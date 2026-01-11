'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronDown, X, List } from 'lucide-react';
import StrategySummaryPanel, { StrategyRule } from './StrategySummaryPanel';

interface MobileStrategySummaryProps {
  strategyName?: string;
  rules: StrategyRule[];
  onClose?: () => void;
}

/**
 * MOBILE STRATEGY SUMMARY
 * 
 * Mobile-optimized version with:
 * - Slide-up panel (bottom sheet)
 * - Swipe-to-dismiss gesture
 * - Floating action button when collapsed
 * - Keyboard-aware positioning
 * - Touch-optimized UI
 */
export default function MobileStrategySummary({
  strategyName,
  rules,
  onClose,
}: MobileStrategySummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewRules, setHasNewRules] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const prevRuleCount = useRef(rules.length);

  // Detect new rules
  useEffect(() => {
    if (rules.length > prevRuleCount.current && !isOpen) {
      setHasNewRules(true);
      // Auto-dismiss "new" indicator after 3 seconds
      const timer = setTimeout(() => setHasNewRules(false), 3000);
      return () => clearTimeout(timer);
    }
    prevRuleCount.current = rules.length;
  }, [rules.length, isOpen]);

  // Detect keyboard (mobile Safari and Chrome)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const diff = windowHeight - viewportHeight;
        setKeyboardHeight(diff > 100 ? diff : 0);
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Swipe down to close (velocity or distance threshold)
    if (info.velocity.y > 300 || info.offset.y > 100) {
      setIsOpen(false);
      onClose?.();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewRules(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  if (rules.length === 0) return null;

  return (
    <>
      {/* Floating Action Button (FAB) - Shows when panel is closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={handleOpen}
            className="fixed z-40 bottom-20 right-4 w-14 h-14 bg-[#00FFD1] rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#00FFD1] focus:ring-offset-2 focus:ring-offset-black"
            style={{
              bottom: keyboardHeight > 0 ? `${keyboardHeight + 20}px` : '80px',
              boxShadow: hasNewRules
                ? '0 4px 20px rgba(0, 255, 209, 0.6)'
                : '0 4px 12px rgba(0, 255, 209, 0.3)',
            }}
            aria-label="View strategy summary"
          >
            <List className="w-6 h-6 text-black" />
            
            {/* New rules indicator */}
            {hasNewRules && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF4757] rounded-full border-2 border-black"
                aria-hidden="true"
              />
            )}
            
            {/* Pulse effect for new rules */}
            {hasNewRules && (
              <motion.div
                className="absolute inset-0 rounded-full bg-[#00FFD1]"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                aria-hidden="true"
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Sheet Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={handleClose}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="fixed left-0 right-0 z-50 bg-[#000000] rounded-t-2xl shadow-2xl flex flex-col"
              style={{
                bottom: keyboardHeight,
                maxHeight: keyboardHeight > 0 ? '50vh' : '75vh',
                touchAction: 'none',
              }}
            >
              {/* Drag Handle */}
              <div className="pt-3 pb-2 flex justify-center">
                <div className="w-10 h-1 bg-[rgba(255,255,255,0.2)] rounded-full" />
              </div>

              {/* Header with close button */}
              <div className="px-4 pb-3 border-b border-[rgba(255,255,255,0.1)] flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-[#00FFD1] rounded-full animate-pulse" />
                    <span className="text-[rgba(255,255,255,0.5)] text-xs font-mono uppercase tracking-wider">
                      Strategy Builder
                    </span>
                  </div>
                  <h2 className="text-white font-mono text-sm leading-tight">
                    {strategyName || 'Untitled Strategy'}
                  </h2>
                </div>
                
                <button
                  onClick={handleClose}
                  className="p-2 -mr-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#00FFD1] rounded"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <StrategySummaryContent rules={rules} />
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between">
                  <span className="text-[rgba(255,255,255,0.5)] text-xs font-mono">
                    {rules.length} {rules.length === 1 ? 'rule' : 'rules'} defined
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-[#00FFD1] rounded-full" />
                    <span className="text-[#00FFD1] text-xs font-mono">Active</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Summary content component (shared between mobile and desktop)
 */
function StrategySummaryContent({ rules }: { rules: StrategyRule[] }) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['setup', 'entry', 'exit', 'risk'])
  );

  const rulesByCategory = rules.reduce((acc, rule) => {
    const category = rule.category || 'setup';
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, StrategyRule[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const categoryLabels: Record<string, string> = {
    setup: 'SETUP',
    entry: 'ENTRY',
    exit: 'EXIT',
    risk: 'RISK MGMT',
    timeframe: 'TIMEFRAME',
    filters: 'FILTERS',
  };

  const categoryOrder = ['setup', 'entry', 'exit', 'risk', 'timeframe', 'filters'];

  return (
    <div className="space-y-3">
      {categoryOrder.map(category => {
        const categoryRules = rulesByCategory[category];
        if (!categoryRules || categoryRules.length === 0) return null;

        const isExpanded = expandedCategories.has(category);

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-[rgba(255,255,255,0.1)] rounded-sm overflow-hidden"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-3 py-3 bg-[rgba(255,255,255,0.02)] active:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <span className="text-[#00FFD1] text-xs font-mono font-semibold tracking-wider">
                {categoryLabels[category]}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[rgba(255,255,255,0.3)] text-xs font-mono">
                  {categoryRules.length}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[rgba(255,255,255,0.5)] transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Category Rules */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 py-3 space-y-3 bg-[rgba(255,255,255,0.01)]">
                    {categoryRules.map((rule, index) => (
                      <div key={`${rule.label}-${index}`}>
                        <div className="text-[rgba(255,255,255,0.5)] text-[10px] font-mono uppercase tracking-wide mb-1">
                          {rule.label}
                        </div>
                        <div className="text-white text-xs font-mono leading-relaxed border-l-2 border-[rgba(0,255,209,0.3)] pl-2">
                          {rule.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
