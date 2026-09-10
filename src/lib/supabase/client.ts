/**
 * Supabase Client Configuration
 * Typed client for browser-side operations
 */

import { createClient } from '@supabase/supabase-js'
import type { Database, Profile } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Helper to get current user's profile
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return profile
}

// Helper to check if user has required role
export async function requireRole(allowedRoles: string[]) {
  const profile = await getCurrentProfile()
  
  if (!profile) {
    throw new Error('Not authenticated')
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new Error(`Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`)
  }

  return profile as NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>
}
