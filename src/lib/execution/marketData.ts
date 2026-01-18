/**
 * Market Data Aggregator
 * 
 * Handles WebSocket connection to Tradovate, tick aggregation,
 * and indicator calculations (EMA, RSI, ATR, Opening Range).
 * 
 * Includes reconnection logic with exponential backoff per Issue #10.
 * 
 * Enhanced per Agent 1 code review:
 * - Issue #3: Restore candle buffer after WebSocket reconnection
 * 
 * @module lib/execution/marketData
 * @see Issue #10 - Component 2: Market Data Aggregator
 */

import {
  OHLCV,
  Quote,
  Tick,
  OpeningRange,
  WebSocketState,
  WebSocketConfig,
  WebSocketStatus,
} from './types';
import { tradovateMarketDataCircuitBreaker } from './circuitBreaker';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_WS_CONFIG: WebSocketConfig = {
  url: 'wss://md.tradovateapi.com/v1/websocket',
  reconnectAttempts: 10,
  reconnectDelay: 1000,      // Start at 1 second
  maxReconnectDelay: 60000,  // Max 1 minute
  pingInterval: 30000,       // Ping every 30 seconds
};

// Candle buffer size (200 candles for indicator calculations)
const CANDLE_BUFFER_SIZE = 200;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Function type for fetching historical bars (injected from TradovateClient)
 */
export type HistoricalBarsFetcher = (
  symbol: string,
  barCount?: number,
  timeframeMinutes?: number
) => Promise<OHLCV[]>;

// ============================================================================
// MARKET DATA AGGREGATOR CLASS
// ============================================================================

export class MarketDataAggregator {
  private wsConnection: WebSocket | null = null;
  private config: WebSocketConfig;
  private accessToken: string = '';
  private state: WebSocketState = 'disconnected';
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  
  // Historical data fetcher (injected from TradovateClient)
  private historicalBarsFetcher: HistoricalBarsFetcher | null = null;

  // Data storage
  private candles: Map<string, OHLCV[]> = new Map();
  private currentCandle: Map<string, OHLCV> = new Map();
  private quotes: Map<string, Quote> = new Map();
  private subscriptions: Set<string> = new Set();
  private openingRanges: Map<string, OpeningRange> = new Map();

