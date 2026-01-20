'use client';

/**
 * Ticks Slider Control
 * 
 * Slider for stop loss and profit target in ticks.
 * Shows tick value in dollar terms based on instrument.
 */

import { cn } from '@/lib/utils';
import type { BaseControlProps } from './types';
import type { InstrumentValue } from './types';

// ============================================================================
// TICK VALUES BY INSTRUMENT (in dollars)
// ============================================================================

const TICK_VALUES: Record<string, number> = {
  ES: 12.50,    // $12.50 per tick (0.25 points)
  MES: 1.25,    // $1.25 per tick
  NQ: 5.00,     // $5.00 per tick (0.25 points)
  MNQ: 0.50,    // $0.50 per tick
  YM: 5.00,     // $5.00 per tick (1 point)
  MYM: 0.50,    // $0.50 per tick
  RTY: 5.00,    // $5.00 per tick (0.10 points)
  M2K: 0.50,    // $0.50 per tick
  CL: 10.00,    // $10.00 per tick (0.01)
  MCL: 1.00,    // $1.00 per tick
  GC: 10.00,    // $10.00 per tick (0.10)
  MGC: 1.00,    // $1.00 per tick
};

// ============================================================================
// COMPONENT
// ============================================================================

interface TicksSliderProps extends Omit<BaseControlProps, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  /** Instrument for dollar value calculation */
  instrument?: InstrumentValue | string;
  /** Min ticks */
  min?: number;
  /** Max ticks */
  max?: number;
  /** Step size */
  step?: number;
  /** Show dollar value */
  showDollarValue?: boolean;
}

export function TicksSlider({
  value,
  onChange,
  label = 'Ticks',
  disabled = false,
  error,
  instrument = 'ES',
  min = 5,
  max = 100,
  step = 5,
  showDollarValue = true,
}: TicksSliderProps) {
  const tickValue = TICK_VALUES[instrument] || 12.50;
  const dollarValue = value * tickValue;
  
  return (
    <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-400">{label}</label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-indigo-400">{value} ticks</span>
            {showDollarValue && (
              <span className="text-xs text-zinc-500">(${dollarValue.toFixed(2)})</span>
            )}
          </div>
        </div>
      )}
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        disabled={disabled}
        className="w-full accent-indigo-500"
      />
      
      <div className="flex justify-between text-[10px] text-zinc-500">
        <span>{min}</span>
        <span>{Math.round((min + max) / 2)}</span>
        <span>{max}</span>
      </div>
      
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default TicksSlider;
