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
  
  // RAPID STRATEGY BUILDER - Legacy flag REMOVED in Issue #47 Week 2
  // The rapid flow is now the ONLY conversation system.
  // Previous rapid_strategy_builder: true controlled Socratic vs Rapid prompt.
  // Socratic system deleted (40% abandonment vs 15% for rapid).
  // This comment preserved for historical reference.
  
  // GENERATE-FIRST RAPID FLOW (Phase 1 vibe-first)
  // True = Generate strategy immediately, ask only critical questions (stop loss)
  // False = Use existing Socratic dialogue flow
  // Route: /api/strategy/generate-rapid
  generate_first_flow: true,
  
  // UNIFIED STRATEGY BUILD ENDPOINT (Issue #47 Week 3)
  // When true, enables A/B test routing to /api/strategy/build
  // Rollout percentage configured in AB_TEST_CONFIG.unified_endpoint_rollout
  unified_endpoint_enabled: true,
  
  // PHASE 1: STRATEGY BUILDER VISUAL FEATURES (Hidden for vibe-first simplicity)
  // These features work but add visual complexity during conversation
  // Hide in Phase 1, enable in Phase 2 for power users
  summary_panel_visible: false,        // Real-time rule extraction panel
  chart_animations_visible: false,     // Strategy visualizations during chat
  smart_tools_visible: false,          // Position calc, timeframe helper during chat
  
  // Phase 1B (Weeks 5-8) - Execution Layer
  autopilot_mode: false,
  websocket_monitoring: false,
  push_notifications: false,
  
  // EXECUTION LAYER (Release 1: Strategy Validator - Weeks 1-4)
  // Controls the execution engine and Tradovate integration
  execution_engine: false,           // Master switch for execution layer
  execution_copilot_alerts: false,   // Send alerts when setups detected
  execution_copilot_orders: false,   // Execute user-approved orders
  execution_autopilot: false,        // Fully autonomous execution
  
  // Execution mode progression (enforce via EXECUTION_MODE_REQUIREMENTS)
  // paper -> demo -> live_micro -> live
  execution_paper_trading: true,     // Paper trading always available for testing
  execution_demo_trading: false,     // Demo account trading (35+ paper trades required)
  execution_live_micro: false,       // Micro contracts only (20+ demo trades required)
  execution_live_full: false,        // Full contracts (10+ micro trades required)
  
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

// Execution mode requirements (staged testing progression)
// Users must complete N trades at each level before advancing
export const EXECUTION_MODE_REQUIREMENTS = {
  paper: { required_trades: 0, description: 'Paper trading - no real money' },
  demo: { required_trades: 35, description: 'Demo account with simulated funds' },
  live_micro: { required_trades: 20, description: 'Live trading with micro contracts only' },
  live: { required_trades: 10, description: 'Full live trading - all contract sizes' },
} as const;

// Execution safety limits (account-level defaults)
export const EXECUTION_SAFETY_LIMITS = {
  MAX_ACCOUNT_RISK_PERCENT: 3,       // Max 3% risk across all open positions
  MAX_STRATEGY_RISK_PERCENT: 1,       // Max 1% risk per strategy
  MAX_POSITION_SIZE: 10,              // Max contracts per position
  MAX_DAILY_TRADES: 50,               // Max trades per day
  COOLDOWN_AFTER_LOSS_SECONDS: 300,   // 5 minute cooldown after loss (Copilot alert)
  CIRCUIT_BREAKER_FAILURES: 5,        // Open circuit after 5 consecutive failures
  CIRCUIT_BREAKER_TIMEOUT_MS: 60000,  // 1 minute timeout before half-open
} as const;

// A/B Test Configuration (Issue #47 Week 3)
// Separate from FEATURES since these are percentages, not booleans
export const AB_TEST_CONFIG = {
  // Unified endpoint rollout: 0-100%
  // 0 = All traffic to generate-rapid (old)
  // 100 = All traffic to build (new)
  unified_endpoint_rollout: 100, // Single user - using new endpoint exclusively
} as const;

export type FeatureKey = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}

/**
 * Get A/B test rollout percentage
 */
export function getABTestRollout(test: keyof typeof AB_TEST_CONFIG): number {
  return AB_TEST_CONFIG[test];
}
