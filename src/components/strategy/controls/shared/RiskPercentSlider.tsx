'use client';

/**
 * Risk Percent Slider Control
 * 
 * Slider for position sizing as risk percentage.
 * Shows prop firm compliance warnings.
 */

import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BaseControlProps } from './types';

// ============================================================================
// COMPONENT
// ============================================================================

interface RiskPercentSliderProps extends Omit<BaseControlProps, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  /** Min risk percent */
  min?: number;
  /** Max risk percent */
  max?: number;
  /** Step size */
  step?: number;
  /** Show prop firm warning */
  showWarning?: boolean;
  /** Daily loss limit for context */
  dailyLossLimit?: number;
}

export function RiskPercentSlider({
  value,
  onChange,
  label = 'Risk per Trade',
  disabled = false,
  error,
  min = 0.25,
  max = 5,
  step = 0.25,
  showWarning = true,
  dailyLossLimit = 5,
}: RiskPercentSliderProps) {
  // Calculate risk level
  const riskLevel = value <= 1 ? 'conservative' : value <= 2 ? 'moderate' : 'aggressive';
  const maxLossingTrades = Math.floor(dailyLossLimit / value);
  
  return (
    <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400">{label}</label>
          <span className={cn(
            'text-sm font-mono font-bold',
            riskLevel === 'conservative' ? 'text-emerald-400' :
            riskLevel === 'moderate' ? 'text-amber-400' : 'text-red-400'
          )}>
            {value}%
          </span>
        </div>
      )}
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className={cn(
          'w-full',
          riskLevel === 'conservative' ? 'accent-emerald-500' :
          riskLevel === 'moderate' ? 'accent-amber-500' : 'accent-red-500'
        )}
      />
      
      <div className="flex justify-between text-[10px] text-zinc-500">
        <span>{min}% (Safe)</span>
        <span>{max}% (Risky)</span>
      </div>
      
      {showWarning && (
        <div className={cn(
          'flex items-start gap-2 p-2 rounded text-xs mt-2',
          riskLevel === 'conservative' 
            ? 'bg-emerald-500/10 text-emerald-400' 
            : riskLevel === 'moderate'
              ? 'bg-amber-500/10 text-amber-400'
              : 'bg-red-500/10 text-red-400'
        )}>
          {riskLevel === 'conservative' ? (
            <>
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Recommended for prop challenges. {maxLossingTrades}+ consecutive losses before daily limit.</span>
            </>
          ) : riskLevel === 'moderate' ? (
            <>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Moderate risk. {maxLossingTrades} consecutive losses would hit daily limit.</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>High risk! Only {maxLossingTrades} losses before daily limit. Not recommended for challenges.</span>
            </>
          )}
        </div>
      )}
      
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default RiskPercentSlider;
