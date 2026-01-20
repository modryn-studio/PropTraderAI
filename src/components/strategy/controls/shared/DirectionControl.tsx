'use client';

/**
 * Direction Control Component
 * 
 * 3-button selector for trade direction: Long, Short, or Both.
 * Used across pattern confirmation and strategy editing.
 */

import { TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BaseControlProps, DirectionValue } from './types';

// ============================================================================
// DIRECTION DATA
// ============================================================================

export const DIRECTIONS = [
  { value: 'long_only', label: 'Long', icon: TrendingUp, color: 'text-emerald-400' },
  { value: 'short_only', label: 'Short', icon: TrendingDown, color: 'text-red-400' },
  { value: 'both', label: 'Both', icon: ArrowUpDown, color: 'text-indigo-400' },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

interface DirectionControlProps extends Omit<BaseControlProps, 'value' | 'onChange'> {
  value: DirectionValue | string;
  onChange: (value: DirectionValue) => void;
  /** Compact mode with smaller buttons */
  compact?: boolean;
}

export function DirectionControl({
  value,
  onChange,
  label = 'Direction',
  disabled = false,
  error,
  compact = false,
}: DirectionControlProps) {
  return (
    <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
      {label && <label className="text-xs text-zinc-400 block">{label}</label>}
      
      <div className={cn('grid grid-cols-3 gap-2', compact && 'gap-1')}>
        {DIRECTIONS.map(dir => {
          const Icon = dir.icon;
          const isSelected = value === dir.value;
          
          return (
            <button
              key={dir.value}
              type="button"
              onClick={() => onChange(dir.value)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center justify-center border rounded-md transition-all font-mono',
                compact ? 'px-2 py-1.5 gap-0.5' : 'px-4 py-3 gap-1',
                isSelected
                  ? 'bg-indigo-500/10 border-indigo-500'
                  : 'border-zinc-700 hover:border-zinc-600'
              )}
            >
              <Icon className={cn(
                compact ? 'w-4 h-4' : 'w-5 h-5',
                isSelected ? dir.color : 'text-zinc-500'
              )} />
              <span className={cn(
                compact ? 'text-xs' : 'text-sm',
                isSelected ? 'text-white' : 'text-zinc-500'
              )}>
                {dir.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default DirectionControl;
