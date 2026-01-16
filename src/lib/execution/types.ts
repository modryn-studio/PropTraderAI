/**
 * Execution Layer Type Definitions
 * 
 * Core types for the execution engine per Issue #10 consensus.
 * These types power all 6 components of the execution layer.
 * 
 * @module lib/execution/types
 * @see Issue #10 - Execution Layer Specification
 */

// ============================================================================
// TRADOVATE ACCOUNT TYPES
// ============================================================================

export type AccountType = 'live' | 'demo' | 'funded';

export interface TradovateAccount {
  id: string;
  userId: string;
  accountName: string;
  tradovateAccountId: number;
  tradovateUserId?: number;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  accountType: AccountType;
  firmName?: string; // 'topstep', 'ftmo', 'tradeify', etc.
  isActive: boolean;
  isPrimary: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradovateCredentials {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  userId: number;
  accountId: number;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export type OrderAction = 'Buy' | 'Sell';
export type OrderType = 'Market' | 'Limit' | 'Stop' | 'StopLimit';
export type TimeInForce = 'Day' | 'GTC' | 'IOC' | 'FOK';
export type OrderStatus = 
  | 'Pending'      // Created locally, not yet sent
  | 'Working'      // Sent to exchange, waiting for fill
  | 'PartialFill'  // Partially filled
  | 'Filled'       // Completely filled
  | 'Cancelled'    // Cancelled by user or system
  | 'Rejected'     // Rejected by broker/exchange
  | 'Expired';     // Time-in-force expired

export type BracketType = 'entry' | 'stop_loss' | 'take_profit';
export type OrderSource = 'copilot' | 'autopilot' | 'manual' | 'emergency';

export interface Order {
  id: string;
  userId: string;
  strategyId?: string;
  tradovateAccountId: string;
  
  // Idempotency
  setupId?: string;
  tradovateOrderId?: number;
  
  // Order details
  symbol: string;
  action: OrderAction;
  orderType: OrderType;
  orderQty: number;
  price?: number;
  stopPrice?: number;
  timeInForce: TimeInForce;
  
  // Fill tracking
  filledQty: number;
  avgFillPrice?: number;
  
  // Lifecycle
  status: OrderStatus;
  rejectReason?: string;
  
  // Bracket orders
  parentOrderId?: string;
  bracketType?: BracketType;
  
  // Metadata
  source: OrderSource;
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  submittedAt?: Date;
  filledAt?: Date;
  updatedAt: Date;
}

export interface OrderCreateInput {
  strategyId?: string;
  tradovateAccountId: string;
  setupId?: string;
  symbol: string;
  action: OrderAction;
  orderType: OrderType;
  orderQty: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  parentOrderId?: string;
  bracketType?: BracketType;
  source?: OrderSource;
  notes?: string;
}

// Tradovate API order format
export interface TradovateOrderRequest {
  accountId: number;
  accountSpec: string;
  action: 'Buy' | 'Sell';
  symbol: string;
  orderQty: number;
  orderType: 'Limit' | 'Market' | 'Stop' | 'StopLimit';
  price?: number;
  stopPrice?: number;
  timeInForce?: 'Day' | 'GTC' | 'IOC' | 'FOK';
  isAutomated?: boolean;
  customTag50?: string; // For tracking setup_id
}

export interface TradovateOrderResponse {
  orderId: number;
  accountId: number;
  action: string;
  symbol: string;
  orderQty: number;
  orderType: string;
  status: OrderStatus;
  fillPrice?: number;
  fillQty?: number;
  rejectReason?: string;
  timestamp: string;
}

// Simplified order request for internal use
export interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  price?: number;
  stopPrice?: number;
  strategy_id?: string;
  setup_id?: string;
}

// ============================================================================
// FILL TYPES
// ============================================================================

export interface Fill {
  id: string;
  orderId: string;
  userId: string;
  tradovateFillId?: number;
  qty: number;
  price: number;
  commission: number;
  fillTimestamp: Date;
  createdAt: Date;
}

// ============================================================================
// POSITION TYPES
// ============================================================================

export type PositionDirection = 'long' | 'short';
export type PositionStatus = 'open' | 'closing' | 'closed';
export type CloseReason = 'stop_loss' | 'take_profit' | 'manual' | 'emergency' | 'eod';

export interface Position {
  id: string;
  userId: string;
  strategyId?: string;
  tradovateAccountId: string;
  
  // Position details
  symbol: string;
  direction: PositionDirection;
  netQty: number;
  avgEntryPrice: number;
  
  // Risk management
  stopPrice?: number;
  targetPrice?: number;
  stopOrderId?: string;
  targetOrderId?: string;
  
