'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Check, ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RISK CALCULATOR MODAL
 * 
 * Professional position sizing calculator for traders.
 * Uses industry-standard formula: Position = (Account × Risk%) ÷ (Stop × Point Value)
 * 
 * Part of Week 5-6 Day 3-4 implementation (Issue #7).
 * 
 * Features:
 * - Real-time position size calculation
 * - Instrument-specific point values
 * - Comprehensive $ risk breakdown
 * - Warnings for edge cases
 * - Account balance persistence (localStorage)
 * - Quick-tap risk percentage buttons
 * 
 * Design principles:
 * - Educational: Show calculation breakdown
 * - Transparent: No black box math
 * - Safe: Conservative rounding (always down)
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface RiskCalculatorModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Apply handler - returns calculated position size */
  onApply: (positionSize: number) => void;
  /** Current instrument */
  instrument?: string;
  /** Pre-filled stop distance (if editing stop param) */
  initialStopDistance?: number;
}

interface CalculationResult {
  positionSize: number;
  maxDollarRisk: number;
  actualDollarRisk: number;
  dollarRiskPerContract: number;
  pointValue: number;
  warnings: string[];
}

// Point values per contract (industry standard)
const POINT_VALUES: Record<string, number> = {
  'ES': 50,    // $50 per point (E-mini S&P 500)
  'NQ': 20,    // $20 per point (E-mini Nasdaq)
  'YM': 5,     // $5 per point (E-mini Dow)
  'RTY': 50,   // $50 per point (E-mini Russell 2000)
  'CL': 1000,  // $1000 per point (Crude Oil)
  'GC': 100,   // $100 per point (Gold)
  'SI': 5000,  // $5000 per point (Silver)
  'ZB': 1000,  // $1000 per point (30-Year T-Bond)
  'ZN': 1000,  // $1000 per point (10-Year T-Note)
  '6E': 125000, // Euro FX
  'MES': 5,    // $5 per point (Micro E-mini S&P)
  'MNQ': 2,    // $2 per point (Micro E-mini Nasdaq)
};

const DEFAULT_POINT_VALUE = 50; // Default to ES

// Risk percentage presets
const RISK_PRESETS = [0.5, 1, 1.5, 2, 3];

// Instrument display names
const INSTRUMENT_NAMES: Record<string, string> = {
  'ES': 'E-mini S&P 500',
  'NQ': 'E-mini Nasdaq',
  'YM': 'E-mini Dow',
  'RTY': 'E-mini Russell',
  'CL': 'Crude Oil',
  'GC': 'Gold',
  'MES': 'Micro E-mini S&P',
  'MNQ': 'Micro Nasdaq',
};

// Typical stops by instrument (for warnings)
const TYPICAL_STOPS: Record<string, number> = {
  'ES': 50,
  'NQ': 100,
  'YM': 200,
  'CL': 100,
  'GC': 50,
};

// Tick sizes by instrument (for validation - nice to have per Agent 1)
const TICK_SIZES: Record<string, number> = {
  'ES': 0.25,   // $12.50 per tick
  'NQ': 0.25,   // $5 per tick
  'YM': 1.00,   // $5 per tick
  'RTY': 0.10,  // $5 per tick
  'CL': 0.01,   // $10 per tick
  'GC': 0.10,   // $10 per tick
  'MES': 0.25,  // $1.25 per tick
  'MNQ': 0.25,  // $0.50 per tick
};

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

const STORAGE_KEY = 'proptraderai_risk_calculator';

interface SavedDefaults {
  accountBalance: number;
  riskPercentage: number;
  lastUsed: string;
}

