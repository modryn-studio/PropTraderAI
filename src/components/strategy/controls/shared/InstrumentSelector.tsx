'use client';

/**
 * Instrument Selector Control
 * 
 * Dropdown for selecting futures instruments.
 * Mobile-responsive: uses native select on mobile, custom dropdown on desktop.
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BaseControlProps, InstrumentValue } from './types';

// ============================================================================
// INSTRUMENT DATA
// ============================================================================

export const INSTRUMENTS = [
  { value: 'ES', label: 'ES', description: 'E-mini S&P 500', tickValue: '$50/point' },
  { value: 'MES', label: 'MES', description: 'Micro E-mini S&P 500', tickValue: '$5/point' },
  { value: 'NQ', label: 'NQ', description: 'E-mini Nasdaq-100', tickValue: '$20/point' },
  { value: 'MNQ', label: 'MNQ', description: 'Micro E-mini Nasdaq-100', tickValue: '$2/point' },
  { value: 'YM', label: 'YM', description: 'E-mini Dow', tickValue: '$5/point' },
  { value: 'MYM', label: 'MYM', description: 'Micro E-mini Dow', tickValue: '$0.50/point' },
  { value: 'RTY', label: 'RTY', description: 'E-mini Russell 2000', tickValue: '$50/point' },
  { value: 'M2K', label: 'M2K', description: 'Micro E-mini Russell 2000', tickValue: '$5/point' },
  { value: 'CL', label: 'CL', description: 'Crude Oil', tickValue: '$10/tick' },
  { value: 'MCL', label: 'MCL', description: 'Micro Crude Oil', tickValue: '$1/tick' },
  { value: 'GC', label: 'GC', description: 'Gold', tickValue: '$10/tick' },
  { value: 'MGC', label: 'MGC', description: 'Micro Gold', tickValue: '$1/tick' },
] as const;

// Common instruments for quick selection
export const COMMON_INSTRUMENTS: InstrumentValue[] = ['ES', 'NQ', 'YM', 'RTY', 'CL', 'GC'];

// ============================================================================
// COMPONENT
// ============================================================================

interface InstrumentSelectorProps extends Omit<BaseControlProps, 'value' | 'onChange'> {
  value: InstrumentValue | string;
  onChange: (value: InstrumentValue) => void;
  /** Show only common instruments */
  compact?: boolean;
  /** Visual variant */
  variant?: 'dropdown' | 'buttons';
}

export function InstrumentSelector({
  value,
  onChange,
  label = 'Instrument',
  disabled = false,
  error,
  compact = false,
  variant = 'dropdown',
}: InstrumentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  
  const instruments = compact 
    ? INSTRUMENTS.filter(i => COMMON_INSTRUMENTS.includes(i.value as InstrumentValue))
    : INSTRUMENTS;
  
  const selectedInstrument = INSTRUMENTS.find(i => i.value === value);
  
  // Button grid variant (for quick selection)
  if (variant === 'buttons') {
    return (
      <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
        {label && <label className="text-xs text-zinc-400 block">{label}</label>}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {instruments.map(inst => (
            <button
              key={inst.value}
              type="button"
              onClick={() => onChange(inst.value as InstrumentValue)}
              disabled={disabled}
              className={cn(
                'px-3 py-2 text-sm font-mono border rounded-md transition-colors',
                value === inst.value
                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
              )}
            >
              {inst.label}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
  
  // Mobile: Native select
  if (isMobile) {
    return (
      <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
        {label && <label className="text-xs text-zinc-400 block">{label}</label>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as InstrumentValue)}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border rounded-md bg-zinc-900 text-white font-mono text-sm',
            'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
            error ? 'border-red-500' : 'border-zinc-700'
          )}
        >
          <option value="">Select instrument...</option>
          {instruments.map(inst => (
            <option key={inst.value} value={inst.value}>
              {inst.label} - {inst.description}
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
          'w-full flex items-center justify-between px-3 py-2 border rounded-md',
          'bg-zinc-900 text-sm font-mono transition-colors',
          isOpen ? 'border-indigo-500' : error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-600'
        )}
      >
        <span className={selectedInstrument ? 'text-white' : 'text-zinc-500'}>
          {selectedInstrument 
            ? `${selectedInstrument.label} - ${selectedInstrument.description}` 
            : 'Select instrument...'}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-zinc-500 transition-transform', isOpen && 'rotate-180')} />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop to close on click outside */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {instruments.map(inst => (
              <button
                key={inst.value}
                type="button"
                onClick={() => { 
                  onChange(inst.value as InstrumentValue); 
                  setIsOpen(false); 
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm font-mono transition-colors flex items-center justify-between',
                  value === inst.value 
                    ? 'bg-indigo-500/10 text-indigo-400' 
                    : 'text-zinc-300 hover:bg-zinc-800'
                )}
              >
                <span>
                  <span className="font-bold">{inst.label}</span>
                  <span className="text-zinc-500 ml-2">- {inst.description}</span>
                </span>
                <span className="text-xs text-zinc-500">{inst.tickValue}</span>
              </button>
            ))}
          </div>
        </>
      )}
      
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default InstrumentSelector;
