import { logBehavioralEvent, BehavioralEventType } from './logger';

/**
 * Animation Event Types for PATH 2 behavioral tracking
 * 
 * High-signal events that help us understand:
 * 1. Which strategy types users describe
 * 2. Whether animations improve completion rates
 * 3. User engagement patterns with visualization
 */
export type AnimationEventType =
  | 'animation_generated'
  | 'animation_viewed'
  | 'animation_updated'
  | 'animation_dismissed_quickly'
  | 'animation_generation_failed'
  | 'strategy_confirmed_with_animation'
  | 'strategy_confirmed_without_animation';

interface AnimationEventData {
  // Common fields
  type?: string;
  direction?: string;
  device?: 'mobile' | 'desktop';
  
  // View tracking
  time_to_view_ms?: number;
  view_duration_ms?: number;
  
  // Update tracking
  update_count?: number;
  old_type?: string;
  new_type?: string;
  
  // Error tracking
  error_type?: string;
  config_snippet?: string;
  
  // Strategy confirmation
  had_animation?: boolean;
  reason?: string;
  
  // Session context
  session_time?: number;
  message_count?: number;
  
  // Allow additional properties for BehavioralEventData compatibility
  [key: string]: unknown;
}

/**
 * Log an animation-related behavioral event
 * 
 * These events are critical for understanding:
 * - Whether animations help users complete strategies
 * - Which strategy types are most common
 * - User engagement patterns with visualization
 * 
 * @example
 * ```ts
 * // When animation appears on mobile
 * logAnimationEvent(userId, 'animation_viewed', {
 *   device: 'mobile',
 *   type: 'breakout_range',
 *   direction: 'long',
 *   time_to_view_ms: 1500,
 * });
 * 
 * // When user dismisses animation quickly
 * logAnimationEvent(userId, 'animation_dismissed_quickly', {
 *   view_duration_ms: 2300,
 *   type: 'ema_pullback',
 * });
 * ```
 */
export async function logAnimationEvent(
  userId: string,
  eventType: AnimationEventType,
  eventData: AnimationEventData
): Promise<{ success: boolean; error?: string }> {
  // Cast to BehavioralEventType since animation events are a subset
  return logBehavioralEvent(
    userId, 
    eventType as BehavioralEventType, 
    eventData
  );
}

/**
 * Log animation generation for analytics
 * 
 * Call this when Claude successfully generates an animation config.
 */
export async function logAnimationGenerated(
  userId: string,
  config: { type: string; direction: string },
  sessionTime: number
): Promise<void> {
  await logAnimationEvent(userId, 'animation_generated', {
    type: config.type,
    direction: config.direction,
    session_time: sessionTime,
  });
}

/**
 * Log animation generation failure
 * 
 * Call this when Claude's animation config fails to parse.
 */
export async function logAnimationFailed(
  userId: string,
  errorType: string,
  configSnippet?: string
): Promise<void> {
  await logAnimationEvent(userId, 'animation_generation_failed', {
    error_type: errorType,
    config_snippet: configSnippet?.substring(0, 200), // Truncate for storage
  });
}

/**
 * Log strategy confirmation with animation context
 * 
 * Call this when user saves their strategy.
 * This is KEY for measuring animation effectiveness.
 */
export async function logStrategyConfirmedWithAnimation(
  userId: string,
  hadAnimation: boolean,
  reason?: string
): Promise<void> {
  if (hadAnimation) {
    await logAnimationEvent(userId, 'strategy_confirmed_with_animation', {
      had_animation: true,
    });
  } else {
    await logAnimationEvent(userId, 'strategy_confirmed_without_animation', {
      had_animation: false,
      reason: reason || 'no_animation_generated',
    });
  }
}