  // Event callbacks
  private onTickCallback?: (tick: Tick) => void;
  private onCandleCloseCallback?: (symbol: string, candle: OHLCV) => void;
  private onQuoteCallback?: (quote: Quote) => void;
  private onStateChangeCallback?: (state: WebSocketState) => void;
  private onConnectionLostCallback?: () => void;
  private onConnectionRestoredCallback?: () => void;
  private onHistoricalBarsLoadedCallback?: (symbol: string, count: number) => void;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_WS_CONFIG, ...config };
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Connect to Tradovate WebSocket
   */
  async connect(accessToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Check circuit breaker
        if (!tradovateMarketDataCircuitBreaker.isAvailable()) {
          reject(new Error('Market data circuit breaker is OPEN'));
          return;
        }

        this.wsConnection = new WebSocket(this.config.url);

        this.wsConnection.onopen = () => {
          console.log('[MarketData] WebSocket connected');
          this.authenticate();
        };

        this.wsConnection.onmessage = (event) => {
          this.handleMessage(event.data);
          
          // Resolve on successful auth
          if (this.state === 'connected') {
            resolve();
          }
        };

        this.wsConnection.onerror = (error) => {
          console.error('[MarketData] WebSocket error:', error);
          this.stopPing(); // Stop ping on error
          this.handleError(error);
          reject(error);
        };

        this.wsConnection.onclose = (event) => {
          console.log(`[MarketData] WebSocket closed: ${event.code} ${event.reason}`);
          this.stopPing(); // Stop ping on close
          this.handleClose();
        };

        // Set connection timeout
        setTimeout(() => {
          if (this.state !== 'connected') {
            reject(new Error('Connection timeout'));
            this.disconnect();
          }
        }, 10000);

      } catch (error) {
        this.handleError(error);
        reject(error);
      }
    });
  }

  /**
   * Authenticate with Tradovate
   */
  private authenticate(): void {
    this.send({
      op: 'authorize',
      token: this.accessToken,
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const messages = data.split('\n').filter(Boolean);
      
      for (const msgStr of messages) {
        const msg = JSON.parse(msgStr);
        
        switch (msg.e || msg.op) {
          case 'authorize':
            if (msg.s === 200) {
              console.log('[MarketData] Authenticated successfully');
              this.onConnected();
            } else {
              console.error('[MarketData] Authentication failed:', msg);
              this.handleError(new Error('Authentication failed'));
            }
            break;

          case 'md/subscribeQuote':
            // Quote subscription confirmed
            console.log(`[MarketData] Subscribed to ${msg.symbol}`);
            break;

          case 'quote':
            this.handleQuote(msg.d);
            break;

          case 'trade':
            this.handleTick(msg.d);
            break;

          case 'chart':
            this.handleChartData(msg.d);
            break;

          case 'ping':
            this.send({ op: 'pong' });
            break;
        }
      }
    } catch (error) {
      console.error('[MarketData] Failed to parse message:', error);
    }
  }

  /**
   * Handle successful connection
   * Enhanced per Agent 1 code review: restore candle buffer after reconnect
   */
  private onConnected(): void {
    this.setState('connected');
    const wasReconnection = this.reconnectAttempts > 0;
    this.reconnectAttempts = 0;
    
    // Start ping interval
    this.startPing();

    // Resubscribe to all instruments
    const symbols = Array.from(this.subscriptions);
    for (const symbol of symbols) {
      this.subscribe(symbol).catch(console.error);
    }

    // Restore candle buffers if this was a reconnection
    if (wasReconnection && this.historicalBarsFetcher) {
      this.restoreCandleBuffers(symbols).catch((error) => {
        console.error('[MarketData] Failed to restore candle buffers:', error);
      });
    }

    // Notify callback
    if (this.onConnectionRestoredCallback && wasReconnection) {
      this.onConnectionRestoredCallback();
    }
  }

  /**
   * Restore candle buffers after reconnection
   * Per Agent 1 code review: Issue #3 - fetch 200 candles via REST to restore buffer
   */
  private async restoreCandleBuffers(symbols: string[]): Promise<void> {
    if (!this.historicalBarsFetcher) {
      console.warn('[MarketData] No historical bars fetcher configured, skipping buffer restoration');
      return;
    }

    console.log(`[MarketData] Restoring candle buffers for ${symbols.length} symbols...`);

    for (const symbol of symbols) {
      try {
        const historicalBars = await this.historicalBarsFetcher(symbol, CANDLE_BUFFER_SIZE, 5);
        
        if (historicalBars.length > 0) {
          // Preserve any candles from current session that might still be valid
          const existingCandles = this.candles.get(symbol) || [];
          const lastHistoricalTime = historicalBars[historicalBars.length - 1]?.timestamp.getTime() || 0;
          
          // Only keep existing candles that are newer than the historical data
          const newerCandles = existingCandles.filter(
            (c) => c.timestamp.getTime() > lastHistoricalTime
          );
          
          // Merge: historical + newer session candles, limited to buffer size
          const mergedCandles = [...historicalBars, ...newerCandles].slice(-CANDLE_BUFFER_SIZE);
          this.candles.set(symbol, mergedCandles);
          
          console.log(`[MarketData] Restored ${mergedCandles.length} candles for ${symbol}`);
        }
      } catch (error) {
        console.error(`[MarketData] Failed to restore candles for ${symbol}:`, error);
      }
    }
  }

  /**
   * Set the historical bars fetcher (called from execution engine with TradovateClient)
   */
  setHistoricalBarsFetcher(fetcher: HistoricalBarsFetcher): void {
    this.historicalBarsFetcher = fetcher;
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(): void {
    this.stopPing();
    
    if (this.state !== 'disconnected') {
      this.setState('disconnected');
      this.handleReconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: unknown): void {
    console.error('[MarketData] Error:', error);
    this.handleReconnect();
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error('[MarketData] Max reconnect attempts reached');
      this.setState('failed');
      
      if (this.onConnectionLostCallback) {
        this.onConnectionLostCallback();
      }
      return;
    }

    this.reconnectAttempts++;
    this.setState('reconnecting');

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    console.log(`[MarketData] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect(this.accessToken);
      } catch (error) {
        console.error('[MarketData] Reconnection failed:', error);
        this.handleReconnect();
      }
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ op: 'ping' });
      }
    }, this.config.pingInterval);
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  async disconnect(): Promise<void> {
    this.setState('disconnected');
    this.stopPing();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * Send message to WebSocket
   */
  private send(message: Record<string, unknown>): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    }
  }

  /**
   * Set connection state
   */
  private setState(state: WebSocketState): void {
    this.state = state;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && 
           this.wsConnection !== null && 
           this.wsConnection.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   */
  getStatus(): WebSocketStatus {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to instrument quotes
   */
  async subscribe(symbol: string): Promise<void> {
    this.subscriptions.add(symbol);
    
    // Initialize empty candle buffer if not exists
    const isNewSubscription = !this.candles.has(symbol) || this.candles.get(symbol)!.length === 0;
    if (!this.candles.has(symbol)) {
      this.candles.set(symbol, []);
    }

    // CRITICAL FIX per Agent 1 Fresh Review Issue #4:
    // Fetch historical bars on INITIAL subscription (not just reconnection)
    // Without this, indicators won't have enough data for 16+ hours
    // 
    // BUG #1 FIX (Agent 1 Fresh Fix Verification):
    // Fetch ASYNC to avoid blocking - don't await, fire and forget
    // This prevents 15-second freeze when activating multiple strategies
    if (isNewSubscription && this.historicalBarsFetcher) {
      this.fetchHistoricalBarsAsync(symbol).catch(err => {
        console.error(`[MarketData] Background historical fetch failed for ${symbol}:`, err);
      });
    }

    // Subscribe to WebSocket immediately (don't wait for historical data)
    if (this.isConnected()) {
      this.send({
        op: 'md/subscribeQuote',
        symbol,
      });

      // Also subscribe to trades for tick data
      this.send({
        op: 'md/subscribeTrade',
        symbol,
      });
    }
  }

  /**
   * Fetch historical bars asynchronously (non-blocking)
   * Merges with any live candles that accumulated while fetching
   * Emits 'historical_bars_loaded' event when complete
   */
  private async fetchHistoricalBarsAsync(symbol: string): Promise<void> {
    if (!this.historicalBarsFetcher) return;
    
    try {
      console.log(`[MarketData] Fetching historical bars for ${symbol} in background...`);
      const historicalBars = await this.historicalBarsFetcher(symbol, CANDLE_BUFFER_SIZE, 5);
      
      if (historicalBars.length > 0) {
        // Merge with any live candles that accumulated while fetching
        const liveCandles = this.candles.get(symbol) || [];
        const lastHistoricalTime = historicalBars[historicalBars.length - 1]?.timestamp.getTime() || 0;
        const newerLiveCandles = liveCandles.filter(c => c.timestamp.getTime() > lastHistoricalTime);
        
        const mergedCandles = [...historicalBars, ...newerLiveCandles].slice(-CANDLE_BUFFER_SIZE);
        this.candles.set(symbol, mergedCandles);
        
        console.log(`[MarketData] Loaded ${mergedCandles.length} candles for ${symbol} (${historicalBars.length} historical + ${newerLiveCandles.length} live)`);
        
        // Emit event so strategies know buffer is ready
        if (this.onHistoricalBarsLoadedCallback) {
          this.onHistoricalBarsLoadedCallback(symbol, mergedCandles.length);
        }
      } else {
        console.warn(`[MarketData] No historical data available for ${symbol}`);
      }
    } catch (error) {
      console.error(`[MarketData] Failed to fetch historical bars for ${symbol}:`, error);
      // Continue anyway - will aggregate from live data
    }
  }

  /**
   * Unsubscribe from instrument
   */
  async unsubscribe(symbol: string): Promise<void> {
    this.subscriptions.delete(symbol);
    this.candles.delete(symbol);
    this.currentCandle.delete(symbol);
    this.quotes.delete(symbol);

    if (this.isConnected()) {
      this.send({
        op: 'md/unsubscribeQuote',
        symbol,
      });
    }
  }

  // ============================================================================
  // DATA HANDLERS
  // ============================================================================

  /**
   * Handle incoming quote update
   */
  private handleQuote(data: Record<string, unknown>): void {
    const symbol = data.symbol as string;
    const bid = (data.bid as number) || 0;
    const ask = (data.ask as number) || 0;
    
    const quote: Quote = {
      symbol,
      bid,
      ask,
      last: (data.last as number) || (bid + ask) / 2,
      volume: (data.volume as number) || 0,
      timestamp: new Date((data.timestamp as string) || Date.now()),
    };

    this.quotes.set(symbol, quote);

    if (this.onQuoteCallback) {
      this.onQuoteCallback(quote);
    }
  }

  /**
   * Handle incoming tick/trade
   */
  private handleTick(data: Record<string, unknown>): void {
    const symbol = data.symbol as string;
    const price = data.price as number;
    const size = data.size as number;
    const timestamp = new Date(data.timestamp as string || Date.now());

    const tick: Tick = {
      symbol,
      price,
      size,
      timestamp,
      aggressor: data.side === 'B' ? 'buy' : data.side === 'S' ? 'sell' : 'unknown',
    };

    // Aggregate tick into current candle
    this.aggregateTick(symbol, price, size, timestamp);

    if (this.onTickCallback) {
      this.onTickCallback(tick);
    }
  }

  /**
   * Handle chart data (for historical backfill)
   */
  private handleChartData(data: Record<string, unknown>): void {
    const symbol = data.symbol as string;
    const bars = data.bars as Record<string, unknown>[];
    
    if (!bars || !Array.isArray(bars)) return;

    const candles = bars.map((bar) => ({
      timestamp: new Date(bar.timestamp as string),
      open: bar.open as number,
      high: bar.high as number,
      low: bar.low as number,
      close: bar.close as number,
      volume: bar.volume as number,
    }));

    // Add to candle buffer
    const existing = this.candles.get(symbol) || [];
    this.candles.set(symbol, [...candles, ...existing].slice(0, CANDLE_BUFFER_SIZE));
  }

  /**
   * Aggregate tick into candle
   * Uses 5-minute candles by default
   */
  private aggregateTick(symbol: string, price: number, size: number, timestamp: Date): void {
    const candleInterval = 5 * 60 * 1000; // 5 minutes
    const candleStart = Math.floor(timestamp.getTime() / candleInterval) * candleInterval;
    
    let current = this.currentCandle.get(symbol);

    // Check if we need to start a new candle
    if (!current || current.timestamp.getTime() !== candleStart) {
      // Close previous candle
      if (current) {
        const candles = this.candles.get(symbol) || [];
        candles.push(current);
        
        // Trim to buffer size
        if (candles.length > CANDLE_BUFFER_SIZE) {
          candles.shift();
        }
        
        this.candles.set(symbol, candles);

        // Notify callback
        if (this.onCandleCloseCallback) {
          this.onCandleCloseCallback(symbol, current);
        }
      }

      // Start new candle
      current = {
        timestamp: new Date(candleStart),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: size,
      };
      this.currentCandle.set(symbol, current);
    } else {
      // Update current candle
      current.high = Math.max(current.high, price);
      current.low = Math.min(current.low, price);
      current.close = price;
      current.volume += size;
    }
  }

  // ============================================================================
  // DATA GETTERS
  // ============================================================================

  /**
   * Get candles for a symbol
   */
  getCandles(symbol: string, count?: number): OHLCV[] {
    const candles = this.candles.get(symbol) || [];
    const current = this.currentCandle.get(symbol);
    
    const all = current ? [...candles, current] : candles;
    
    return count ? all.slice(-count) : all;
  }

  /**
   * Get current quote for a symbol
   */
  getQuote(symbol: string): Quote | undefined {
    return this.quotes.get(symbol);
  }

  /**
   * Get current candle (incomplete)
   */
  getCurrentCandle(symbol: string): OHLCV | undefined {
    return this.currentCandle.get(symbol);
  }

  // ============================================================================
  // INDICATOR CALCULATIONS
  // ============================================================================

  /**
   * Calculate Opening Range (e.g., 9:30-9:45 CT)
   */
  calculateOpeningRange(
    symbol: string,
    startTime: string = '09:30',
    endTime: string = '09:45'
  ): OpeningRange | null {
    // Check cache
    const cacheKey = `${symbol}-${startTime}-${endTime}`;
    const cached = this.openingRanges.get(cacheKey);
    if (cached?.isComplete) {
      return cached;
    }

    const candles = this.getCandles(symbol);
    if (candles.length === 0) return null;

    // Parse time strings
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Filter candles within OR period
    const orCandles = candles.filter((c) => {
      const candleMinutes = c.timestamp.getHours() * 60 + c.timestamp.getMinutes();
      return candleMinutes >= startMinutes && candleMinutes < endMinutes;
    });

    if (orCandles.length === 0) return null;

    const high = Math.max(...orCandles.map((c) => c.high));
    const low = Math.min(...orCandles.map((c) => c.low));

    // Check if OR is complete (current time past endTime)
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isComplete = currentMinutes >= endMinutes;

    const openingRange: OpeningRange = {
      high,
      low,
      startTime: new Date(orCandles[0].timestamp),
      endTime: new Date(orCandles[orCandles.length - 1].timestamp),
      isComplete,
    };

    // Cache if complete
    if (isComplete) {
      this.openingRanges.set(cacheKey, openingRange);
    }

    return openingRange;
  }

  /**
   * Set/restore opening range from persisted state
   * Used on engine restart to preserve opening range calculated earlier in the session
   * 
   * Per Agent 1 Issue #6: Opening range must survive Railway restarts
   */
  setOpeningRange(
    symbol: string,
    openingRange: OpeningRange,
    startTime: string = '09:30',
    endTime: string = '09:45'
  ): void {
    const cacheKey = `${symbol}-${startTime}-${endTime}`;
    this.openingRanges.set(cacheKey, openingRange);
    console.log(`[MarketData] Set opening range for ${symbol}: H=${openingRange.high} L=${openingRange.low} complete=${openingRange.isComplete}`);
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   * Enhanced per Agent 1 code review: added input validation
   */
  calculateEMA(symbol: string, period: number): number[] {
    // Input validation
    if (!symbol) {
      console.warn('[MarketData.calculateEMA] Symbol is required');
      return [];
    }
    if (!Number.isFinite(period) || period < 1) {
      console.warn(`[MarketData.calculateEMA] Invalid period: ${period} (must be >= 1)`);
      return [];
    }

    const candles = this.getCandles(symbol);
    if (candles.length < period) {
      // This is expected for new symbols, so just return empty without warning
      return [];
    }

    const prices = candles.map((c) => c.close);
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);

    // Calculate remaining EMAs
    for (let i = period; i < prices.length; i++) {
      const value = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(value);
    }

    return ema;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * Enhanced per Agent 1 code review: added input validation
   */
  calculateRSI(symbol: string, period: number = 14): number | null {
    // Input validation
    if (!symbol) {
      console.warn('[MarketData.calculateRSI] Symbol is required');
      return null;
    }
    if (!Number.isFinite(period) || period < 2) {
      console.warn(`[MarketData.calculateRSI] Invalid period: ${period} (must be >= 2)`);
      return null;
    }

    const candles = this.getCandles(symbol);
    if (candles.length < period + 1) return null;

    const prices = candles.map((c) => c.close);
    
    let gains = 0;
    let losses = 0;

    // Calculate first average
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate smoothed RSI
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate ATR (Average True Range)
   * Enhanced per Agent 1 code review: added input validation
   */
  calculateATR(symbol: string, period: number = 14): number | null {
    // Input validation
    if (!symbol) {
      console.warn('[MarketData.calculateATR] Symbol is required');
      return null;
    }
    if (!Number.isFinite(period) || period < 1) {
      console.warn(`[MarketData.calculateATR] Invalid period: ${period} (must be >= 1)`);
      return null;
    }

    const candles = this.getCandles(symbol);
    if (candles.length < period + 1) return null;

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRanges.push(tr);
    }

    // Calculate ATR using Wilder's smoothing
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;

    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return atr;
  }

  /**
   * Calculate VWAP (Volume Weighted Average Price)
   * Enhanced per Agent 1 code review: added input validation
   */
  calculateVWAP(symbol: string): number | null {
    // Input validation
    if (!symbol) {
      console.warn('[MarketData.calculateVWAP] Symbol is required');
      return null;
    }

    const candles = this.getCandles(symbol);
    if (candles.length === 0) return null;

    // Filter to today's candles only
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCandles = candles.filter((c) => c.timestamp >= today);
    if (todayCandles.length === 0) return null;

    let cumulativeTPV = 0; // Typical Price × Volume
    let cumulativeVolume = 0;

    for (const candle of todayCandles) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeTPV += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
    }

    if (cumulativeVolume === 0) return null;

    return cumulativeTPV / cumulativeVolume;
  }

  // ============================================================================
  // EVENT CALLBACKS
  // ============================================================================

  onTick(callback: (tick: Tick) => void): void {
    this.onTickCallback = callback;
  }

  onCandleClose(callback: (symbol: string, candle: OHLCV) => void): void {
    this.onCandleCloseCallback = callback;
  }

  onQuote(callback: (quote: Quote) => void): void {
    this.onQuoteCallback = callback;
  }

  onStateChange(callback: (state: WebSocketState) => void): void {
    this.onStateChangeCallback = callback;
  }

  onConnectionLost(callback: () => void): void {
    this.onConnectionLostCallback = callback;
  }

  onConnectionRestored(callback: () => void): void {
    this.onConnectionRestoredCallback = callback;
  }

  /**
   * Register callback for when historical bars finish loading
   * Essential for strategies to know when indicators are ready
   */
  onHistoricalBarsLoaded(callback: (symbol: string, count: number) => void): void {
    this.onHistoricalBarsLoadedCallback = callback;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let marketDataInstance: MarketDataAggregator | null = null;

export function getMarketDataAggregator(): MarketDataAggregator {
  if (!marketDataInstance) {
    marketDataInstance = new MarketDataAggregator();
  }
  return marketDataInstance;
}
