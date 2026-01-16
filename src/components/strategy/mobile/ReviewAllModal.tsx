'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, Check, AlertCircle, ChevronRight, ChevronDown, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';
import { needsConfirmation } from '@/lib/utils/parameterUtils';

/**
 * REVIEW ALL MODAL
 * 
 * Mobile-optimized list view of all strategy parameters.
 * Slides up from bottom. Shows confirmation status at a glance.
 * Tapping a parameter jumps back to that card in swipe view.
 * 
 * From Agent 1 Decision (Issue #7):
 * - Stay in mobile context (no jarring layout shift)
 * - Show all params at once with confirmation status
 * - Jump to card on tap
 * - Direct edit button (Week 5-6)
 */

interface ReviewAllModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Parameters to display */
  parameters: { rule: StrategyRule; originalIndex: number }[];
  /** Set of confirmed parameter indices */
  confirmedParams: Set<number>;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when user taps a parameter to jump to it */
  onCardSelect: (displayIndex: number) => void;
  /** Callback when user taps Edit on a parameter (Week 5-6) */
  onEditParameter?: (originalIndex: number) => void;
  /** Strategy name for header */
  strategyName?: string;
}

// Category colors (matching ParameterCard)
const CATEGORY_COLORS: Record<string, string> = {
  setup: 'text-blue-400',
  entry: 'text-purple-400',
  exit: 'text-amber-400',
  risk: 'text-red-400',
  filters: 'text-cyan-400',
  timeframe: 'text-green-400',
};

export function ReviewAllModal({
  isOpen,
  parameters,
  confirmedParams,
  onClose,
  onCardSelect,
  onEditParameter,
  strategyName = 'Strategy Overview',
}: ReviewAllModalProps) {
  const handleCardClick = (displayIndex: number) => {
    onCardSelect(displayIndex);
    onClose();
  };
  
  const handleEditClick = (e: React.MouseEvent, originalIndex: number) => {
    e.stopPropagation(); // Prevent card jump
    if (onEditParameter) {
      onEditParameter(originalIndex);
      // Don't close modal - let edit modal slide on top
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className={cn(
              'fixed left-0 right-0 bottom-0 z-50',
              'bg-zinc-900 rounded-t-2xl',
              'max-h-[85vh] overflow-hidden',
              // Safe area insets for iOS
              'pb-[max(16px,env(safe-area-inset-bottom))]',
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Handle bar (drag indicator) */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-100">
                {strategyName}
              </h2>
              <button
                onClick={onClose}
                className={cn(
                  'flex items-center justify-center',
                  'min-w-[44px] min-h-[44px] -mr-2',
                  'rounded-full hover:bg-zinc-800 transition-colors'
                )}
                aria-label="Close"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            
            {/* Parameters List */}
            <div className="relative overflow-y-auto max-h-[calc(85vh-120px)] px-4 py-3">
              <div className="space-y-2">
                {parameters.map(({ rule, originalIndex }, displayIndex) => {
                  const requiresConfirmation = needsConfirmation(rule);
                  const isConfirmed = confirmedParams.has(originalIndex) || !requiresConfirmation;
                  const categoryColor = CATEGORY_COLORS[rule.category] || 'text-zinc-400';
                  
                  return (
                    <motion.button
                      key={`${rule.label}-${displayIndex}`}
                      onClick={() => handleCardClick(displayIndex)}
                      className={cn(
                        'w-full flex items-center justify-between p-4 rounded-lg',
                        'bg-zinc-800/50 hover:bg-zinc-800 transition-colors',
                        'text-left min-h-[60px]'
                      )}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        {/* Category + Label */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs uppercase tracking-wide', categoryColor)}>
                            {rule.category}
                          </span>
                          {rule.isDefaulted && (
                            <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700 py-0">
                              default
                            </Badge>
                          )}
                        </div>
                        
                        {/* Label and Value */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-zinc-400">
                            {rule.label}:
                          </span>
                          <span className="text-sm text-zinc-100 truncate">
                            {rule.value}
                          </span>
                        </div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isConfirmed ? (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-500">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                        
                        {/* Edit button (Week 5-6) */}
                        {onEditParameter && (
                          <button
                            onClick={(e) => handleEditClick(e, originalIndex)}
                            className={cn(
                              'p-2 rounded-lg',
                              'hover:bg-zinc-700 transition-colors',
                              'text-zinc-400 hover:text-zinc-200'
                            )}
                            aria-label={`Edit ${rule.label}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Scroll indicator for long lists */}
              {parameters.length > 5 && (
                <motion.div
                  className="sticky bottom-0 left-0 right-0 flex justify-center py-2 pointer-events-none"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded-full">
                    <ChevronDown className="w-3 h-3" />
                    <span>Scroll for more</span>
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Footer summary */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900">
              <p className="text-center text-sm text-zinc-500">
                Tap any parameter to jump to its card
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
