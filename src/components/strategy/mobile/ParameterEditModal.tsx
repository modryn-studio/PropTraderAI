'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, Info, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';
import { needsConfirmation } from '@/lib/utils/parameterUtils';

/**
 * PARAMETER EDIT MODAL
 * 
 * Mobile-optimized slide-up modal for editing strategy parameters.
 * Part of Week 5-6 implementation (Issue #7).
 * 
 * Features:
 * - iOS-style sheet presentation (slide up from bottom)
 * - Context-aware input types based on category
 * - Real-time validation with feedback
 * - Smart suggestions for common values
 * - Auto-confirm after edit (since user explicitly changed it)
 * 
 * Design principles:
 * - Mobile-first (full screen on small devices)
 * - Large touch targets (48px minimum)
 * - Clear visual hierarchy
 * - Immediate feedback on changes
 */

interface ParameterEditModalProps {
  /** The parameter being edited */
  parameter: StrategyRule;
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Save handler - returns new value */
  onSave: (newValue: string) => void;
  /** Optional: current instrument for context */
  instrument?: string;
}

// ============================================================================
// INPUT TYPE CONFIGURATION
// ============================================================================

interface ValidationResult {
  valid: boolean;
  error?: string;    // Blocking error (prevent save)
  warning?: string;  // Non-blocking warning (allow save with caution)
}

interface InputConfig {
  type: 'text' | 'number' | 'time' | 'select';
  inputMode: 'text' | 'numeric' | 'decimal' | 'tel';  // Mobile keyboard type
  suggestions?: string[];
  placeholder?: string;
  suffix?: string;
  prefix?: string;
  validation?: (value: string) => ValidationResult;
  helpText?: string;
}

/**
 * Get input configuration based on parameter label and category
 */
