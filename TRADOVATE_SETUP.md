# Tradovate API Setup Guide

**Last Updated:** January 17, 2026  
**Phase:** 1B - Live Market Data Integration

---

## Quick Overview

Tradovate provides **FREE demo accounts** with live market data access. No credit card required.

**What you get:**
- ✅ Real-time market data (ES, NQ, YM, RTY, CL, GC)
- ✅ Paper trading with $50,000 virtual account
- ✅ Full API access (REST + WebSocket)
- ✅ 30-day demo period (renewable)

---

## Step 1: Create Demo Account

1. Go to: https://trader.tradovate.com/sign-up
2. Select **"Try Demo"** (not "Open Live Account")
3. Fill in registration:
   - First/Last Name
   - Email address
   - Phone number (any format)
   - Username (lowercase, alphanumeric)
   - Password (8+ chars)
4. Verify email address
5. Log in to https://trader.tradovate.com

**✅ Done:** You now have a demo trading account with $50,000 virtual funds.

---

## Step 2: Get API Credentials

### Option A: Request API Access (Official)

1. Log in to Tradovate demo account
2. Email support: support@tradovate.com
3. Subject: "API Access Request - Demo Account"
4. Body:
   ```
   Hello,
   
   I'm building a trading strategy automation platform (PropTraderAI) and would like
   API access for my demo account to test live market data integration.
   
   Username: [YOUR_USERNAME]
   Email: [YOUR_EMAIL]
   Purpose: Testing automated strategy execution with paper trading
   
   Could you please provide:
   - App ID
   - Client ID (CID)
   - Client Secret
   
   Thank you!
   ```
5. Wait 24-48 hours for credentials email

### Option B: Use Test Credentials (Quick Start)

**⚠️ WARNING:** These are example credentials. Real credentials from Option A required for production.

For **local testing only**, use these placeholder values:

```env
TRADOVATE_CLIENT_ID=test_client_id
TRADOVATE_CLIENT_SECRET=test_client_secret
TRADOVATE_USERNAME=demo_user
TRADOVATE_PASSWORD=demo_password
```

---

## Step 3: Configure Local Environment

1. Open `.env.local` in root directory
2. Add these variables:

```env
# Tradovate API Configuration
TRADOVATE_API_URL=https://demo.tradovateapi.com/v1
TRADOVATE_MD_WS_URL=wss://md.demo.tradovateapi.com/v1/websocket
TRADOVATE_CLIENT_ID=your_client_id_here
TRADOVATE_CLIENT_SECRET=your_client_secret_here
TRADOVATE_USERNAME=your_tradovate_username
TRADOVATE_PASSWORD=your_tradovate_password
TRADOVATE_APP_ID=PropTraderAI
```

3. Save file

---

## Step 4: Configure Railway Environment

1. Go to: https://railway.app/project/f116217c-36c7-457d-a618-f0257720b52d
2. Click on your service (proptraderai-production)
3. Go to **Variables** tab
4. Add these variables (use Raw Editor for clean paste):

```
TRADOVATE_API_URL=https://demo.tradovateapi.com/v1
TRADOVATE_MD_WS_URL=wss://md.demo.tradovateapi.com/v1/websocket
TRADOVATE_CLIENT_ID=your_client_id_here
TRADOVATE_CLIENT_SECRET=your_client_secret_here
TRADOVATE_USERNAME=your_tradovate_username
TRADOVATE_PASSWORD=your_tradovate_password
TRADOVATE_APP_ID=PropTraderAI
```

5. Click **Deploy** (Railway will restart with new variables)

---

## Step 5: Test Connection

### Local Test (Next.js API)

Create test endpoint:

```bash
# Create test file
New-Item -ItemType File -Path "src/app/api/test-tradovate/route.ts"
```

