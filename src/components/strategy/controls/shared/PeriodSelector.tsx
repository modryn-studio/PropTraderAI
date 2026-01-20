'use client';

/**
 * Period Selector Control
 * 
 * Generic period selector for:
 * - Opening Range periods (5, 15, 30, 60 min)
 * - EMA periods (9, 20, 50, 100, 200)
 * - Lookback periods (10, 20, 50, 100)
 * 
 * Adapts options based on periodType prop.
 */

import { cn } from '@/lib/utils';
import type { BaseControlProps } from './types';

// ============================================================================
// PERIOD OPTIONS BY TYPE
// ============================================================================

export const PERIOD_OPTIONS = {
  range: [
    { value: 5, label: '5 min', description: 'Aggressive' },
    { value: 15, label: '15 min', description: 'Standard' },
    { value: 30, label: '30 min', description: 'Conservative' },
    { value: 60, label: '60 min', description: 'Very conservative' },
  ],
  ema: [
    { value: 9, label: '9 EMA', description: 'Scalping' },
    { value: 20, label: '20 EMA', description: 'Standard' },
    { value: 50, label: '50 EMA', description: 'Swing' },
    { value: 100, label: '100 EMA', description: 'Position' },
    { value: 200, label: '200 EMA', description: 'Institutional' },
  ],
  lookback: [
    { value: 10, label: '10 bars', description: 'Recent' },
    { value: 20, label: '20 bars', description: 'Standard' },
    { value: 50, label: '50 bars', description: 'Extended' },
    { value: 100, label: '100 bars', description: 'Major levels' },
  ],
} as const;

type PeriodType = keyof typeof PERIOD_OPTIONS;

// ============================================================================
// COMPONENT
// ============================================================================

interface PeriodSelectorProps extends Omit<BaseControlProps, 'value' | 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  /** Type of period to show options for */
  periodType: PeriodType;
  /** Show as buttons or dropdown */
  variant?: 'buttons' | 'dropdown';
}

export function PeriodSelector({
  value,
  onChange,
  label,
  disabled = false,
  error,
  periodType,
  variant = 'buttons',
}: PeriodSelectorProps) {
  const options = PERIOD_OPTIONS[periodType];
  const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
  
  // Generate default label if not provided
  const displayLabel = label || {
    range: 'Range Period',
    ema: 'EMA Period',
    lookback: 'Lookback Period',
  }[periodType];
  
  if (variant === 'dropdown') {
    return (
      <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
        {displayLabel && <label className="text-xs text-zinc-400 block">{displayLabel}</label>}
        <select
          value={numericValue}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border bg-zinc-900 text-white font-mono text-sm',
            'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
            error ? 'border-red-500' : 'border-zinc-700'
          )}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label} - {opt.description}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
  
  // Buttons variant
  return (
    <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
      {displayLabel && <label className="text-xs text-zinc-400 block">{displayLabel}</label>}
      
      <div className={cn(
        'grid gap-2',
        options.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'
      )}>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center justify-center px-2 py-2 border transition-all',
              numericValue === opt.value
                ? 'bg-indigo-500/10 border-indigo-500'
                : 'border-zinc-700 hover:border-zinc-600'
            )}
          >
            <span className={cn(
              'font-mono text-sm font-bold',
              numericValue === opt.value ? 'text-indigo-400' : 'text-zinc-300'
            )}>
              {opt.label.split(' ')[0]}
            </span>
            <span className={cn(
              'text-[10px] mt-0.5',
              numericValue === opt.value ? 'text-indigo-400/70' : 'text-zinc-500'
            )}>
              {opt.description}
            </span>
          </button>
        ))}
      </div>
      
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default PeriodSelector;
