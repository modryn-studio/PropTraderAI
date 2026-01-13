'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Eye, EyeOff, List, X, Minimize2, Maximize2 } from 'lucide-react';
import { useResponsiveBreakpoints, useKeyboardVisible } from '@/lib/hooks/useResponsiveBreakpoints';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';
import { lazy, Suspense } from 'react';
import { validateStrategy, type ValidationResult } from '@/lib/strategy/strategyValidator';
import ValidationStatus from './ValidationStatus';

// Parameter-Based Animation System (replaces old template-based StrategyVisualizer)
const SmartAnimationContainer = lazy(() => import('@/components/animation'));

export type { StrategyRule };

interface StrategySummaryPanelProps {
  strategyName?: string;
  rules: StrategyRule[];
  isVisible?: boolean;
  isAnimationExpanded?: boolean;
  onToggleAnimation?: () => void;
  onValidationChange?: (validation: ValidationResult) => void;
}

/**
 * STRATEGY SUMMARY PANEL
 * 
 * Desktop: Fixed left sidebar that tracks strategy rules as user defines them.
 * Mobile: FAB → slide-up panel with embedded animation preview.
 * 
 * Terminal Luxe aesthetic:
 * - Pure black (#000000) backgrounds
 * - Cyan accent (#00FFD1)
 * - Monospace typography (JetBrains Mono)
 * - Subtle borders (rgba(255,255,255,0.1))
 */
