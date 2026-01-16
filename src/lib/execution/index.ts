/**
 * Execution Layer Module Exports
 * 
 * This module provides the complete execution layer for PropTraderAI:
 * - TradovateClient: OAuth, token refresh, order placement
 * - MarketDataAggregator: WebSocket, candles, indicators
 * - OrderManager/PositionManager: Order lifecycle, safety limits
 * - ExecutionEngine: Setup detection, monitoring, orchestration
 * - CircuitBreaker: Fault tolerance for API failures
 * - DatabasePool: Singleton connection management (Agent 1 fix)
 * 
 * @module lib/execution
 * @see Issue #10 - Execution Layer Specification
 */

// Types
export * from './types';

// Database Pool (Agent 1 code review fix: Issue #1)
export {
  getDatabasePool,
  getDatabase,
  getDatabaseSync,
} from './database';

// Circuit Breaker
export {
  CircuitBreaker,
  circuitBreakerRegistry,
  tradovateOrdersCircuitBreaker,
  tradovateMarketDataCircuitBreaker,
  tradovateAuthCircuitBreaker,
} from './circuitBreaker';

// Tradovate Client
export {
  TradovateClient,
  INSTRUMENT_SPECS,
  generateSetupId,
  calculatePositionSize,
  calculateStopPrice,
  calculateTargetPrice,
} from './tradovate';

// Order & Position Management
export {
  OrderManager,
  PositionManager,
} from './orderManager';

// Market Data
export {
  MarketDataAggregator,
  getMarketDataAggregator,
  type HistoricalBarsFetcher,
} from './marketData';

// Execution Engine
export {
  ExecutionEngine,
  createExecutionEngine,
  type EngineState,
  type EngineStatus,
  type EngineConfig,
} from './engine';

// Rule Interpreter (P0 BLOCKING component per Issue #10)
export {
  compileStrategy,
  validateRulesForCompilation,
  compileORBPattern,
  compileEMAPullbackPattern,
  compileBreakoutPattern,
  type CompiledStrategy,
  type EvaluationContext,
  type IndicatorValues,
  type EntrySignal,
} from './ruleInterpreter';
