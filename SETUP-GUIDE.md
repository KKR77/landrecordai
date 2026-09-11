# 🔧 Complete Setup Guide - Login, Auth & Demo Admin

## Part 1: Fix "Failed to Fetch" Error

### Root Cause
Your `.env` file has placeholder values:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Solution: Create Real Supabase Project

**Step 1: Create Supabase Project**
1. Go to https://supabase.com
3. Click "New Project"
4. Fill in:
   - Name: `land-record-platform` (or any name)
   - Database Password: (save this somewhere safe)
   - Region: Choose closest to you
5. Wait for project to be created (~2 minutes)

**Step 2: Get Your Credentials**
1. Go to your project dashboard
2. Click "Settings" (gear icon) → "API"
3. Copy these values:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - needed for seed script

**Step 3: Update .env**
Open `.env` and replace:
```env
# OLD (placeholder)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# NEW (your real values)
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 4: Apply Database Migrations**
```bash
# If using Supabase CLI
supabase db push

# OR manually run migrations in Supabase SQL Editor
# Copy content from supabase/migrations/*.sql and run in order
```

---

## Part 2: Create Demo Admin User

### Option A: Using Seed Script (Recommended)

**Step 1: Install dependencies**
```bash
npm install @supabase/supabase-js dotenv
```

**Step 2: Run seed script**
```bash
node seed-admin.js
```

**Step 3: Verify**
You should see:
```
✅ DEMO ADMIN USER CREATED SUCCESSFULLY
📧 Email:    admin@demo.local
🔑 Password: Admin123!
👤 Role:     admin
🌐 Scope:    All tehsils (NULL)
```

### Option B: Manual Creation via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create New User"
3. Fill in:
   - Email: `admin@demo.local`
   - Password: `Admin123!`
   - Check "Auto Confirm User"
4. Click "Create User"
5. Copy the User UID
6. Go to Table Editor → `profiles` table
7. Click "Insert" → "New Row"
8. Fill in:
   - id: (paste the User UID)
   - role: `admin`
   - tehsil_scope: (leave NULL)
   - name: `Demo Admin`
   - phone: `+919876543210`
9. Click "Save"

---

## Part 3: Configure Email Verification

Supabase Auth sends confirmation emails by default. This is already implemented in the Signup component.

### Test Email Verification
1. Sign up with a new email
2. Check your email for confirmation link
3. Click the link to verify
4. You'll be redirected to the login page

### Customize Email Templates (Optional)
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Edit templates:
   - Confirm signup
   - Magic link
   - Reset password
3. Customize HTML/CSS as needed

---

## Part 4: Configure Phone OTP (SMS)

### Step 1: Enable Phone Provider in Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Click "Phone"
3. Enable "Enable Phone provider"
4. Choose SMS provider:
   - **Twilio** (recommended)
   - **MessageBird**
   - **Vonage**
   - **AWS SNS**

### Step 2: Configure Twilio (Example)

**Get Twilio Credentials:**
1. Go to https://twilio.com and create account
2. Go to Console Dashboard: https://console.twilio.com
3. Copy:
   - **Account SID**
   - **Auth Token**
4. Get a phone number:
   - Go to Phone Numbers → Buy a Number
   - Choose a number with SMS capability
   - Copy the phone number

**Add to Supabase:**
1. Go to Supabase Dashboard → Authentication → Providers → Phone
2. Fill in:
   - Provider: Twilio
   - Account SID: (paste from Twilio)
   - Auth Token: (paste from Twilio)
   - Sender Phone Number: (paste your Twilio number)
3. Click "Save"

### Step 3: Test Phone OTP

1. Open the app
2. Click "Sign In with Phone OTP"
3. Enter phone number: `+919876543210` (with country code)
4. You'll receive SMS with 6-digit OTP
5. Enter OTP to login

### ⚠️ Important Notes

**SMS Costs:**
- Twilio charges ~$0.0075 per SMS (US)
- International rates vary
- Free trial: $15 credit (~2000 SMS)

**Phone Number Format:**
- Must include country code
- Examples:
  - India: `+919876543210`
  - US: `+14155552671`
  - UK: `+447700900123`

**Rate Limits:**
- Supabase limits: 30 OTP requests per hour per phone number
- Twilio limits: Varies by account type

---

## Part 5: Configure Redirect URLs

### Step 1: Add Site URL

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set:
   - **Site URL**: `http://localhost:5173` (for local dev)
   - **Redirect URLs**: 
     - `http://localhost:5173/**`
     - `https://your-domain.com/**` (for production)

