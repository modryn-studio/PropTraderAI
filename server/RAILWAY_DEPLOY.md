# Railway Deployment Guide

## Prerequisites
1. [Railway account](https://railway.app/) (free tier available)
2. Railway CLI installed: `npm install -g @railway/cli`

## Step 1: Create Railway Project

```bash
# Login to Railway
railway login

# Create new project in Railway dashboard or via CLI
railway init
```

## Step 2: Set Environment Variables

In Railway dashboard, add these environment variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3001
NODE_ENV=production
INTERNAL_TOKEN=<generate-secure-random-token>
TRADOVATE_API_URL=https://demo.tradovateapi.com/v1
TRADOVATE_CLIENT_ID=your_client_id
TRADOVATE_CLIENT_SECRET=your_secret
```

**Generate secure token:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Deploy

```bash
# From the server/ directory
cd server
railway up
```

Railway will:
- Detect Node.js project
- Run `npm install`
- Run `npm run build`
- Start with `npm start`

## Step 4: Get Deployment URL

```bash
# Generate domain (if not auto-assigned)
railway domain

# Copy the URL (e.g., https://proptraderai-execution.up.railway.app)
```

## Step 5: Update Next.js Environment

Add to your main `.env.local`:

```
EXECUTION_SERVER_URL=https://your-app.up.railway.app
EXECUTION_SERVER_TOKEN=<same-token-as-INTERNAL_TOKEN>
```

## Verification

Test the connection:
```bash
curl https://your-app.up.railway.app/health
# Should return: {"status":"ok","timestamp":"...","uptime":123}
```

## Local Development

To test locally before deploying:

```bash
# Terminal 1: Start execution server
cd server
cp .env.example .env  # Fill in real values
npm install
npm run dev

# Terminal 2: Start Next.js app
npm run dev
```

Then create a strategy via template gallery to test activation flow.

## Monitoring

Railway dashboard shows:
- Deployment logs
- CPU/Memory usage
- Request metrics
- Environment variables

## Cost

- Free tier: 500 hours/month (enough for 24/7 single instance)
- Pro plan: $5/month for unlimited hours + more resources
