/**
 * Tradovate API Client
 * 
 * Handles OAuth, orders, positions, and account management.
 * Includes circuit breaker protection and automatic token refresh.
 * 
 * @module lib/execution/tradovate
 * @see Issue #10 - Component 3: Tradovate Client
 */

import {
  TradovateAccount,
  TradovateCredentials,
  TradovateOrderRequest,
  TradovateOrderResponse,
  Order,
  OrderStatus,
  Position,
  ContractInfo,
  TradovateAPIError,
  InstrumentSpec,
} from './types';
import {
  tradovateOrdersCircuitBreaker,
  tradovateAuthCircuitBreaker,
} from './circuitBreaker';

// ============================================================================
// CONSTANTS
// ============================================================================

const TRADOVATE_API_URL = 'https://api.tradovateapi.com/v1';
const TRADOVATE_DEMO_API_URL = 'https://demo.tradovateapi.com/v1';
const TRADOVATE_MD_WS_URL = 'wss://md.tradovateapi.com/v1/websocket';
const TRADOVATE_DEMO_MD_WS_URL = 'wss://md-demo.tradovateapi.com/v1/websocket';

// Token refresh buffer (refresh 10 minutes before expiry)
const TOKEN_REFRESH_BUFFER_MS = 10 * 60 * 1000;

// Instrument specifications
export const INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  ES: {
    symbol: 'ES',
    name: 'E-mini S&P 500',
    exchange: 'CME',
    tickSize: 0.25,
    pointValue: 50,
    marginRequirement: 12000,
    tradingHours: { start: '18:00', end: '17:00', timezone: 'America/Chicago' },
  },
  NQ: {
    symbol: 'NQ',
    name: 'E-mini NASDAQ-100',
    exchange: 'CME',
    tickSize: 0.25,
    pointValue: 20,
    marginRequirement: 16500,
    tradingHours: { start: '18:00', end: '17:00', timezone: 'America/Chicago' },
  },
  MES: {
    symbol: 'MES',
    name: 'Micro E-mini S&P 500',
    exchange: 'CME',
    tickSize: 0.25,
    pointValue: 5,
    marginRequirement: 1200,
    tradingHours: { start: '18:00', end: '17:00', timezone: 'America/Chicago' },
  },
  MNQ: {
    symbol: 'MNQ',
    name: 'Micro E-mini NASDAQ-100',
    exchange: 'CME',
    tickSize: 0.25,
    pointValue: 2,
    marginRequirement: 1650,
    tradingHours: { start: '18:00', end: '17:00', timezone: 'America/Chicago' },
  },
  YM: {
    symbol: 'YM',
    name: 'E-mini Dow',
    exchange: 'CBOT',
    tickSize: 1,
    pointValue: 5,
    marginRequirement: 9000,
    tradingHours: { start: '18:00', end: '17:00', timezone: 'America/Chicago' },
  },
  RTY: {
    symbol: 'RTY',
    name: 'E-mini Russell 2000',
    exchange: 'CME',
    tickSize: 0.1,
    pointValue: 50,
    marginRequirement: 7000,
    tradingHours: { start: '18:00', end: '17:00', timezone: 'America/Chicago' },
  },
  CL: {
    symbol: 'CL',
    name: 'Crude Oil',
    exchange: 'NYMEX',
    tickSize: 0.01,
    pointValue: 1000,
    marginRequirement: 6500,
    tradingHours: { start: '18:00', end: '17:00', timezone: 'America/Chicago' },
  },
  GC: {
    symbol: 'GC',
    name: 'Gold',
    exchange: 'COMEX',
    tickSize: 0.1,
    pointValue: 100,
    marginRequirement: 9000,
    tradingHours: { start: '18:00', end: '17:00', timezone: 'America/Chicago' },
  },
};

// ============================================================================
// TRADOVATE CLIENT CLASS
// ============================================================================

export class TradovateClient {
  private account: TradovateAccount;
  private baseUrl: string;
  private mdWsUrl: string;
  private tokenRefreshTimeout: NodeJS.Timeout | null = null;

