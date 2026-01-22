# Quick Railway Deployment

**Project Created:** ✅ PropTraderAI  
**URL:** https://railway.com/project/f116217c-36c7-457d-a618-f0257720b52d

## Step 1: Set Environment Variables

1. Open Railway dashboard: https://railway.com/project/f116217c-36c7-457d-a618-f0257720b52d
2. Click "New" → "Empty Service" (or it might already be created)
3. Click on the service → "Variables" tab
4. Add these variables:

```
SUPABASE_URL=https://ryxohicxjdcdnjhwgvgp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_GCLblhwJUMihuzizG21DSg_kk_VBbIM
PORT=3001
NODE_ENV=production
INTERNAL_TOKEN=de002882dac517ab9d89468d82fba05d74ded3a111acd79333b336d723119e5e
```

## Step 2: Deploy via GitHub (Recommended)

**Option A: Push to GitHub and deploy from there**

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Add execution server"
   git push
   ```

2. In Railway dashboard:
   - Click "Deploy from GitHub repo"
   - Select: `modryn-studio/PropTraderAI`
   - Root directory: `/server`
   - Click "Deploy"

**Option B: Deploy via Railway CLI**

```bash
cd server
railway link  # Select PropTraderAI project
railway up
```

## Step 3: Get Deployment URL

After deployment completes:

1. Go to Railway dashboard → Your service
2. Click "Settings" tab
3. Scroll to "Networking"
4. Click "Generate Domain"
5. Copy the URL (e.g., `proptraderai-production.up.railway.app`)

## Step 4: Update Local Environment

Add to your main `.env.local`:

```
EXECUTION_SERVER_URL=https://proptraderai-production.up.railway.app
```

(Keep EXECUTION_SERVER_TOKEN the same)

## Step 5: Test

```bash
curl https://your-domain.up.railway.app/health
```

Should return:
```json
{
  "status": "running",
  "serverId": "...",
  "activeEngines": 0,
  "totalStrategies": 0,
  "uptime": 123,
  "timestamp": "..."
}
```

## Troubleshooting

**Build fails?**
- Check Railway logs for errors
- Verify all environment variables are set
- Make sure `server/package.json` has correct build scripts

**Can't reach server?**
- Generate domain if not auto-generated
- Check service is running (green status in dashboard)
- Verify firewall/network settings

**Auth errors?**
- Verify `INTERNAL_TOKEN` matches `EXECUTION_SERVER_TOKEN` in main .env.local
- Check Railway service logs for authentication attempts
