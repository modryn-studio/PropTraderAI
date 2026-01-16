/**
 * Order Manager Component
 * 
 * Manages order lifecycle, fills, and state reconciliation.
 * Implements idempotency via setup_id and handles partial fills.
 * 
 * @module lib/execution/orderManager
 * @see Issue #10 - Component 6: Order & Position Manager
 */

import { createClient } from '@/lib/supabase/server';
import {
  Order,
  OrderCreateInput,
  OrderStatus,
  Fill,
  Position,
  ExecutionMetric,
  SafetyCheck,
  SafetyViolation,
  SafetyLimitError,
} from './types';
import { TradovateClient } from './tradovate';

// ============================================================================
// ORDER MANAGER CLASS
// ============================================================================

export class OrderManager {
  private tradovate: TradovateClient;
  private userId: string;

  constructor(tradovate: TradovateClient, userId: string) {
    this.tradovate = tradovate;
    this.userId = userId;
  }

  // ============================================================================
  // ORDER LIFECYCLE
  // ============================================================================

  /**
   * Create a new order with idempotency check
   * Returns existing order if setup_id already exists
   */
  async createOrder(input: OrderCreateInput): Promise<Order> {
    const supabase = await createClient();

    // Check idempotency: if setup_id exists, return existing order
    if (input.setupId) {
      const { data: existing } = await supabase
        .from('orders')
        .select('*')
        .eq('setup_id', input.setupId)
        .single();

      if (existing) {
        console.log(`[OrderManager] Order already exists for setup_id: ${input.setupId}`);
        return this.mapFromDb(existing);
      }
    }

    // Check safety limits before creating order
    const safetyCheck = await this.checkSafetyLimits(input);
    if (!safetyCheck.passed) {
      const violation = safetyCheck.violations.find(v => v.severity === 'blocked');
      if (violation) {
        throw new SafetyLimitError(violation.message, violation);
      }
    }

    // Insert order into database
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: this.userId,
        strategy_id: input.strategyId,
        tradovate_account_id: input.tradovateAccountId,
        setup_id: input.setupId,
        symbol: input.symbol,
        action: input.action,
        order_type: input.orderType,
        order_qty: input.orderQty,
        price: input.price,
        stop_price: input.stopPrice,
        time_in_force: input.timeInForce || 'Day',
        status: 'Pending',
        parent_order_id: input.parentOrderId,
        bracket_type: input.bracketType,
        source: input.source || 'copilot',
        notes: input.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('[OrderManager] Failed to create order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Submit order to Tradovate
   */
  async submitOrder(order: Order): Promise<Order> {
    const supabase = await createClient();

    try {
      // Resolve symbol to current front month
      const tradovateSymbol = await this.tradovate.resolveSymbol(order.symbol);

      // Get account details
      const { data: account } = await supabase
        .from('tradovate_accounts')
        .select('*')
        .eq('id', order.tradovateAccountId)
        .single();

      if (!account) {
        throw new Error('Tradovate account not found');
      }

      const startTime = Date.now();

      // Place order with Tradovate
      const response = await this.tradovate.placeOrder({
        accountId: account.tradovate_account_id,
        accountSpec: account.account_name,
        action: order.action,
        symbol: tradovateSymbol,
        orderQty: order.orderQty,
        orderType: order.orderType,
        price: order.price,
        stopPrice: order.stopPrice,
        timeInForce: order.timeInForce,
        isAutomated: true,
        customTag50: order.setupId,
      });

      const latencyMs = Date.now() - startTime;

      // Update order with Tradovate response
      const { data: updated, error } = await supabase
        .from('orders')
        .update({
          tradovate_order_id: response.orderId,
          status: response.status,
          filled_qty: response.fillQty || 0,
          avg_fill_price: response.fillPrice,
          reject_reason: response.rejectReason,
          submitted_at: new Date().toISOString(),
          filled_at: response.status === 'Filled' ? new Date().toISOString() : null,
        })
        .eq('id', order.id)
        .select()
        .single();

      if (error) {
        console.error('[OrderManager] Failed to update order:', error);
        throw new Error(`Failed to update order: ${error.message}`);
      }

      // Log metric
      await this.logMetric({
        eventType: response.status === 'Rejected' ? 'order_rejected' : 'order_placed',
        orderId: order.id,
        strategyId: order.strategyId,
        latencyMs,
        details: { tradovateOrderId: response.orderId },
      });

      return this.mapFromDb(updated);

    } catch (error) {
      // Update order as rejected
      await supabase
        .from('orders')
        .update({
          status: 'Rejected',
          reject_reason: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', order.id);

      throw error;
    }
  }

  /**
   * Update order status from Tradovate
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    filledQty?: number,
    avgFillPrice?: number
  ): Promise<Order> {
    const supabase = await createClient();

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (filledQty !== undefined) {
      updates.filled_qty = filledQty;
    }

    if (avgFillPrice !== undefined) {
      updates.avg_fill_price = avgFillPrice;
    }

    if (status === 'Filled') {
      updates.filled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }

    // Log metric for fills
    if (status === 'Filled') {
      await this.logMetric({
        eventType: 'order_filled',
        orderId,
        details: { filledQty, avgFillPrice },
      });
    }

    return this.mapFromDb(data);
  }

  /**
   * Record a fill for an order
   */
  async recordFill(
    orderId: string,
    tradovateFillId: number,
    qty: number,
    price: number,
    commission: number,
    timestamp: Date
  ): Promise<Fill> {
    const supabase = await createClient();

    // Check if fill already recorded (idempotency)
    const { data: existing } = await supabase
      .from('fills')
      .select('*')
      .eq('tradovate_fill_id', tradovateFillId)
      .single();

    if (existing) {
      return this.mapFillFromDb(existing);
    }

    // Insert fill
    const { data: fill, error } = await supabase
      .from('fills')
      .insert({
        order_id: orderId,
        user_id: this.userId,
        tradovate_fill_id: tradovateFillId,
        qty,
        price,
        commission,
        fill_timestamp: timestamp.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record fill: ${error.message}`);
    }

    // Update order's filled_qty and avg_fill_price
    await this.recalculateOrderFills(orderId);

    return this.mapFillFromDb(fill);
  }

  /**
   * Recalculate order fills after new fill recorded
   */
  private async recalculateOrderFills(orderId: string): Promise<void> {
    const supabase = await createClient();

    // Get all fills for this order
    const { data: fills } = await supabase
      .from('fills')
      .select('*')
      .eq('order_id', orderId);

    if (!fills || fills.length === 0) return;

    // Calculate totals
    const totalQty = fills.reduce((sum, f) => sum + f.qty, 0);
    const weightedPrice = fills.reduce((sum, f) => sum + f.qty * f.price, 0) / totalQty;

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('order_qty')
      .eq('id', orderId)
      .single();

    // Determine new status
    let newStatus: OrderStatus = 'Working';
    if (order && totalQty >= order.order_qty) {
      newStatus = 'Filled';
    } else if (totalQty > 0) {
      newStatus = 'PartialFill';
    }

    // Update order
    await supabase
      .from('orders')
      .update({
        filled_qty: totalQty,
        avg_fill_price: weightedPrice,
        status: newStatus,
        filled_at: newStatus === 'Filled' ? new Date().toISOString() : null,
      })
      .eq('id', orderId);
  }

  // ============================================================================
  // ORDER QUERIES
  // ============================================================================

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', this.userId)
      .single();

    return data ? this.mapFromDb(data) : null;
  }

  /**
   * Get order by setup_id (for idempotency check)
   */
  async getOrderBySetupId(setupId: string): Promise<Order | null> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('setup_id', setupId)
      .eq('user_id', this.userId)
      .single();

    return data ? this.mapFromDb(data) : null;
  }

  /**
   * Get all working orders
   */
  async getWorkingOrders(): Promise<Order[]> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', this.userId)
      .in('status', ['Pending', 'Working', 'PartialFill']);

    return (data || []).map(this.mapFromDb);
  }

  /**
   * Get orders for a strategy
   */
  async getOrdersForStrategy(strategyId: string): Promise<Order[]> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('strategy_id', strategyId)
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });

    return (data || []).map(this.mapFromDb);
  }

  // ============================================================================
  // STATE RECONCILIATION
  // ============================================================================

  /**
   * Reconcile order state with Tradovate
   * Called after WebSocket reconnection
   */
  async reconcileOrders(): Promise<void> {
    console.log('[OrderManager] Reconciling orders with Tradovate...');

    const workingOrders = await this.getWorkingOrders();

    for (const order of workingOrders) {
      if (!order.tradovateOrderId) continue;

      try {
        const status = await this.tradovate.getOrderStatus(order.tradovateOrderId);

        if (status.status !== order.status || status.filledQty !== order.filledQty) {
          console.log(`[OrderManager] Updating order ${order.id}: ${order.status} → ${status.status}`);
          
          await this.updateOrderStatus(
            order.id,
            status.status,
            status.filledQty,
            status.avgFillPrice
          );
        }
      } catch (error) {
        console.error(`[OrderManager] Failed to reconcile order ${order.id}:`, error);
      }
    }

    console.log('[OrderManager] Reconciliation complete');
  }

  // ============================================================================
  // SAFETY LIMITS
  // ============================================================================

  /**
   * Check safety limits before placing order
   */
  async checkSafetyLimits(input: OrderCreateInput): Promise<SafetyCheck> {
    const supabase = await createClient();
    const violations: SafetyViolation[] = [];

    // Get account-level limits
    const { data: accountLimits } = await supabase
      .from('safety_limits')
      .select('*')
      .eq('tradovate_account_id', input.tradovateAccountId)
      .eq('is_active', true)
      .single();

    // Get strategy-level limits
    let strategyLimits = null;
    if (input.strategyId) {
      const { data } = await supabase
        .from('safety_limits')
        .select('*')
        .eq('strategy_id', input.strategyId)
        .eq('is_active', true)
        .single();
      strategyLimits = data;
    }

    // Check position size limits
    if (accountLimits?.max_position_size && input.orderQty > accountLimits.max_position_size) {
      violations.push({
        type: 'position_size',
        message: `Position size ${input.orderQty} exceeds account limit of ${accountLimits.max_position_size}`,
        currentValue: input.orderQty,
        limit: accountLimits.max_position_size,
        severity: 'blocked',
      });
    }

    if (strategyLimits?.max_position_size && input.orderQty > strategyLimits.max_position_size) {
      violations.push({
        type: 'position_size',
        message: `Position size ${input.orderQty} exceeds strategy limit of ${strategyLimits.max_position_size}`,
        currentValue: input.orderQty,
        limit: strategyLimits.max_position_size,
        severity: 'blocked',
      });
    }

    // Check concurrent positions limit
    if (accountLimits?.max_concurrent_positions) {
      const { count } = await supabase
        .from('positions')
        .select('*', { count: 'exact', head: true })
        .eq('tradovate_account_id', input.tradovateAccountId)
        .eq('status', 'open');

      if (count && count >= accountLimits.max_concurrent_positions) {
        violations.push({
          type: 'concurrent_positions',
          message: `Maximum concurrent positions (${accountLimits.max_concurrent_positions}) reached`,
          currentValue: count,
          limit: accountLimits.max_concurrent_positions,
          severity: 'blocked',
        });
      }
    }

    // Check daily trade limit
    if (accountLimits?.max_daily_trades) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('tradovate_account_id', input.tradovateAccountId)
        .gte('created_at', today.toISOString());

      if (count && count >= accountLimits.max_daily_trades) {
        violations.push({
          type: 'daily_trades',
          message: `Maximum daily trades (${accountLimits.max_daily_trades}) reached`,
          currentValue: count,
          limit: accountLimits.max_daily_trades,
          severity: 'blocked',
        });
      }
    }

    // Check daily loss limit
    if (accountLimits?.max_daily_loss) {
      const todayPnl = await this.calculateDailyPnl(input.tradovateAccountId);

      if (todayPnl <= -accountLimits.max_daily_loss) {
        violations.push({
          type: 'daily_loss',
          message: `Daily loss limit ($${accountLimits.max_daily_loss}) reached`,
          currentValue: Math.abs(todayPnl),
          limit: accountLimits.max_daily_loss,
          severity: 'blocked',
        });
      }
    }

    return {
      passed: violations.filter(v => v.severity === 'blocked').length === 0,
      violations,
    };
  }

  /**
   * Calculate today's P&L for an account
   */
  async calculateDailyPnl(tradovateAccountId: string): Promise<number> {
    const supabase = await createClient();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get closed positions from today
    const { data: positions } = await supabase
      .from('positions')
      .select('realized_pnl')
      .eq('tradovate_account_id', tradovateAccountId)
      .eq('status', 'closed')
      .gte('closed_at', today.toISOString());

    const realizedPnl = (positions || []).reduce((sum, p) => sum + (p.realized_pnl || 0), 0);

    // Get unrealized P&L from open positions
    const { data: openPositions } = await supabase
      .from('positions')
      .select('unrealized_pnl')
      .eq('tradovate_account_id', tradovateAccountId)
      .eq('status', 'open');

    const unrealizedPnl = (openPositions || []).reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

    return realizedPnl + unrealizedPnl;
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  /**
   * Log execution metric
   */
  private async logMetric(metric: Omit<ExecutionMetric, 'id' | 'userId' | 'createdAt'>): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('execution_metrics')
      .insert({
        user_id: this.userId,
        strategy_id: metric.strategyId,
        order_id: metric.orderId,
        event_type: metric.eventType,
        latency_ms: metric.latencyMs,
        slippage_ticks: metric.slippageTicks,
        details: metric.details,
      });
  }

  // ============================================================================
  // MAPPING HELPERS
  // ============================================================================

  private mapFromDb(row: Record<string, unknown>): Order {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      strategyId: row.strategy_id as string | undefined,
      tradovateAccountId: row.tradovate_account_id as string,
      setupId: row.setup_id as string | undefined,
      tradovateOrderId: row.tradovate_order_id as number | undefined,
      symbol: row.symbol as string,
      action: row.action as Order['action'],
      orderType: row.order_type as Order['orderType'],
      orderQty: row.order_qty as number,
      price: row.price as number | undefined,
      stopPrice: row.stop_price as number | undefined,
      timeInForce: row.time_in_force as Order['timeInForce'],
      filledQty: row.filled_qty as number || 0,
      avgFillPrice: row.avg_fill_price as number | undefined,
      status: row.status as OrderStatus,
      rejectReason: row.reject_reason as string | undefined,
      parentOrderId: row.parent_order_id as string | undefined,
      bracketType: row.bracket_type as Order['bracketType'],
      source: row.source as Order['source'],
      notes: row.notes as string | undefined,
      createdAt: new Date(row.created_at as string),
      submittedAt: row.submitted_at ? new Date(row.submitted_at as string) : undefined,
      filledAt: row.filled_at ? new Date(row.filled_at as string) : undefined,
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapFillFromDb(row: Record<string, unknown>): Fill {
    return {
      id: row.id as string,
      orderId: row.order_id as string,
      userId: row.user_id as string,
      tradovateFillId: row.tradovate_fill_id as number | undefined,
      qty: row.qty as number,
      price: row.price as number,
      commission: row.commission as number || 0,
      fillTimestamp: new Date(row.fill_timestamp as string),
      createdAt: new Date(row.created_at as string),
    };
  }
}

// ============================================================================
// POSITION MANAGER
// ============================================================================

export class PositionManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Open a new position from a filled order
   */
  async openPosition(
    order: Order,
    stopPrice?: number,
    targetPrice?: number
  ): Promise<Position> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('positions')
      .insert({
        user_id: this.userId,
        strategy_id: order.strategyId,
        tradovate_account_id: order.tradovateAccountId,
        symbol: order.symbol,
        direction: order.action === 'Buy' ? 'long' : 'short',
        net_qty: order.filledQty,
        avg_entry_price: order.avgFillPrice,
        stop_price: stopPrice,
        target_price: targetPrice,
        entry_order_id: order.id,
        status: 'open',
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to open position: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Update position P&L
   */
  async updatePositionPnl(
    positionId: string,
    currentPrice: number
  ): Promise<void> {
    const supabase = await createClient();

    const { data: position } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .single();

    if (!position) return;

    const direction = position.direction as 'long' | 'short';
    const entryPrice = position.avg_entry_price as number;
    const qty = position.net_qty as number;

    // Calculate unrealized P&L
    const priceDiff = direction === 'long' 
      ? currentPrice - entryPrice 
      : entryPrice - currentPrice;
    
    // Note: Need to multiply by point value for accurate P&L
    const unrealizedPnl = priceDiff * qty;

    // Update MFE/MAE
    const currentMfe = position.max_favorable_excursion as number || 0;
    const currentMae = position.max_adverse_excursion as number || 0;
    
    const newMfe = Math.max(currentMfe, unrealizedPnl);
    const newMae = Math.min(currentMae, unrealizedPnl);

    await supabase
      .from('positions')
      .update({
        unrealized_pnl: unrealizedPnl,
        max_favorable_excursion: newMfe,
        max_adverse_excursion: newMae,
        updated_at: new Date().toISOString(),
      })
      .eq('id', positionId);
  }

  /**
   * Close a position
   */
  async closePosition(
    positionId: string,
    closePrice: number,
    reason: Position['closeReason']
  ): Promise<Position> {
    const supabase = await createClient();

    const { data: position } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .single();

    if (!position) {
      throw new Error('Position not found');
    }

    const direction = position.direction as 'long' | 'short';
    const entryPrice = position.avg_entry_price as number;
    const qty = position.net_qty as number;

    // Calculate realized P&L
    const priceDiff = direction === 'long' 
      ? closePrice - entryPrice 
      : entryPrice - closePrice;
    
    const realizedPnl = priceDiff * qty;

    const { data, error } = await supabase
      .from('positions')
      .update({
        status: 'closed',
        close_reason: reason,
        realized_pnl: realizedPnl,
        unrealized_pnl: 0,
        closed_at: new Date().toISOString(),
      })
      .eq('id', positionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to close position: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Get open positions
   */
  async getOpenPositions(tradovateAccountId?: string): Promise<Position[]> {
    const supabase = await createClient();

    let query = supabase
      .from('positions')
      .select('*')
      .eq('user_id', this.userId)
      .eq('status', 'open');

    if (tradovateAccountId) {
      query = query.eq('tradovate_account_id', tradovateAccountId);
    }

    const { data } = await query;

    return (data || []).map(this.mapFromDb);
  }

  /**
   * Get active risk across all positions
   */
  async getAccountRisk(tradovateAccountId: string): Promise<{
    totalRisk: number;
    positionCount: number;
    riskByStrategy: Record<string, number>;
  }> {
    const positions = await this.getOpenPositions(tradovateAccountId);

    const riskByStrategy: Record<string, number> = {};
    let totalRisk = 0;

    for (const position of positions) {
      if (position.stopPrice && position.avgEntryPrice) {
        const stopDistance = Math.abs(position.avgEntryPrice - position.stopPrice);
        const positionRisk = stopDistance * position.netQty;
        
        totalRisk += positionRisk;
        
        if (position.strategyId) {
          riskByStrategy[position.strategyId] = 
            (riskByStrategy[position.strategyId] || 0) + positionRisk;
        }
      }
    }

    return {
      totalRisk,
      positionCount: positions.length,
      riskByStrategy,
    };
  }

  private mapFromDb(row: Record<string, unknown>): Position {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      strategyId: row.strategy_id as string | undefined,
      tradovateAccountId: row.tradovate_account_id as string,
      symbol: row.symbol as string,
      direction: row.direction as Position['direction'],
      netQty: row.net_qty as number,
      avgEntryPrice: row.avg_entry_price as number,
      stopPrice: row.stop_price as number | undefined,
      targetPrice: row.target_price as number | undefined,
      stopOrderId: row.stop_order_id as string | undefined,
      targetOrderId: row.target_order_id as string | undefined,
      unrealizedPnl: row.unrealized_pnl as number || 0,
      realizedPnl: row.realized_pnl as number || 0,
      maxFavorableExcursion: row.max_favorable_excursion as number || 0,
      maxAdverseExcursion: row.max_adverse_excursion as number || 0,
      status: row.status as Position['status'],
      closeReason: row.close_reason as Position['closeReason'],
      entryOrderId: row.entry_order_id as string | undefined,
      openedAt: new Date(row.opened_at as string),
      closedAt: row.closed_at ? new Date(row.closed_at as string) : undefined,
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