function loadSavedDefaults(): SavedDefaults | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveDefaults(accountBalance: number, riskPercentage: number) {
  if (typeof window === 'undefined') return;
  try {
    const data: SavedDefaults = {
      accountBalance,
      riskPercentage,
      lastUsed: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// CALCULATION LOGIC
// ============================================================================

function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  stopDistance: number,
  instrument: string
): CalculationResult {
  const pointValue = POINT_VALUES[instrument] || DEFAULT_POINT_VALUE;
  const warnings: string[] = [];
  
  // Step 1: Calculate max dollar risk
  const maxDollarRisk = accountBalance * (riskPercentage / 100);
  
  // Step 2: Calculate dollar risk per contract
  const dollarRiskPerContract = stopDistance * pointValue;
  
  // Step 3: Calculate position size (round down for safety)
  let positionSize = 0;
  if (dollarRiskPerContract > 0) {
    positionSize = Math.floor(maxDollarRisk / dollarRiskPerContract);
  }
  
  // Step 4: Calculate actual dollar risk (with rounding)
  const actualDollarRisk = positionSize * dollarRiskPerContract;
  
  // Generate warnings
  if (positionSize === 0) {
    warnings.push('Position size < 1 contract. Consider tighter stop or higher risk %.');
  }
  
  if (positionSize > 10) {
    warnings.push(`Large position (${positionSize} contracts). Verify inputs.`);
  }
  
  // Check if under-utilizing risk significantly
  const riskDifference = maxDollarRisk - actualDollarRisk;
  if (positionSize > 0 && riskDifference > 100) {
    warnings.push(`Under-utilizing risk by $${riskDifference.toFixed(0)}. Consider tighter stop.`);
  }
  
  // Wide stop warning
  const typicalStop = TYPICAL_STOPS[instrument] || 50;
  if (stopDistance > typicalStop) {
    warnings.push(`Wide stop (>${typicalStop} points for ${instrument}). Consider tighter stop.`);
  }
  
  // Tick size validation (nice to have per Agent 1)
  const tickSize = TICK_SIZES[instrument];
  if (tickSize && stopDistance % tickSize !== 0) {
    warnings.push(`Stop should be multiple of ${tickSize} (tick size for ${instrument}).`);
  }
  
  return {
    positionSize,
    maxDollarRisk,
    actualDollarRisk,
    dollarRiskPerContract,
    pointValue,
    warnings,
  };
}

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

function triggerHaptic(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RiskCalculatorModal({
  isOpen,
  onClose,
  onApply,
  instrument = 'ES',
  initialStopDistance,
}: RiskCalculatorModalProps) {
  // Load saved defaults on mount
  const savedDefaults = loadSavedDefaults();
  
  // State
  const [accountBalance, setAccountBalance] = useState<string>(
    savedDefaults?.accountBalance?.toString() || '50000'
  );
  const [riskPercentage, setRiskPercentage] = useState<number>(
    savedDefaults?.riskPercentage || 1
  );
  const [stopDistance, setStopDistance] = useState<string>(
    initialStopDistance?.toString() || '20'
  );
  const [result, setResult] = useState<CalculationResult | null>(null);
  
  // Validation errors
  const [accountError, setAccountError] = useState<string | null>(null);
  const [stopError, setStopError] = useState<string | null>(null);
  
  // Calculate on input change
  const calculate = useCallback(() => {
    const balance = parseFloat(accountBalance.replace(/,/g, ''));
    const stop = parseFloat(stopDistance);
    
    // Validate account
    if (isNaN(balance) || balance < 1000) {
      setAccountError('Minimum account size: $1,000');
      setResult(null);
      return;
    }
    setAccountError(null);
    
    // Validate stop
    if (isNaN(stop) || stop <= 0) {
      setStopError('Stop must be greater than 0');
      setResult(null);
      return;
    }
    setStopError(null);
    
    // Calculate
    const calcResult = calculatePositionSize(balance, riskPercentage, stop, instrument);
    setResult(calcResult);
  }, [accountBalance, riskPercentage, stopDistance, instrument]);
  
  // Recalculate when inputs change
  useEffect(() => {
    if (isOpen) {
      calculate();
    }
  }, [isOpen, calculate]);
  
  // Reset on open with new stop distance
  useEffect(() => {
    if (isOpen && initialStopDistance) {
      setStopDistance(initialStopDistance.toString());
    }
  }, [isOpen, initialStopDistance]);
  
  // Handle apply
  const handleApply = () => {
    if (!result || result.positionSize === 0) return;
    
    // Save defaults for next time
    const balance = parseFloat(accountBalance.replace(/,/g, ''));
    saveDefaults(balance, riskPercentage);
    
    // Haptic feedback
    triggerHaptic([10, 50, 10]);
    
    onApply(result.positionSize);
    onClose();
  };
  
  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  const pointValue = POINT_VALUES[instrument] || DEFAULT_POINT_VALUE;
  const instrumentName = INSTRUMENT_NAMES[instrument] || instrument;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={onClose}
          />
          
          {/* Modal Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-[60]',
              'bg-zinc-900 rounded-t-2xl',
              'max-h-[95vh] overflow-hidden',
              'pb-[env(safe-area-inset-bottom)]'
            )}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b border-zinc-800">
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 min-h-[44px] -ml-2 px-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              
              <div className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
                <Calculator className="w-5 h-5 text-blue-400" />
                <span>Risk Calculator</span>
              </div>
              
              <div className="w-16" /> {/* Spacer for alignment */}
            </div>
            
            {/* Content */}
            <div className="px-5 py-6 space-y-6 overflow-y-auto max-h-[calc(95vh-180px)]">
              
              {/* Instrument Info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                <div>
                  <p className="text-sm text-zinc-400">Instrument</p>
                  <p className="text-lg font-medium text-zinc-100">{instrument}</p>
                  <p className="text-xs text-zinc-500">{instrumentName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-400">Point Value</p>
                  <p className="text-lg font-medium text-emerald-400">${pointValue}</p>
                  <p className="text-xs text-zinc-500">per point</p>
                </div>
              </div>
              
              {/* Account Balance Input */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Account Balance</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9,]*"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(e.target.value.replace(/[^0-9,]/g, ''))}
                    placeholder="50000"
                    className={cn(
                      'w-full pl-8 pr-4 py-4 rounded-xl text-lg',
                      'bg-zinc-800 border-2 transition-colors',
                      'text-zinc-100 placeholder:text-zinc-600',
                      'focus:outline-none',
                      accountError
                        ? 'border-red-500/50 focus:border-red-500'
                        : 'border-zinc-700 focus:border-zinc-500'
                    )}
                  />
                </div>
                {accountError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{accountError}</span>
                  </div>
                )}
              </div>
              
              {/* Risk Percentage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-zinc-400">Risk Per Trade</label>
                  <span className="text-lg font-semibold text-amber-400">{riskPercentage}%</span>
                </div>
                
                {/* Quick-tap buttons */}
                <div className="flex gap-2">
                  {RISK_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setRiskPercentage(preset)}
                      className={cn(
                        'flex-1 py-3 rounded-xl text-sm font-medium',
                        'transition-colors min-h-[48px]',
                        riskPercentage === preset
                          ? 'bg-amber-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      )}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
                
                <p className="text-xs text-zinc-500">
                  Most prop firms recommend 0.5% - 2% risk per trade
                </p>
              </div>
              
              {/* Stop Distance Input */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Stop Distance</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={stopDistance}
                    onChange={(e) => setStopDistance(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="20"
                    className={cn(
                      'w-full px-4 py-4 rounded-xl text-lg',
                      'bg-zinc-800 border-2 transition-colors',
                      'text-zinc-100 placeholder:text-zinc-600',
                      'focus:outline-none pr-20',
                      stopError
                        ? 'border-red-500/50 focus:border-red-500'
                        : 'border-zinc-700 focus:border-zinc-500'
                    )}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    points
                  </span>
                </div>
                
                {/* Quick-tap stop buttons */}
                <div className="flex gap-2">
                  {(instrument === 'ES' || instrument === 'MES' 
                    ? [10, 15, 20, 25, 30]
                    : instrument === 'NQ' || instrument === 'MNQ'
                      ? [20, 30, 40, 50, 75]
                      : [10, 15, 20, 25, 50]
                  ).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setStopDistance(preset.toString())}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-medium',
                        'transition-colors min-h-[40px]',
                        stopDistance === preset.toString()
                          ? 'bg-zinc-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                
                {stopError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{stopError}</span>
                  </div>
                )}
              </div>
              
              {/* Result Display */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Main Result */}
                  <div className="text-center p-6 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-800/50 border border-zinc-700">
                    <div className={cn(
                      'text-5xl font-bold mb-2',
                      result.positionSize === 0 ? 'text-red-400' : 'text-emerald-400'
                    )}>
                      {result.positionSize}
                    </div>
                    <div className="text-zinc-400">
                      {result.positionSize === 1 ? 'contract' : 'contracts'}
                    </div>
                    <div className="text-sm text-zinc-500 mt-1">
                      recommended position size
                    </div>
                    
                    {/* Visual Risk Bar */}
                    {result.positionSize > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-700">
                        <div className="flex justify-between text-xs text-zinc-500 mb-1">
                          <span>Risk Used</span>
                          <span>{((result.actualDollarRisk / result.maxDollarRisk) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(result.actualDollarRisk / result.maxDollarRisk) * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-emerald-400">{formatCurrency(result.actualDollarRisk)}</span>
                          <span className="text-zinc-500">of {formatCurrency(result.maxDollarRisk)} max</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Risk Breakdown */}
                  <div className="space-y-3 p-4 rounded-lg bg-zinc-800/30">
                    <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-700 pb-2">
                      Risk Breakdown
                    </h3>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Account Balance</span>
                      <span className="font-medium text-zinc-200">
                        {formatCurrency(parseFloat(accountBalance.replace(/,/g, '')) || 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Risk Percentage</span>
                      <span className="font-medium text-amber-400">{riskPercentage}%</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Max $ Risk</span>
                      <span className="font-medium text-amber-400">
                        {formatCurrency(result.maxDollarRisk)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Stop Distance</span>
                      <span className="font-medium text-zinc-200">{stopDistance} points</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">$ Risk Per Contract</span>
                      <span className="font-medium text-zinc-200">
                        {formatCurrency(result.dollarRiskPerContract)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm border-t border-zinc-700 pt-3 mt-3">
                      <span className="text-zinc-300 font-medium">Actual $ Risk</span>
                      <span className={cn(
                        'font-semibold',
                        result.positionSize === 0 ? 'text-zinc-500' : 'text-red-400'
                      )}>
                        {formatCurrency(result.actualDollarRisk)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="space-y-2">
                      {result.warnings.map((warning, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          <span className="text-sm text-amber-200">{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Formula Info */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-800/30">
                    <Info className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-zinc-500">
                      <p className="font-medium text-zinc-400 mb-1">Position Size Formula</p>
                      <p>Position = (Account × Risk%) ÷ (Stop × Point Value)</p>
                      <p className="mt-1">
                        = ({formatCurrency(parseFloat(accountBalance.replace(/,/g, '')) || 0)} × {riskPercentage}%) 
                        ÷ ({stopDistance} × ${pointValue})
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Apply Button (Fixed at bottom) */}
            <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-900">
              <button
                onClick={handleApply}
                disabled={!result || result.positionSize === 0}
                className={cn(
                  'w-full flex items-center justify-center gap-2',
                  'min-h-[52px] px-6 rounded-xl',
                  'font-semibold text-lg transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900',
                  !result || result.positionSize === 0
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500'
                )}
              >
                <Check className="w-5 h-5" />
                <span>
                  {result && result.positionSize > 0
                    ? `Apply ${result.positionSize} contract${result.positionSize !== 1 ? 's' : ''}`
                    : 'Calculate Position Size'
                  }
                </span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
