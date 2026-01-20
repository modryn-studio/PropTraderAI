'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Save, Loader2, List, Check } from 'lucide-react';

/**
 * STICKY ACTION BAR
 * 
 * Bottom action bar for mobile swipeable cards.
 * Shows completion status and save/review actions.
 * Sticks to bottom with safe area insets for iOS.
 * 
 * From Agent 1 Decision (Issue #7):
 * - Block save until critical params confirmed
 * - "Review All" opens list view modal
 * - Safe area insets for iOS notch/home indicator
 */

interface StickyActionBarProps {
  /** Number of completed (confirmed) parameters */
  completedCount: number;
  /** Total number of parameters */
  totalCount: number;
  /** Whether save is allowed (all critical params confirmed) */
  canSave: boolean;
  /** Callback for "Review All" button */
  onReviewAll: () => void;
  /** Callback when user saves strategy */
  onSave: () => Promise<void>;
}

export function StickyActionBar({
  completedCount,
  totalCount,
  canSave,
  onReviewAll,
  onSave,
}: StickyActionBarProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isComplete = completedCount === totalCount;

  const handleSave = async () => {
    if (!canSave || isSaving) return;
    
    setIsSaving(true);
    setError(null);
    try {
      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save strategy');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className={cn(
        'sticky bottom-0 left-0 right-0',
        'bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800',
        // Safe area insets for iOS
        'pb-[max(16px,env(safe-area-inset-bottom))]',
        'px-[max(16px,env(safe-area-inset-left))]',
      )}
    >
      <div className="flex items-center justify-between gap-4 pt-4 pb-2">
        {/* Completion Status */}
        <div className="flex items-center gap-2">
          {isComplete ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 text-emerald-400"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">All Complete</span>
            </motion.div>
          ) : (
            <span className="text-sm text-zinc-400">
              ✓ {completedCount}/{totalCount} Complete
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Review All Button */}
          <button
            onClick={onReviewAll}
            className={cn(
              'flex items-center justify-center gap-2',
              'min-h-[44px] px-4 py-2',
              'bg-zinc-800 hover:bg-zinc-700 text-zinc-300',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500'
            )}
          >
            <List className="w-4 h-4" />
            <span className="text-sm font-medium">Review All</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className={cn(
              'flex items-center justify-center gap-2',
              'min-h-[44px] px-5 py-2',
              'font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900',
              canSave
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="text-sm">
                  {canSave ? 'Save Strategy' : 'Confirm critical params'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400 text-center pb-1"
        >
          {error}
        </motion.p>
      )}

      {/* Unconfirmed warning */}
      {!canSave && !error && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-amber-500 text-center pb-1"
        >
          Confirm all critical parameters (stop loss, risk limits) to save
        </motion.p>
      )}
    </div>
  );
}
