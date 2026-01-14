/**
 * SESSION BOUNDARY DETECTION & MANAGEMENT
 * 
 * Tracks trading sessions and detects when they end.
 * Uses multi-signal detection:
 * 1. Market close
 * 2. User inactivity (30 min)
 * 3. New session started
 * 4. Explicit user action
 * 
 * Triggers end-of-session educational insights.
 * 
 * Part of: Rapid Strategy Builder Edge Case Handling
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TradingSession {
  id: string;
  strategyId: string;
  userId: string;
  startTime: Date;
  lastActivityTime: Date;
  lastTradeTime: Date | null;
  isActive: boolean;
  tradesCount: number;
  endReason?: SessionEndReason;
  endTime?: Date;
  metadata?: {
    timezone: string;
    instrument?: string;
    strategyName?: string;
  };
}

export type SessionEndReason = 
  | 'market_close' 
  | 'inactivity' 
  | 'user_action' 
  | 'new_session'
  | 'app_close';

export type ActivityType = 
  | 'trade_executed'
  | 'strategy_viewed'
  | 'tool_used'
  | 'settings_changed'
  | 'chat_message'
  | 'backtest_run'
  | 'page_view'
  | 'button_click';

export interface SessionEndEvent {
  session: TradingSession;
  reason: SessionEndReason;
  insights?: SessionInsights;
}

export interface SessionInsights {
  totalDuration: number; // minutes
  tradesCount: number;
  activeTime: number; // minutes actually engaged
  idleTime: number; // minutes idle
  peakActivityHour?: number;
  suggestedContent?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INACTIVITY_THRESHOLD_MINUTES = 30;
const MARKET_OPEN_HOUR_ET = 9;
const MARKET_OPEN_MINUTE_ET = 30;
const MARKET_CLOSE_HOUR_ET = 16;

// ============================================================================
// SESSION STORAGE (in-memory for now, would be Redis/DB in production)
// ============================================================================

const activeSessions: Map<string, TradingSession> = new Map();
const sessionHistory: Map<string, TradingSession[]> = new Map();

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Convert date to Eastern Time
 */
function toEasternTime(date: Date): Date {
  // Simple ET conversion (doesn't handle DST perfectly, but good enough)
  const utcOffset = date.getTimezoneOffset();
  const etOffset = 5 * 60; // ET is UTC-5 (or -4 during DST)
  const diff = utcOffset - etOffset;
  return new Date(date.getTime() + diff * 60 * 1000);
}

/**
 * Check if market is currently open
 */
export function isMarketOpen(time: Date = new Date()): boolean {
  const et = toEasternTime(time);
  const day = et.getDay();
  const hour = et.getHours();
  const minute = et.getMinutes();
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  // Before market open
  if (hour < MARKET_OPEN_HOUR_ET) return false;
  if (hour === MARKET_OPEN_HOUR_ET && minute < MARKET_OPEN_MINUTE_ET) return false;
  
  // After market close
  if (hour >= MARKET_CLOSE_HOUR_ET) return false;
  
  return true;
}

/**
 * Get time until market close in minutes
 */
