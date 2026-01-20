'use client';

/**
 * Time Range / Session Selector
 * 
 * Preset trading sessions with exchange time display.
 * Handles timezone conversion for user's local time.
 */

import { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BaseControlProps, SessionValue } from './types';

// ============================================================================
// SESSION DATA
// ============================================================================

export const SESSION_OPTIONS = [
  { 
    value: 'NY Session (9:30 AM - 4:00 PM ET)', 
    label: 'NY Session', 
    startTime: '09:30',
    endTime: '16:00',
    timezone: 'America/New_York',
    description: 'Full trading day'
  },
  { 
    value: 'NY Morning (9:30 AM - 12:00 PM ET)', 
    label: 'NY Morning', 
    startTime: '09:30',
    endTime: '12:00',
    timezone: 'America/New_York',
    description: 'Most volatile hours'
  },
  { 
    value: 'NY Afternoon (12:00 PM - 4:00 PM ET)', 
    label: 'NY Afternoon', 
    startTime: '12:00',
    endTime: '16:00',
    timezone: 'America/New_York',
    description: 'Lower volatility'
  },
  { 
    value: 'Opening Hour (9:30 AM - 10:30 AM ET)', 
    label: 'Opening Hour', 
    startTime: '09:30',
    endTime: '10:30',
    timezone: 'America/New_York',
    description: 'Highest volatility'
  },
  { 
    value: 'Power Hour (3:00 PM - 4:00 PM ET)', 
    label: 'Power Hour', 
    startTime: '15:00',
    endTime: '16:00',
    timezone: 'America/New_York',
    description: 'End-of-day surge'
  },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

interface TimeRangeSelectorProps extends Omit<BaseControlProps, 'value' | 'onChange'> {
  value: SessionValue | string;
  onChange: (value: SessionValue) => void;
  /** Show as radio buttons instead of dropdown */
  variant?: 'dropdown' | 'radio';
}

export function TimeRangeSelector({
  value,
  onChange,
  label = 'Trading Session',
  disabled = false,
  error,
  variant = 'radio',
}: TimeRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  
  const selectedSession = SESSION_OPTIONS.find(s => s.value === value);
  
  // Radio button variant (default for clarity)
  if (variant === 'radio') {
    return (
      <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
        {label && <label className="text-xs text-zinc-400 block">{label}</label>}
        
        <div className="space-y-2">
          {SESSION_OPTIONS.map(session => (
            <button
              key={session.value}
              type="button"
              onClick={() => onChange(session.value)}
              disabled={disabled}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 border transition-colors text-left',
                value === session.value
                  ? 'bg-indigo-500/10 border-indigo-500'
                  : 'border-zinc-700 hover:border-zinc-600'
              )}
            >
              <div className="flex items-center gap-2">
                <Clock className={cn(
                  'w-4 h-4',
                  value === session.value ? 'text-indigo-400' : 'text-zinc-500'
                )} />
                <span className={cn(
                  'font-mono text-sm',
                  value === session.value ? 'text-white' : 'text-zinc-400'
                )}>
                  {session.label}
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                {session.startTime} - {session.endTime} ET
              </span>
            </button>
          ))}
        </div>
        
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
  
  // Dropdown variant (compact)
  // Mobile: Native select
  if (isMobile) {
    return (
      <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
        {label && <label className="text-xs text-zinc-400 block">{label}</label>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SessionValue)}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border bg-zinc-900 text-white font-mono text-sm',
            'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
            error ? 'border-red-500' : 'border-zinc-700'
          )}
        >
          <option value="">Select session...</option>
          {SESSION_OPTIONS.map(session => (
            <option key={session.value} value={session.value}>
              {session.label} ({session.startTime} - {session.endTime} ET)
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
  
  // Desktop: Custom dropdown
  return (
    <div className={cn('space-y-2 relative', disabled && 'opacity-50 pointer-events-none')}>
      {label && <label className="text-xs text-zinc-400 block">{label}</label>}
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 border',
          'bg-zinc-900 text-sm font-mono transition-colors',
          isOpen ? 'border-indigo-500' : error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-600'
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <span className={selectedSession ? 'text-white' : 'text-zinc-500'}>
            {selectedSession?.label || 'Select session...'}
          </span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-zinc-500 transition-transform', isOpen && 'rotate-180')} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-zinc-900 border border-zinc-700 shadow-lg">
            {SESSION_OPTIONS.map(session => (
              <button
                key={session.value}
                type="button"
                onClick={() => { onChange(session.value); setIsOpen(false); }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm font-mono transition-colors flex items-center justify-between',
                  value === session.value 
                    ? 'bg-indigo-500/10 text-indigo-400' 
                    : 'text-zinc-300 hover:bg-zinc-800'
                )}
              >
                <span>{session.label}</span>
                <span className="text-xs text-zinc-500">
                  {session.startTime} - {session.endTime} ET
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default TimeRangeSelector;
