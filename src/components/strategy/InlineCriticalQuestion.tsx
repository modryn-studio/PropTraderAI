'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * INLINE CRITICAL QUESTION
 * 
 * Part of the Rapid Strategy Flow (Phase 1).
 * Shown inline in chat when a critical parameter is missing.
 * 
 * Design principles:
 * - Non-blocking (doesn't interrupt flow like modal)
 * - Large touch targets (mobile-friendly)
 * - Clear default recommendation
 * - Pattern-specific options
 */

interface CriticalQuestionOption {
  value: string;
  label: string;
  default?: boolean;
}

interface InlineCriticalQuestionProps {
  /** The question to ask */
  question: string;
  /** Available answer options */
  options: CriticalQuestionOption[];
  /** Callback when user selects an option */
  onSelect: (value: string) => void;
  /** Type of critical parameter (for styling/icons) */
  variant: 'stop_loss' | 'instrument' | 'entry' | 'direction';
  /** Show loading state while processing */
  isLoading?: boolean;
  /** Currently selected value (for controlled mode) */
  selectedValue?: string;
}

export default function InlineCriticalQuestion({
  question,
  options,
  onSelect,
  variant,
  isLoading = false,
  selectedValue,
}: InlineCriticalQuestionProps) {
  
  // Variant-specific styling
  const variantConfig = {
    stop_loss: {
      icon: AlertTriangle,
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-500/5',
      accentColor: 'text-amber-500',
      hoverBorder: 'hover:border-amber-500/50',
    },
    instrument: {
      icon: null,
      borderColor: 'border-blue-500/30',
      bgColor: 'bg-blue-500/5',
      accentColor: 'text-blue-500',
      hoverBorder: 'hover:border-blue-500/50',
    },
    entry: {
      icon: null,
      borderColor: 'border-purple-500/30',
      bgColor: 'bg-purple-500/5',
      accentColor: 'text-purple-500',
      hoverBorder: 'hover:border-purple-500/50',
    },
    direction: {
      icon: null,
      borderColor: 'border-green-500/30',
      bgColor: 'bg-green-500/5',
      accentColor: 'text-green-500',
      hoverBorder: 'hover:border-green-500/50',
    },
  };
  
  // Default config for unknown variants
  const defaultConfig = {
    icon: null,
    borderColor: 'border-gray-500/30',
    bgColor: 'bg-gray-500/5',
    accentColor: 'text-gray-400',
    hoverBorder: 'hover:border-gray-500/50',
  };
  
  const config = (variant && variantConfig[variant]) || defaultConfig;
  const IconComponent = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'my-4 p-4 rounded-lg border',
        config.borderColor,
        config.bgColor
      )}
    >
      {/* Question Header */}
      <div className="flex items-start gap-3 mb-4">
        {IconComponent && (
          <IconComponent className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.accentColor)} />
        )}
        <p className="text-sm font-medium text-zinc-200">{question}</p>
      </div>
      
      {/* Options Grid */}
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const isSelected = selectedValue === option.value;
          const isDefault = option.default;
          
          return (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !isLoading && onSelect(option.value)}
              disabled={isLoading}
              className={cn(
                'relative px-4 py-2.5 rounded-md text-sm font-medium transition-all',
                'border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900',
                isSelected
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 focus:ring-emerald-500'
                  : isDefault
                    ? cn(
                        'bg-zinc-800 border-zinc-600 text-zinc-100',
                        config.hoverBorder,
                        'focus:ring-zinc-500'
                      )
                    : cn(
                        'bg-zinc-900 border-zinc-700 text-zinc-300',
                        'hover:bg-zinc-800 hover:border-zinc-600',
                        'focus:ring-zinc-500'
                      ),
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.span>
              )}
              
              {/* Label */}
              <span>{option.label}</span>
              
              {/* Recommended badge */}
              {isDefault && !isSelected && (
                <span className="ml-2 text-xs opacity-60">(recommended)</span>
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-400 rounded-full"
          />
          <span>Processing...</span>
        </div>
      )}
      
      {/* Help text for "Other" option */}
      {selectedValue === 'custom' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3"
        >
          <input
            type="text"
            placeholder="Describe your stop loss..."
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm',
              'bg-zinc-800 border border-zinc-700',
              'text-zinc-200 placeholder:text-zinc-500',
              'focus:outline-none focus:ring-2 focus:ring-zinc-500'
            )}
            autoFocus
          />
        </motion.div>
      )}
    </motion.div>
  );
}
