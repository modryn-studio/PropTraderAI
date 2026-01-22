/**
 * PropTraderAI Execution Server
 * 
 * Standalone server that runs on Railway to monitor strategies 24/7.
 * Maintains persistent WebSocket connections to Tradovate for market data.
 * 
 * Architecture:
 * - One ExecutionEngine instance per user
 * - Engines loaded on startup from database (active strategies)
 * - New strategies added via HTTP API from Next.js app
 * 
 * @see Issue #10 - Activation API Implementation Plan
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

// ============================================================================
// TYPES
// ============================================================================

interface StrategyPayload {
  id: string;
  name: string;
  user_id: string;
  canonical_rules: Record<string, unknown>;
  format_version: string;
}

interface AddStrategyRequest {
  userId: string;
  strategy: StrategyPayload;
}

interface EngineState {
  state: string;
  activeStrategies: number;
  startedAt: Date;
}

// Simplified engine placeholder - in production, import from shared lib
interface MockExecutionEngine {
  userId: string;
  strategies: Map<string, StrategyPayload>;
  state: 'stopped' | 'running';
  startedAt: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT || '3001', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'dev-token';
const SERVER_ID = process.env.RAILWAY_SERVICE_ID || `local-${Date.now()}`;

// Supabase client
const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ============================================================================
// ENGINE MANAGEMENT
// ============================================================================

// Map of userId -> ExecutionEngine
const engines: Map<string, MockExecutionEngine> = new Map();

/**
 * Get or create an execution engine for a user
 */
function getOrCreateEngine(userId: string): MockExecutionEngine {
  let engine = engines.get(userId);
  
  if (!engine) {
    console.log(`[Engine] Creating new engine for user: ${userId}`);
    engine = {
      userId,
      strategies: new Map(),
      state: 'running',
      startedAt: new Date(),
    };
    engines.set(userId, engine);
  }
  
  return engine;
}

/**
 * Add a strategy to a user's engine
 */
function addStrategyToEngine(userId: string, strategy: StrategyPayload): EngineState {
  const engine = getOrCreateEngine(userId);
  
  engine.strategies.set(strategy.id, strategy);
  
  console.log(`[Engine] Added strategy ${strategy.id} to user ${userId}`);
  console.log(`[Engine] Pattern: ${(strategy.canonical_rules as Record<string, unknown>).pattern}`);
  console.log(`[Engine] Active strategies for user: ${engine.strategies.size}`);
  
  return {
    state: engine.state,
    activeStrategies: engine.strategies.size,
    startedAt: engine.startedAt,
  };
}

/**
 * Remove a strategy from a user's engine
 */
function removeStrategyFromEngine(userId: string, strategyId: string): boolean {
  const engine = engines.get(userId);
  
  if (!engine) {
    return false;
  }
  
  const deleted = engine.strategies.delete(strategyId);
  
  if (deleted) {
    console.log(`[Engine] Removed strategy ${strategyId} from user ${userId}`);
    
    // Clean up engine if no strategies left
    if (engine.strategies.size === 0) {
      console.log(`[Engine] No strategies left for user ${userId}, cleaning up`);
      engines.delete(userId);
    }
  }
  
  return deleted;
}

/**
 * Load all active strategies from database on startup
 */