function getInputConfig(param: StrategyRule, instrument?: string): InputConfig {
  const label = param.label.toLowerCase();
  
  // Stop Loss / Risk parameters
  if (label.includes('stop') || label.includes('risk') || label.includes('drawdown')) {
    // Instrument-specific limits
    const limits = {
      'ES': { typical: 50, max: 100 },
      'NQ': { typical: 100, max: 200 },
      'YM': { typical: 200, max: 500 },
    };
    const limit = limits[instrument as keyof typeof limits] || { typical: 50, max: 200 };
    
    return {
      type: 'number',
      inputMode: 'numeric',  // Whole numbers for stop loss
      suffix: label.includes('points') || label.includes('ticks') ? 'points' : 
              label.includes('%') || label.includes('percent') ? '%' : 'points',
      suggestions: instrument === 'ES' || instrument === 'NQ' 
        ? ['10', '15', '20', '25', '30'] 
        : ['5', '10', '15', '20', '25'],
      placeholder: '20',
      validation: (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return { valid: false, error: 'Must be a number' };
        if (num <= 0) return { valid: false, error: 'Must be greater than 0' };
        if (num < 0) return { valid: false, error: 'Stop loss cannot be negative' };
        // Warning for wide stops (non-blocking)
        if (num > limit.typical) {
          return { valid: true, warning: `Wide stop (>${limit.typical} points). Are you sure?` };
        }
        return { valid: true };
      },
      helpText: 'Distance from entry to stop loss. Smaller = less risk, tighter stop.',
    };
  }
  
  // Target / Profit parameters
  if (label.includes('target') || label.includes('profit') || label.includes('reward')) {
    return {
      type: 'number',
      inputMode: 'decimal',  // Allow decimals for R ratios
      suffix: label.includes('R') || label.includes('r:r') ? 'R' : 'points',
      suggestions: ['1.5R', '2R', '2.5R', '3R'],
      placeholder: '2R',
      validation: (value) => {
        // Allow "R" suffix for R:R values
        const cleaned = value.replace(/R$/i, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) return { valid: false, error: 'Must be a number (optionally with R)' };
        if (num <= 0) return { valid: false, error: 'Must be greater than 0' };
        if (num < 1) return { valid: false, error: 'R:R must be at least 1:1' };
        // Warning for high R:R (non-blocking)
        if (num > 5) {
          return { valid: true, warning: 'High R:R (>5:1) may be unrealistic. Confirm?' };
        }
        return { valid: true };
      },
      helpText: 'Your profit target. 2R means 2x your risk (stop loss distance).',
    };
  }
  
  // Position Sizing
  if (label.includes('sizing') || label.includes('contracts') || label.includes('lots')) {
    return {
      type: 'select',
      inputMode: 'numeric',  // Whole numbers for contracts
      suggestions: ['1', '2', '3', '5', '10'],
      placeholder: '1',
      validation: (value) => {
        const num = parseInt(value);
        if (isNaN(num)) return { valid: false, error: 'Must be a whole number' };
        if (num < 1) return { valid: false, error: 'Minimum is 1 contract' };
        // Warning for large positions (non-blocking)
        if (num > 10) {
          return { valid: true, warning: `Large position size (${num} contracts). Are you sure?` };
        }
        return { valid: true };
      },
      helpText: 'Number of contracts to trade per setup.',
    };
  }
  
  // Time parameters
  if (label.includes('time') || label.includes('session') || label.includes('start') || label.includes('end')) {
    return {
      type: 'time',
      inputMode: 'text',  // Time format
      suggestions: ['9:30 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'],
      placeholder: '9:30 AM',
      validation: (value) => {
        // Basic time validation
        const timeRegex = /^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM|am|pm)?$/;
        if (!timeRegex.test(value)) {
          return { valid: false, error: 'Use format like 9:30 AM' };
        }
        return { valid: true };
      },
      helpText: 'Times are in your local timezone (converted for exchange).',
    };
  }
  
  // Range parameters (Opening Range, etc.)
  if (label.includes('range') && (label.includes('minutes') || label.includes('min'))) {
    return {
      type: 'select',
      inputMode: 'numeric',  // Whole numbers for minutes
      suggestions: ['5', '15', '30', '60'],
      suffix: 'min',
      placeholder: '30',
      validation: (value) => {
        const num = parseInt(value);
        if (isNaN(num)) return { valid: false, error: 'Must be a number' };
        if (num < 1) return { valid: false, error: 'Minimum is 1 minute' };
        return { valid: true };
      },
      helpText: 'Duration for the range calculation after market open.',
    };
  }
  
  // Default text input (fallback for unknown param types)
  return {
    type: 'text',
    inputMode: 'text',  // Default text keyboard
    placeholder: param.value,
    validation: (value) => {
      if (!value.trim()) return { valid: false, error: 'Value cannot be empty' };
      return { valid: true };
    },
    helpText: 'Enter the value for this parameter.',
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

export function ParameterEditModal({
  parameter,
  isOpen,
  onClose,
  onSave,
  instrument,
}: ParameterEditModalProps) {
  const [value, setValue] = useState(parameter.value);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [hasChanged, setHasChanged] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const config = getInputConfig(parameter, instrument);
  const requiresConfirmation = needsConfirmation(parameter);

  // Reset state when modal opens with new parameter
  useEffect(() => {
    if (isOpen) {
      setValue(parameter.value);
      setError(null);
      setWarning(null);
      setHasChanged(false);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, parameter.value]);

  // Validate on change
  useEffect(() => {
    if (hasChanged && config.validation) {
      const result = config.validation(value);
      setError(result.valid ? null : result.error || 'Invalid value');
      setWarning(result.valid && result.warning ? result.warning : null);
    }
  }, [value, hasChanged, config]);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    setHasChanged(true);
  };

  const handleSave = () => {
    // Final validation
    if (config.validation) {
      const result = config.validation(value);
      if (!result.valid) {
        setError(result.error || 'Invalid value');
        return;
      }
    }
    
    // Normalize value (add suffix if needed)
    let finalValue = value.trim();
    if (config.suffix && !finalValue.toLowerCase().endsWith(config.suffix.toLowerCase())) {
      // Don't auto-add suffix for R values (user may include it)
      if (config.suffix !== 'R' && config.suffix !== '%') {
        // Only add suffix if it's a pure number
        if (/^\d+(\.\d+)?$/.test(finalValue)) {
          finalValue = `${finalValue} ${config.suffix}`;
        }
      }
    }
    
    // Haptic feedback on successful save (success pattern)
    triggerHaptic([10, 50, 10]);
    
    onSave(finalValue);
    onClose();
  };

  const handleSuggestionTap = (suggestion: string) => {
    setValue(suggestion);
    setHasChanged(true);
    setError(null);
    setWarning(null);
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
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          
          {/* Modal Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50',
              'bg-zinc-900 rounded-t-2xl',
              'max-h-[90vh] overflow-hidden',
              // iOS safe area
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
              
              <h2 className="text-lg font-semibold text-zinc-100 text-center flex-1">
                Edit {parameter.label}
              </h2>
              
              <button
                onClick={handleSave}
                disabled={!!error}
                className={cn(
                  'flex items-center gap-1 min-h-[44px] px-3 rounded-lg',
                  'font-medium transition-colors',
                  error 
                    ? 'text-zinc-500 cursor-not-allowed'
                    : 'text-emerald-400 hover:bg-emerald-400/10'
                )}
              >
                <Check className="w-5 h-5" />
                <span>Save</span>
              </button>
            </div>
            
            {/* Content */}
            <div className="px-5 py-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Current vs New Value Preview */}
              {hasChanged && value !== parameter.value && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50"
                >
                  <div className="flex-1 text-center">
                    <p className="text-xs text-zinc-500">Current</p>
                    <p className="text-sm text-zinc-400 line-through">{parameter.value}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-zinc-500 rotate-180" />
                  <div className="flex-1 text-center">
                    <p className="text-xs text-emerald-500">New</p>
                    <p className="text-sm text-emerald-400 font-medium">{value}</p>
                  </div>
                </motion.div>
              )}
              
              {/* Input Field */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">{parameter.label}</label>
                
                <div className="relative">
                  {config.prefix && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      {config.prefix}
                    </span>
                  )}
                  
                  <input
                    ref={inputRef}
                    type={config.type === 'number' ? 'text' : config.type}
                    inputMode={config.inputMode}
                    pattern={config.inputMode === 'numeric' ? '[0-9]*' : undefined}
                    value={value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder={config.placeholder}
                    className={cn(
                      'w-full px-4 py-4 rounded-xl text-lg',
                      'bg-zinc-800 border-2 transition-colors',
                      'text-zinc-100 placeholder:text-zinc-600',
                      'focus:outline-none',
                      error
                        ? 'border-red-500/50 focus:border-red-500'
                        : warning
                          ? 'border-amber-500/50 focus:border-amber-500'
                          : 'border-zinc-700 focus:border-zinc-500',
                      config.prefix && 'pl-8',
                      config.suffix && 'pr-16'
                    )}
                  />
                  
                  {config.suffix && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      {config.suffix}
                    </span>
                  )}
                </div>
                
                {/* Error Message (blocking) */}
                {/* Error Message (blocking) */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex items-center gap-2 text-red-400 text-sm"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Warning Message (non-blocking) */}
                <AnimatePresence>
                  {warning && !error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex items-center gap-2 text-amber-400 text-sm"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>{warning}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Quick Suggestions */}
              {config.suggestions && config.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Common values</p>
                  <div className="flex flex-wrap gap-2">
                    {config.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionTap(suggestion)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium',
                          'transition-colors min-h-[40px]',
                          value === suggestion
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Help Text */}
              {config.helpText && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-800/30">
                  <Info className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-zinc-400">{config.helpText}</p>
                </div>
              )}
              
              {/* Critical Warning */}
              {requiresConfirmation && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-200 font-medium">Critical Parameter</p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      This parameter affects your risk. Double-check before saving.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Original Default Info */}
              {parameter.isDefaulted && parameter.explanation && (
                <div className="p-3 rounded-lg bg-zinc-800/30 space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Why this was defaulted</p>
                  <p className="text-sm text-zinc-400">{parameter.explanation}</p>
                </div>
              )}
            </div>
            
            {/* Save Button (Fixed at bottom for mobile) */}
            <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-900">
              <button
                onClick={handleSave}
                disabled={!!error}
                className={cn(
                  'w-full flex items-center justify-center gap-2',
                  'min-h-[52px] px-6 rounded-xl',
                  'font-semibold text-lg transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900',
                  error
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500'
                )}
              >
                <Check className="w-5 h-5" />
                <span>Save Changes</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
