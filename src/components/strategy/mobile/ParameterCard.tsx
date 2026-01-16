'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Pencil, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';
import { needsConfirmation } from '@/lib/utils/parameterUtils';

/**
 * PARAMETER CARD
 * 
 * Individual swipeable card for a single strategy parameter.
 * Shows value, confirmation state, and edit affordance.
 * 
 * Design principles:
 * - Clear visual hierarchy
 * - Large tap targets (44px minimum)
 * - Critical params highlighted differently
 */

interface ParameterCardProps {
  /** The strategy rule to display */
  parameter: StrategyRule;
  /** Whether this param has been confirmed */
  isConfirmed: boolean;
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Callback when user wants to edit */
  onEdit: () => void;
  /** Optional className */
  className?: string;
}

// Category colors (matching StrategyEditableCard)
const CATEGORY_COLORS: Record<string, string> = {
  setup: 'text-blue-400',
  entry: 'text-purple-400',
  exit: 'text-amber-400',
  risk: 'text-red-400',
  filters: 'text-cyan-400',
  timeframe: 'text-green-400',
};

export function ParameterCard({
  parameter,
  isConfirmed,
  onConfirm,
  onEdit,
  className,
}: ParameterCardProps) {
  const requiresConfirmation = needsConfirmation(parameter);
  const categoryColor = CATEGORY_COLORS[parameter.category] || 'text-zinc-400';

  return (
    <motion.div
      className={cn(
        'flex flex-col rounded-xl border overflow-hidden',
        'bg-zinc-900 min-h-[400px]',
        isConfirmed 
          ? 'border-emerald-500/30' 
          : requiresConfirmation 
            ? 'border-amber-500/30' 
            : 'border-zinc-700',
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-800/50">
        <div className="flex items-center justify-between">
          <span className={cn('text-xs uppercase tracking-wide font-medium', categoryColor)}>
            {parameter.category}
          </span>
          
          {parameter.isDefaulted && (
            <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
              default
            </Badge>
          )}
          
          {requiresConfirmation && !isConfirmed && (
            <div className="flex items-center gap-1 text-amber-500">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-xs">Needs confirmation</span>
            </div>
          )}
          
          {isConfirmed && (
            <div className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3 h-3" />
              <span className="text-xs">Confirmed</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Parameter Label */}
        <h3 className="text-lg font-medium text-zinc-300 text-center mb-4">
          {parameter.label}
        </h3>
        
        {/* Parameter Value (large, prominent) */}
        <div className="text-center mb-6">
          <p className={cn(
            'text-3xl font-semibold',
            requiresConfirmation && !isConfirmed ? 'text-amber-100' : 'text-zinc-100'
          )}>
            {parameter.value}
          </p>
        </div>
        
        {/* Explanation (for defaulted params) */}
        {parameter.isDefaulted && parameter.explanation && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-800/50 max-w-xs">
            <Info className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              {parameter.explanation}
            </p>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-800/30">
        <div className="flex gap-3">
          {/* Edit Button */}
          <button
            onClick={onEdit}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'min-h-[48px] px-4 py-3 rounded-lg',
              'bg-zinc-800 hover:bg-zinc-700 text-zinc-300',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500'
            )}
          >
            <Pencil className="w-4 h-4" />
            <span className="font-medium">Edit</span>
          </button>
          
          {/* Confirm Button (only for params needing confirmation) */}
          {requiresConfirmation && !isConfirmed && (
            <button
              onClick={onConfirm}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'min-h-[48px] px-4 py-3 rounded-lg',
                'bg-emerald-600 hover:bg-emerald-500 text-white',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500'
              )}
            >
              <Check className="w-4 h-4" />
              <span className="font-medium">Confirm</span>
            </button>
          )}
          
          {/* Already confirmed indicator */}
          {isConfirmed && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'min-h-[48px] px-4 py-3 rounded-lg',
                'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
              )}
            >
              <Check className="w-4 h-4" />
              <span className="font-medium">Confirmed</span>
            </motion.div>
          )}
          
          {/* Auto-confirm badge (for non-critical params) */}
          {!requiresConfirmation && !isConfirmed && (
            <div className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'min-h-[48px] px-4 py-3 rounded-lg',
              'bg-zinc-800/50 text-zinc-500 border border-zinc-700'
            )}>
              <span className="text-sm">Auto-confirmed</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
