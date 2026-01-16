/**
 * Execution Engine Foundation
 * 
 * Core engine that monitors market data, detects setups,
 * and orchestrates order execution with safety limits.
 * 
 * Implements hybrid monitoring (5-second polling + candle close checks)
 * and setup queue with backpressure handling per Issue #10.
 * 
 * @module lib/execution/engine
 * @see Issue #10 - Component 1: Execution Engine
 */

import { createClient } from '@supabase/supabase-js';
import {
  ExecutableStrategyConfig,
  SetupDetection,
  OHLCV,
  ExecutionMode,
  WebSocketState,
  Quote,
  ParsedRules,
  OpeningRange,
} from './types';
import { MarketDataAggregator, getMarketDataAggregator } from './marketData';
import { generateSetupId } from './tradovate';
import { 
  compileStrategy, 
  validateRulesForCompilation,
  type CompiledStrategy,
  type EvaluationContext,
  type IndicatorValues,
} from './ruleInterpreter';

// ============================================================================
// CONSTANTS
// ============================================================================

const MONITORING_INTERVAL = 5000; // 5 seconds
const SETUP_QUEUE_MAX_SIZE = 10;  // Maximum pending setups before rejection

// ============================================================================
// TYPES
// ============================================================================

export type EngineState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface EngineStatus {
  state: EngineState;
  activeStrategies: number;
  pendingSetups: number;
  wsStatus: WebSocketState;
  lastCheck: Date | null;
  errorMessage?: string;
}

export interface EngineConfig {
  userId: string;
  tradovateAccountId: string;
  executionMode: ExecutionMode;
  enableAlerts: boolean;
  enableExecution: boolean;
}

interface SetupQueueItem {
  setup: SetupDetection;
  strategy: ExecutableStrategyConfig;
  addedAt: Date;
}

// ============================================================================
// EXECUTION ENGINE CLASS
// ============================================================================

export class ExecutionEngine {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  private config: EngineConfig;
  private state: EngineState = 'stopped';
  private strategies: Map<string, ExecutableStrategyConfig> = new Map();
  private compiledStrategies: Map<string, CompiledStrategy> = new Map();
  private setupQueue: SetupQueueItem[] = [];
  private processingSetup: boolean = false;
  
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private lastCheck: Date | null = null;
  private errorMessage?: string;

  private marketData: MarketDataAggregator;

  // Event callbacks
  private onSetupDetectedCallback?: (setup: SetupDetection, strategy: ExecutableStrategyConfig) => void;
  private onStateChangeCallback?: (state: EngineState) => void;
  private onErrorCallback?: (error: Error) => void;
  private onAlertCallback?: (message: string, setup: SetupDetection) => void;

  constructor(config: EngineConfig) {
    this.config = config;
    this.marketData = getMarketDataAggregator();
  }

  // ============================================================================
  // ENGINE LIFECYCLE
  // ============================================================================

  /**
   * Start the execution engine
   */
  async start(): Promise<void> {
    if (this.state !== 'stopped') {
      throw new Error(`Cannot start engine from state: ${this.state}`);
    }

    this.setState('starting');

    try {
      // 1. Set up market data event handlers
      this.setupMarketDataHandlers();
      
      // 2. Load active strategies
      await this.loadStrategies();

      // 3. Start monitoring loop
      this.startMonitoring();

      this.setState('running');
      console.log('[Engine] Started successfully');
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setState('error');
      throw error;
    }
  }

  /**
   * Set up event handlers for market data events
   * Concern #1 FIX (Agent 1 Fresh Fix Verification):
   * Listen for historical_bars_loaded to immediately check strategies
   */
  private setupMarketDataHandlers(): void {
    // When historical bars finish loading, immediately check strategies using that symbol
    this.marketData.onHistoricalBarsLoaded((symbol, count) => {
      console.log(`[Engine] Historical data ready for ${symbol} (${count} candles), checking strategies...`);
      
      const strategiesUsingSymbol = Array.from(this.strategies.values())
        .filter(s => s.instrument === symbol && s.isActive);
      
      // Immediately check these strategies (don't wait for next tick)
      for (const strategy of strategiesUsingSymbol) {
        this.checkStrategy(strategy).catch(err => {
          console.error(`[Engine] Error checking strategy ${strategy.id} after historical load:`, err);
        });
      }
    });

    // On candle close, check strategies (hybrid monitoring)
    this.marketData.onCandleClose((symbol, candle) => {
      const strategiesUsingSymbol = Array.from(this.strategies.values())
        .filter(s => s.instrument === symbol && s.isActive);
      
      for (const strategy of strategiesUsingSymbol) {
        this.checkStrategy(strategy).catch(err => {
          console.error(`[Engine] Error checking strategy ${strategy.id} on candle close:`, err);
        });
      }
    });
  }

