/**
 * Environment Variable Validation
 * Fails loudly on startup if required variables are missing
 */

export interface EnvConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  appName: string
  appEnv: string
  enableMockData: boolean
  enableAnalytics: boolean
}

class MissingEnvVarError extends Error {
  constructor(varName: string) {
    super(
      `Missing required environment variable: ${varName}\n` +
      `Please check your .env file and ensure all required variables are set.\n` +
      `See .env.example for reference.`
    )
    this.name = 'MissingEnvVarError'
  }
}

function getRequiredEnv(key: string): string {
  const value = import.meta.env[key]
  if (!value) {
    throw new MissingEnvVarError(key)
  }
  return value
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return import.meta.env[key] || defaultValue
}

function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key]
  if (!value) return defaultValue
  return value === 'true' || value === '1'
}

export function validateEnv(): EnvConfig {
  try {
    const config: EnvConfig = {
      supabaseUrl: getRequiredEnv('VITE_SUPABASE_URL'),
      supabaseAnonKey: getRequiredEnv('VITE_SUPABASE_ANON_KEY'),
      appName: getOptionalEnv('VITE_APP_NAME', 'Land Record Platform'),
      appEnv: getOptionalEnv('VITE_APP_ENV', 'development'),
      enableMockData: getBooleanEnv('VITE_ENABLE_MOCK_DATA', true),
      enableAnalytics: getBooleanEnv('VITE_ENABLE_ANALYTICS', false),
    }

    // Validate Supabase URL format
    if (!config.supabaseUrl.startsWith('https://')) {
      throw new Error('VITE_SUPABASE_URL must start with https://')
    }

    // Validate Supabase key format (basic check)
    if (config.supabaseAnonKey.length < 20) {
      throw new Error('VITE_SUPABASE_ANON_KEY appears to be invalid (too short)')
    }

    console.log(`✓ Environment validated successfully (${config.appEnv})`)
    return config
  } catch (error) {
    if (error instanceof MissingEnvVarError) {
      console.error('\n❌ Environment Validation Failed\n')
      console.error(error.message)
      console.error('\nThis is a fatal error. The application cannot start.\n')
    }
    throw error
  }
}

// Export validated config
export const env = validateEnv()