```typescript
// src/app/api/test-tradovate/route.ts
import { NextResponse } from 'next/server';
import { TradovateClient } from '@/lib/execution/tradovate';

export async function GET() {
  try {
    // Test authentication
    const credentials = await TradovateClient.authenticate(
      process.env.TRADOVATE_USERNAME!,
      process.env.TRADOVATE_PASSWORD!,
      process.env.TRADOVATE_APP_ID || 'PropTraderAI',
      process.env.TRADOVATE_CLIENT_ID!,
      process.env.TRADOVATE_CLIENT_SECRET!,
      true // isDemo = true
    );

    return NextResponse.json({
      success: true,
      message: 'Tradovate connection successful!',
      accountId: credentials.accountId,
      userId: credentials.userId,
    });
  } catch (error) {
    console.error('[Test Tradovate] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

### Run Test

```bash
# Start dev server if not running
npm run dev

# Open browser
Start-Process "http://localhost:3000/api/test-tradovate"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tradovate connection successful!",
  "accountId": 123456,
  "userId": 789012
}
```

---

## Step 6: Test Market Data WebSocket

Once authentication works, test live market data:

```typescript
// Add to test endpoint
import { MarketDataAggregator } from '@/lib/execution/marketData';

// After successful auth, create aggregator
const account: TradovateAccount = {
  id: credentials.accountId.toString(),
  userId: 'test_user',
  accountType: 'demo',
  credentials: credentials,
};

const client = new TradovateClient(account);
const aggregator = new MarketDataAggregator(client, console);

// Subscribe to ES (E-mini S&P 500)
await aggregator.subscribe(['ES'], ['1min', '5min']);

// Check if data is flowing
setTimeout(() => {
  console.log('Market data received:', aggregator.getLatestCandle('ES', '5min'));
}, 10000); // Wait 10 seconds
```

---

## Common Issues

### 401 Unauthorized
- **Cause:** Invalid credentials
- **Fix:** Double-check CLIENT_ID, CLIENT_SECRET, USERNAME, PASSWORD

### 403 Forbidden
- **Cause:** API access not enabled for account
- **Fix:** Email support@tradovate.com to enable API access

### WebSocket Connection Failed
- **Cause:** Invalid access token or expired session
- **Fix:** Check token refresh logic in TradovateClient.refreshAccessToken()

### "No market data received"
- **Cause:** Market closed or subscription failed
- **Fix:** 
  - Check trading hours (ES: 18:00-17:00 CT, closed Sat 5pm - Sun 6pm)
  - Verify contract symbol is correct (use 'ES' not 'ESH25')

---

## Security Notes

### DO NOT Commit

Never commit these to Git:
- ❌ TRADOVATE_CLIENT_SECRET
- ❌ TRADOVATE_PASSWORD
- ❌ Access tokens

Always use:
- ✅ Environment variables
- ✅ .env.local (gitignored)
- ✅ Railway secrets

### Production Checklist

Before going live with real accounts:
- [ ] Use production API URL (https://api.tradovateapi.com/v1)
- [ ] Enable 2FA on Tradovate account
- [ ] Rotate API credentials every 90 days
- [ ] Use separate credentials per environment (dev/staging/prod)
- [ ] Monitor API rate limits (100 requests/minute)

---

## Next Steps After Configuration

Once Tradovate is connected:

1. **Test Market Data Flow** (Step 6 above)
2. **Integrate with ExecutionEngine** (server/src/index.ts)
3. **Build Setup Detection Loop** (scan for strategy conditions)
4. **Add Push Notifications** (when setup detected)
5. **Create Copilot Mode UI** (user approval before execution)

---

## Support Resources

- **Tradovate API Docs:** https://api.tradovate.com/
- **Demo Trading Platform:** https://trader.tradovate.com
- **Support Email:** support@tradovate.com
- **Community:** https://community.tradovate.com/

---

## Current Status

**Tradovate Client Implementation:** ✅ Complete (1008 lines)  
**Features Implemented:**
- OAuth authentication with auto-refresh
- Circuit breaker protection
- WebSocket market data subscription
- Symbol resolution (contract rollover)
- Order placement and management
- Position tracking
- 7 instruments configured (ES, NQ, MES, MNQ, YM, RTY, CL)

**What's Missing:** Only API credentials configuration (Steps 1-4 above)

---

**Last Updated:** January 17, 2026  
**Next Milestone:** Complete Week 3 testing with live market data
