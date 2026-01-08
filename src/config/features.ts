/**
 * Feature flags to control what's visible by phase
 * 
 * Phase 1A (NOW): Vibe-only consumer app
 * Phase 1B (Weeks 5-8): Autopilot mode, WebSocket monitoring
 * Phase 2 (Weeks 9-16): Advanced mode, behavioral insights UI
 * Phase 3 (Months 5+): API access, strategy editing
 */

export const FEATURES = {
  // Phase 1A (NOW) - Core functionality
  natural_language_strategy: true,
  tradovate_oauth: true,
  challenge_tracking: true,
  copilot_mode: true,
  behavioral_logging: true, // Always on - data collection from Day 1
  account_protection_card: true, // Shows $ protected, not discipline metrics
  
  // Phase 1B (Weeks 5-8)
  autopilot_mode: false,
  websocket_monitoring: false,
  push_notifications: false,
  
  // Phase 2 (Weeks 9-16)
  advanced_mode: false,
  parsed_logic_view: false,
  tilt_alerts_ui: false, // UI only - detection runs silently in Phase 1
  session_heatmaps: false,
  friction_patterns: false, // 10-second countdown for revenge trades
  
  // Phase 3 (Months 5+)
  api_access: false,
  strategy_editing: false,
  data_export: false,
  multi_account: false,
  webhook_support: false,
} as const;

// Challenge rule constants
export const CHALLENGE_RULES = {
  DAILY_LOSS_LIMIT: 0.05, // 5%
  MAX_DRAWDOWN: 0.10, // 10%
  WARNING_THRESHOLD: 0.70, // Warn at 70% of limit used
  CRITICAL_THRESHOLD: 0.85, // Critical alert at 85%
} as const;

// Tilt detection thresholds (runs silently in Phase 1, UI in Phase 2)
export const TILT_THRESHOLDS = {
  WARNING: 50, // Show warning
  CRITICAL: 70, // Critical alert
  AUTO_PAUSE: 85, // Automatic pause (Autopilot only)
} as const;

export type FeatureKey = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}
