-- Phase 7 Bug Fix: profiles RLS policies caused infinite recursion
--
-- The original policies on public.profiles queried public.profiles itself
-- from inside subqueries (e.g. "Admins can view all profiles" checked
-- EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')).
-- This caused Postgres error 42P17: infinite recursion detected in policy
-- for relation "profiles", surfacing to the frontend as a 500 error on
-- every /rest/v1/profiles request.
--
-- Fix: use SECURITY DEFINER helper functions that read the role/tehsil_scope
-- directly, bypassing RLS re-evaluation, breaking the recursive loop.

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_tehsil_scope(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tehsil_scope FROM public.profiles WHERE id = user_id;
$$;

-- Drop the recursive profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Officials can view profiles in their scope" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Recreate them using the helper functions instead of self-referencing subqueries
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Officials can view profiles in their scope"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) IN ('patwari', 'tehsildar')
    AND (
      public.get_user_tehsil_scope(auth.uid()) IS NULL
      OR public.get_user_tehsil_scope(auth.uid()) = tehsil_scope
    )
  );

CREATE POLICY "Only admins can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role::text = public.get_user_role(auth.uid())
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin');