  constructor(account: TradovateAccount) {
    this.account = account;
    
    // Use demo API for demo/funded accounts
    const isDemo = account.accountType === 'demo';
    this.baseUrl = isDemo ? TRADOVATE_DEMO_API_URL : TRADOVATE_API_URL;
    this.mdWsUrl = isDemo ? TRADOVATE_DEMO_MD_WS_URL : TRADOVATE_MD_WS_URL;

    // Schedule token refresh
    this.scheduleTokenRefresh();
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Authenticate with Tradovate using credentials
   * This is called during initial OAuth flow
   */
  static async authenticate(
    username: string,
    password: string,
    appId: string,
    cid: string,
    secret: string,
    isDemo: boolean = false
  ): Promise<TradovateCredentials> {
    const baseUrl = isDemo ? TRADOVATE_DEMO_API_URL : TRADOVATE_API_URL;

    const response = await tradovateAuthCircuitBreaker.execute(async () => {
      const res = await fetch(`${baseUrl}/auth/accesstokenrequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: username,
          password: password,
          appId: appId,
          appVersion: '1.0',
          deviceId: 'proptrader-web',
          cid: cid,
          sec: secret,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ errorText: 'Unknown error' }));
        throw new TradovateAPIError(
          error.errorText || 'Authentication failed',
          'AUTH_FAILED',
          res.status,
          res.status >= 500
        );
      }

      return res.json();
    });

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || response.accessToken,
      expiresIn: response.expirationTime || 7200,
      userId: response.userId,
      accountId: response.accountId,
    };
  }

  /**
   * Refresh access token before expiry
   */
  async refreshAccessToken(): Promise<void> {
    console.log('[TradovateClient] Refreshing access token...');

    const response = await tradovateAuthCircuitBreaker.execute(async () => {
      const res = await fetch(`${this.baseUrl}/auth/renewaccesstoken`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.account.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new TradovateAPIError(
          'Token refresh failed',
          'TOKEN_REFRESH_FAILED',
          res.status,
          res.status >= 500
        );
      }

      return res.json();
    });

    // Update account tokens
    this.account.accessToken = response.accessToken;
    this.account.tokenExpiresAt = new Date(Date.now() + (response.expirationTime || 7200) * 1000);

    // Reschedule next refresh
    this.scheduleTokenRefresh();

    console.log('[TradovateClient] Token refreshed, expires at:', this.account.tokenExpiresAt);
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }

    const expiresAt = this.account.tokenExpiresAt.getTime();
    const refreshAt = expiresAt - TOKEN_REFRESH_BUFFER_MS;
    const delay = Math.max(0, refreshAt - Date.now());

    this.tokenRefreshTimeout = setTimeout(() => {
      this.refreshAccessToken().catch((error) => {
        console.error('[TradovateClient] Failed to refresh token:', error);
      });
    }, delay);

    console.log(`[TradovateClient] Token refresh scheduled in ${Math.round(delay / 1000)}s`);
  }

  // ============================================================================
  // ACCOUNT INFO
  // ============================================================================

  /**
   * Get account information
   */
  async getAccount(): Promise<Record<string, unknown>> {
    return this.request('GET', `/account/item?id=${this.account.tradovateAccountId}`);
  }

  /**
   * Get current account balance
   */
  async getAccountBalance(): Promise<number> {
    const cashBalance = await this.request('GET', `/cashBalance/getCashBalanceSnapshot?accountId=${this.account.tradovateAccountId}`) as Record<string, number>;
    return (cashBalance.realizedPnl || 0) + (cashBalance.openPnl || 0) + (cashBalance.totalCashValue || 0);
  }

  /**
   * Get account positions
   */
  async getPositions(): Promise<Position[]> {
    const response = await this.request('GET', `/position/list?accountId=${this.account.tradovateAccountId}`);
    const positions = (Array.isArray(response) ? response : []) as Array<Record<string, unknown>>;
    
    return positions.map((p: Record<string, unknown>) => ({
      id: String(p.id),
      userId: this.account.userId,
      tradovateAccountId: this.account.id,
      symbol: p.contractId as string,
      direction: (p.netPos as number) > 0 ? 'long' : 'short',
      netQty: Math.abs(p.netPos as number),
      avgEntryPrice: p.netPrice as number,
      unrealizedPnl: p.openPnl as number,
      realizedPnl: 0,
      maxFavorableExcursion: 0,
      maxAdverseExcursion: 0,
      status: 'open' as const,
      openedAt: new Date(p.timestamp as string),
      updatedAt: new Date(),
    }));
  }

  // ============================================================================
  // SYMBOL RESOLUTION
  // ============================================================================

  /**
   * Resolve base instrument to current front month contract
   * Handles rollover logic
   */
  async resolveSymbol(instrument: string): Promise<string> {
    const baseSymbol = instrument.toUpperCase();
    
    if (!INSTRUMENT_SPECS[baseSymbol]) {
      throw new TradovateAPIError(
        `Unknown instrument: ${instrument}`,
        'UNKNOWN_INSTRUMENT',
        400,
        false
      );
    }

    // Get available contracts
    const contracts = await this.getContracts(baseSymbol);
    
    // Select front month based on volume and expiry
    const frontMonth = this.selectFrontMonth(contracts);
    
    return frontMonth.tradovateSymbol;
  }

  /**
   * Get available contracts for an instrument
   */
  async getContracts(baseSymbol: string): Promise<ContractInfo[]> {
    const products = await this.request('GET', '/contract/find?name=' + baseSymbol);
    
    if (!Array.isArray(products) || products.length === 0) {
      throw new TradovateAPIError(
        `No contracts found for ${baseSymbol}`,
        'NO_CONTRACTS',
        404,
        false
      );
    }

    const now = new Date();
    
    return products
      .filter((p: Record<string, unknown>) => {
        const expiryDate = new Date(p.expirationDate as string);
        return expiryDate > now;
      })
      .map((p: Record<string, unknown>) => ({
        baseInstrument: baseSymbol,
        tradovateSymbol: p.name as string,
        expiryDate: new Date(p.expirationDate as string),
        firstNoticeDate: p.firstNoticeDate ? new Date(p.firstNoticeDate as string) : undefined,
        isFrontMonth: p.isFront as boolean || false,
        tickSize: INSTRUMENT_SPECS[baseSymbol]?.tickSize || 0.25,
        pointValue: INSTRUMENT_SPECS[baseSymbol]?.pointValue || 50,
        dailyVolume: p.volume as number | undefined,
        openInterest: p.openInterest as number | undefined,
        isActive: true,
        lastUpdated: new Date(),
      }));
  }

  /**
   * Select front month contract based on volume and expiry
   * Per Issue #10: Don't trade contracts expiring in < 2 days
   */
  private selectFrontMonth(contracts: ContractInfo[]): ContractInfo {
    const now = new Date();
    
    // Filter out contracts expiring in < 2 days
    const eligible = contracts.filter((c) => {
      const daysUntilExpiry = (c.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry > 2;
    });

    if (eligible.length === 0) {
      throw new TradovateAPIError(
        'No eligible contracts available',
        'NO_ELIGIBLE_CONTRACTS',
        404,
        false
      );
    }

    // Sort by volume (highest first), then by expiry (soonest first)
    eligible.sort((a, b) => {
      if (a.dailyVolume && b.dailyVolume) {
        return b.dailyVolume - a.dailyVolume;
      }
      return a.expiryDate.getTime() - b.expiryDate.getTime();
    });

    return eligible[0];
  }

  /**
   * Check if contract is approaching rollover (within 5 days)
   */
  async checkRollover(symbol: string): Promise<{ 
    daysUntilExpiry: number; 
    shouldAlert: boolean;
    newSymbol?: string;
  }> {
    const contracts = await this.getContracts(symbol);
    const current = contracts.find((c) => c.tradovateSymbol === symbol);
    
    if (!current) {
      return { daysUntilExpiry: 999, shouldAlert: false };
    }

    const daysUntilExpiry = (current.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const shouldAlert = daysUntilExpiry <= 5 && daysUntilExpiry > 0;
    
    let newSymbol: string | undefined;
    if (shouldAlert) {
      const nextMonth = contracts.find((c) => 
        c.expiryDate > current.expiryDate && 
        (c.dailyVolume ?? 0) > (current.dailyVolume ?? 0) * 0.1
      );
      newSymbol = nextMonth?.tradovateSymbol;
    }

    return { daysUntilExpiry, shouldAlert, newSymbol };
  }

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================

  /**
   * Place an order
   */
  async placeOrder(order: TradovateOrderRequest): Promise<TradovateOrderResponse> {
    return tradovateOrdersCircuitBreaker.execute(async () => {
      const response = await this.request('POST', '/order/placeorder', {
        accountId: order.accountId,
        accountSpec: order.accountSpec,
        action: order.action,
        symbol: order.symbol,
        orderQty: order.orderQty,
        orderType: order.orderType,
        price: order.price,
        stopPrice: order.stopPrice,
        timeInForce: order.timeInForce || 'Day',
        isAutomated: order.isAutomated ?? true,
        customTag50: order.customTag50,
      }) as Record<string, unknown>;

      return {
        orderId: response.orderId as number,
        accountId: response.accountId as number,
        action: response.action as string,
        symbol: response.symbol as string,
        orderQty: response.orderQty as number,
        orderType: response.orderType as string,
        status: this.mapOrderStatus(String(response.ordStatus || '')),
        fillPrice: response.avgFillPrice as number | undefined,
        fillQty: response.filledQty as number | undefined,
        rejectReason: response.rejectReason as string | undefined,
        timestamp: response.timestamp as string,
      };
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(tradovateOrderId: number): Promise<void> {
    await tradovateOrdersCircuitBreaker.execute(async () => {
      await this.request('POST', '/order/cancelorder', {
        orderId: tradovateOrderId,
      });
    });
  }

  /**
   * Modify an order
   */
  async modifyOrder(
    tradovateOrderId: number,
    updates: { price?: number; stopPrice?: number; orderQty?: number }
  ): Promise<TradovateOrderResponse> {
    return tradovateOrdersCircuitBreaker.execute(async () => {
      const response = await this.request('POST', '/order/modifyorder', {
        orderId: tradovateOrderId,
        ...updates,
      }) as Record<string, unknown>;

      return {
        orderId: response.orderId as number,
        accountId: response.accountId as number,
        action: response.action as string,
        symbol: response.symbol as string,
        orderQty: response.orderQty as number,
        orderType: response.orderType as string,
        status: this.mapOrderStatus(String(response.ordStatus || '')),
        fillPrice: response.avgFillPrice as number | undefined,
        fillQty: response.filledQty as number | undefined,
        rejectReason: response.rejectReason as string | undefined,
        timestamp: response.timestamp as string,
      };
    });
  }

  /**
   * Get order status
   */
  async getOrderStatus(tradovateOrderId: number): Promise<{ 
    status: OrderStatus; 
    filledQty: number; 
    avgFillPrice?: number;
  }> {
    const order = await this.request('GET', `/order/item?id=${tradovateOrderId}`) as Record<string, unknown>;
    
    return {
      status: this.mapOrderStatus(String(order.ordStatus || '')),
      filledQty: (order.filledQty as number) || 0,
      avgFillPrice: order.avgFillPrice as number | undefined,
    };
  }

  /**
   * Get order history
   */
  async getOrderHistory(startDate: Date, endDate: Date): Promise<Order[]> {
    const response = await this.request('GET', `/order/list?accountId=${this.account.tradovateAccountId}`);
    const orders = (Array.isArray(response) ? response : []) as Array<Record<string, unknown>>;
    
    return orders
      .filter((o: Record<string, unknown>) => {
        const timestamp = new Date(o.timestamp as string);
        return timestamp >= startDate && timestamp <= endDate;
      })
      .map((o: Record<string, unknown>) => this.mapToOrder(o));
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  /**
   * Close a position by symbol
   */
  async closePosition(symbol: string): Promise<TradovateOrderResponse> {
    const positions = await this.getPositions();
    const position = positions.find((p) => p.symbol === symbol && p.status === 'open');

    if (!position) {
      throw new TradovateAPIError(
        `No open position for ${symbol}`,
        'NO_POSITION',
        404,
        false
      );
    }

    // Close with market order in opposite direction
    return this.placeOrder({
      accountId: this.account.tradovateAccountId,
      accountSpec: this.account.accountName,
      action: position.direction === 'long' ? 'Sell' : 'Buy',
      symbol,
      orderQty: position.netQty,
      orderType: 'Market',
      isAutomated: true,
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Make authenticated API request
   */
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.account.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ errorText: 'Unknown error' }));
      throw new TradovateAPIError(
        error.errorText || `Request failed: ${response.status}`,
        error.errorCode || 'REQUEST_FAILED',
        response.status,
        response.status >= 500
      );
    }

    return response.json();
  }

  /**
   * Map Tradovate order status to our OrderStatus type
   */
  private mapOrderStatus(tradovateStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'PendingNew': 'Pending',
      'Working': 'Working',
      'PartFilled': 'PartialFill',
      'Filled': 'Filled',
      'Canceled': 'Cancelled',
      'Cancelled': 'Cancelled',
      'Rejected': 'Rejected',
      'Expired': 'Expired',
    };

    return statusMap[tradovateStatus] || 'Pending';
  }

  /**
   * Map Tradovate order response to our Order type
   */
  private mapToOrder(o: Record<string, unknown>): Order {
    return {
      id: String(o.id),
      userId: this.account.userId,
      tradovateAccountId: this.account.id,
      tradovateOrderId: o.id as number,
      symbol: o.symbol as string || (o.contractId as string),
      action: o.action as 'Buy' | 'Sell',
      orderType: o.orderType as Order['orderType'],
      orderQty: o.orderQty as number,
      price: o.price as number | undefined,
      stopPrice: o.stopPrice as number | undefined,
      timeInForce: (o.timeInForce as Order['timeInForce']) || 'Day',
      filledQty: (o.filledQty as number) || 0,
      avgFillPrice: o.avgFillPrice as number | undefined,
      status: this.mapOrderStatus(o.ordStatus as string),
      rejectReason: o.rejectReason as string | undefined,
      source: 'manual',
      createdAt: new Date(o.timestamp as string),
      updatedAt: new Date(),
    };
  }

  /**
   * Get market data WebSocket URL
   */
  getMarketDataWebSocketUrl(): string {
    return this.mdWsUrl;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate idempotent setup ID
 * Format: strategyId-timestamp-direction
 */
export function generateSetupId(strategyId: string, timestamp: Date, direction?: string): string {
  const base = `${strategyId}-${timestamp.toISOString()}`;
  return direction ? `${base}-${direction}` : base;
}

/**
 * Calculate position size based on risk
 * Formula: Position = (Account × Risk%) ÷ (Stop × Point Value)
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  stopDistancePoints: number,
  instrument: string
): number {
  const spec = INSTRUMENT_SPECS[instrument.toUpperCase()];
  if (!spec) {
    throw new Error(`Unknown instrument: ${instrument}`);
  }

  const dollarRisk = accountBalance * riskPercent;
  const riskPerContract = stopDistancePoints * spec.pointValue;
  
  if (riskPerContract <= 0) {
    throw new Error('Invalid stop distance');
  }

  return Math.floor(dollarRisk / riskPerContract);
}

/**
 * Calculate stop price from ticks
 */
export function calculateStopPrice(
  entryPrice: number,
  stopTicks: number,
  direction: 'long' | 'short',
  instrument: string
): number {
  const spec = INSTRUMENT_SPECS[instrument.toUpperCase()];
  if (!spec) {
    throw new Error(`Unknown instrument: ${instrument}`);
  }

  const stopDistance = stopTicks * spec.tickSize;
  
  return direction === 'long' 
    ? entryPrice - stopDistance 
    : entryPrice + stopDistance;
}

/**
 * Calculate target price from R:R ratio
 */
export function calculateTargetPrice(
  entryPrice: number,
  stopPrice: number,
  rewardRiskRatio: number,
  direction: 'long' | 'short'
): number {
  const stopDistance = Math.abs(entryPrice - stopPrice);
  const targetDistance = stopDistance * rewardRiskRatio;
  
  return direction === 'long'
    ? entryPrice + targetDistance
    : entryPrice - targetDistance;
}
