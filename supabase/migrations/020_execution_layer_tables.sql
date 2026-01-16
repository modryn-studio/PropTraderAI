-- Migration: 020_execution_layer_tables.sql
-- Purpose: Create tables for execution layer (Issue #10 consensus)
-- Date: January 16, 2026
-- Phase: Release 1 (Strategy Validator) - Week 1

-- ============================================================================
-- TABLE 1: tradovate_accounts
-- Purpose: Support multiple broker accounts per user (TopStep, FTMO, demo, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tradovate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Account identification
  account_name TEXT NOT NULL,
  tradovate_account_id BIGINT NOT NULL,
  tradovate_user_id BIGINT,
  
  -- OAuth tokens (encrypted at application level)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Account classification
  account_type TEXT NOT NULL CHECK (account_type IN ('live', 'demo', 'funded')),
  firm_name TEXT, -- 'topstep', 'ftmo', 'tradeify', etc.
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, tradovate_account_id)
);

-- Ensure only one primary account per user
CREATE UNIQUE INDEX idx_tradovate_accounts_primary 
  ON tradovate_accounts(user_id) 
  WHERE is_primary = true;

-- Index for quick lookups
CREATE INDEX idx_tradovate_accounts_user ON tradovate_accounts(user_id);
CREATE INDEX idx_tradovate_accounts_active ON tradovate_accounts(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE 2: orders
-- Purpose: Track order lifecycle (Working → Filled → Cancelled → Rejected)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  tradovate_account_id UUID NOT NULL REFERENCES tradovate_accounts(id) ON DELETE CASCADE,
  
  -- Idempotency key (prevents duplicate orders)
  setup_id TEXT UNIQUE,
  
  -- Tradovate order reference
  tradovate_order_id BIGINT UNIQUE,
  
  -- Order details
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('Buy', 'Sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('Market', 'Limit', 'Stop', 'StopLimit')),
  order_qty INT NOT NULL CHECK (order_qty > 0),
  price DECIMAL(12, 4), -- Limit price (null for Market orders)
  stop_price DECIMAL(12, 4), -- Stop price (for Stop/StopLimit orders)
  time_in_force TEXT DEFAULT 'Day' CHECK (time_in_force IN ('Day', 'GTC', 'IOC', 'FOK')),
  
  -- Fill tracking
  filled_qty INT DEFAULT 0,
  avg_fill_price DECIMAL(12, 4),
  
  -- Order lifecycle
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN (
    'Pending',      -- Created locally, not yet sent
    'Working',      -- Sent to exchange, waiting for fill
    'PartialFill',  -- Partially filled
    'Filled',       -- Completely filled
    'Cancelled',    -- Cancelled by user or system
    'Rejected',     -- Rejected by broker/exchange
    'Expired'       -- Time-in-force expired
  )),
  reject_reason TEXT,
  
  -- Bracket orders (stop loss / take profit)
  parent_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  bracket_type TEXT CHECK (bracket_type IN ('entry', 'stop_loss', 'take_profit')),
  
  -- Metadata
  source TEXT DEFAULT 'copilot' CHECK (source IN ('copilot', 'autopilot', 'manual', 'emergency')),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_strategy ON orders(strategy_id);
CREATE INDEX idx_orders_account ON orders(tradovate_account_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE status IN ('Pending', 'Working', 'PartialFill');
CREATE INDEX idx_orders_tradovate_id ON orders(tradovate_order_id);
CREATE INDEX idx_orders_setup_id ON orders(setup_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================================================
-- TABLE 3: fills
-- Purpose: Track individual fills (orders can have multiple fills)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tradovate fill reference
  tradovate_fill_id BIGINT UNIQUE,
  
  -- Fill details
  qty INT NOT NULL CHECK (qty > 0),
  price DECIMAL(12, 4) NOT NULL,
  commission DECIMAL(10, 4) DEFAULT 0,
  
  -- Timestamps
  fill_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_fills_order ON fills(order_id);
CREATE INDEX idx_fills_user ON fills(user_id);
CREATE INDEX idx_fills_timestamp ON fills(fill_timestamp DESC);

-- ============================================================================
-- TABLE 4: positions
-- Purpose: Track open positions and their P&L
-- ============================================================================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  tradovate_account_id UUID NOT NULL REFERENCES tradovate_accounts(id) ON DELETE CASCADE,
  
  -- Position details
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  net_qty INT NOT NULL, -- Positive for long, negative for short
  avg_entry_price DECIMAL(12, 4) NOT NULL,
  
  -- Risk management
  stop_price DECIMAL(12, 4),
  target_price DECIMAL(12, 4),
  stop_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  target_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- P&L tracking
  unrealized_pnl DECIMAL(12, 2) DEFAULT 0,
  realized_pnl DECIMAL(12, 2) DEFAULT 0,
  max_favorable_excursion DECIMAL(12, 2) DEFAULT 0, -- Best unrealized P&L
  max_adverse_excursion DECIMAL(12, 2) DEFAULT 0,   -- Worst unrealized P&L
  
  -- Position lifecycle
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed')),
  close_reason TEXT, -- 'stop_loss', 'take_profit', 'manual', 'emergency', 'eod'
  
  -- Entry order reference
  entry_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Timestamps
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_positions_user ON positions(user_id);
CREATE INDEX idx_positions_strategy ON positions(strategy_id);
CREATE INDEX idx_positions_account ON positions(tradovate_account_id);
CREATE INDEX idx_positions_open ON positions(user_id, status) WHERE status = 'open';
CREATE INDEX idx_positions_symbol ON positions(symbol, status);

-- ============================================================================
-- TABLE 5: symbol_cache
-- Purpose: Cache contract info to handle rollover
-- ============================================================================
CREATE TABLE IF NOT EXISTS symbol_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Symbol identification
  base_instrument TEXT NOT NULL, -- 'ES', 'NQ', 'MES', etc.
  tradovate_symbol TEXT NOT NULL, -- 'ESH6', 'NQUM5', etc.
  
  -- Contract details
  expiry_date DATE NOT NULL,
  first_notice_date DATE,
  is_front_month BOOLEAN DEFAULT false,
  
  -- Market data
  tick_size DECIMAL(10, 6) NOT NULL,
  point_value DECIMAL(10, 2) NOT NULL,
  daily_volume BIGINT,
  open_interest BIGINT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(base_instrument, tradovate_symbol)
);

-- Indexes
CREATE INDEX idx_symbol_cache_instrument ON symbol_cache(base_instrument);
CREATE INDEX idx_symbol_cache_front_month ON symbol_cache(base_instrument, is_front_month) WHERE is_front_month = true;
CREATE INDEX idx_symbol_cache_expiry ON symbol_cache(expiry_date);

-- ============================================================================
-- TABLE 6: safety_limits
-- Purpose: Store risk management limits per user/account/strategy
-- ============================================================================
CREATE TABLE IF NOT EXISTS safety_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope (one of these should be set)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tradovate_account_id UUID REFERENCES tradovate_accounts(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  
  -- Limit type
  limit_type TEXT NOT NULL CHECK (limit_type IN ('account', 'strategy')),
  
  -- Daily limits
  max_daily_loss DECIMAL(12, 2), -- e.g., $500
  max_daily_trades INT, -- e.g., 10 trades
  
  -- Position limits
  max_position_size INT, -- e.g., 5 contracts
  max_concurrent_positions INT, -- e.g., 3 positions
  
  -- Risk limits
  max_risk_percent DECIMAL(5, 2), -- e.g., 3.00 for 3%
  max_risk_per_trade DECIMAL(12, 2), -- e.g., $500
  
  -- Drawdown limits
  max_drawdown_percent DECIMAL(5, 2), -- e.g., 5.00 for 5%
  max_drawdown_amount DECIMAL(12, 2), -- e.g., $2500
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure proper scope
  CONSTRAINT safety_limits_scope_check CHECK (
    (user_id IS NOT NULL AND tradovate_account_id IS NULL AND strategy_id IS NULL) OR
    (user_id IS NULL AND tradovate_account_id IS NOT NULL AND strategy_id IS NULL) OR
    (user_id IS NULL AND tradovate_account_id IS NULL AND strategy_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_safety_limits_user ON safety_limits(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_safety_limits_account ON safety_limits(tradovate_account_id) WHERE tradovate_account_id IS NOT NULL;
CREATE INDEX idx_safety_limits_strategy ON safety_limits(strategy_id) WHERE strategy_id IS NOT NULL;

-- ============================================================================
-- TABLE 7: execution_metrics
-- Purpose: Track execution performance for observability
-- ============================================================================
CREATE TABLE IF NOT EXISTS execution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'setup_detected',
    'order_placed',
    'order_filled',
    'order_rejected',
    'connection_lost',
    'connection_restored',
    'circuit_breaker_opened',
    'circuit_breaker_closed',
    'safety_limit_hit',
    'emergency_stop'
  )),
  
  -- Metrics
  latency_ms INT, -- Time from detection to action
  slippage_ticks DECIMAL(10, 4), -- Expected vs actual fill
  
  -- Details
  details JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX idx_execution_metrics_user ON execution_metrics(user_id);
CREATE INDEX idx_execution_metrics_type ON execution_metrics(event_type);
CREATE INDEX idx_execution_metrics_created ON execution_metrics(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tradovate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_metrics ENABLE ROW LEVEL SECURITY;

-- symbol_cache is shared, no RLS needed (read-only for users)

-- Tradovate accounts policies
CREATE POLICY "Users can view own tradovate accounts"
  ON tradovate_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tradovate accounts"
  ON tradovate_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tradovate accounts"
  ON tradovate_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tradovate accounts"
  ON tradovate_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id);

-- Fills policies
CREATE POLICY "Users can view own fills"
  ON fills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fills"
  ON fills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Positions policies
CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
  ON positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  USING (auth.uid() = user_id);

-- Safety limits policies
CREATE POLICY "Users can view own safety limits"
  ON safety_limits FOR SELECT
  USING (auth.uid() = user_id OR 
         tradovate_account_id IN (SELECT id FROM tradovate_accounts WHERE user_id = auth.uid()) OR
         strategy_id IN (SELECT id FROM strategies WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own safety limits"
  ON safety_limits FOR ALL
  USING (auth.uid() = user_id OR 
         tradovate_account_id IN (SELECT id FROM tradovate_accounts WHERE user_id = auth.uid()) OR
         strategy_id IN (SELECT id FROM strategies WHERE user_id = auth.uid()));

-- Execution metrics policies
CREATE POLICY "Users can view own execution metrics"
  ON execution_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own execution metrics"
  ON execution_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tradovate_accounts_updated_at
  BEFORE UPDATE ON tradovate_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_limits_updated_at
  BEFORE UPDATE ON safety_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LINK STRATEGIES TO ACCOUNTS
-- ============================================================================

-- Add tradovate_account_id to strategies table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'strategies' AND column_name = 'tradovate_account_id'
  ) THEN
    ALTER TABLE strategies 
      ADD COLUMN tradovate_account_id UUID REFERENCES tradovate_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tradovate_accounts IS 'Broker accounts linked via OAuth (supports multiple accounts per user)';
COMMENT ON TABLE orders IS 'Order lifecycle tracking with idempotency via setup_id';
COMMENT ON TABLE fills IS 'Individual fills for orders (supports partial fills)';
COMMENT ON TABLE positions IS 'Open and closed positions with P&L tracking';
COMMENT ON TABLE symbol_cache IS 'Contract info cache for rollover detection';
COMMENT ON TABLE safety_limits IS 'Risk management limits at user/account/strategy level';
COMMENT ON TABLE execution_metrics IS 'Observability metrics for execution performance';

COMMENT ON COLUMN orders.setup_id IS 'Idempotency key: strategyId-timestamp, prevents duplicate orders';
COMMENT ON COLUMN positions.max_favorable_excursion IS 'Best unrealized P&L during position lifetime';
COMMENT ON COLUMN positions.max_adverse_excursion IS 'Worst unrealized P&L during position lifetime';