  // P&L
  unrealizedPnl: number;
  realizedPnl: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  
  // Lifecycle
  status: PositionStatus;
  closeReason?: CloseReason;
  entryOrderId?: string;
  
  // Timestamps
  openedAt: Date;
  closedAt?: Date;
  updatedAt: Date;
}

// ============================================================================
// MARKET DATA TYPES
// ============================================================================

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: Date;
}

export interface OpeningRange {
  high: number;
  low: number;
  startTime: Date;
  endTime: Date;
  isComplete: boolean;
}

export interface Tick {
  symbol: string;
  price: number;
  size: number;
  timestamp: Date;
  aggressor: 'buy' | 'sell' | 'unknown';
}

// ============================================================================
// SYMBOL / CONTRACT TYPES
// ============================================================================

export interface InstrumentSpec {
  symbol: string;
  name: string;
  exchange: string;
  tickSize: number;
  pointValue: number;
  marginRequirement: number;
  tradingHours: {
    start: string; // "18:00" (CT)
    end: string;   // "17:00" (CT)
    timezone: string;
  };
}

export interface ContractInfo {
  baseInstrument: string; // 'ES', 'NQ'
  tradovateSymbol: string; // 'ESH6', 'NQUM5'
  expiryDate: Date;
  firstNoticeDate?: Date;
  isFrontMonth: boolean;
  tickSize: number;
  pointValue: number;
  dailyVolume?: number;
  openInterest?: number;
  isActive: boolean;
  lastUpdated: Date;
}

// ============================================================================
// SAFETY LIMITS TYPES
// ============================================================================

export type LimitType = 'account' | 'strategy';

export interface SafetyLimits {
  id: string;
  userId?: string;
  tradovateAccountId?: string;
  strategyId?: string;
  limitType: LimitType;
  
  // Daily limits
  maxDailyLoss?: number;
  maxDailyTrades?: number;
  
  // Position limits
  maxPositionSize?: number;
  maxConcurrentPositions?: number;
  
  // Risk limits
  maxRiskPercent?: number;
  maxRiskPerTrade?: number;
  
  // Drawdown limits
  maxDrawdownPercent?: number;
  maxDrawdownAmount?: number;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyCheck {
  passed: boolean;
  violations: SafetyViolation[];
}

export interface SafetyViolation {
  type: 'daily_loss' | 'daily_trades' | 'position_size' | 'concurrent_positions' | 'risk_percent' | 'drawdown';
  message: string;
  currentValue: number;
  limit: number;
  severity: 'warning' | 'blocked';
}

// ============================================================================
// SETUP DETECTION TYPES
// ============================================================================

export type SetupStatus = 
  | 'pending'           // Detected, waiting in queue
  | 'awaiting_approval' // Copilot mode: waiting for user
  | 'approved'          // User approved in Copilot mode
  | 'rejected'          // User rejected or expired
  | 'alerted'           // Alert sent (alert-only mode)
  | 'executed'          // Order placed
  | 'failed';           // Execution failed

export interface SetupDetection {
  id: string; // Unique setup ID for idempotency
  strategy_id: string;
  instrument: string;
  
  // Signal info
  signal_type: 'entry' | 'exit';
  direction: 'long' | 'short';
  price: number;
  timestamp: Date;
  conditions_met: string[];
  indicators?: Record<string, number | null>;
  exit_reason?: string;
  
  // Status tracking
  status: SetupStatus;
  order_id?: string;
  error?: string;
  
  // Optional detailed trade params (when fully calculated)
  entryPrice?: number;
  stopPrice?: number;
  targetPrice?: number;
  contractQuantity?: number;
  riskAmount?: number;
  riskPercent?: number;
  rewardRisk?: number;
  confidence?: number;
  reason?: string;
  expiresAt?: Date;
}

export interface SetupQueue {
  pendingSetups: SetupDetection[];
  currentSetup: SetupDetection | null;
  isProcessing: boolean;
}

// ============================================================================
// EXECUTABLE STRATEGY TYPES
// ============================================================================

/**
 * Simplified strategy configuration stored in database
 * Used by execution engine to monitor and execute trades
 */
export interface ExecutableStrategyConfig {
  id: string;
  name: string;
  instrument: string;
  parsedRules: ParsedRules;
  autonomyLevel: 'copilot' | 'autopilot';
  executionMode: ExecutionMode;
  maxDailyLoss?: number;
  maxDrawdown?: number;
  positionSize?: number;
  isActive: boolean;
}

export interface ParsedRules {
  entry_conditions?: EntryCondition[];
  exit_conditions?: ExitCondition[];
  filters?: StrategyFilter[];
  position_sizing?: PositionSizing;
}

export interface EntryCondition {
  type?: string;
  indicator?: string;
  period?: number;
  value?: number;
  comparator?: string;
  direction?: 'long' | 'short';
}

export interface ExitCondition {
  type?: string;
  indicator?: string;
  period?: number;
  value?: number;
  comparator?: string;
}

export interface StrategyFilter {
  type: string;
  start?: string;
  end?: string;
  value?: number;
}

export interface PositionSizing {
  method: 'fixed' | 'risk_percent' | 'kelly';
  value: number;
  maxContracts?: number;
}

/**
 * Compiled executable strategy with detection functions
 * Used for real-time pattern detection
 */
export interface ExecutableStrategy {
  // Pattern detection
  shouldEnter: (marketData: OHLCV[], quote: Quote) => boolean;
  getEntryPrice: (marketData: OHLCV[], quote: Quote) => number;
  
