/**
 * Execution Layer Module Exports
 * 
 * This module provides the complete execution layer for PropTraderAI:
 * - TradovateClient: OAuth, token refresh, order placement
 * - MarketDataAggregator: WebSocket, candles, indicators
 * - OrderManager/PositionManager: Order lifecycle, safety limits
 * - ExecutionEngine: Setup detection, monitoring, orchestration
 * - CircuitBreaker: Fault tolerance for API failures
 * 
 * @module lib/execution
 * @see Issue #10 - Execution Layer Specification
 */

// Types
export * from './types';

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
} from './marketData';

// Execution Engine
export {
  ExecutionEngine,
  createExecutionEngine,
  type EngineState,
  type EngineStatus,
  type EngineConfig,
} from './engine';
