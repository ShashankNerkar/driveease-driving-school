# 🔴 Production Environment Variables Required

## Issue Found
Login works locally but fails in production due to:
1. **CORS blocking** - CLIENT_URL still points to localhost
2. **Cookie issues** - sameSite='strict' blocks cross-origin cookies in production

## 🔧 Required Fix: Update Production Environment Variables on Render

You need to set these environment variables on Render:

### **Critical Variable:**
```bash
CLIENT_URL=https://your-frontend-domain.com
```

Replace `https://your-frontend-domain.com` with your actual deployed frontend URL (e.g., Vercel, Netlify, or custom domain).

### **Why This Matters:**

**Current server/.env (Local):**
```bash
CLIENT_URL=http://localhost:5173  ❌ Only allows local frontend
```

**Required on Render:**
```bash
CLIENT_URL=https://your-production-frontend.vercel.app  ✅ Allows production frontend
```

---

## 📋 How CLIENT_URL is Used

### 1. **CORS Configuration** (`src/app.js`)
```javascript
cors({
  origin: process.env.CLIENT_URL,  // Only this origin can access the API
  credentials: true,                // Required for cookies
})
```

**Effect:** If CLIENT_URL is localhost, production frontend requests are blocked with CORS error.

### 2. **Cookie Settings** (`src/utils/generateToken.js`)
```javascript
sameSite: isProduction ? 'strict' : 'lax'
```

**Problem:** `sameSite: 'strict'` in production blocks cookies unless frontend and backend share the same domain.

---

## 🎯 Solution

### Option 1: Frontend and Backend on Same Domain (Recommended)
**Example:** 
- Frontend: `https://driveease.com`
- Backend: `https://api.driveease.com`

**Setup:**
1. Deploy frontend to your domain
2. Point backend to `api.driveease.com` subdomain
3. Set on Render:
   ```bash
   CLIENT_URL=https://driveease.com
   NODE_ENV=production
   ```
4. Update cookies to include domain:
   ```javascript
   domain: '.driveease.com'  // Allows api.driveease.com to set cookies for driveease.com
   ```

### Option 2: Different Domains with sameSite='none' (Quick Fix)
**Example:**
- Frontend: `https://driveease.vercel.app`
- Backend: `https://driveease-driving-school.onrender.com`

**Required Changes:**

1. **Set on Render:**
   ```bash
   CLIENT_URL=https://driveease.vercel.app
   NODE_ENV=production
   ```

2. **Update `server/src/utils/generateToken.js`:**
   Change line 52 and 60:
   ```javascript
   // From:
   sameSite: isProduction ? 'strict' : 'lax',
   
   // To:
   sameSite: isProduction ? 'none' : 'lax',
   ```

3. **Rebuild and redeploy backend**

---

## 🔍 Current Configuration Analysis

### Local (.env file)
```bash
CLIENT_URL=http://localhost:5173          ✅ Works for local development
NODE_ENV=development                      ✅ Correct
```

### Production (Render - NEEDS UPDATE)
```bash
CLIENT_URL=http://localhost:5173          ❌ WRONG - Still localhost
NODE_ENV=production                       ✅ Correct (assumed)
```

---

## 🧪 How to Test After Fix

1. **Update CLIENT_URL on Render** to your frontend URL
2. **Restart Render service**
3. **Test login from production frontend:**
   - Open browser DevTools → Network tab
   - Attempt login
   - Check for:
     - ✅ No CORS errors
     - ✅ Set-Cookie headers in response
     - ✅ Cookies stored in Application tab
     - ✅ Cookies sent with subsequent requests

4. **Check for specific errors:**
   - CORS error → CLIENT_URL mismatch
   - Cookies not set → sameSite issue
   - Cookies not sent → domain/secure mismatch

---

## 📝 Summary

**Root Cause:** Production backend has `CLIENT_URL=http://localhost:5173`, blocking production frontend.

**Immediate Fix:** Set `CLIENT_URL` on Render to your deployed frontend URL.

**Complete Fix:** Choose Option 1 or 2 above based on your domain setup.

**No local .env changes needed** - These are production-only environment variables.
