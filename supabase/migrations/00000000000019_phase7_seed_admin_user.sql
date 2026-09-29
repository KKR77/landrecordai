-- Phase 7: Seed Admin User for Demo
-- 
-- This migration creates a demo admin user for testing purposes.
-- 
-- IMPORTANT: This is for DEMO/TESTING only. In production:
-- 1. Use Supabase Auth UI or API to create users
-- 2. Never hardcode passwords in migrations
-- 3. Remove this migration before production deployment
--
-- Admin credentials:
-- Email: admin@demo.local
-- Password: Admin123!
-- Role: admin
-- Tehsil Scope: NULL (can access all tehsils)

-- Step 1: Create the user in auth.users
-- Note: This uses Supabase's auth.users table
-- The password will be hashed by Supabase Auth

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Fixed ID for demo
  '00000000-0000-0000-0000-000000000000', -- Default instance
  'admin@demo.local',
  -- Password: Admin123! (hashed with bcrypt)
  -- You can generate this hash using: https://bcrypt-generator.com/
  -- Or use Supabase Auth API to create the user properly
  '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNO', -- Placeholder hash
  NOW(), -- Email confirmed immediately for demo
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Demo Admin", "role": "admin"}',
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create identity for email provider
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- Fixed ID for demo
  '00000000-0000-0000-0000-000000000001', -- Link to user above
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "admin@demo.local"}',
  'email',
  '00000000-0000-0000-0000-000000000001',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create profile in public.profiles
INSERT INTO public.profiles (
  id,
  role,
  tehsil_scope,
  name,
  phone,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Same ID as auth.users
  'admin',
  NULL, -- Admin can access all tehsils
  'Demo Admin',
  '+919876543210', -- Demo phone number
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  tehsil_scope = EXCLUDED.tehsil_scope,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  updated_at = NOW();

-- Verification query (run this to confirm the admin user was created)
-- SELECT 
--   u.email,
--   p.role,
--   p.tehsil_scope,
--   p.name
-- FROM auth.users u
-- JOIN public.profiles p ON u.id = p.id
-- WHERE u.email = 'admin@demo.local';

--'Phase 7: Seed demo admin user (admin@demo.local / Admin123!)';
