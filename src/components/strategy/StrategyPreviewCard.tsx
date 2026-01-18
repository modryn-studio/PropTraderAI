'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Settings, ChevronDown, ChevronUp, Sparkles, AlertCircle, Save } from 'lucide-react';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

/**
 * STRATEGY PREVIEW CARD
 * 
 * Compact inline card shown after 2-3 messages when completeness >= 70%.
 * Shows complete strategy with defaults highlighted and quick action buttons.
 * 
 * Purpose:
 * - Give users immediate feedback that their strategy is "ready"
 * - Show defaults clearly so they understand what's applied
 * - Provide quick path to save OR customize
 * 
 * Design: Terminal Luxe - matches Summary Panel aesthetic
 */

interface StrategyPreviewCardProps {
  strategyName: string;
  rules: StrategyRule[];
  completenessPercentage: number;
  onSave: () => void;
  onCustomize: () => void;
  onDismiss?: () => void;
  isVisible?: boolean;
}

// Category display order and icons
const CATEGORY_CONFIG = {
  setup: { label: 'Setup', order: 1 },
  entry: { label: 'Entry', order: 2 },
  exit: { label: 'Exit', order: 3 },
  risk: { label: 'Risk', order: 4 },
  filters: { label: 'Filters', order: 5 },
  timeframe: { label: 'Time', order: 6 },
} as const;

export default function StrategyPreviewCard({
  strategyName,
  rules,
  completenessPercentage,
  onSave,
  onCustomize,
  // onDismiss - reserved for future "X" button
  isVisible = true,
}: StrategyPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Group rules by category and sort
  const groupedRules = useMemo(() => {
    const groups: Record<string, StrategyRule[]> = {};
    
    rules.forEach(rule => {
      const category = rule.category || 'filters';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(rule);
    });
    
    // Sort categories by config order
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const orderA = CATEGORY_CONFIG[a as keyof typeof CATEGORY_CONFIG]?.order ?? 99;
        const orderB = CATEGORY_CONFIG[b as keyof typeof CATEGORY_CONFIG]?.order ?? 99;
        return orderA - orderB;
      });
  }, [rules]);
  
  // Count defaults
  const defaultsCount = useMemo(() => 
    rules.filter(r => r.isDefaulted).length
  , [rules]);
  
  // Determine card state - requires 70%+ AND critical params
  const isComplete = useMemo(() => {
    if (completenessPercentage < 0.7) return false;
    
    const hasEntry = rules.some(r => r.category === 'entry');
    const hasExit = rules.some(r => r.category === 'exit');
    const hasRisk = rules.some(r => r.category === 'risk');
    
    return hasEntry && hasExit && hasRisk;
  }, [completenessPercentage, rules]);
  
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="mx-auto w-full max-w-xl my-4"
    >
      <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] rounded-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <div className="w-8 h-8 rounded-full bg-[#00FFD1]/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-[#00FFD1]" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
            )}
            <div>
              <h3 className="text-white font-mono text-sm font-medium">
                {strategyName || 'Your Strategy'}
              </h3>
              <p className="text-[rgba(255,255,255,0.5)] text-xs font-mono">
                {isComplete 
                  ? `Ready to trade${defaultsCount > 0 ? ` • ${defaultsCount} smart default${defaultsCount > 1 ? 's' : ''}` : ''}`
                  : `${Math.round(completenessPercentage * 100)}% complete`
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Rules Preview (collapsible) */}
        <div className="overflow-hidden">
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {groupedRules.map(([category, categoryRules]) => (
              <div key={category} className="space-y-1">
                <div className="text-[rgba(255,255,255,0.4)] text-[10px] font-mono uppercase tracking-wider">
                  {CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.label || category}
                </div>
                {categoryRules.map((rule, idx) => (
                  <div 
                    key={`${rule.label}-${idx}`}
                    className="flex items-center justify-between gap-2 py-1"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {rule.isDefaulted ? (
                        <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      ) : (
                        <Check className="w-3 h-3 text-[#00FFD1] flex-shrink-0" />
                      )}
                      <span className="text-[rgba(255,255,255,0.7)] text-xs font-mono truncate">
                        {rule.label}
                      </span>
                    </div>
                    <span className={`text-xs font-mono truncate max-w-[50%] text-right ${
                      rule.isDefaulted ? 'text-amber-400' : 'text-white'
                    }`}>
                      {rule.value}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Defaults explanation if any */}
          {defaultsCount > 0 && (
            <div className="px-4 py-2 bg-[rgba(255,200,0,0.05)] border-t border-[rgba(255,255,255,0.05)]">
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[rgba(255,255,255,0.5)] text-[11px] font-mono">
                  Smart defaults applied based on your pattern. You can customize anytime.
                </p>
              </div>
            </div>
          )}
        </motion.div>
        </div>
        
        {/* Action Buttons */}
        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.08)] flex gap-2">
          <button
            onClick={onCustomize}
            className="flex-1 px-3 py-2 text-[rgba(255,255,255,0.7)] text-sm font-mono 
                       border border-[rgba(255,255,255,0.15)] rounded
                       hover:border-[rgba(255,255,255,0.3)] hover:text-white
                       transition-all flex items-center justify-center gap-2"
          >
            <Settings className="w-3.5 h-3.5" />
            Customize
          </button>
          <button
            onClick={onSave}
            disabled={!isComplete}
            className={`flex-1 px-3 py-2 text-sm font-mono rounded
                       flex items-center justify-center gap-2 transition-all
                       ${isComplete 
                         ? 'bg-[#00FFD1] text-black hover:bg-[#00FFD1]/90' 
                         : 'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.3)] cursor-not-allowed'
                       }`}
          >
            <Save className="w-3.5 h-3.5" />
            Save Strategy
          </button>
        </div>
      </div>
    </motion.div>
  );
}