export default function StrategySummaryPanel({
  strategyName,
  rules,
  isVisible = true,
  isAnimationExpanded: _isAnimationExpanded,
  onToggleAnimation: _onToggleAnimation,
  onValidationChange,
}: StrategySummaryPanelProps) {
  const { isMobile } = useResponsiveBreakpoints();
  const isKeyboardVisible = useKeyboardVisible();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hasNewRules, setHasNewRules] = useState(false);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(true); // Start minimized
  const prevRuleCount = useRef(rules.length);
  const hasAutoExpandedPreview = useRef(false); // Track if we've auto-expanded

  // Real-time validation (memoized)
  const validation = useMemo(() => validateStrategy(rules), [rules]);

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);

  // Detect new rules for FAB indicator
  useEffect(() => {
    if (rules.length > prevRuleCount.current && !isMobileOpen) {
      setHasNewRules(true);
      const timer = setTimeout(() => setHasNewRules(false), 3000);
      return () => clearTimeout(timer);
    }
    prevRuleCount.current = rules.length;
  }, [rules.length, isMobileOpen]);

  // Check if animation can actually render (has complete parameters)
  // SmartAnimationContainer returns null if missing stop/target
  const canRenderAnimation = useMemo(() => {
    if (rules.length < 3) return false;
    
    // Basic check: need entry-related rules, stop, and target
    const hasStop = rules.some(r => 
      r.label.toLowerCase().includes('stop') || 
      r.category === 'risk' && r.label.toLowerCase().includes('loss')
    );
    const hasTarget = rules.some(r => 
      r.label.toLowerCase().includes('target') || 
      r.label.toLowerCase().includes('profit')
    );
    
    return hasStop && hasTarget;
  }, [rules]);

  // Auto-expand preview when animation becomes available (once)
  useEffect(() => {
    if (canRenderAnimation && !hasAutoExpandedPreview.current && isPreviewMinimized) {
      setIsPreviewMinimized(false);
      hasAutoExpandedPreview.current = true;
    }
  }, [canRenderAnimation, isPreviewMinimized]);

  // Don't render if no rules
  if (!isVisible || rules.length === 0) return null;

  // Mobile: FAB + slide-up panel
  if (isMobile) {
    return (
      <MobileSummaryPanel
        strategyName={strategyName}
        rules={rules}
        isOpen={isMobileOpen}
        onOpen={() => {
          setIsMobileOpen(true);
          setHasNewRules(false);
        }}
        onClose={() => setIsMobileOpen(false)}
        hasNewRules={hasNewRules}
        isKeyboardVisible={isKeyboardVisible}
        validation={validation}
        canRenderAnimation={canRenderAnimation}
      />
    );
  }

  // Desktop: Fixed left sidebar
  return (
    <motion.aside
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-[73px] bottom-0 w-80 bg-[#000000] border-r border-[rgba(255,255,255,0.1)] z-30 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 bg-[#00FFD1] rounded-full animate-pulse" />
          <span className="text-[rgba(255,255,255,0.5)] text-xs font-mono uppercase tracking-wider">
            Strategy Builder
          </span>
        </div>
        <h2 className="text-white font-mono text-sm leading-tight mt-2">
          {strategyName || 'Untitled Strategy'}
        </h2>
      </div>

      {/* Rules List - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-4 py-4 space-y-4">
          {/* Validation Status (progressive reveal - only show after first rule) */}
          <ValidationStatus validation={validation} />
          
          {/* Strategy Rules by Category */}
          <RulesCategoryList rules={rules} />
        </div>
      </div>

      {/* Visual Preview (Parameter-Based Animation) */}
      {canRenderAnimation && (
        <div className="border-t border-[rgba(255,255,255,0.1)]">
          {/* Preview Header with Minimize Button */}
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="text-[rgba(255,255,255,0.5)] text-xs font-mono uppercase tracking-wide">
              Visual Preview
            </div>
            <button
              onClick={() => setIsPreviewMinimized(!isPreviewMinimized)}
              className="p-1 text-[rgba(255,255,255,0.5)] hover:text-[#00FFD1] transition-colors rounded"
              title={isPreviewMinimized ? 'Expand preview' : 'Minimize preview'}
            >
              {isPreviewMinimized ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          
          {/* Animation Container - Collapsible */}
          <AnimatePresence initial={false}>
            {!isPreviewMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <Suspense fallback={
                    <div className="h-48 flex items-center justify-center bg-[rgba(0,255,209,0.05)] rounded">
                      <div className="text-[rgba(255,255,255,0.5)] text-sm font-mono">
                        Calculating positions...
                      </div>
                    </div>
                  }>
                    <SmartAnimationContainer 
                      rules={rules}
                      debug={process.env.NODE_ENV === 'development'}
                      width={288}
                      height={200}
                      duration={3}
                    />
                  </Suspense>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Footer - Rule Count + Animation Toggle */}
      <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center justify-between">
          <span className="text-[rgba(255,255,255,0.5)] text-xs font-mono">
            {rules.length} {rules.length === 1 ? 'rule' : 'rules'} defined
          </span>
          
          {/* Animation toggle button (only show if animation exists) */}
          {canRenderAnimation && (
            <button
              onClick={() => setIsPreviewMinimized(!isPreviewMinimized)}
              className="flex items-center gap-1.5 text-xs font-mono text-[rgba(255,255,255,0.5)] hover:text-[#00FFD1] transition-colors group"
              title={isPreviewMinimized ? 'Show preview' : 'Hide preview'}
            >
              {isPreviewMinimized ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">View Preview</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Hide Preview</span>
                </>
              )}
            </button>
          )}
          
          {!canRenderAnimation && (
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 bg-[#00FFD1] rounded-full" />
              <span className="text-[#00FFD1] text-xs font-mono">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 209, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 209, 0.5);
        }
      `}</style>
    </motion.aside>
  );
}

// ============================================================================
// MOBILE SUMMARY PANEL
// ============================================================================

interface MobileSummaryPanelProps {
  strategyName?: string;
  rules: StrategyRule[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  hasNewRules: boolean;
  isKeyboardVisible: boolean;
  validation: ValidationResult;
  canRenderAnimation: boolean;
}

function MobileSummaryPanel({
  strategyName,
  rules,
  isOpen,
  onOpen,
  onClose,
  hasNewRules,
  isKeyboardVisible,
  validation,
  canRenderAnimation,
}: MobileSummaryPanelProps) {
  // Don't show FAB when keyboard is visible
  const showFAB = !isOpen && !isKeyboardVisible;

  return (
    <>
      {/* FAB - Right side (matches animation FAB position when it was there) */}
      <AnimatePresence>
        {showFAB && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={onOpen}
            className="fixed z-40 bottom-20 right-4 w-14 h-14 bg-[#00FFD1] rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#00FFD1] focus:ring-offset-2 focus:ring-offset-black"
            style={{
              boxShadow: hasNewRules
                ? '0 4px 20px rgba(0, 255, 209, 0.6)'
                : '0 4px 12px rgba(0, 255, 209, 0.3)',
            }}
            aria-label="View strategy summary"
          >
            <List className="w-6 h-6 text-black" />
            
            {/* New rules indicator */}
            {hasNewRules && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF4757] rounded-full border-2 border-black flex items-center justify-center"
                >
                  <span className="text-[8px] text-white font-bold">+</span>
                </motion.div>
                
                {/* Pulse effect */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#00FFD1]"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  aria-hidden="true"
                />
              </>
            )}
            
            {/* Animation ready indicator (when preview available) */}
            {canRenderAnimation && !hasNewRules && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -left-1 w-5 h-5 bg-[#00FFD1] rounded-full border-2 border-black flex items-center justify-center"
                title="Animation preview ready"
              >
                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-up Panel */}
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
              onClick={onClose}
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
              onDragEnd={(_, info) => {
                if (info.velocity.y > 300 || info.offset.y > 100) {
                  onClose();
                }
              }}
              className="fixed left-0 right-0 z-50 bg-[#000000] rounded-t-2xl shadow-2xl flex flex-col"
              style={{
                bottom: 0,
                maxHeight: '80vh',
                touchAction: 'none',
              }}
            >
              {/* Drag Handle */}
              <div className="pt-3 pb-2 flex justify-center">
                <div className="w-10 h-1 bg-[rgba(255,255,255,0.2)] rounded-full" />
              </div>

              {/* Header */}
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
                  onClick={onClose}
                  className="p-2 -mr-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#00FFD1] rounded"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Embedded Animation Preview (Parameter-Based) */}
              {canRenderAnimation && (
                <div className="mx-4 mt-4 border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
                  <div className="bg-[rgba(255,255,255,0.02)] px-3 py-2 border-b border-[rgba(255,255,255,0.1)]">
                    <span className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
                      Strategy Preview
                    </span>
                  </div>
                  {/* Render Parameter-Based Animation */}
                  <div className="p-4 bg-[rgba(0,0,0,0.5)]">
                    <Suspense fallback={
                      <div className="h-32 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#00FFD1]/20 flex items-center justify-center animate-pulse">
                            <svg className="w-4 h-4 text-[#00FFD1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-[10px] text-[rgba(255,255,255,0.5)]">Loading preview...</span>
                        </div>
                      </div>
                    }>
                      <SmartAnimationContainer 
                        rules={rules}
                        debug={process.env.NODE_ENV === 'development'}
                        width={400}
                        height={240}
                      />
                    </Suspense>
                  </div>
                </div>
              )}

              {/* Scrollable Rules Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Validation Status */}
                <ValidationStatus validation={validation} />
                
                {/* Strategy Rules by Category */}
                <RulesCategoryList rules={rules} />
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

// ============================================================================
// SHARED RULES CATEGORY LIST
// ============================================================================

function RulesCategoryList({ rules }: { rules: StrategyRule[] }) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['setup', 'entry', 'exit', 'risk'])
  );

  // Group rules by category
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
            transition={{ duration: 0.2 }}
            className="border border-[rgba(255,255,255,0.1)] rounded-sm overflow-hidden"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-3 py-2 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-colors group"
            >
              <span className="text-[#00FFD1] text-xs font-mono font-semibold tracking-wider">
                {categoryLabels[category]}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[rgba(255,255,255,0.3)] text-xs font-mono">
                  {categoryRules.length}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[rgba(255,255,255,0.5)] group-hover:text-[#00FFD1] transition-colors" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[rgba(255,255,255,0.5)] group-hover:text-[#00FFD1] transition-colors" />
                )}
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
                  <div className="px-3 py-2 space-y-2 bg-[rgba(255,255,255,0.01)]">
                    {categoryRules.map((rule, index) => (
                      <motion.div
                        key={`${rule.label}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group/rule"
                      >
                        {/* Rule Label */}
                        <div className="text-[rgba(255,255,255,0.5)] text-[10px] font-mono uppercase tracking-wide mb-0.5">
                          {rule.label}
                        </div>
                        {/* Rule Value */}
                        <div className="text-white text-xs font-mono leading-relaxed border-l-2 border-[rgba(0,255,209,0.3)] pl-2 group-hover/rule:border-[#00FFD1] transition-colors">
                          {rule.value}
                        </div>
                      </motion.div>
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
