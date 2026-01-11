/**
 * STRATEGY ANIMATION TAXONOMY
 * 
 * Based on research of most popular futures trading strategies in 2024-2025.
 * This defines all animatable strategy types and their requirements.
 * 
 * Each animation shows: entry, stop loss, price behavior, and target.
 */

export type AnimationType =
  // === PRICE ACTION STRATEGIES ===
  | 'breakout_range'          // Opening Range Breakout (ORB)
  | 'pullback_entry'          // Pullback to support/MA then continuation
  | 'failed_breakout'         // Fakeout / bull trap reversal
  | 'trend_continuation'      // Higher highs/lows in trend
  
  // === INDICATOR STRATEGIES ===
  | 'ema_cross'               // Moving average crossover
  | 'ema_pullback'            // Price pulls back to EMA then bounces
  | 'rsi_strategy'            // RSI overbought/oversold with divergence
  | 'macd_cross'              // MACD signal line crossover
  
  // === VWAP STRATEGIES ===
  | 'vwap_bounce'             // Mean reversion to VWAP
  | 'vwap_breakout'           // Break above/below VWAP with hold
  | 'vwap_pullback'           // Pullback to VWAP as support/resistance
  
  // === ICT / SMART MONEY CONCEPTS ===
  | 'order_block'             // Institutional order block
  | 'fair_value_gap'          // FVG/imbalance fill
  | 'liquidity_sweep'         // Stop hunt then reversal
  | 'breaker_block'           // Failed OB that changes polarity
  | 'silver_bullet'           // Killzone liquidity grab + FVG entry
  
  // === ADVANCED PATTERNS ===
  | 'supply_demand_zone'      // Price reacts to zone
  | 'mean_reversion';         // Price returns to average

/**
 * Animation configuration that Claude generates
 */
export interface AnimationConfig {
  type: AnimationType;
  direction: 'long' | 'short';
  
  // Price action parameters
  priceAction?: {
    consolidationTime?: number;  // Minutes of ranging (default: 30 for ORB)
    breakoutSpeed?: 'slow' | 'medium' | 'fast';  // How aggressive the move
    retracement?: number;        // % pullback (e.g., 0.618 for Fib)
  };
  
  // Indicators to show (optional)
  indicators?: {
    ema?: { period: number; show: boolean };       // e.g., 20 EMA
    vwap?: { show: boolean };
    rsi?: { show: boolean; level?: number };       // e.g., RSI 50
    orderBlock?: { show: boolean };
    fvg?: { show: boolean };
  };
  
  // Entry/Exit levels
  entry: {
    type: 'breakout' | 'pullback' | 'bounce' | 'sweep';
    label: string;  // e.g., "Enter above range high"
  };
  
  stopLoss: {
    placement: 'range_low' | 'structure' | 'order_block' | 'custom';
    label: string;  // e.g., "Stop below range low"
  };
  
  target?: {
    riskReward?: number;  // e.g., 2 for 1:2 RR
    label: string;        // e.g., "Target 1:2 RR"
  };
  
  // Visual customization
  display: {
    chartType: 'line' | 'candle';  // Line for simple, candle for ICT/OB
    showVolume?: boolean;
    duration?: number;              // Animation duration in seconds (default: 8)
    height?: number;                // Chart height in pixels (default: 200)
  };
  
  // Context (for display)
  context?: {
    timeframe?: string;             // e.g., "5min", "1H"
    session?: string;               // e.g., "NY Open", "London Killzone"
  };
}

/**
 * Strategy templates - predefined configs for common setups
 */
