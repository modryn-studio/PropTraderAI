'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, AlertCircle } from 'lucide-react';

/**
 * SWIPE PROGRESS INDICATOR
 * 
 * Shows progress through parameter cards with tappable dots.
 * Displays current position and completion status.
 * 
 * From Agent 1 Decision (Issue #7):
 * - Dots are tappable to jump to card
 * - Can't skip unconfirmed critical params when jumping forward
 * - Shows completion count, not percentage
 */

interface SwipeProgressIndicatorProps {
  /** Current card index (0-based) */
  current: number;
  /** Total number of cards */
  total: number;
  /** Number of confirmed parameters */
  confirmedCount: number;
  /** Indices that need confirmation but aren't confirmed yet */
  unconfirmedCriticalIndices: number[];
  /** Callback when dot is tapped */
  onDotClick: (index: number) => void;
}

export function SwipeProgressIndicator({
  current,
  total,
  confirmedCount,
  unconfirmedCriticalIndices,
  onDotClick,
}: SwipeProgressIndicatorProps) {
  // Track which dots should pulse (blocked skip feedback)
  const [pulseDots, setPulseDots] = useState<number[]>([]);
  
  // Handle dot click with forward-skip guard and visual feedback
  const handleDotClick = (targetIndex: number) => {
    // Always allow going back
    if (targetIndex <= current) {
      onDotClick(targetIndex);
      return;
    }
    
    // Validate critical indices are within bounds
    const validCriticalIndices = unconfirmedCriticalIndices.filter(
      idx => idx >= 0 && idx < total
    );
    
    // Find any unconfirmed critical params between current and target
    const blockingIndices = validCriticalIndices.filter(
      criticalIndex => criticalIndex > current && criticalIndex < targetIndex
    );
    
    if (blockingIndices.length > 0) {
      // Visual feedback: pulse the blocking dots
      setPulseDots(blockingIndices);
      setTimeout(() => setPulseDots([]), 1000);
      return;
    }
    
    onDotClick(targetIndex);
  };

  return (
    <div className="w-full px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
      {/* Dots Row */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {Array.from({ length: total }).map((_, index) => {
          const isActive = index === current;
          const isCompleted = index < current;
          const isCriticalUnconfirmed = unconfirmedCriticalIndices.includes(index);
          const isPulsing = pulseDots.includes(index);
          const canClick = index <= current || !unconfirmedCriticalIndices.some(
            ci => ci > current && ci < index
          );

          return (
            <motion.button
              key={index}
              onClick={() => handleDotClick(index)}
              disabled={!canClick}
              aria-label={`Go to parameter ${index + 1}`}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'relative flex items-center justify-center transition-all',
                'min-w-[24px] min-h-[24px] rounded-full',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
                canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                isActive && 'ring-2 ring-offset-2 ring-offset-zinc-900',
                isActive && (isCriticalUnconfirmed ? 'ring-amber-500' : 'ring-indigo-500'),
                isPulsing && 'ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-900 animate-pulse',
              )}
              whileHover={canClick ? { scale: 1.1 } : {}}
              whileTap={canClick ? { scale: 0.95 } : {}}
            >
              {/* Dot background */}
              <motion.div
                className={cn(
                  'w-3 h-3 rounded-full transition-colors',
                  isCompleted && 'bg-emerald-500',
                  isActive && !isCompleted && (isCriticalUnconfirmed ? 'bg-amber-500' : 'bg-indigo-500'),
                  !isActive && !isCompleted && 'bg-zinc-700',
                )}
                animate={isPulsing ? { scale: [1, 1.2, 1] } : isActive ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: isPulsing ? 0.5 : 0.3, repeat: isPulsing ? 2 : 0 }}
              />
              
              {/* Completed check icon */}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-zinc-900" />
                </motion.div>
              )}
              
              {/* Critical warning indicator */}
              {isCriticalUnconfirmed && isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -top-1 -right-1"
                >
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* Progress Text */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">
          Card {current + 1} of {total}
        </span>
        <span className={cn(
          'font-medium',
          confirmedCount === total ? 'text-emerald-400' : 'text-zinc-400'
        )}>
          ✓ {confirmedCount}/{total} Complete
        </span>
      </div>
    </div>
  );
}
