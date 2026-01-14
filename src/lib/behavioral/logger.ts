import { createClient } from '@/lib/supabase/client';

/**
 * Behavioral Event Types
 * 
 * These events build our data moat (PATH 2).
 * Log everything from Day 1 - ML models come later.
 */
export type BehavioralEventType =
  // Trade events
  | 'trade_executed'
  | 'trade_rejected'
  | 'order_placed'
  | 'order_cancelled'
  
  // Strategy events
  | 'strategy_created'
  | 'strategy_updated'
  | 'strategy_activated'
  | 'strategy_paused'
  | 'strategy_saved_incomplete'
  | 'screenshot_analyzed'
  | 'timezone_conversion_applied'
  
  // Strategy chat events (Strategy Builder)
  | 'strategy_chat_message_sent'
  | 'strategy_clarification_requested'
  | 'strategy_conversation_completed'
  | 'strategy_conversation_abandoned'
  | 'multi_strategy_cta_shown'
  | 'multi_strategy_cta_clicked'
  | 'dashboard_add_strategy_clicked'
  
  // Smart Tools events (Token savings initiative)
  | 'smart_tool_shown'
  | 'smart_tool_completed'
  | 'smart_tool_dismissed'
  | 'smart_tool_interaction'
  
  // Validation events (Firm rules)
  | 'strategy_validated'
  | 'validation_warnings_ignored'
  | 'strategy_revision_after_validation'
  
  // Protection events (PATH 2 core)
  | 'pre_trade_check'
  | 'near_violation'
  | 'violation_prevented'
  | 'alert_shown'
  | 'alert_dismissed'
  | 'warning_acknowledged'
  
  // Tilt detection (silent in Phase 1)
  | 'tilt_signal_detected'
  | 'revenge_trade_detected'
  | 'overtrading_detected'
  | 'boredom_trade_detected'
  
  // Session events
  | 'session_start'
  | 'session_end'
  | 'app_opened'
  | 'app_backgrounded'
  
  // User actions
  | 'broker_connected'
  | 'broker_disconnected'
  | 'challenge_started'
  | 'challenge_passed'
  | 'challenge_failed'
  
  // Animation events (Strategy visualization)
  | 'animation_generated'
  | 'animation_viewed'
  | 'animation_updated'
  | 'animation_dismissed_quickly'
  | 'animation_generation_failed'
  | 'strategy_confirmed_with_animation'
  | 'strategy_confirmed_without_animation'
  
  // Trading Intelligence events (Professional coaching)
  | 'trading_intelligence_used'
  | 'intelligence_phase_transition'
  | 'critical_error_detected'
  | 'critical_error_corrected'
  | 'response_validation_failed'
  | 'professional_standard_enforced'
  
  // Rapid Flow events (Expertise detection & smart defaults)
  | 'expertise_detected'
  | 'smart_defaults_applied'
  | 'completeness_calculated'
  | 'template_offered'
  | 'template_accepted'
  
  // API error events
  | 'claude_api_error'
  
  // Rule streaming events (Claude update_rule tool)
  | 'rule_updated_via_tool';

export interface ChallengeStatus {
  challengeId?: string;
  firmName?: string;
  accountSize?: number;
  dailyPnl?: number;
  totalPnl?: number;
  dailyLimitUsed?: number; // percentage (0-100)
  drawdownUsed?: number; // percentage (0-100)
  tradeCount?: number;
}

export interface SessionContext {
  sessionId?: string;
  sessionStartTime?: string;
  tradesThisSession?: number;
  lossesThisSession?: number;
  winsThisSession?: number;
  timeSinceLastTrade?: number; // minutes
  timeSinceLastLoss?: number; // minutes
}

export interface BehavioralEventData {
  // Generic data object - structure varies by event type
  [key: string]: unknown;
}

/**
 * Log a behavioral event to the database
 * 
 * Call this EVERYWHERE. This data is our moat.
 * 
 * @example
 * // After a trade is executed
 * await logBehavioralEvent(userId, 'trade_executed', {
 *   symbol: 'ES',
 *   side: 'long',
 *   size: 2,
 *   price: 4520.50,
 *   pnl: 150,
 * });
 * 
 * @example
 * // When we prevent a violation
 * await logBehavioralEvent(userId, 'violation_prevented', {
 *   violationType: 'daily_loss_limit',
 *   amountProtected: 1200,
 *   limitUsedBefore: 78,
 *   attemptedTradeSize: 3,
 * }, challengeStatus);
 */
