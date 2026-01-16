'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';
import { 
  needsConfirmation, 
  orderByImportance, 
  filterInstrumentParam,
  canSaveStrategy,
} from '@/lib/utils/parameterUtils';
import { ParameterCard } from './ParameterCard';
import { SwipeProgressIndicator } from './SwipeProgressIndicator';
import { StickyActionBar } from './StickyActionBar';

/**
 * STRATEGY SWIPEABLE CARDS
 * 
 * Mobile-first swipeable interface for reviewing strategy parameters.
 * Shows one parameter at a time with swipe gestures to navigate.
 * 
 * From Agent 1 Decision (Issue #7):
 * - Framer Motion for swipe detection
 * - Spring animations (stiffness: 300, damping: 30)
 * - Hybrid navigation (swipe + arrow buttons)
 * - Parameters ordered by importance (critical first)
 * - Block save until critical params confirmed
 */

interface StrategySwipeableCardsProps {
  /** Strategy name */
  name: string;
  /** Parsed strategy rules */
  rules: StrategyRule[];
  /** Detected pattern */
  pattern?: string;
  /** Instrument */
  instrument?: string;
  /** Callback when user confirms a parameter */
  onParameterConfirm: (index: number) => void;
  /** Callback when user wants to edit a parameter */
  onParameterEdit: (index: number) => void;
  /** Callback for "Review All" button */
  onReviewAll: () => void;
  /** Callback when user saves strategy */
  onSave: () => Promise<void>;
  /** Set of already confirmed parameter indices */
  confirmedParams: Set<number>;
  /** Current card index (for state persistence) */
  currentIndex?: number;
  /** Callback when card changes */
  onIndexChange?: (index: number) => void;
}

// Animation config (matching existing codebase patterns)
const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 1,
};

// Swipe threshold in pixels
const SWIPE_THRESHOLD = 100;

