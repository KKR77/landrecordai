/**
 * Supabase Client Configuration
 * Typed client for browser-side operations
 * Gracefully handles missing credentials for demo environments
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '../../types/supabase'
import { env } from '../env'

let supabaseInstance: SupabaseClient<Database> | null = null

// Create Supabase client if credentials are available
if (env.isSupabaseConfigured && env.supabaseUrl && env.supabaseAnonKey) {
  supabaseInstance = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

// Export a proxy that handles missing credentials gracefully
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    if (!supabaseInstance) {
      // Return a mock implementation that throws helpful errors
      if (prop === 'auth') {
        return {
          getUser: async () => ({ data: { user: null }, error: null }),
          signIn: async () => ({ data: null, error: new Error('Supabase not configured') }),
          signOut: async () => ({ error: null }),
        }
      }
      if (prop === 'from') {
        return () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: new Error('Supabase not configured') }),
            }),
          }),
          insert: async () => ({ data: null, error: new Error('Supabase not configured') }),
          update: async () => ({ data: null, error: new Error('Supabase not configured') }),
        })
      }
      if (prop === 'rpc') {
        return async () => ({ data: null, error: new Error('Supabase not configured') })
      }
      return () => {
        throw new Error('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
      }
    }
    return (supabaseInstance as any)[prop]
  },
})

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return env.isSupabaseConfigured && supabaseInstance !== null
}

// Helper to get current user's profile
export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - cannot fetch profile')
    return null
  }

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
