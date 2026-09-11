/**
 * Seed Script: Create Demo Admin User
 * 
 * This script creates a demo admin user using Supabase Auth API.
 * 
 * Usage:
 * 1. Make sure .env has real VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY
 * 3. Run: node seed-admin.js
 * 
 * This will create:
 * - User: admin@demo.local
 * - Password: Admin123!
 * - Role: admin
 * - Tehsil Scope: NULL (can access all tehsils)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedAdmin() {
  console.log('🔑 Creating demo admin user...\n')

  const email = 'admin@demo.local'
  const password = 'Admin123!'

  try {
    // Step 1: Create user in Supabase Auth
    console.log('Step 1: Creating user in Supabase Auth...')
    const {  error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for demo
      user_meta_data: {
        name: 'Demo Admin',
        role: 'admin',
      },
    })

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('⚠️  User already exists, updating profile...')
      } else {
        throw authError
      }
    } else {
      console.log('✅ User created successfully')
    }

    // Step 2: Get user ID
    console.log('\nStep 2: Fetching user ID...')
    const {  error: listError } = await supabase.auth.admin.listUsers()

    if (listError) throw listError

    const adminUser = users.users.find((u) => u.email === email)
    if (!adminUser) {
      throw new Error('Admin user not found after creation')
    }

    console.log('✅ User ID:', adminUser.id)

    // Step 3: Create/update profile
    console.log('\nStep 3: Creating profile in public.profiles...')
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: adminUser.id,
        role: 'admin',
        tehsil_scope: null, // Admin can access all tehsils
        name: 'Demo Admin',
        phone: '+919876543210',
      })

    if (error) throw error

    console.log('✅ Profile created successfully')

    // Success!
    console.log('\n' + '='.repeat(60))
    console.log('✅ DEMO ADMIN USER CREATED SUCCESSFULLY')
    console.log('='.repeat(60))
    console.log('\n📧 Email:    admin@demo.local')
    console.log('🔑 Password: Admin123!')
    console.log('👤 Role:     admin')
    console.log('🌐 Scope:    All tehsils (NULL)')
    console.log('\n' + '='.repeat(60))
    console.log('\n⚠️  IMPORTANT: This is for DEMO/TESTING only!')
    console.log('Remove this user before production deployment.')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message)
    process.exit(1)
  }
}

seedAdmin()