async function loadActiveStrategies(): Promise<void> {
  console.log('[Startup] Loading active strategies from database...');
  
  try {
    const { data: strategies, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('[Startup] Failed to load strategies:', error);
      return;
    }
    
    if (!strategies || strategies.length === 0) {
      console.log('[Startup] No active strategies found');
      return;
    }
    
    console.log(`[Startup] Found ${strategies.length} active strategies`);
    
    for (const strategy of strategies) {
      if (strategy.canonical_rules) {
        addStrategyToEngine(strategy.user_id, {
          id: strategy.id,
          name: strategy.name,
          user_id: strategy.user_id,
          canonical_rules: strategy.canonical_rules,
          format_version: strategy.format_version,
        });
        
        // Update execution_server_id in database
        await supabase
          .from('strategies')
          .update({ execution_server_id: SERVER_ID })
          .eq('id', strategy.id);
      }
    }
    
    console.log(`[Startup] Loaded ${engines.size} user engines`);
    
  } catch (err) {
    console.error('[Startup] Error loading strategies:', err);
  }
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health check endpoint
 * Used by Railway for health monitoring
 */
app.get('/health', (_req: Request, res: Response) => {
  const totalStrategies = Array.from(engines.values())
    .reduce((sum, engine) => sum + engine.strategies.size, 0);
  
  res.json({
    status: 'running',
    serverId: SERVER_ID,
    activeEngines: engines.size,
    totalStrategies,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get server status with detailed info
 */
app.get('/status', (_req: Request, res: Response) => {
  const engineDetails = Array.from(engines.entries()).map(([userId, engine]) => ({
    userId: userId.substring(0, 8) + '...', // Truncate for privacy
    strategyCount: engine.strategies.size,
    state: engine.state,
    startedAt: engine.startedAt,
  }));
  
  res.json({
    serverId: SERVER_ID,
    engines: engineDetails,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

/**
 * Auth middleware for protected routes
 */
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'];
  
  if (token !== INTERNAL_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  next();
}

/**
 * Add strategy to engine
 * Called by Next.js activation API
 */
app.post('/engine/strategies', authMiddleware, (req: Request, res: Response) => {
  try {
    const { userId, strategy } = req.body as AddStrategyRequest;
    
    if (!userId || !strategy) {
      res.status(400).json({ error: 'userId and strategy are required' });
      return;
    }
    
    if (!strategy.canonical_rules) {
      res.status(400).json({ error: 'Strategy must have canonical_rules' });
      return;
    }
    
    const engineStatus = addStrategyToEngine(userId, strategy);
    
    res.json({
      success: true,
      serverId: SERVER_ID,
      engineStatus,
    });
    
  } catch (error) {
    console.error('[POST /engine/strategies] Error:', error);
    res.status(500).json({ error: 'Failed to add strategy' });
  }
});

/**
 * Remove strategy from engine
 * Called by Next.js deactivation API
 */
app.delete('/engine/strategies/:strategyId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { strategyId } = req.params;
    
    // Find which engine has this strategy
    let found = false;
    for (const [userId, engine] of engines.entries()) {
      if (engine.strategies.has(strategyId)) {
        removeStrategyFromEngine(userId, strategyId);
        found = true;
        break;
      }
    }
    
    if (!found) {
      res.status(404).json({ error: 'Strategy not found in any engine' });
      return;
    }
    
    res.json({ success: true, strategyId });
    
  } catch (error) {
    console.error('[DELETE /engine/strategies] Error:', error);
    res.status(500).json({ error: 'Failed to remove strategy' });
  }
});

/**
 * Get all strategies for a user
 */
app.get('/engine/users/:userId/strategies', authMiddleware, (req: Request, res: Response) => {
  const { userId } = req.params;
  const engine = engines.get(userId);
  
  if (!engine) {
    res.json({ strategies: [] });
    return;
  }
  
  const strategies = Array.from(engine.strategies.values()).map(s => ({
    id: s.id,
    name: s.name,
    pattern: (s.canonical_rules as Record<string, unknown>).pattern,
  }));
  
  res.json({ strategies });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer(): Promise<void> {
  console.log('='.repeat(60));
  console.log('PropTraderAI Execution Server');
  console.log('='.repeat(60));
  console.log(`Server ID: ${SERVER_ID}`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));
  
  // Load active strategies from database
  await loadActiveStrategies();
  
  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    console.log('='.repeat(60));
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  
  // Mark all strategies as needing re-activation on next server start
  // This is handled by the is_active flag remaining true
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  process.exit(0);
});

// Start the server
startServer().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
