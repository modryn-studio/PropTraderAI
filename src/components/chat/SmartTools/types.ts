/**
 * Smart Tools Type Definitions
 * 
 * Shared types for the inline calculator/tool system.
 * 
 * Created: January 13, 2026
 */

import type { ToolType, PrefilledData } from '@/lib/utils/toolDetection';

// Re-export for convenience
export type { ToolType, PrefilledData };

// ============================================================================
// TOOL STATE
// ============================================================================

export interface ActiveTool {
  type: ToolType;
  prefilledData: PrefilledData;
  messageId: string; // Attach tool to specific assistant message
  isCollapsed: boolean;
  completedValues?: Record<string, unknown>;
}

// ============================================================================
// TOOL COMPONENT PROPS
// ============================================================================

export interface BaseToolProps {
  prefilledData: PrefilledData;
  onComplete: (values: Record<string, unknown>) => void;
  onDismiss: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export type PositionSizeCalculatorProps = BaseToolProps;

export interface ContractSelectorProps extends BaseToolProps {
  riskAmount?: number; // Optional - can be calculated from position size or prefilled
}

export interface StopLossCalculatorProps extends BaseToolProps {
  instrument?: string;
  contractQuantity?: number;
}

export interface DrawdownVisualizerProps extends BaseToolProps {
  riskPerTrade?: number;
}

export interface TimeframeHelperProps extends BaseToolProps {
  userTimezone?: string;
}

// ============================================================================
// TOOL COMPLETION VALUES
// ============================================================================

export interface PositionSizeValues {
  accountSize: number;
  drawdownLimit: number;
  riskPercent: number;
  riskAmount: number;
  tradesUntilDrawdown: number;
}

export interface ContractSelectorValues {
  instrument: string;
  stopLossTicks: number;
  contractQuantity: number;
  riskPerContract: number;
  totalRisk: number;
}

export interface StopLossValues {
  stopType: 'fixed' | 'atr' | 'dollar';
  stopLossTicks: number;
  riskPerContract: number;
  totalRisk: number;
}

export interface DrawdownValues {
  dailyLimit: number;
  drawdownLimit: number;
  currentPnL: number;
  tradesRemainingDaily: number;
  tradesRemainingTotal: number;
}

export interface TimeframeValues {
  startTime: string;
  endTime: string;
  timezone: string;
  days: string[];
}

// ============================================================================
// INSTRUMENT DATA
// ============================================================================

// NOTE: Contract specifications are defined in src/lib/utils/contractSpecs.ts
// Use CONTRACT_SPECS, getContractSpec(), and related functions from there.
// This avoids duplication and ensures a single source of truth for CME specs.

// ============================================================================
// VALIDATION THRESHOLDS
// ============================================================================

export const VALIDATION_THRESHOLDS = {
  // Risk percentage warnings
  riskPercent: {
    warning: 2.0, // > 2% shows warning
    error: 5.0,   // > 5% shows error
  },
  
  // Trades until drawdown warnings
  tradesUntilDrawdown: {
    warning: 5,  // <= 5 trades shows warning
    error: 3,    // <= 3 trades shows error
  },
  
  // Contract quantity warnings
  contracts: {
    warningHigh: 100,  // > 100 contracts shows warning
    warningLow: 2,     // < 2 contracts shows warning
  },
  
  // ATR multiple warnings
  atrMultiple: {
    warning: 2.5,  // > 2.5x ATR shows warning (wide stop)
    error: 3.5,    // > 3.5x ATR shows error
  },
  
  // Daily limit usage warnings
  dailyLimitUsage: {
    warning: 70,   // > 70% used shows warning
    danger: 90,    // > 90% used shows danger
  },
};

// ============================================================================
// MARKET SESSIONS
// ============================================================================

export const MARKET_SESSIONS = {
  'Opening Range': {
    startET: '09:30',
    endET: '10:30',
    description: 'High volume, volatility. Best for breakouts.',
  },
  'Morning Session': {
    startET: '09:30',
    endET: '12:00',
    description: 'Most liquid period. Best for trending moves.',
  },
  'Afternoon Session': {
    startET: '12:00',
    endET: '16:00',
    description: 'Slower action, reversals common.',
  },
  'Extended Hours': {
    startET: '06:00',
    endET: '09:30',
    description: 'Pre-market. Lower liquidity.',
  },
};

export const TIMEZONES = {
  ET: { label: 'Eastern (ET)', offset: 0 },
  CT: { label: 'Central (CT)', offset: -1 },
  MT: { label: 'Mountain (MT)', offset: -2 },
  PT: { label: 'Pacific (PT)', offset: -3 },
};

