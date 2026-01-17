/**
 * Strategy State Persistence
 * 
 * Persists runtime strategy state (like opening range) to database
 * so it survives engine restarts. Critical for intraday strategies.
 * 
 * Per Agent 1 Code Review Issue #6:
 * - Opening range calculated at 9:45 AM must survive Railway restarts
 * - Without this, strategies break if engine restarts mid-session
 * 
 * @module lib/execution/strategyState
 * @see Issue #10 - Strategy State Persistence
 */

import { getDatabaseSync } from './database';
import type { OpeningRange } from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Types of state that can be persisted
 */
export type StrategyStateType = 
  | 'opening_range'
  | 'ema_anchor'
  | 'session_stats'
  | 'last_entry'
  | 'cooldown';

/**
 * Opening range state structure
 */
export interface OpeningRangeState {
  high: number;
  low: number;
  startTime: string; // ISO timestamp
  endTime: string;   // ISO timestamp
  isComplete: boolean;
}

/**
 * Session statistics state
 */
export interface SessionStatsState {
  tradesExecuted: number;
  tradesWon: number;
  tradesLost: number;
  totalPnL: number;
  lastTradeTime: string;
}

/**
 * Last entry state (for cooldown / revenge trade detection)
 */
export interface LastEntryState {
  entryTime: string;
  entryPrice: number;
  direction: 'long' | 'short';
  outcome?: 'win' | 'loss' | 'pending';
  exitTime?: string;
  exitPrice?: number;
  pnl?: number;
}

/**
 * Cooldown state (after loss, prevent immediate re-entry)
 */
export interface CooldownState {
  reason: 'loss' | 'manual' | 'daily_limit' | 'consecutive_failures';
  startTime: string;
  endTime: string;
  previousLoss?: number;
}

/**
 * Generic strategy state record from database
 */
export interface StrategyStateRecord {
  id: string;
  strategy_id: string;
  user_id: string;
  state_type: StrategyStateType;
  state_data: unknown;
  calculated_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STRATEGY STATE MANAGER
// ============================================================================

/**
 * Manages persistence and retrieval of strategy runtime state
 */
export class StrategyStateManager {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  // ==========================================================================
  // OPENING RANGE STATE
  // ==========================================================================
  
  /**
   * Save opening range state for a strategy
   * Expires at market close (4:00 PM ET)
   */
  async saveOpeningRange(
    strategyId: string,
    openingRange: OpeningRange
  ): Promise<void> {
    const db = getDatabaseSync();
    
    const stateData: OpeningRangeState = {
      high: openingRange.high,
      low: openingRange.low,
      startTime: typeof openingRange.startTime === 'string' 
        ? openingRange.startTime 
        : openingRange.startTime.toISOString(),
      endTime: typeof openingRange.endTime === 'string'
        ? openingRange.endTime
        : openingRange.endTime.toISOString(),
      isComplete: openingRange.isComplete,
    };
    
    const { error } = await db.from('strategy_state').upsert({
      strategy_id: strategyId,
      user_id: this.userId,
      state_type: 'opening_range',
      state_data: stateData,
      calculated_at: new Date().toISOString(),
      expires_at: this.getMarketCloseTime().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'strategy_id,state_type',
    });
    
    if (error) {
      console.error('[StrategyState] Failed to save opening range:', error);
      throw error;
    }
    
    console.log(`[StrategyState] Saved opening range for strategy ${strategyId}: ${openingRange.high}/${openingRange.low}`);
  }
  
  /**
   * Restore opening range state for a strategy
   * Returns null if not found or expired
   */
  async restoreOpeningRange(strategyId: string): Promise<OpeningRange | null> {
    const db = getDatabaseSync();
    
    const { data, error } = await db
      .from('strategy_state')
      .select('*')
      .eq('strategy_id', strategyId)
      .eq('state_type', 'opening_range')
      .single();
    
    if (error || !data) {
      console.log(`[StrategyState] No opening range found for strategy ${strategyId}`);
      return null;
    }
    
    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log(`[StrategyState] Opening range expired for strategy ${strategyId}`);
      // Clean up expired state
      await this.deleteState(strategyId, 'opening_range');
      return null;
    }
    
    const stateData = data.state_data as OpeningRangeState;
    
    const openingRange: OpeningRange = {
      high: stateData.high,
      low: stateData.low,
      startTime: new Date(stateData.startTime),
      endTime: stateData.endTime,
      isComplete: stateData.isComplete,
    };
    
    console.log(`[StrategyState] Restored opening range for strategy ${strategyId}: ${openingRange.high}/${openingRange.low}`);
    return openingRange;
  }
  
  // ==========================================================================
  // SESSION STATS STATE
  // ==========================================================================
  
