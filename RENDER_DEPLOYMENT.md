# Deploying AutoFolio to Render

## Prerequisites
- Render account (free tier works)
- GitHub repository with your code

## Step 1: Create PostgreSQL Database

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **New → PostgreSQL**
3. **Configure:**
   - Name: `autofolio-db` (or any name you prefer)
   - Database: `autofolio` (default is fine)
   - User: (auto-generated)
   - Region: Choose closest to you
   - Plan: **Free** (for testing)
4. **Click "Create Database"**
5. **Wait 2-3 minutes** for provisioning

## Step 2: Get Database Connection URL

1. Click on your newly created PostgreSQL database
2. Scroll down to **"Connections"** section
3. **Copy the "Internal Database URL"**
   - Format: `postgres://username:password@hostname/database`
   - Example: `postgres://autofolio_user:abc123...@dpg-xyz.oregon-postgres.render.com/autofolio`

> ⚠️ **Important:** Use the **Internal Database URL**, not the External one, for better security and no extra charges.

## Step 3: Create Web Service

1. **Go to Render Dashboard → New → Web Service**
2. **Connect your GitHub repository**: `ASHARISH1805/autofolio-saas`
3. **Configure:**
   - Name: `autofolio-saas`
   - Region: Same as database
   - Branch: `main`
   - Root Directory: (leave empty)
   - Environment: `Node`
   - Build Command: `yarn` (default)
   - Start Command: `yarn start` (default)
   - Plan: **Free**

## Step 4: Set Environment Variables

In the **Environment** tab of your web service, add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | *Paste Internal Database URL from Step 2* | Required ✅ |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID | Required for login ✅ |
| `GEMINI_API_KEY` | Your Google Gemini API Key | Required for AI resume parsing ✅ |
| `NODE_ENV` | `production` | Optional (auto-detected) |
| `PORT` | `3000` | Optional (Render auto-assigns) |

### Where to Get API Keys:

**Google Client ID (OAuth):**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/Select Project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add your Render URL to Authorized redirect URIs

**Gemini API Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create API Key
3. Copy and paste

## Step 5: Deploy

1. **Click "Create Web Service"** (or "Save Changes" if already created)
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Run `node deploy_db.js` (sets up database schema)
   - Start your server with `node server.js`
3. **Monitor the logs** for any errors

## Step 6: Verify Deployment

1. **Check logs** should show:
   ```
   DEBUG: Using Connection String: postgres://...@...render.com.../...
   DEBUG: Environment: PRODUCTION
   ✅ Deployment DB Check Complete.
   🚀 Server is running on port ...
   ```

2. **Visit your URL**: `https://autofolio-saas.onrender.com` (or your custom name)

3. **Test features:**
   - Landing page loads
   - Google login works
   - Dashboard accessible
   - AI resume parsing works

## Common Issues

### ❌ `ECONNREFUSED` Error
**Cause:** DATABASE_URL not set
**Fix:** Add DATABASE_URL environment variable (Step 4)

### ❌ Google Login Fails
**Cause:** GOOGLE_CLIENT_ID not set or redirect URI not configured
**Fix:** 
1. Set GOOGLE_CLIENT_ID environment variable
2. Add `https://your-app.onrender.com` to Google Cloud Console → Authorized redirect URIs

### ❌ AI Resume Parsing Fails
**Cause:** GEMINI_API_KEY not set
**Fix:** Add GEMINI_API_KEY environment variable

### ❌ App Keeps Restarting
**Cause:** Usually database connection or missing env vars
**Fix:** Check logs for specific error, ensure all required env vars are set

## Updating Your App

1. **Push changes to GitHub** (main branch)
2. **Render auto-deploys** (if auto-deploy is enabled)
3. **Or manually deploy** from Render dashboard → Manual Deploy

## Free Tier Limitations

- **Web Service:** Spins down after 15 minutes of inactivity (first request will be slow)
- **PostgreSQL:** 90 days retention, 256MB storage
- **Build minutes:** 500 minutes/month

## Going to Production

For production use:
1. Upgrade to **Starter plan** ($7/month) - no spin down
2. Use **paid PostgreSQL** for better performance
3. Add custom domain
4. Enable auto-scaling

---

Need help? Check [Render Documentation](https://render.com/docs) or contact support.
