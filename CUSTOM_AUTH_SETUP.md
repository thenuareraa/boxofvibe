# Custom Authentication Setup Guide

## What's Been Done

The custom authentication system with plain text passwords and **username login** is now **fully implemented**:

### Backend APIs (Complete)
- `/api/custom-auth/signup` - User registration with username, email, and plain text passwords
- `/api/custom-auth/login` - **Login with USERNAME and password** (no email needed)
- `/api/custom-auth/logout` - Session cleanup
- `/api/custom-auth/me` - Get current user from session
- `/api/admin/users` - Admin API to view all users (with passwords), block/unblock/delete accounts

### Frontend (Complete)
- **Login page** - Uses USERNAME + PASSWORD (no email field)
- **Signup page** - Requires USERNAME, EMAIL, and PASSWORD
- Admin panel updated to display users with passwords (app/admin-control-panel/page.tsx)
- Admin Overview tab simplified - shows only Total Songs, Total Users, Recent Songs, and User Login Details
- Block/Unblock/Delete user functionality added to admin panel

## IMPORTANT: Next Step - Run SQL in Supabase

**You MUST run the SQL setup script in Supabase before the system will work!**

### Steps to Complete Setup:

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**
4. Copy the entire contents of `custom-auth-setup.sql` file
5. Paste it into the SQL editor
6. Click **"Run"** to execute the script

This will create:
- `custom_users` table (stores users with plain text passwords)
- `custom_sessions` table (stores login sessions)

### After Running SQL

The system will be ready to use:
- Users can sign up and login at the homepage
- Passwords are stored as plain text in `custom_users` table
- Admin can view all users with passwords in admin panel (Users tab)
- Admin can block, unblock, or delete any user account
- Blocked users cannot login

## Features

### Admin Panel - Users Tab
- **View all users** with email and plain text password
- **Block users** - prevents login, shows custom reason
- **Unblock users** - re-enable blocked accounts
- **Delete users** - permanently remove accounts
- **See login details** - last login time, join date, status

### Security Note
⚠️ **Passwords are stored as PLAIN TEXT** - this was explicitly requested by you for full admin control. This is NOT recommended for production systems, but provides complete visibility into user credentials as you requested.

## Testing

After running the SQL:
1. Go to http://localhost:3000
2. Click "Sign Up Free"
3. Create a test account with:
   - **Username** (required, must be unique)
   - **Email** (required)
   - **Password** (minimum 6 characters)
4. Login using your **USERNAME** and **PASSWORD** (no email needed)
5. Access admin panel at http://localhost:3000/admin-control-panel
6. Go to "Users" tab or "Overview" tab
7. You should see the test user with their **plain text password visible**

## Key Changes

### Username Login
- **Login form** now asks for USERNAME (not email)
- **Signup form** asks for USERNAME, EMAIL, and PASSWORD
- Username is **UNIQUE** - no two users can have the same username
- Login is done via username lookup, NOT email

### Admin Panel Simplifications
- **Overview tab** shows only:
  - Total Songs count
  - Total Users count
  - Recently Added Songs (last 10)
  - User Login Details (username, email, PASSWORD in plain text)
- Removed Analytics and System tabs (not needed)
- Users tab shows full details with passwords

## Files Modified

- `app/page.tsx` - Login/signup using custom auth
- `app/admin-control-panel/page.tsx` - User management with passwords
- `app/api/custom-auth/signup/route.ts` - Signup API
- `app/api/custom-auth/login/route.ts` - Login API
- `app/api/custom-auth/logout/route.ts` - Logout API
- `app/api/custom-auth/me/route.ts` - Get current user API
- `app/api/admin/users/route.ts` - Admin user management API
- `custom-auth-setup.sql` - Database schema

## Done!

Everything is ready to go. Just run the SQL in Supabase and you're good to test!