### Step 2: Test Redirects

1. Sign up with new email
2. Click confirmation link in email
3. You should be redirected to your app
4. Login should work

---

## Part 6: Test Complete Auth Flow

### Test 1: Email Login
```bash
# Start dev server
npm run dev
```
1. Open http://localhost:5173
2. Enter email: `admin@demo.local`
3. Enter password: `Admin123!`
4. Click "Sign In"
5. ✅ Should redirect to dashboard

### Test 2: Email Signup
1. Click "Sign up"
2. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Password: Test123!
3. Click "Create Account"
4. ✅ Should show "Check Your Email" message
5. Check email and click confirmation link
6. ✅ Should redirect to login

### Test 3: Phone OTP (if configured)
1. Click "Sign In with Phone OTP"
2. Enter phone: `+919876543210`
3. Click "Send OTP"
4. ✅ Should receive SMS with OTP
5. Enter OTP
6. ✅ Should login successfully

### Test 4: Role-Based Access
1. Login as admin (`admin@demo.local`)
2. ✅ Should see all tabs (Upload, Admin Queue, Analytics, AI Assistant)
3. Logout
4. Create new user with role `patwari`
5. Login as patwari
6. ✅ Should see limited tabs (Upload only)

---

## Troubleshooting

### "Failed to fetch" Error

**Cause:** Supabase URL/key not configured

**Solution:**
1. Check `.env` has real values (not placeholders)
2. Restart dev server: `npm run dev`
3. Check browser console for exact error

### "Invalid login credentials"

**Cause:** Wrong email/password

**Solution:**
1. Verify user exists in Supabase Dashboard → Authentication → Users
2. Try resetting password
3. Check email is confirmed

### "Email not confirmed"

**Cause:** User hasn't clicked confirmation link

**Solution:**
1. Check email for confirmation link
2. Or manually confirm in Supabase Dashboard → Authentication → Users → Edit User → Check "Confirm email"

### "OTP not received"

**Cause:** SMS provider not configured

**Solution:**
1. Check Supabase Dashboard → Authentication → Providers → Phone
2. Verify Twilio (or other provider) is configured
3. Check phone number format includes country code
4. Check Twilio account has credits

### "User already exists"

**Cause:** Trying to signup with existing email

**Solution:**
1. Use different email
2. Or login with existing credentials
3. Or delete user in Supabase Dashboard → Authentication → Users

---

## Production Checklist

Before deploying to production:

- [ ] Remove demo admin user (`admin@demo.local`)
- [ ] Remove seed script (`seed-admin.js`)
- [ ] Update redirect URLs to production domain
- [ ] Configure custom email templates
- [ ] Set up proper SMS provider with sufficient credits
- [ ] Enable rate limiting
- [ ] Set up monitoring/alerts
- [ ] Test all auth flows in production
- [ ] Document admin user creation process for ops team

---

## Quick Reference

### Demo Admin Credentials
```
Email:    admin@demo.local
Password: Admin123!
Role:     admin
Scope:    All tehsils
```

### Useful Supabase Dashboard Links
- Users: https://app.supabase.com/project/_/auth/users
- Providers: https://app.supabase.com/project/_/auth/providers
- Email Templates: https://app.supabase.com/project/_/auth/templates
- API Settings: https://app.supabase.com/project/_/settings/api

### Commands
```bash
# Start dev server
npm run dev

# Create admin user
node seed-admin.js

# Apply migrations
supabase db push

# Build for production
npm run build
```

---

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Auth Guide: https://supabase.com/docs/guides/auth
- Phone Auth: https://supabase.com/docs/guides/auth/phone-login
- Twilio Docs: https://www.twilio.com/docs

---

**Last Updated:** Phase 7 Implementation
**Status:** ✅ Ready for Testing