  // Risk management
  getStopPrice: (entryPrice: number, marketData: OHLCV[]) => number;
  getTargetPrice: (entryPrice: number, stopPrice: number) => number;
  
  // Position sizing
  getContractQuantity: (accountBalance: number, riskPerTrade: number, stopDistance: number) => number;
  
  // Filters
  isTimeValid: (timestamp: Date) => boolean;
  isSessionValid: (timestamp: Date) => boolean;
  
  // Metadata
  instrument: string;
  pattern: string;
  direction: 'long' | 'short' | 'both';
}

export interface CompiledStrategy {
  strategyId: string;
  userId: string;
  executable: ExecutableStrategy;
  isActive: boolean;
  lastCompiled: Date;
}

// ============================================================================
// EXECUTION METRICS TYPES
// ============================================================================

export type MetricEventType =
  | 'setup_detected'
  | 'order_placed'
  | 'order_filled'
  | 'order_rejected'
  | 'connection_lost'
  | 'connection_restored'
  | 'circuit_breaker_opened'
  | 'circuit_breaker_closed'
  | 'safety_limit_hit'
  | 'emergency_stop';

export interface ExecutionMetric {
  id: string;
  userId?: string;
  strategyId?: string;
  orderId?: string;
  eventType: MetricEventType;
  latencyMs?: number;
  slippageTicks?: number;
  details?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// CIRCUIT BREAKER TYPES
// ============================================================================

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Open after N failures
  timeout: number; // ms before trying again
  successThreshold: number; // Successes needed to close
}

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextRetry?: Date;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number; // Initial delay in ms
  maxReconnectDelay: number;
  pingInterval: number;
}

export interface WebSocketStatus {
  state: WebSocketState;
  reconnectAttempts: number;
  lastConnected?: Date;
  lastDisconnected?: Date;
  latency?: number;
}

// ============================================================================
// EXECUTION MODE TYPES
// ============================================================================

export type ExecutionMode = 'paper' | 'demo' | 'live_micro' | 'live';

export interface ExecutionModeRequirements {
  mode: ExecutionMode;
  requiredPaperTrades: number;
  requiredDemoTrades: number;
  requiredMicroTrades: number;
}

export const EXECUTION_MODE_REQUIREMENTS: Record<ExecutionMode, ExecutionModeRequirements> = {
  paper: {
    mode: 'paper',
    requiredPaperTrades: 0,
    requiredDemoTrades: 0,
    requiredMicroTrades: 0,
  },
  demo: {
    mode: 'demo',
    requiredPaperTrades: 20,
    requiredDemoTrades: 0,
    requiredMicroTrades: 0,
  },
  live_micro: {
    mode: 'live_micro',
    requiredPaperTrades: 20,
    requiredDemoTrades: 10,
    requiredMicroTrades: 0,
  },
  live: {
    mode: 'live',
    requiredPaperTrades: 20,
    requiredDemoTrades: 10,
    requiredMicroTrades: 5,
  },
};

// ============================================================================
// ERROR TYPES
// ============================================================================

export type ErrorRecoveryAction = 'retry' | 'skip' | 'alert' | 'emergency_stop';

export interface ExecutionError {
  code: string;
  message: string;
  recoveryAction: ErrorRecoveryAction;
  retryable: boolean;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export class TradovateAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'TradovateAPIError';
  }
}

export class OrderExecutionError extends Error {
  constructor(
    message: string,
    public orderId?: string,
    public recoveryAction: ErrorRecoveryAction = 'alert',
  ) {
    super(message);
    this.name = 'OrderExecutionError';
  }
}

export class SafetyLimitError extends Error {
  constructor(
    message: string,
    public violation: SafetyViolation,
  ) {
    super(message);
    this.name = 'SafetyLimitError';
  }
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string = 'Circuit breaker is OPEN - API is unavailable',
    public nextRetry?: Date,
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}
