# 🔴 Gmail SMTP Setup Required

## Error Found
```
Error Code: EAUTH
Error Message: Application-specific password required
```

## Root Cause
Gmail requires **App Passwords** when using SMTP. Regular Gmail passwords don't work anymore.

## ✅ Solution: Generate Gmail App Password

### Step 1: Enable 2-Factor Authentication
1. Go to: https://myaccount.google.com/security
2. Find **"2-Step Verification"**
3. Click **"Get Started"** and follow the setup

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select app: **"Mail"**
3. Select device: **"Other (Custom name)"**
4. Enter name: **"DriveEase Backend"**
5. Click **"Generate"**
6. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### Step 3: Update .env File
Replace `EMAIL_PASS` in `server/.env` with the generated App Password:

```bash
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

**Note:** Keep the spaces in the app password - they're part of the format.

### Step 4: Test SMTP Connection
Run:
```bash
cd server
node test-smtp.js
```

You should see:
```
✅ SMTP connection successful!
✅ Test email sent successfully!
```

## ⚠️ Important Notes

1. **Don't use your regular Gmail password** - It won't work
2. **App Passwords require 2FA** - Must be enabled first
3. **App Password is 16 characters** - Usually shown with spaces: `xxxx xxxx xxxx xxxx`
4. **Keep it secret** - Treat it like a password
5. **One-time view** - Save it immediately after generation

## 🔧 Current .env Status

✅ Fixed Issues:
- EMAIL_HOST changed from `smtp.your-provider.com` to `smtp.gmail.com`
- EMAIL_FROM extra 's' removed

❌ Remaining Issue:
- EMAIL_PASS needs to be a Gmail App Password (not regular password)

## 📋 Quick Reference

**Current .env (after my fixes):**
```bash
EMAIL_HOST=smtp.gmail.com          ✅ Correct
EMAIL_PORT=587                      ✅ Correct  
EMAIL_SECURE=false                  ✅ Correct
EMAIL_USER=shashanknerkar21@gmail.com  ✅ Correct
EMAIL_PASS=Shashi@1973             ❌ Regular password (needs App Password)
EMAIL_FROM="DriveEase <shashanknerkar21@gmail.com>"  ✅ Correct
```

**Required .env:**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=shashanknerkar21@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx    👈 Replace with App Password
EMAIL_FROM="DriveEase <shashanknerkar21@gmail.com>"
```

## 🧪 Test Script Available

I've created `test-smtp.js` in the server folder. Use it to verify SMTP configuration:

```bash
cd server
node test-smtp.js
```

This will:
- ✅ Validate all EMAIL_* environment variables
- ✅ Test SMTP connection to Gmail
- ✅ Send a test email to your inbox
- ✅ Show detailed error messages if anything fails
