-- PropTraderAI Database Schema
-- Based on PropTraderAI_Build_Specification.md
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CHALLENGES
-- ============================================
CREATE TYPE challenge_status AS ENUM ('active', 'passed', 'failed', 'paused');

CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  firm_name TEXT NOT NULL,
  account_size DECIMAL NOT NULL,
  daily_loss_limit DECIMAL NOT NULL,
  max_drawdown DECIMAL NOT NULL,
  profit_target DECIMAL,
  trading_days_required INTEGER,
  current_balance DECIMAL NOT NULL,
  current_pnl DECIMAL DEFAULT 0,
  daily_pnl DECIMAL DEFAULT 0,
  status challenge_status DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own challenges" ON public.challenges
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- STRATEGIES
-- ============================================
CREATE TYPE strategy_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE autonomy_level AS ENUM ('copilot', 'autopilot');

CREATE TABLE public.strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  natural_language TEXT NOT NULL,
  parsed_rules JSONB DEFAULT '{}',
  backtest_results JSONB DEFAULT '{}',
  status strategy_status DEFAULT 'draft',
  autonomy_level autonomy_level DEFAULT 'copilot',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for strategies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own strategies" ON public.strategies
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRADES
-- ============================================
CREATE TYPE trade_side AS ENUM ('long', 'short');
CREATE TYPE trade_status AS ENUM ('pending', 'open', 'closed', 'cancelled');

CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  side trade_side NOT NULL,
  entry_price DECIMAL,
  exit_price DECIMAL,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  quantity INTEGER NOT NULL,
  pnl DECIMAL,
  fees DECIMAL DEFAULT 0,
  status trade_status DEFAULT 'pending',
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  tradovate_order_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trades" ON public.trades
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- BEHAVIORAL DATA (THE MOAT)
-- ============================================
CREATE TABLE public.behavioral_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  challenge_status JSONB DEFAULT '{}',
  session_context JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for behavioral_data
ALTER TABLE public.behavioral_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own behavioral data" ON public.behavioral_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own behavioral data" ON public.behavioral_data
  FOR SELECT USING (auth.uid() = user_id);

-- Index for fast queries on behavioral data
CREATE INDEX idx_behavioral_user_time ON public.behavioral_data(user_id, timestamp DESC);
CREATE INDEX idx_behavioral_event_type ON public.behavioral_data(event_type);

-- ============================================
-- TRADING RULES (Personal rules per user)
-- ============================================
CREATE TABLE public.trading_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for trading_rules
ALTER TABLE public.trading_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trading rules" ON public.trading_rules
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CHAT MESSAGES
-- ============================================
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_id UUID NOT NULL,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own chat messages" ON public.chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast session queries
CREATE INDEX idx_chat_session ON public.chat_messages(session_id, created_at);

-- ============================================
-- SCREENSHOT ANALYSES
-- ============================================
CREATE TABLE public.screenshot_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  analysis JSONB NOT NULL,
  support_levels JSONB DEFAULT '[]',
  resistance_levels JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  confidence DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for screenshot_analyses
ALTER TABLE public.screenshot_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own analyses" ON public.screenshot_analyses
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- BROKER CONNECTIONS (Tradovate)
-- ============================================
CREATE TABLE public.broker_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  broker TEXT NOT NULL DEFAULT 'tradovate',
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  account_id TEXT,
  account_name TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, broker)
);

-- RLS for broker_connections
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own broker connections" ON public.broker_connections
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- PROP FIRMS DATABASE
-- ============================================
CREATE TABLE public.prop_firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  account_sizes JSONB NOT NULL,
  daily_loss_limit_percent DECIMAL NOT NULL,
  max_drawdown_percent DECIMAL NOT NULL,
  profit_target_percent DECIMAL,
  profit_split DECIMAL,
  trading_days_required INTEGER,
  allowed_instruments JSONB DEFAULT '[]',
  trading_hours JSONB DEFAULT '{}',
  rules JSONB DEFAULT '{}',
  website_url TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Tradeify as first prop firm
INSERT INTO public.prop_firms (
  name, 
  slug, 
  account_sizes, 
  daily_loss_limit_percent, 
  max_drawdown_percent,
  profit_target_percent,
  profit_split,
  trading_days_required,
  allowed_instruments,
  rules
) VALUES (
  'Tradeify',
  'tradeify',
  '[50000, 100000, 150000, 250000]',
  2.0,
  4.0,
  6.0,
  80.0,
  5,
  '["ES", "NQ", "MES", "MNQ", "YM", "RTY", "CL", "GC"]',
  '{"max_contracts": {"50000": 5, "100000": 10, "150000": 15, "250000": 25}, "trailing_drawdown": true}'
);

-- Public read access for prop firms
ALTER TABLE public.prop_firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prop firms" ON public.prop_firms
  FOR SELECT USING (true);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trading_rules_updated_at BEFORE UPDATE ON public.trading_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_broker_connections_updated_at BEFORE UPDATE ON public.broker_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_prop_firms_updated_at BEFORE UPDATE ON public.prop_firms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