export function getMinutesUntilClose(time: Date = new Date()): number {
  if (!isMarketOpen(time)) return 0;
  
  const et = toEasternTime(time);
  const closeTime = new Date(et);
  closeTime.setHours(MARKET_CLOSE_HOUR_ET, 0, 0, 0);
  
  return Math.max(0, (closeTime.getTime() - et.getTime()) / 60000);
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start a new trading session
 */
export function startSession(
  userId: string,
  strategyId: string,
  metadata?: TradingSession['metadata']
): TradingSession {
  // End any existing session for this user
  const existingSession = activeSessions.get(userId);
  if (existingSession) {
    endSession(userId, 'new_session');
  }
  
  const session: TradingSession = {
    id: generateSessionId(),
    userId,
    strategyId,
    startTime: new Date(),
    lastActivityTime: new Date(),
    lastTradeTime: null,
    isActive: true,
    tradesCount: 0,
    metadata,
  };
  
  activeSessions.set(userId, session);
  
  return session;
}

/**
 * Get active session for user
 */
export function getActiveSession(userId: string): TradingSession | null {
  const session = activeSessions.get(userId);
  
  if (!session || !session.isActive) {
    return null;
  }
  
  // Check if session should have ended
  const endReason = checkSessionShouldEnd(session);
  if (endReason) {
    endSession(userId, endReason);
    return null;
  }
  
  return session;
}

/**
 * Track activity and update session
 */
export function trackActivity(
  userId: string,
  activityType: ActivityType
): TradingSession | null {
  const session = activeSessions.get(userId);
  
  if (!session || !session.isActive) {
    return null;
  }
  
  // Update activity time
  session.lastActivityTime = new Date();
  
  // Track trades specifically
  if (activityType === 'trade_executed') {
    session.lastTradeTime = new Date();
    session.tradesCount++;
  }
  
  // Check if session should end after this activity
  const endReason = checkSessionShouldEnd(session);
  if (endReason) {
    return endSession(userId, endReason);
  }
  
  return session;
}

/**
 * Check if session should end based on various signals
 */
function checkSessionShouldEnd(session: TradingSession): SessionEndReason | null {
  const now = new Date();
  
  // Signal 1: Market closed
  if (!isMarketOpen(now) && isMarketOpen(session.lastActivityTime)) {
    return 'market_close';
  }
  
  // Signal 2: Inactivity
  const inactiveMinutes = (now.getTime() - session.lastActivityTime.getTime()) / 60000;
  if (inactiveMinutes >= INACTIVITY_THRESHOLD_MINUTES && session.tradesCount > 0) {
    return 'inactivity';
  }
  
  return null;
}

/**
 * End a session and generate insights
 */
export function endSession(
  userId: string,
  reason: SessionEndReason
): TradingSession | null {
  const session = activeSessions.get(userId);
  
  if (!session) {
    return null;
  }
  
  // Mark session as ended
  session.isActive = false;
  session.endReason = reason;
  session.endTime = new Date();
  
  // Store in history
  const userHistory = sessionHistory.get(userId) || [];
  userHistory.push({ ...session });
  sessionHistory.set(userId, userHistory);
  
  // Remove from active sessions
  activeSessions.delete(userId);
  
  return session;
}

/**
 * Generate end-of-session insights
 */
export function generateSessionInsights(session: TradingSession): SessionInsights {
  const endTime = session.endTime || new Date();
  const totalDuration = (endTime.getTime() - session.startTime.getTime()) / 60000;
  
  // Estimate active vs idle time (simplified)
  const idleTime = session.tradesCount > 0 
    ? Math.max(0, totalDuration - (session.tradesCount * 5)) // Assume 5 min per trade activity
    : totalDuration * 0.3; // 30% idle if no trades
  
  const activeTime = totalDuration - idleTime;
  
  // Determine peak activity hour
  const startHour = session.startTime.getHours();
  const peakActivityHour = session.lastTradeTime 
    ? session.lastTradeTime.getHours()
    : startHour;
  
  // Generate content suggestions based on session
  const suggestedContent: string[] = [];
  
  if (session.tradesCount === 0) {
    suggestedContent.push('No trades taken - review your entry criteria');
    suggestedContent.push('Consider if your setup appeared during this session');
  } else if (session.tradesCount > 10) {
    suggestedContent.push('High trade count - review for overtrading patterns');
  }
  
  if (session.endReason === 'market_close') {
    suggestedContent.push('Session ended at market close - good discipline');
  }
  
  if (idleTime > activeTime) {
    suggestedContent.push('Significant idle time detected - were you waiting for setup?');
  }
  
  return {
    totalDuration: Math.round(totalDuration),
    tradesCount: session.tradesCount,
    activeTime: Math.round(activeTime),
    idleTime: Math.round(idleTime),
    peakActivityHour,
    suggestedContent,
  };
}

/**
 * Get session history for user
 */
export function getSessionHistory(userId: string, limit: number = 10): TradingSession[] {
  const history = sessionHistory.get(userId) || [];
  return history.slice(-limit);
}

/**
 * Serialize session for API response
 */
export function serializeSession(session: TradingSession): Record<string, unknown> {
  return {
    id: session.id,
    strategyId: session.strategyId,
    startTime: session.startTime.toISOString(),
    lastActivityTime: session.lastActivityTime.toISOString(),
    lastTradeTime: session.lastTradeTime?.toISOString() || null,
    isActive: session.isActive,
    tradesCount: session.tradesCount,
    endReason: session.endReason || null,
    endTime: session.endTime?.toISOString() || null,
    metadata: session.metadata || {},
  };
}

// ============================================================================
// PERIODIC CHECK (would be called by cron/scheduler in production)
// ============================================================================

/**
 * Check all active sessions for timeout
 * Should be called periodically (e.g., every 5 minutes)
 */
export function checkAllSessionsForTimeout(): SessionEndEvent[] {
  const endedSessions: SessionEndEvent[] = [];
  
  for (const [userId, session] of Array.from(activeSessions.entries())) {
    const endReason = checkSessionShouldEnd(session);
    
    if (endReason) {
      const endedSession = endSession(userId, endReason);
      if (endedSession) {
        endedSessions.push({
          session: endedSession,
          reason: endReason,
          insights: generateSessionInsights(endedSession),
        });
      }
    }
  }
  
  return endedSessions;
}

const sessionManagerExports = {
  startSession,
  getActiveSession,
  trackActivity,
  endSession,
  generateSessionInsights,
  getSessionHistory,
  isMarketOpen,
  getMinutesUntilClose,
  checkAllSessionsForTimeout,
};

export default sessionManagerExports;
