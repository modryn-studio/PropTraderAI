'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown } from 'lucide-react';

export interface StrategyRule {
  label: string;
  value: string;
  category?: 'setup' | 'entry' | 'exit' | 'risk' | 'timeframe' | 'filters';
}

interface StrategySummaryPanelProps {
  strategyName?: string;
  rules: StrategyRule[];
  isVisible?: boolean;
}

/**
 * STRATEGY SUMMARY PANEL
 * 
 * Terminal-style sidebar that tracks strategy rules as user defines them.
 * Matches PropTraderAI's "Terminal Luxe" aesthetic:
 * - Pure black (#000000) backgrounds
 * - Cyan accent (#00FFD1)
 * - Monospace typography (JetBrains Mono)
 * - Subtle borders (rgba(255,255,255,0.1))
 * 
 * Categories auto-organize rules:
 * - Setup (range, pattern, context)
 * - Entry (trigger, confirmation)
 * - Exit (target, stop)
 * - Risk (position size, R:R)
 * - Timeframe (session, duration)
 * - Filters (indicators, conditions)
 */
export default function StrategySummaryPanel({
  strategyName,
  rules,
  isVisible = true,
}: StrategySummaryPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['setup', 'entry', 'exit', 'risk'])
  );

  if (!isVisible || rules.length === 0) return null;

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
    <motion.aside
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-[73px] bottom-0 w-80 bg-[#000000] border-l border-[rgba(255,255,255,0.1)] z-30 overflow-hidden flex flex-col"
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
        <div className="px-4 py-4 space-y-3">
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
      </div>

      {/* Footer - Rule Count */}
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
