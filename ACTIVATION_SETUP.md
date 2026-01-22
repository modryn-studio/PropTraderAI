# Activation Setup Checklist

## ✅ Step 1: Database Migration (COMPLETED)
Migration 024 has been applied successfully.

## 🔧 Step 2: Set Environment Variables

### 2A. Generate Secure Token
```bash
# Generate a secure random token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2B. Add to `.env.local` (Next.js app)
```bash
# Add these lines to your existing .env.local
EXECUTION_SERVER_URL=http://localhost:3001
EXECUTION_SERVER_TOKEN=<paste-token-from-2A>
```

### 2C. Create `server/.env` (Execution server)
```bash
cd server
cp .env.example .env
# Edit server/.env and fill in:
# - SUPABASE_URL (same as Next.js)
# - SUPABASE_SERVICE_ROLE_KEY (same as Next.js)
# - INTERNAL_TOKEN (same token as EXECUTION_SERVER_TOKEN)
# - TRADOVATE_* credentials
```

## 🚀 Step 3: Test Locally

### 3A. Install Server Dependencies
```bash
cd server
npm install
```

### 3B. Start Execution Server (Terminal 1)
```bash
cd server
npm run dev
```

You should see:
```
[Execution Server] Starting on port 3001...
[Execution Server] Connected to Supabase
[Execution Server] Loaded 0 active strategies
[Execution Server] Server ready at http://localhost:3001
```

### 3C. Start Next.js App (Terminal 2)
```bash
npm run dev
```

### 3D. Test Activation Flow
1. Navigate to http://localhost:3000/dashboard
2. Click "Strategy Builder" → "Start with Template"
3. Select ORB template
4. Fill in customization form
5. Click "Save Strategy"
6. Check Terminal 1 (execution server) for logs:
   ```
   [Execution Server] POST /engine/strategies - Adding strategy xyz...
   ```

## 🌐 Step 4: Deploy to Railway (When Ready)

**DON'T deploy yet** - test locally first!

When ready to deploy:
1. Follow [server/RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)
2. Update `.env.local` with Railway URL
3. Enable feature flag (see Step 5)

## 🎛️ Step 5: Enable Feature Flag (Beta Testing)

Currently the feature is **disabled** (`strategy_activation_enabled: false`).

### When to Enable:
- ✅ Local testing successful
- ✅ Railway deployment complete
- ✅ Health check passes
- ✅ Ready for beta users

### How to Enable:
```typescript
// src/config/features.ts
export const FEATURES = {
  // ...
  strategy_activation_enabled: true,  // Change to true
} as const;
```

Then redeploy Next.js app.

## 🧪 Verification Checklist

Before enabling for users:
- [ ] Execution server starts without errors
- [ ] Health check responds: `curl http://localhost:3001/health`
- [ ] Strategy activation succeeds (check server logs)
- [ ] Strategy appears in `/api/execution/status`
- [ ] WebSocket connection established (check browser console)
- [ ] Real-time updates working (modify strategy, see change reflected)

## 🐛 Troubleshooting

### Server won't start
- Check `server/.env` has all required variables
- Verify Supabase credentials
- Check port 3001 not already in use: `netstat -ano | findstr :3001`

### Activation fails silently
- Check `EXECUTION_SERVER_TOKEN` matches `INTERNAL_TOKEN`
- Check `EXECUTION_SERVER_URL` is correct
- Look at Next.js terminal for activation errors
- Look at execution server terminal for request logs

### No strategies loaded on startup
- Check database: `SELECT * FROM strategies WHERE is_active = true;`
- Verify `SUPABASE_SERVICE_ROLE_KEY` has read access
- Check server logs for Supabase connection errors

## 📊 Current Status

- ✅ Migration 024 applied
- ⏸️ Environment variables (Step 2) - **YOU ARE HERE**
- ⏸️ Local testing (Step 3)
- ⏸️ Railway deployment (Step 4)
- ⏸️ Feature flag (Step 5)
