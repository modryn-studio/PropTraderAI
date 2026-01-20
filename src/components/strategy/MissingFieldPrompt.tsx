'use client';

/**
 * Missing Field Prompt Component
 * 
 * Inline prompt for critical fields that couldn't be defaulted.
 * Shows friendly UI to collect required information.
 * 
 * Key features:
 * - Inline card (not blocking modal)
 * - Pattern-aware field inputs
 * - Button grid based on field type
 * - [Continue] button to complete strategy
 * 
 * @see Issue #44 - Enhanced Strategy Builder UX
 */

import { useState } from 'react';
import { AlertCircle, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldInfo } from '@/lib/strategy/validateAgainstCanonical';
import type { SupportedPattern } from '@/lib/execution/canonical-schema';

// ============================================================================
// TYPES
// ============================================================================

interface MissingFieldPromptProps {
  /** Pattern being configured */
  pattern: SupportedPattern;
  /** Fields that need user input */
  missingFields: FieldInfo[];
  /** Called when all fields are filled */
  onComplete: (values: Record<string, string | number>) => void;
  /** Called when user wants to cancel */
  onCancel?: () => void;
}

// ============================================================================
// FIELD DISPLAY METADATA
// ============================================================================

interface FieldDisplayInfo {
  title: string;
  description: string;
  options: Array<{ value: string; label: string; description?: string }>;
}

const FIELD_DISPLAY: Record<string, FieldDisplayInfo> = {
  instrument: {
    title: 'What instrument?',
    description: 'Choose the futures contract you want to trade',
    options: [
      { value: 'ES', label: 'ES', description: 'E-Mini S&P 500 • $50/point' },
      { value: 'NQ', label: 'NQ', description: 'E-Mini Nasdaq • $20/point' },
      { value: 'YM', label: 'YM', description: 'E-Mini Dow • $5/point' },
      { value: 'RTY', label: 'RTY', description: 'E-Mini Russell • $50/point' },
      { value: 'CL', label: 'CL', description: 'Crude Oil • $10/tick' },
      { value: 'GC', label: 'GC', description: 'Gold • $10/tick' },
    ],
  },
  periodMinutes: {
    title: 'Opening range period?',
    description: 'How long after market open to wait before looking for breakouts',
    options: [
      { value: '5', label: '5 min', description: 'Aggressive' },
      { value: '15', label: '15 min', description: 'Standard' },
      { value: '30', label: '30 min', description: 'Conservative' },
      { value: '60', label: '60 min', description: 'Very conservative' },
    ],
  },
  emaPeriod: {
    title: 'EMA period?',
    description: 'The moving average period to trade pullbacks against',
    options: [
      { value: '9', label: '9 EMA', description: 'Scalping' },
      { value: '20', label: '20 EMA', description: 'Standard' },
      { value: '50', label: '50 EMA', description: 'Swing' },
      { value: '100', label: '100 EMA', description: 'Position' },
      { value: '200', label: '200 EMA', description: 'Institutional' },
    ],
  },
  lookbackPeriod: {
    title: 'Lookback period?',
    description: 'How many bars to look back for support/resistance levels',
    options: [
      { value: '10', label: '10 bars', description: 'Recent' },
      { value: '20', label: '20 bars', description: 'Standard' },
      { value: '50', label: '50 bars', description: 'Extended' },
      { value: '100', label: '100 bars', description: 'Major' },
    ],
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function MissingFieldPrompt({
  missingFields,
  onComplete,
  onCancel,
}: MissingFieldPromptProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Check if all fields are filled
  const allFilled = missingFields.every(f => values[f.field] !== undefined);

  const handleValueChange = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Auto-advance to next field if not last
    if (currentIndex < missingFields.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const handleComplete = () => {
    // Convert string values to appropriate types
    const typedValues: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(values)) {
      const field = missingFields.find(f => f.field === key);
      if (field?.inputType === 'number' || ['periodMinutes', 'emaPeriod', 'lookbackPeriod'].includes(key)) {
        typedValues[key] = parseInt(value, 10);
      } else {
        typedValues[key] = value;
      }
    }
    onComplete(typedValues);
  };

  // If only one field, show simple inline prompt
  if (missingFields.length === 1) {
    const field = missingFields[0];
    const displayInfo = FIELD_DISPLAY[field.field];
    const options = displayInfo?.options || field.options?.map(o => ({ value: o, label: o })) || [];

    return (
      <div className="w-full max-w-2xl mx-auto bg-amber-900/10 border border-amber-500/50 rounded-lg">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-zinc-200">
              Almost there! Just need:
            </h3>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 pt-2">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-zinc-200 mb-1">
                {displayInfo?.title || field.label}
              </p>
              {displayInfo?.description && (
                <p className="text-xs text-zinc-400 mb-3">{displayInfo.description}</p>
              )}
            </div>

            {/* Button grid for options */}
            <div className={cn(
              'grid gap-2',
              options.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'
            )}>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleValueChange(field.field, option.value)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-md border-2 p-3 transition-all',
                    values[field.field] === option.value
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                  )}
                >
                  <span className="text-base font-bold text-zinc-200">{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-zinc-500 mt-1">{option.description}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-amber-500/30 p-4 flex gap-3">
          {onCancel && (
            <button 
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={handleComplete}
            disabled={!values[field.field]}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors',
              values[field.field]
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            )}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Multiple fields - show progress-based UI
  return (
    <div className="w-full max-w-2xl mx-auto bg-amber-900/10 border border-amber-500/50 rounded-lg">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-zinc-200">
              Need a few more details
            </h3>
          </div>
          <span className="text-sm text-zinc-500">
            {Object.keys(values).length} / {missingFields.length}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-1 bg-zinc-800 rounded-full mt-3">
          <div 
            className="h-1 bg-indigo-500 rounded-full transition-all"
            style={{ width: `${(Object.keys(values).length / missingFields.length) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 pt-2 space-y-3">
        {missingFields.map((field, index) => {
          const displayInfo = FIELD_DISPLAY[field.field];
          const isActive = index === currentIndex;
          const isFilled = values[field.field] !== undefined;
          const options = displayInfo?.options || field.options?.map(o => ({ value: o, label: o })) || [];

          return (
            <div 
              key={field.field}
              className={cn(
                'p-3 rounded-lg border transition-all',
                isActive 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : isFilled
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-zinc-800 bg-zinc-900/50'
              )}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setCurrentIndex(index)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-zinc-200">
                    {displayInfo?.title || field.label}
                  </p>
                  {isFilled && (
                    <div className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-sm text-emerald-400 font-mono">
                        {values[field.field]}
                      </span>
                    </div>
                  )}
                </div>
              </button>
              
              {isActive && (
                <>
                  {displayInfo?.description && (
                    <p className="text-xs text-zinc-400 mb-3">{displayInfo.description}</p>
                  )}

                  <div className={cn(
                    'grid gap-2',
                    options.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'
                  )}>
                    {options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleValueChange(field.field, option.value)}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-md border-2 p-2 transition-all text-sm',
                          values[field.field] === option.value
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div className="border-t border-amber-500/30 p-4 flex gap-3">
        {onCancel && (
          <button 
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
        )}
        <button 
          onClick={handleComplete}
          disabled={!allFilled}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors',
            allFilled
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          )}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default MissingFieldPrompt;