  /**
   * Save session statistics
   */
  async saveSessionStats(
    strategyId: string,
    stats: SessionStatsState
  ): Promise<void> {
    const db = getDatabaseSync();
    
    const { error } = await db.from('strategy_state').upsert({
      strategy_id: strategyId,
      user_id: this.userId,
      state_type: 'session_stats',
      state_data: stats,
      calculated_at: new Date().toISOString(),
      expires_at: this.getMarketCloseTime().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'strategy_id,state_type',
    });
    
    if (error) {
      console.error('[StrategyState] Failed to save session stats:', error);
      throw error;
    }
  }
  
  /**
   * Restore session statistics
   */
  async restoreSessionStats(strategyId: string): Promise<SessionStatsState | null> {
    const db = getDatabaseSync();
    
    const { data, error } = await db
      .from('strategy_state')
      .select('*')
      .eq('strategy_id', strategyId)
      .eq('state_type', 'session_stats')
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await this.deleteState(strategyId, 'session_stats');
      return null;
    }
    
    return data.state_data as SessionStatsState;
  }
  
  // ==========================================================================
  // LAST ENTRY STATE
  // ==========================================================================
  
  /**
   * Save last entry for revenge trade detection
   */
  async saveLastEntry(
    strategyId: string,
    entry: LastEntryState
  ): Promise<void> {
    const db = getDatabaseSync();
    
    const { error } = await db.from('strategy_state').upsert({
      strategy_id: strategyId,
      user_id: this.userId,
      state_type: 'last_entry',
      state_data: entry,
      calculated_at: new Date().toISOString(),
      expires_at: this.getMarketCloseTime().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'strategy_id,state_type',
    });
    
    if (error) {
      console.error('[StrategyState] Failed to save last entry:', error);
      throw error;
    }
  }
  
  /**
   * Restore last entry
   */
  async restoreLastEntry(strategyId: string): Promise<LastEntryState | null> {
    const db = getDatabaseSync();
    
    const { data, error } = await db
      .from('strategy_state')
      .select('*')
      .eq('strategy_id', strategyId)
      .eq('state_type', 'last_entry')
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await this.deleteState(strategyId, 'last_entry');
      return null;
    }
    
    return data.state_data as LastEntryState;
  }
  
  // ==========================================================================
  // COOLDOWN STATE
  // ==========================================================================
  
  /**
   * Set a cooldown period (prevents trading)
   */
  async setCooldown(
    strategyId: string,
    reason: CooldownState['reason'],
    durationMinutes: number,
    previousLoss?: number
  ): Promise<void> {
    const db = getDatabaseSync();
    
    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
    
    const cooldown: CooldownState = {
      reason,
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      previousLoss,
    };
    
    const { error } = await db.from('strategy_state').upsert({
      strategy_id: strategyId,
      user_id: this.userId,
      state_type: 'cooldown',
      state_data: cooldown,
      calculated_at: now.toISOString(),
      expires_at: endTime.toISOString(),
      updated_at: now.toISOString(),
    }, {
      onConflict: 'strategy_id,state_type',
    });
    
    if (error) {
      console.error('[StrategyState] Failed to set cooldown:', error);
      throw error;
    }
    
    console.log(`[StrategyState] Cooldown set for strategy ${strategyId}: ${durationMinutes} minutes (${reason})`);
  }
  
  /**
   * Check if strategy is in cooldown
   */
  async isInCooldown(strategyId: string): Promise<{
    inCooldown: boolean;
    cooldown?: CooldownState;
    remainingMinutes?: number;
  }> {
    const db = getDatabaseSync();
    
    const { data, error } = await db
      .from('strategy_state')
      .select('*')
      .eq('strategy_id', strategyId)
      .eq('state_type', 'cooldown')
      .single();
    
    if (error || !data) {
      return { inCooldown: false };
    }
    
    const cooldown = data.state_data as CooldownState;
    const now = new Date();
    const endTime = new Date(cooldown.endTime);
    
    if (now >= endTime) {
      // Cooldown expired, clean up
      await this.deleteState(strategyId, 'cooldown');
      return { inCooldown: false };
    }
    
    const remainingMs = endTime.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    
    return {
      inCooldown: true,
      cooldown,
      remainingMinutes,
    };
  }
  
  /**
   * Clear cooldown early
   */
  async clearCooldown(strategyId: string): Promise<void> {
    await this.deleteState(strategyId, 'cooldown');
    console.log(`[StrategyState] Cooldown cleared for strategy ${strategyId}`);
  }
  
  // ==========================================================================
  // GENERIC STATE OPERATIONS
  // ==========================================================================
  
  /**
   * Save arbitrary state
   */
  async saveState<T>(
    strategyId: string,
    stateType: StrategyStateType,
    stateData: T,
    expiresAt?: Date
  ): Promise<void> {
    const db = getDatabaseSync();
    
    const { error } = await db.from('strategy_state').upsert({
      strategy_id: strategyId,
      user_id: this.userId,
      state_type: stateType,
      state_data: stateData as object,
      calculated_at: new Date().toISOString(),
      expires_at: expiresAt?.toISOString() || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'strategy_id,state_type',
    });
    
    if (error) {
      console.error(`[StrategyState] Failed to save ${stateType}:`, error);
      throw error;
    }
  }
  
  /**
   * Restore arbitrary state
   */
  async restoreState<T>(
    strategyId: string,
    stateType: StrategyStateType
  ): Promise<T | null> {
    const db = getDatabaseSync();
    
    const { data, error } = await db
      .from('strategy_state')
      .select('*')
      .eq('strategy_id', strategyId)
      .eq('state_type', stateType)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await this.deleteState(strategyId, stateType);
      return null;
    }
    
    return data.state_data as T;
  }
  
  /**
   * Delete specific state
   */
  async deleteState(strategyId: string, stateType: StrategyStateType): Promise<void> {
    const db = getDatabaseSync();
    
    const { error } = await db
      .from('strategy_state')
      .delete()
      .eq('strategy_id', strategyId)
      .eq('state_type', stateType);
    
    if (error) {
      console.error(`[StrategyState] Failed to delete ${stateType}:`, error);
    }
  }
  
  /**
   * Delete all states for a strategy
   */
  async clearAllStates(strategyId: string): Promise<void> {
    const db = getDatabaseSync();
    
    const { error } = await db
      .from('strategy_state')
      .delete()
      .eq('strategy_id', strategyId);
    
    if (error) {
      console.error('[StrategyState] Failed to clear all states:', error);
      throw error;
    }
    
    console.log(`[StrategyState] Cleared all states for strategy ${strategyId}`);
  }
  
  /**
   * Get all states for a strategy
   */
  async getAllStates(strategyId: string): Promise<StrategyStateRecord[]> {
    const db = getDatabaseSync();
    
    const { data, error } = await db
      .from('strategy_state')
      .select('*')
      .eq('strategy_id', strategyId);
    
    if (error) {
      console.error('[StrategyState] Failed to get all states:', error);
      return [];
    }
    
    return (data as StrategyStateRecord[]) || [];
  }
  
  // ==========================================================================
  // BATCH OPERATIONS (for engine startup/shutdown)
  // ==========================================================================
  
  /**
   * Restore all states for multiple strategies at once (engine startup)
   */
  async restoreAllStatesForStrategies(
    strategyIds: string[]
  ): Promise<Map<string, Map<StrategyStateType, unknown>>> {
    const db = getDatabaseSync();
    
    const { data, error } = await db
      .from('strategy_state')
      .select('*')
      .in('strategy_id', strategyIds)
      .gt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('[StrategyState] Failed to restore batch states:', error);
      return new Map();
    }
    
    const result = new Map<string, Map<StrategyStateType, unknown>>();
    
    for (const record of (data || []) as StrategyStateRecord[]) {
      if (!result.has(record.strategy_id)) {
        result.set(record.strategy_id, new Map());
      }
      result.get(record.strategy_id)!.set(record.state_type, record.state_data);
    }
    
    console.log(`[StrategyState] Restored states for ${result.size} strategies`);
    return result;
  }
  
  /**
   * Clear all expired states (housekeeping)
   */
  async cleanupExpiredStates(): Promise<number> {
    const db = getDatabaseSync();
    
    const { data, error } = await db
      .from('strategy_state')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');
    
    if (error) {
      console.error('[StrategyState] Failed to cleanup expired states:', error);
      return 0;
    }
    
    const count = data?.length || 0;
    if (count > 0) {
      console.log(`[StrategyState] Cleaned up ${count} expired states`);
    }
    
    return count;
  }
  
  // ==========================================================================
  // UTILITIES
  // ==========================================================================
  
  /**
   * Get market close time for today (4:00 PM ET)
   */
  private getMarketCloseTime(): Date {
    const now = new Date();
    
    // Create today's date in ET timezone
    const etOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    
    const etDate = now.toLocaleDateString('en-US', etOptions);
    const [month, day, year] = etDate.split('/');
    
    // 4:00 PM ET
    const closeTime = new Date(`${year}-${month}-${day}T16:00:00-05:00`);
    
    // If current time is past close, return tomorrow's close
    if (now > closeTime) {
      closeTime.setDate(closeTime.getDate() + 1);
    }
    
    return closeTime;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a strategy state manager for a user
 */
export function createStrategyStateManager(userId: string): StrategyStateManager {
  return new StrategyStateManager(userId);
}
