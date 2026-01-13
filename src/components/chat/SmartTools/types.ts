/**
 * Smart Tools Type Definitions
 * 
 * Shared types for the inline calculator/tool system.
 * 
 * Created: January 13, 2026
 */

import type { ToolType, PrefilledData } from '@/lib/utils/toolDetection';

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
  riskAmount: number; // Required - calculated from position size
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

export interface InstrumentSpec {
  symbol: string;
  name: string;
  tickValue: number;
  pointValue: number;
  typicalStopRange: [number, number]; // [min, max] ticks
  microVersion?: string;
}

export const INSTRUMENTS: Record<string, InstrumentSpec> = {
  NQ: {
    symbol: 'NQ',
    name: 'E-mini Nasdaq',
    tickValue: 5,
    pointValue: 20,
    typicalStopRange: [10, 30],
    microVersion: 'MNQ',
  },
  MNQ: {
    symbol: 'MNQ',
    name: 'Micro E-mini Nasdaq',
    tickValue: 0.5,
    pointValue: 2,
    typicalStopRange: [20, 60],
  },
  ES: {
    symbol: 'ES',
    name: 'E-mini S&P 500',
    tickValue: 12.5,
    pointValue: 50,
    typicalStopRange: [8, 20],
    microVersion: 'MES',
  },
  MES: {
    symbol: 'MES',
    name: 'Micro E-mini S&P 500',
    tickValue: 1.25,
    pointValue: 5,
    typicalStopRange: [16, 40],
  },
  CL: {
    symbol: 'CL',
    name: 'Crude Oil',
    tickValue: 10,
    pointValue: 1000,
    typicalStopRange: [10, 30],
    microVersion: 'MCL',
  },
  MCL: {
    symbol: 'MCL',
    name: 'Micro Crude Oil',
    tickValue: 1,
    pointValue: 100,
    typicalStopRange: [20, 60],
  },
  GC: {
    symbol: 'GC',
    name: 'Gold',
    tickValue: 10,
    pointValue: 100,
    typicalStopRange: [10, 40],
    microVersion: 'MGC',
  },
  MGC: {
    symbol: 'MGC',
    name: 'Micro Gold',
    tickValue: 1,
    pointValue: 10,
    typicalStopRange: [20, 80],
  },
};

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
};