export async function logBehavioralEvent(
  userId: string,
  eventType: BehavioralEventType,
  eventData: BehavioralEventData,
  challengeStatus?: ChallengeStatus,
  sessionContext?: SessionContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase.from('behavioral_data').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      challenge_status: challengeStatus || null,
      session_context: sessionContext || null,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('[Behavioral Logger] Failed to log event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Behavioral Logger] Exception:', message);
    return { success: false, error: message };
  }
}

/**
 * Server-side version of logBehavioralEvent
 * 
 * Use this in API routes where you already have an authenticated Supabase client.
 * Pass in the server Supabase client to avoid RLS policy issues.
 * 
 * @example
 * // In an API route
 * const supabase = await createClient(); // server client
 * await logBehavioralEventServer(supabase, userId, 'trade_executed', { ... });
 */
export async function logBehavioralEventServer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any, // Accept any Supabase client (server or browser)
  userId: string,
  eventType: BehavioralEventType,
  eventData: BehavioralEventData,
  challengeStatus?: ChallengeStatus,
  sessionContext?: SessionContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('behavioral_data').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      challenge_status: challengeStatus || null,
      session_context: sessionContext || null,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('[Behavioral Logger] Failed to log event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Behavioral Logger] Exception:', message);
    return { success: false, error: message };
  }
}

/**
 * Calculate tilt score based on behavioral signals
 * 
 * Runs silently in Phase 1 (logged but not shown to user)
 * UI appears in Phase 2 when advanced_mode is enabled
 * 
 * @returns Score 0-100. Higher = more likely tilted
 */
export function calculateTiltScore(
  timeSinceLastLoss: number,        // minutes
  positionSizeVsAverage: number,    // percentage (100 = average, 150 = 50% bigger)
  directionFlipAfterLoss: boolean,
  recentMessages: number,           // count of messages in last 5 min
  warningsRejected: number,         // warnings dismissed today
  lossesToday: number,
  sessionDuration: number           // hours
): number {
  let score = 0;
  
  // Quick re-entry after loss = revenge trade signal
  if (timeSinceLastLoss < 10) score += 25;
  else if (timeSinceLastLoss < 20) score += 10;
  
  // Increased size after loss = emotional sizing
  if (positionSizeVsAverage > 150) score += 20;
  else if (positionSizeVsAverage > 120) score += 10;
  
  // Flipped direction immediately after loss = revenge
  if (directionFlipAfterLoss) score += 15;
  
  // High message frequency = agitation
  if (recentMessages > 5) score += 15;
  else if (recentMessages > 3) score += 5;
  
  // Dismissing warnings = ignoring protection
  if (warningsRejected > 0) score += 10 * Math.min(warningsRejected, 3);
  
  // Multiple losses = emotional state
  if (lossesToday > 2) score += 10;
  
  // Long session = fatigue
  if (sessionDuration > 4) score += 5;
  
  return Math.min(score, 100);
}

/**
 * Detect if a trade looks like a revenge trade
 */
export function isRevengeTrade(
  timeSinceLastLoss: number,  // minutes
  currentSize: number,
  averageSize: number,
  sameDirection: boolean
): { isRevenge: boolean; confidence: number; reason?: string } {
  const isQuickReentry = timeSinceLastLoss < 10;
  const isOversized = currentSize > averageSize * 1.5;
  
  if (isQuickReentry && isOversized) {
    return {
      isRevenge: true,
      confidence: 0.9,
      reason: `Same direction, ${Math.round(currentSize / averageSize * 100)}% of average size, ${timeSinceLastLoss} minutes after loss`,
    };
  }
  
  if (isQuickReentry && sameDirection) {
    return {
      isRevenge: true,
      confidence: 0.7,
      reason: `Same direction, ${timeSinceLastLoss} minutes after loss`,
    };
  }
  
  if (isOversized && timeSinceLastLoss < 30) {
    return {
      isRevenge: true,
      confidence: 0.6,
      reason: `Position ${Math.round(currentSize / averageSize * 100)}% of average size, ${timeSinceLastLoss} minutes after loss`,
    };
  }
  
  return { isRevenge: false, confidence: 0 };
}
