# PropTraderAI Execution Server

Standalone server that runs strategies 24/7 on Railway.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env` file:

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional
PORT=3001
EXECUTION_SERVER_TOKEN=your-secure-token
NODE_ENV=production
```

## Railway Deployment

1. Create new Railway project
2. Connect this `server` directory
3. Set environment variables in Railway dashboard
4. Deploy

Railway will automatically:
- Run `npm run build`
- Start with `npm start`
- Restart on crashes
- Provide health monitoring

## API Endpoints

### Health Check
```
GET /health
```
Returns server status, active engines count, uptime.

### Add Strategy
```
POST /engine/strategies
Headers: X-Internal-Token: <token>
Body: { userId: string, strategy: StrategyPayload }
```

### Remove Strategy
```
DELETE /engine/strategies/:strategyId
Headers: X-Internal-Token: <token>
```

## Architecture

```
Next.js App (Vercel)
    │
    ├── /api/strategy/activate (POST)
    │       │
    │       └──→ Execution Server (Railway)
    │               │
    │               ├── ExecutionEngine per user
    │               ├── WebSocket to Tradovate
    │               └── Setup detection loop
    │
    └── /api/strategy/activate (DELETE)
            │
            └──→ Execution Server
                    └── Remove from engine
```

## Notes

- This is a placeholder implementation
- Production version will import ExecutionEngine from shared lib
- Uses mock engine for API testing
