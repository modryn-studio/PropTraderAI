/**
 * Feature flags to control what's visible by phase
 * 
 * Phase 1A (NOW): Vibe-only consumer app
 * Phase 1B (Weeks 5-8): Autopilot mode, WebSocket monitoring
 * Phase 2 (Weeks 9-16): Advanced mode, behavioral insights UI
 * Phase 3 (Months 5+): API access, strategy editing
 * 
 * STRATEGY BUILDER VISIBILITY (Phase 1 vs Phase 2)
 * ================================================
 * Phase 1 (NOW): Vibe-first simplicity
 * - Hide: Summary panel, animations, smart tools during conversation
 * - Focus: Fast strategy articulation (0-3 questions, <2 min)
 * - Show complexity only AFTER strategy generation
 * 
 * Phase 2 (FUTURE): Power user features
 * - Show: Real-time rule extraction, visualizations, inline editing
 * - Activation: TBD (user preference toggle? automatic after 5+ strategies?)
 * 
 * To enable Phase 2 features:
 * 1. Set summary_panel_visible: true
 * 2. Set chart_animations_visible: true  
 * 3. Set smart_tools_visible: true
 * 4. Test with power users before rolling out to all
 */

export const FEATURES = {
  // Phase 1A (NOW) - Core functionality
  natural_language_strategy: true,
  tradovate_oauth: true,
  challenge_tracking: true,
  copilot_mode: true,
  behavioral_logging: true, // Always on - data collection from Day 1
  account_protection_card: true, // Shows $ protected, not discipline metrics
  
  // RAPID STRATEGY BUILDER - New optimized flow
  // Set to true for <2 minute completion (grouped questions, smart defaults)
  // Set to false ONLY for debugging or A/B testing legacy Socratic method
  // WARNING: Legacy mode had 40%+ abandonment rate vs 15% for rapid flow
  rapid_strategy_builder: true,
  
  // GENERATE-FIRST RAPID FLOW (Phase 1 vibe-first)
  // True = Generate strategy immediately, ask only critical questions (stop loss)
  // False = Use existing Socratic dialogue flow
  // Route: /api/strategy/generate-rapid
  generate_first_flow: true,
  
  // PHASE 1: STRATEGY BUILDER VISUAL FEATURES (Hidden for vibe-first simplicity)
  // These features work but add visual complexity during conversation
  // Hide in Phase 1, enable in Phase 2 for power users
  summary_panel_visible: false,        // Real-time rule extraction panel
  chart_animations_visible: false,     // Strategy visualizations during chat
  smart_tools_visible: false,          // Position calc, timeframe helper during chat
  
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
