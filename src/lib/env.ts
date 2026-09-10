/**
 * Environment Variable Validation
 * Gracefully handles missing Supabase credentials for demo environments
 */

export interface EnvConfig {
  supabaseUrl: string | null
  supabaseAnonKey: string | null
  appName: string
  appEnv: string
  enableMockData: boolean
  enableAnalytics: boolean
  isSupabaseConfigured: boolean
}

function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return import.meta.env[key] || defaultValue
}

function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key]
  if (!value) return defaultValue
  return value === 'true' || value === '1'
}

export function validateEnv(): EnvConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || null
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || null
  
  const config: EnvConfig = {
    supabaseUrl,
    supabaseAnonKey,
    appName: getOptionalEnv('VITE_APP_NAME', 'Land Record Platform'),
    appEnv: getOptionalEnv('VITE_APP_ENV', 'development'),
    enableMockData: getBooleanEnv('VITE_ENABLE_MOCK_DATA', true),
    enableAnalytics: getBooleanEnv('VITE_ENABLE_ANALYTICS', false),
    isSupabaseConfigured: !!(supabaseUrl && supabaseAnonKey),
  }

  // Validate Supabase URL format if provided
  if (config.supabaseUrl && !config.supabaseUrl.startsWith('https://')) {
    console.warn('⚠️ VITE_SUPABASE_URL should start with https://')
  }

  // Validate Supabase key format if provided
  if (config.supabaseAnonKey && config.supabaseAnonKey.length < 20) {
    console.warn('⚠️ VITE_SUPABASE_ANON_KEY appears to be invalid (too short)')
  }

  if (config.isSupabaseConfigured) {
    console.log(`✓ Environment validated successfully (${config.appEnv})`)
  } else {
    console.warn('⚠️ Supabase not configured - running in demo mode with limited functionality')
    console.warn('  To enable full functionality, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  }

  return config
}

// Export validated config
export const env = validateEnv()