export function StrategySwipeableCards({
  name,
  rules,
  pattern,
  instrument,
  onParameterConfirm,
  onParameterEdit,
  onReviewAll,
  onSave,
  confirmedParams,
  currentIndex: externalIndex,
  onIndexChange,
}: StrategySwipeableCardsProps) {
  // Filter out instrument (shown in header) and order by importance
  const orderedParams = useMemo(() => {
    const filtered = filterInstrumentParam(rules);
    return orderByImportance(filtered);
  }, [rules]);

  // Handle single parameter edge case
  const isSingleParam = orderedParams.length === 1;

  // Current card index (use external if provided, for state persistence)
  const [internalIndex, setInternalIndex] = useState(0);
  const currentCardIndex = externalIndex ?? internalIndex;

  // Swipe direction for animation
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Change card index with optional callback
  const setCardIndex = useCallback((newIndex: number) => {
    setInternalIndex(newIndex);
    onIndexChange?.(newIndex);
  }, [onIndexChange]);

  // Calculate unconfirmed critical indices (for progress indicator)
  const unconfirmedCriticalIndices = useMemo(() => {
    return orderedParams
      .map(({ originalIndex }, displayIndex) => ({ originalIndex, displayIndex }))
      .filter(({ originalIndex }) => 
        needsConfirmation(rules[originalIndex]) && !confirmedParams.has(originalIndex)
      )
      .map(({ displayIndex }) => displayIndex);
  }, [orderedParams, rules, confirmedParams]);

  // Count confirmed params (for progress display)
  const confirmedCount = useMemo(() => {
    return orderedParams.filter(({ originalIndex }) => 
      !needsConfirmation(rules[originalIndex]) || confirmedParams.has(originalIndex)
    ).length;
  }, [orderedParams, rules, confirmedParams]);

  // Can save check
  const canSave = canSaveStrategy(rules, confirmedParams);

  // Handle swipe end
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // Check if swipe exceeds threshold or has high velocity
    const swipedRight = offset.x > SWIPE_THRESHOLD || velocity.x > 500;
    const swipedLeft = offset.x < -SWIPE_THRESHOLD || velocity.x < -500;

    if (swipedRight && currentCardIndex > 0) {
      setSwipeDirection('right');
      setCardIndex(currentCardIndex - 1);
      triggerHaptic();
    } else if (swipedLeft && currentCardIndex < orderedParams.length - 1) {
      setSwipeDirection('left');
      setCardIndex(currentCardIndex + 1);
      triggerHaptic();
    }
  }, [currentCardIndex, orderedParams.length, setCardIndex]);

  // Navigation handlers
  const goToPrev = useCallback(() => {
    if (currentCardIndex > 0) {
      setSwipeDirection('right');
      setCardIndex(currentCardIndex - 1);
    }
  }, [currentCardIndex, setCardIndex]);

  const goToNext = useCallback(() => {
    if (currentCardIndex < orderedParams.length - 1) {
      setSwipeDirection('left');
      setCardIndex(currentCardIndex + 1);
    }
  }, [currentCardIndex, orderedParams.length, setCardIndex]);

  // Handle dot click (jump to card)
  const handleDotClick = useCallback((targetIndex: number) => {
    setSwipeDirection(targetIndex > currentCardIndex ? 'left' : 'right');
    setCardIndex(targetIndex);
  }, [currentCardIndex, setCardIndex]);

  // Current parameter
  const currentParam = orderedParams[currentCardIndex];

  // If single param, render simplified view
  if (isSingleParam) {
    return (
      <div className="flex flex-col h-full bg-zinc-950">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-100">{name}</h2>
          <div className="flex items-center gap-2 mt-1">
            {pattern && (
              <span className="text-xs text-zinc-500 capitalize">
                {pattern.replace(/_/g, ' ')}
              </span>
            )}
            {instrument && (
              <span className="text-xs text-indigo-400">{instrument}</span>
            )}
          </div>
        </div>

        {/* Single Card */}
        <div className="flex-1 p-4">
          <ParameterCard
            parameter={currentParam.rule}
            isConfirmed={confirmedParams.has(currentParam.originalIndex)}
            onConfirm={() => onParameterConfirm(currentParam.originalIndex)}
            onEdit={() => onParameterEdit(currentParam.originalIndex)}
          />
        </div>

        {/* Action Bar */}
        <StickyActionBar
          completedCount={confirmedCount}
          totalCount={orderedParams.length}
          canSave={canSave}
          onReviewAll={onReviewAll}
          onSave={onSave}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-100">{name}</h2>
        <div className="flex items-center gap-2 mt-1">
          {pattern && (
            <span className="text-xs text-zinc-500 capitalize">
              {pattern.replace(/_/g, ' ')}
            </span>
          )}
          {instrument && (
            <span className="text-xs text-indigo-400">{instrument}</span>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <SwipeProgressIndicator
        current={currentCardIndex}
        total={orderedParams.length}
        confirmedCount={confirmedCount}
        unconfirmedCriticalIndices={unconfirmedCriticalIndices}
        onDotClick={handleDotClick}
      />

      {/* Swipeable Card Area */}
      <div className="flex-1 relative overflow-hidden px-4 py-6">
        {/* Arrow Navigation (secondary, bottom corners) */}
        <button
          onClick={goToPrev}
          disabled={currentCardIndex === 0}
          className={cn(
            'absolute left-2 bottom-1/2 transform translate-y-1/2 z-10',
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-zinc-800/80 backdrop-blur-sm border border-zinc-700',
            'transition-opacity',
            currentCardIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-70 hover:opacity-100'
          )}
          aria-label="Previous card"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-300" />
        </button>

        <button
          onClick={goToNext}
          disabled={currentCardIndex === orderedParams.length - 1}
          className={cn(
            'absolute right-2 bottom-1/2 transform translate-y-1/2 z-10',
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-zinc-800/80 backdrop-blur-sm border border-zinc-700',
            'transition-opacity',
            currentCardIndex === orderedParams.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-70 hover:opacity-100'
          )}
          aria-label="Next card"
        >
          <ChevronRight className="w-5 h-5 text-zinc-300" />
        </button>

        {/* Swipeable Cards Container */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentCardIndex}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ 
              x: swipeDirection === 'left' ? 300 : swipeDirection === 'right' ? -300 : 0,
              opacity: 0 
            }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ 
              x: swipeDirection === 'left' ? -300 : 300, 
              opacity: 0 
            }}
            transition={SPRING_CONFIG}
            className="h-full cursor-grab active:cursor-grabbing"
          >
            <ParameterCard
              parameter={currentParam.rule}
              isConfirmed={confirmedParams.has(currentParam.originalIndex)}
              onConfirm={() => {
                onParameterConfirm(currentParam.originalIndex);
                triggerHaptic([10, 50, 10]); // Success pattern
              }}
              onEdit={() => onParameterEdit(currentParam.originalIndex)}
            />
          </motion.div>
        </AnimatePresence>

        {/* Peek at next card (subtle) */}
        {currentCardIndex < orderedParams.length - 1 && (
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none">
            <div className="h-full bg-gradient-to-l from-zinc-800/20 to-transparent" />
          </div>
        )}
      </div>

      {/* Sticky Action Bar */}
      <StickyActionBar
        completedCount={confirmedCount}
        totalCount={orderedParams.length}
        canSave={canSave}
        onReviewAll={onReviewAll}
        onSave={onSave}
      />
    </div>
  );
}

/**
 * Trigger haptic feedback on mobile devices
 */
function triggerHaptic(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