  /**
   * Stop the execution engine
   */
  async stop(): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    this.setState('stopping');

    try {
      // Stop monitoring
      this.stopMonitoring();

      // Disconnect market data
      await this.marketData.disconnect();

      // Clear state
      this.strategies.clear();
      this.setupQueue = [];

      this.setState('stopped');
      console.log('[Engine] Stopped successfully');
    } catch (error) {
      console.error('[Engine] Error during stop:', error);
      this.setState('error');
    }
  }

  /**
   * Load user's active strategies
   */
  private async loadStrategies(): Promise<void> {
    const { data: strategies, error } = await this.supabase
      .from('strategies')
      .select('*')
      .eq('user_id', this.config.userId)
      .eq('status', 'active')
      .eq('tradovate_account_id', this.config.tradovateAccountId);

    if (error) {
      throw new Error(`Failed to load strategies: ${error.message}`);
    }

    for (const strategy of strategies || []) {
      const executableStrategy: ExecutableStrategyConfig = {
        id: strategy.id,
        name: strategy.name,
        instrument: strategy.instrument,
        parsedRules: strategy.parsed_rules || {},
        autonomyLevel: strategy.autonomy_level || 'copilot',
        executionMode: strategy.execution_mode || this.config.executionMode,
        maxDailyLoss: strategy.max_daily_loss,
        maxDrawdown: strategy.max_drawdown,
        positionSize: strategy.position_size,
        isActive: true,
      };

      this.strategies.set(strategy.id, executableStrategy);
      
      // Compile strategy using Rule Interpreter
      this.compileStrategyRules(executableStrategy);
    }

    console.log(`[Engine] Loaded ${this.strategies.size} active strategies, ${this.compiledStrategies.size} compiled`);
  }

  /**
   * Compile strategy rules into executable functions
   */
  private compileStrategyRules(strategy: ExecutableStrategyConfig): void {
    try {
      const validation = validateRulesForCompilation(strategy.parsedRules);
      
      if (validation.warnings.length > 0) {
        console.warn(`[Engine] Strategy ${strategy.id} compilation warnings:`, validation.warnings);
      }
      
      const compiled = compileStrategy(
        strategy.parsedRules,
        strategy.instrument
      );
      
      this.compiledStrategies.set(strategy.id, compiled);
      console.log(`[Engine] Compiled strategy ${strategy.id}: pattern=${compiled.pattern}, direction=${compiled.direction}`);
    } catch (err) {
      console.error(`[Engine] Failed to compile strategy ${strategy.id}:`, err);
      // Don't store failed compilations - strategy will use fallback text matching
    }
  }

  // ============================================================================
  // MONITORING LOOP
  // ============================================================================

  /**
   * Start the monitoring loop
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.monitoringTick().catch(console.error);
    }, MONITORING_INTERVAL);

    console.log('[Engine] Monitoring started');
  }

  /**
   * Stop the monitoring loop
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Single monitoring tick (runs every 5 seconds)
   * 
   * Concern #3 FIX (Agent 1 Fresh Fix Verification):
   * - Track consecutive failures per strategy
   * - Auto-pause after 3 consecutive failures
   * - Alert user about auto-paused strategies
   */
  private async monitoringTick(): Promise<void> {
    this.lastCheck = new Date();

    try {
      // 1. Check all active strategies IN PARALLEL (FIX per Agent 1 Fresh Review Issue #3)
      // Sequential checking caused race conditions where queue couldn't drain fast enough
      const strategyArray = Array.from(this.strategies.values()).filter(s => s.isActive);
      
      // Run all strategy checks concurrently with error tracking
      const strategyChecks = strategyArray.map(async (strategy) => {
        try {
          await this.checkStrategy(strategy);
          // Reset failure count on success
          strategy.consecutiveFailures = 0;
        } catch (err) {
          console.error(`[Engine] Error checking strategy ${strategy.id}:`, err);
          
          // Track consecutive failures
          strategy.consecutiveFailures = (strategy.consecutiveFailures || 0) + 1;
          strategy.lastErrorMessage = err instanceof Error ? err.message : String(err);
          
          // Auto-pause after 3 consecutive failures
          if (strategy.consecutiveFailures >= 3) {
            console.error(`[Engine] Auto-pausing strategy ${strategy.id} after ${strategy.consecutiveFailures} consecutive failures`);
            await this.pauseStrategy(strategy.id, `auto_paused: ${strategy.lastErrorMessage}`);
            
            // Notify via error callback
            if (this.onErrorCallback) {
              this.onErrorCallback(new Error(`Strategy ${strategy.name} auto-paused: ${strategy.lastErrorMessage}`));
            }
          }
        }
      });
      
      // Wait for all checks to complete
      await Promise.allSettled(strategyChecks);

      // 2. Process setup queue (run async, don't block next tick)
      this.processSetupQueue().catch(err => {
        console.error('[Engine] Error processing setup queue:', err);
      });

      // 3. Check safety limits
      await this.checkSafetyLimits();

    } catch (error) {
      console.error('[Engine] Error in monitoring tick:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }

  // ============================================================================
  // SETUP DETECTION
  // ============================================================================

  /**
   * Check a strategy for entry/exit conditions
   * Uses compiled strategy if available, falls back to text-based matching
   */
  private async checkStrategy(strategy: ExecutableStrategyConfig): Promise<void> {
    const symbol = strategy.instrument;
    const rules = strategy.parsedRules;

    // Get current market data
    const candles = this.marketData.getCandles(symbol);
    const quote = this.marketData.getQuote(symbol);
    
    if (!quote || candles.length < 50) {
      return; // Not enough data
    }

    // Try to use compiled strategy first (Rule Interpreter)
    const compiled = this.compiledStrategies.get(strategy.id);
    
    if (compiled) {
      await this.checkCompiledStrategy(strategy, compiled, candles, quote);
      return;
    }

    // Fallback to text-based matching for non-compiled strategies
    await this.checkTextBasedStrategy(strategy, candles, quote);
  }

  /**
   * Check strategy using compiled executable functions
   */
  private async checkCompiledStrategy(
    strategy: ExecutableStrategyConfig,
    compiled: CompiledStrategy,
    candles: OHLCV[],
    quote: Quote
  ): Promise<void> {
    const now = new Date();
    
    // Check time validity using compiled filter
    if (!compiled.isTimeValid(now)) {
      return; // Outside trading window
    }

    // Get opening range if pattern requires it
    const openingRange = compiled.pattern.includes('opening_range') 
      ? this.marketData.calculateOpeningRange(strategy.instrument) 
      : null;

    // Build evaluation context
    const indicators = this.buildIndicatorValues(strategy.instrument);
    const context: EvaluationContext = {
      candles,
      quote,
      indicators,
      openingRange,
      currentTime: now,
    };

    // Check entry conditions using compiled function
    const entrySignal = compiled.shouldEnter(context);
    
    if (entrySignal) {
      // Calculate full trade parameters
      const entryPrice = compiled.getEntryPrice(context);
      const stopPrice = compiled.getStopPrice(entryPrice, context);
      const targetPrice = compiled.getTargetPrice(entryPrice, stopPrice, context);
      
      // Calculate position size (assuming $50k account for now - will integrate with real balance)
      const accountBalance = 50000; // TODO: Get from Tradovate account
      const contractQuantity = compiled.getContractQuantity(accountBalance, entryPrice, stopPrice);
      
      const setup: Partial<SetupDetection> = {
        direction: entrySignal.direction,
        price: entrySignal.triggerPrice,
        timestamp: now,
        conditions_met: [entrySignal.reason],
        entryPrice,
        stopPrice,
        targetPrice,
        contractQuantity,
        confidence: entrySignal.confidence,
        reason: entrySignal.reason,
      };

      await this.handleSetupDetected(
        strategy, 
        setup, 
        'entry', 
        indicators as Record<string, number | null>
      );
    }
  }

  /**
   * Build indicator values for evaluation context
   */
  private buildIndicatorValues(symbol: string): IndicatorValues {
    const indicators: IndicatorValues = {};
    
    // Common EMA periods
    for (const period of [20, 50, 200]) {
      const ema = this.marketData.calculateEMA(symbol, period);
      if (ema.length > 0) {
        indicators[`ema${period}`] = ema[ema.length - 1];
      }
    }
    
    // RSI 14
    indicators.rsi14 = this.marketData.calculateRSI(symbol, 14) ?? undefined;
    
    // ATR 14
    indicators.atr14 = this.marketData.calculateATR(symbol, 14) ?? undefined;
    
    // VWAP
    indicators.vwap = this.marketData.calculateVWAP(symbol) ?? undefined;
    
    return indicators;
  }

  /**
   * Fallback: Check strategy using text-based condition matching
   * Used when strategy hasn't been compiled by Rule Interpreter
   */
  private async checkTextBasedStrategy(
    strategy: ExecutableStrategyConfig,
    candles: OHLCV[],
    quote: Quote
  ): Promise<void> {
    const rules = strategy.parsedRules;

    // Check time filters
    if (rules.filters) {
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();
      
      for (const filter of rules.filters) {
        if (filter.type === 'time_window') {
          const start = parseInt(filter.start?.replace(':', '') || '0000');
          const end = parseInt(filter.end?.replace(':', '') || '2359');
          
          if (currentTime < start || currentTime > end) {
            return; // Outside trading window
          }
        }
      }
    }

    // Calculate indicators
    const indicators = this.calculateIndicators(strategy.instrument, rules);

    // Check entry conditions
    const entrySignal = this.checkEntryConditions(rules, indicators, quote, candles);
    
    if (entrySignal) {
      await this.handleSetupDetected(strategy, entrySignal, 'entry', indicators);
    }
  }

  /**
   * Calculate all required indicators
   */
  private calculateIndicators(
    symbol: string,
    rules: ParsedRules
  ): Record<string, number | null> {
    const indicators: Record<string, number | null> = {};

    // Extract required indicators from rules
    const requiredIndicators: string[] = [];
    
    const conditions = [...(rules.entry_conditions || []), ...(rules.exit_conditions || [])];
    for (const condition of conditions) {
      if (condition.indicator) {
        requiredIndicators.push(`${condition.indicator}_${condition.period || 14}`);
      }
    }

    // Calculate each indicator
    for (const key of requiredIndicators) {
      const [indicator, period] = key.split('_');
      const periodNum = parseInt(period);

      switch (indicator.toUpperCase()) {
        case 'EMA': {
          const ema = this.marketData.calculateEMA(symbol, periodNum);
          indicators[key] = ema.length > 0 ? ema[ema.length - 1] : null;
          break;
        }
        case 'RSI':
          indicators[key] = this.marketData.calculateRSI(symbol, periodNum);
          break;
        case 'ATR':
          indicators[key] = this.marketData.calculateATR(symbol, periodNum);
          break;
      }
    }

    // Always calculate VWAP and Opening Range
    indicators['VWAP'] = this.marketData.calculateVWAP(symbol);
    
    const or = this.marketData.calculateOpeningRange(symbol);
    indicators['OR_HIGH'] = or?.high || null;
    indicators['OR_LOW'] = or?.low || null;

    return indicators;
  }

  /**
   * Check entry conditions
   */
  private checkEntryConditions(
    rules: ParsedRules,
    indicators: Record<string, number | null>,
    quote: Quote,
    candles: OHLCV[]
  ): Partial<SetupDetection> | null {
    if (!rules.entry_conditions || rules.entry_conditions.length === 0) {
      return null;
    }

    const currentPrice = quote.last;
    let allConditionsMet = true;
    let direction: 'long' | 'short' = 'long';

    for (const condition of rules.entry_conditions) {
      const met = this.evaluateCondition(condition as unknown as Record<string, unknown>, indicators, currentPrice);
      
      if (!met) {
        allConditionsMet = false;
        break;
      }

      // Determine direction from condition
      if (condition.type === 'price_above' || condition.direction === 'long') {
        direction = 'long';
      } else if (condition.type === 'price_below' || condition.direction === 'short') {
        direction = 'short';
      }
    }

    if (!allConditionsMet) {
      return null;
    }

    return {
      direction,
      price: currentPrice,
      timestamp: new Date(),
      conditions_met: rules.entry_conditions.map((c) => c.indicator || c.type || 'unknown'),
    };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: Record<string, unknown>,
    indicators: Record<string, number | null>,
    currentPrice: number
  ): boolean {
    const type = condition.type as string;
    const indicator = condition.indicator as string;
    const period = condition.period as number;
    const value = condition.value as number;
    const comparator = (condition.comparator as string) || 'greater';

    // Price-based conditions
    if (type === 'price_above') {
      const target = indicator 
        ? indicators[`${indicator}_${period}`]
        : value;
      return target !== null && currentPrice > target;
    }

    if (type === 'price_below') {
      const target = indicator 
        ? indicators[`${indicator}_${period}`]
        : value;
      return target !== null && currentPrice < target;
    }

    // Indicator-based conditions
    if (indicator) {
      const indicatorValue = indicators[`${indicator}_${period || 14}`];
      if (indicatorValue === null) return false;

      switch (comparator) {
        case 'greater':
          return indicatorValue > value;
        case 'less':
          return indicatorValue < value;
        case 'crosses_above':
          return indicatorValue > value;
        case 'crosses_below':
          return indicatorValue < value;
        default:
          return false;
      }
    }

    // Opening Range conditions
    if (type === 'or_breakout_high') {
      const orHigh = indicators['OR_HIGH'];
      return orHigh !== null && currentPrice > orHigh;
    }

    if (type === 'or_breakout_low') {
      const orLow = indicators['OR_LOW'];
      return orLow !== null && currentPrice < orLow;
    }

    return false;
  }

  // ============================================================================
  // SETUP QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Handle detected setup
   */
  private async handleSetupDetected(
    strategy: ExecutableStrategyConfig,
    signal: Partial<SetupDetection>,
    signalType: 'entry' | 'exit',
    indicators: Record<string, number | null>
  ): Promise<void> {
    const setup: SetupDetection = {
      id: generateSetupId(strategy.id, signal.timestamp || new Date(), signal.direction || 'long'),
      strategy_id: strategy.id,
      instrument: strategy.instrument,
      direction: signal.direction || 'long',
      signal_type: signalType,
      price: signal.price || 0,
      timestamp: signal.timestamp || new Date(),
      conditions_met: signal.conditions_met || [],
      indicators,
      status: 'pending',
    };

    // Check for duplicate
    const existing = this.setupQueue.find(item => item.setup.id === setup.id);
    if (existing) {
      return; // Already in queue
    }

    // Check queue size (backpressure)
    if (this.setupQueue.length >= SETUP_QUEUE_MAX_SIZE) {
      console.warn('[Engine] Setup queue full, rejecting new setup');
      return;
    }

    // Add to queue
    this.setupQueue.push({
      setup,
      strategy,
      addedAt: new Date(),
    });

    console.log(`[Engine] Setup detected: ${strategy.name} ${setup.direction} at ${setup.price}`);

    // Notify callback
    if (this.onSetupDetectedCallback) {
      this.onSetupDetectedCallback(setup, strategy);
    }

    // Send alert if configured
    if (this.config.enableAlerts && this.onAlertCallback) {
      const message = `Setup: ${strategy.name} ${setup.direction.toUpperCase()} at ${setup.price}`;
      this.onAlertCallback(message, setup);
    }
  }

  /**
   * Process setup queue (one at a time)
   */
  private async processSetupQueue(): Promise<void> {
    if (this.processingSetup || this.setupQueue.length === 0) {
      return;
    }

    // Don't execute if not enabled
    if (!this.config.enableExecution) {
      // Still remove from queue after alerting
      const item = this.setupQueue.shift();
      if (item) {
        item.setup.status = 'alerted';
        await this.logSetup(item.setup);
      }
      return;
    }

    this.processingSetup = true;

    try {
      const item = this.setupQueue.shift();
      if (!item) return;

      const { setup, strategy } = item;

      // Check if we should execute based on autonomy level
      if (strategy.autonomyLevel === 'copilot') {
        // Copilot mode: alert only, user approves
        setup.status = 'awaiting_approval';
        await this.logSetup(setup);
        return;
      }

      // Autopilot mode: execute automatically
      await this.executeSetup(setup, strategy);

    } finally {
      this.processingSetup = false;
    }
  }

  /**
   * Execute a setup (place order)
   */
  private async executeSetup(setup: SetupDetection, strategy: ExecutableStrategyConfig): Promise<void> {
    try {
      // For now, just log - actual order execution will be implemented with OrderManager
      console.log(`[Engine] Would execute: ${strategy.name} ${setup.direction} at ${setup.price}`);
      
      // Update setup status
      setup.status = 'executed';
      await this.logSetup(setup);

    } catch (error) {
      console.error('[Engine] Failed to execute setup:', error);
      setup.status = 'failed';
      setup.error = error instanceof Error ? error.message : 'Unknown error';
      await this.logSetup(setup);
    }
  }

  /**
   * Log setup to database
   */
  private async logSetup(setup: SetupDetection): Promise<void> {
    // Log to behavioral_data table for PATH 2
    await this.supabase.from('behavioral_data').insert({
      user_id: this.config.userId,
      event_type: 'setup_detected',
      event_data: setup,
      session_context: {
        engine_state: this.state,
        execution_mode: this.config.executionMode,
      },
    });
  }

  // ============================================================================
  // SAFETY CHECKS
  // ============================================================================

  /**
   * Check safety limits
   */
  private async checkSafetyLimits(): Promise<void> {
    try {
      // Check each strategy's daily loss
      const strategyArray = Array.from(this.strategies.values());
      for (const strategy of strategyArray) {
        const dailyPnL = await this.getDailyPnL(strategy.id);
        
        if (strategy.maxDailyLoss && Math.abs(dailyPnL) >= strategy.maxDailyLoss) {
          console.warn(`[Engine] Strategy ${strategy.name} hit daily loss limit`);
          strategy.isActive = false;
          
          if (this.onAlertCallback) {
            this.onAlertCallback(
              `${strategy.name} paused: Daily loss limit reached`,
              {} as SetupDetection
            );
          }
        }
      }

    } catch (error) {
      console.error('[Engine] Error checking safety limits:', error);
    }
  }

  /**
   * Get daily P&L for a strategy
   */
  private async getDailyPnL(strategyId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('positions')
      .select('realized_pnl')
      .eq('strategy_id', strategyId)
      .gte('closed_at', today.toISOString());

    if (error) return 0;

    return (data || []).reduce((sum, p) => sum + (p.realized_pnl || 0), 0);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get current engine status
   */
  getStatus(): EngineStatus {
    return {
      state: this.state,
      activeStrategies: Array.from(this.strategies.values()).filter(s => s.isActive).length,
      pendingSetups: this.setupQueue.length,
      wsStatus: this.marketData.getStatus().state,
      lastCheck: this.lastCheck,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * Add a new strategy
   */
  async addStrategy(strategy: ExecutableStrategyConfig): Promise<void> {
    this.strategies.set(strategy.id, strategy);
    
    // Subscribe to instrument if not already
    await this.marketData.subscribe(strategy.instrument);
  }

  /**
   * Remove a strategy
   */
  async removeStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    this.strategies.delete(strategyId);

    // Check if any other strategy uses this instrument
    const stillNeeded = Array.from(this.strategies.values())
      .some(s => s.instrument === strategy?.instrument);

    if (!stillNeeded && strategy) {
      await this.marketData.unsubscribe(strategy.instrument);
    }
  }

  /**
   * Pause a strategy
   * @param strategyId - ID of the strategy to pause
   * @param reason - Optional reason for pausing (e.g., 'auto_paused: consecutive failures')
   */
  pauseStrategy(strategyId: string, reason?: string): void {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.isActive = false;
      if (reason) {
        console.log(`[Engine] Strategy ${strategyId} paused: ${reason}`);
      }
    }
  }

  /**
   * Resume a strategy
   */
  resumeStrategy(strategyId: string): void {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.isActive = true;
    }
  }

  /**
   * Approve a pending setup (for Copilot mode)
   */
  async approveSetup(setupId: string): Promise<void> {
    const item = this.setupQueue.find(i => i.setup.id === setupId);
    if (item) {
      await this.executeSetup(item.setup, item.strategy);
      this.setupQueue = this.setupQueue.filter(i => i.setup.id !== setupId);
    }
  }

  /**
   * Reject a pending setup
   */
  async rejectSetup(setupId: string, reason?: string): Promise<void> {
    const item = this.setupQueue.find(i => i.setup.id === setupId);
    if (item) {
      item.setup.status = 'rejected';
      item.setup.error = reason;
      await this.logSetup(item.setup);
      this.setupQueue = this.setupQueue.filter(i => i.setup.id !== setupId);
    }
  }

  /**
   * Get pending setups
   */
  getPendingSetups(): SetupDetection[] {
    return this.setupQueue.map(item => item.setup);
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  private setState(state: EngineState): void {
    this.state = state;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  // ============================================================================
  // EVENT CALLBACKS
  // ============================================================================

  onSetupDetected(callback: (setup: SetupDetection, strategy: ExecutableStrategyConfig) => void): void {
    this.onSetupDetectedCallback = callback;
  }

  onStateChange(callback: (state: EngineState) => void): void {
    this.onStateChangeCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onAlert(callback: (message: string, setup: SetupDetection) => void): void {
    this.onAlertCallback = callback;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createExecutionEngine(config: EngineConfig): ExecutionEngine {
  return new ExecutionEngine(config);
}