export const STRATEGY_TEMPLATES: Record<string, Partial<AnimationConfig>> = {
  // Opening Range Breakout
  orb_long: {
    type: 'breakout_range',
    direction: 'long',
    priceAction: {
      consolidationTime: 30,
      breakoutSpeed: 'fast',
    },
    entry: {
      type: 'breakout',
      label: 'Enter on break above range high',
    },
    stopLoss: {
      placement: 'range_low',
      label: 'Stop below range low',
    },
    display: {
      chartType: 'line',
    },
    context: {
      session: '9:30-10:00 ET',
    },
  },
  
  orb_short: {
    type: 'breakout_range',
    direction: 'short',
    priceAction: {
      consolidationTime: 30,
      breakoutSpeed: 'fast',
    },
    entry: {
      type: 'breakout',
      label: 'Enter on break below range low',
    },
    stopLoss: {
      placement: 'range_low',
      label: 'Stop above range high',
    },
    display: {
      chartType: 'line',
    },
    context: {
      session: '9:30-10:00 ET',
    },
  },
  
  // EMA Pullback
  ema_pullback_long: {
    type: 'ema_pullback',
    direction: 'long',
    priceAction: {
      retracement: 0.5,
      breakoutSpeed: 'medium',
    },
    indicators: {
      ema: { period: 20, show: true },
    },
    entry: {
      type: 'pullback',
      label: 'Enter on bounce off 20 EMA',
    },
    stopLoss: {
      placement: 'structure',
      label: 'Stop below recent swing low',
    },
    display: {
      chartType: 'line',
    },
  },
  
  ema_pullback_short: {
    type: 'ema_pullback',
    direction: 'short',
    priceAction: {
      retracement: 0.5,
      breakoutSpeed: 'medium',
    },
    indicators: {
      ema: { period: 20, show: true },
    },
    entry: {
      type: 'pullback',
      label: 'Enter on rejection at 20 EMA',
    },
    stopLoss: {
      placement: 'structure',
      label: 'Stop above recent swing high',
    },
    display: {
      chartType: 'line',
    },
  },
  
  // VWAP Bounce
  vwap_bounce_long: {
    type: 'vwap_bounce',
    direction: 'long',
    indicators: {
      vwap: { show: true },
    },
    entry: {
      type: 'bounce',
      label: 'Enter on bounce off VWAP',
    },
    stopLoss: {
      placement: 'custom',
      label: 'Stop below VWAP',
    },
    display: {
      chartType: 'line',
    },
  },
  
  vwap_bounce_short: {
    type: 'vwap_bounce',
    direction: 'short',
    indicators: {
      vwap: { show: true },
    },
    entry: {
      type: 'bounce',
      label: 'Enter on rejection at VWAP',
    },
    stopLoss: {
      placement: 'custom',
      label: 'Stop above VWAP',
    },
    display: {
      chartType: 'line',
    },
  },
  
  // Order Block (ICT)
  order_block_long: {
    type: 'order_block',
    direction: 'long',
    indicators: {
      orderBlock: { show: true },
    },
    entry: {
      type: 'pullback',
      label: 'Enter on pullback to bullish OB',
    },
    stopLoss: {
      placement: 'order_block',
      label: 'Stop below order block',
    },
    display: {
      chartType: 'candle',  // Candles for ICT
    },
  },
  
  order_block_short: {
    type: 'order_block',
    direction: 'short',
    indicators: {
      orderBlock: { show: true },
    },
    entry: {
      type: 'pullback',
      label: 'Enter on pullback to bearish OB',
    },
    stopLoss: {
      placement: 'order_block',
      label: 'Stop above order block',
    },
    display: {
      chartType: 'candle',
    },
  },
  
  // Fair Value Gap
  fair_value_gap_long: {
    type: 'fair_value_gap',
    direction: 'long',
    indicators: {
      fvg: { show: true },
    },
    entry: {
      type: 'pullback',
      label: 'Enter on FVG fill',
    },
    stopLoss: {
      placement: 'structure',
      label: 'Stop below FVG',
    },
    display: {
      chartType: 'candle',
    },
  },
  
  fair_value_gap_short: {
    type: 'fair_value_gap',
    direction: 'short',
    indicators: {
      fvg: { show: true },
    },
    entry: {
      type: 'pullback',
      label: 'Enter on FVG fill',
    },
    stopLoss: {
      placement: 'structure',
      label: 'Stop above FVG',
    },
    display: {
      chartType: 'candle',
    },
  },
  
  // Liquidity Sweep (ICT)
  liquidity_sweep_long: {
    type: 'liquidity_sweep',
    direction: 'long',
    priceAction: {
      breakoutSpeed: 'fast',
    },
    entry: {
      type: 'sweep',
      label: 'Enter after stop hunt reversal',
    },
    stopLoss: {
      placement: 'structure',
      label: 'Stop below sweep low',
    },
    display: {
      chartType: 'candle',
    },
  },
  
  liquidity_sweep_short: {
    type: 'liquidity_sweep',
    direction: 'short',
    priceAction: {
      breakoutSpeed: 'fast',
    },
    entry: {
      type: 'sweep',
      label: 'Enter after stop hunt reversal',
    },
    stopLoss: {
      placement: 'structure',
      label: 'Stop above sweep high',
    },
    display: {
      chartType: 'candle',
    },
  },
};

/**
 * Helper to generate animation config from natural language
 * This is what the frontend will call after Claude responds
 */
export function generateAnimationConfig(
  strategyType: AnimationType,
  direction: 'long' | 'short',
  customizations?: Partial<AnimationConfig>
): AnimationConfig {
  // Start with template if available
  const templateKey = `${strategyType}_${direction}`;
  const template = STRATEGY_TEMPLATES[templateKey] || {};
  
  // Merge with customizations
  const config: AnimationConfig = {
    type: strategyType,
    direction,
    priceAction: {
      breakoutSpeed: 'medium',
      ...template.priceAction,
      ...customizations?.priceAction,
    },
    indicators: {
      ...template.indicators,
      ...customizations?.indicators,
    },
    entry: template.entry || customizations?.entry || {
      type: 'breakout',
      label: 'Entry',
    },
    stopLoss: template.stopLoss || customizations?.stopLoss || {
      placement: 'structure',
      label: 'Stop Loss',
    },
    target: customizations?.target,
    display: {
      chartType: 'line',
      duration: 8,
      height: 200,
      ...template.display,
      ...customizations?.display,
    },
    context: {
      ...template.context,
      ...customizations?.context,
    },
  };
  
  return config;
}

/**
 * Validates an animation config
 */
export function validateAnimationConfig(config: AnimationConfig): boolean {
  if (!config.type || !config.direction) return false;
  if (!config.entry || !config.stopLoss) return false;
  if (!config.display) return false;
  return true;
}
