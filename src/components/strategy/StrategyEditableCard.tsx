'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Pencil, Save, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getConstrainedInput } from '@/components/strategy/ConstrainedInputs';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

/**
 * STRATEGY EDITABLE CARD
 * 
 * Part of the Rapid Strategy Flow (Phase 1).
 * Shows generated strategy with all parameters editable.
 * Highlights defaults with clear "tap to change" affordance.
 * 
 * Design principles:
 * - Desktop-first (mobile swipeable cards come in Phase 2)
 * - Click-to-edit any parameter
 * - Clear visual distinction for defaults
 * - Grouped by category for scanability
 */

interface StrategyEditableCardProps {
  /** Strategy name */
  name: string;
  /** Parsed strategy rules */
  rules: StrategyRule[];
  /** Detected pattern (e.g., 'opening_range_breakout') */
  pattern?: string;
  /** Instrument (e.g., 'ES') */
  instrument?: string;
  /** Callback when user saves the strategy */
  onSave: () => void;
  /** Callback when user edits a parameter */
  onParameterEdit: (rule: StrategyRule, newValue: string) => void;
  /** Callback to discard and start over */
  onDiscard?: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Whether the strategy has been saved */
  isSaved?: boolean;
}

// Category display configuration
const CATEGORY_CONFIG: Record<string, { label: string; order: number; color: string }> = {
  setup: { label: 'SETUP', order: 1, color: 'text-white/40' },
  entry: { label: 'ENTRY', order: 2, color: 'text-white/40' },
  exit: { label: 'EXIT', order: 3, color: 'text-white/40' },
  risk: { label: 'RISK', order: 4, color: 'text-white/40' },
  filters: { label: 'FILTERS', order: 5, color: 'text-white/40' },
  timeframe: { label: 'TIMEFRAME', order: 6, color: 'text-white/40' },
};

interface EditingState {
  ruleIndex: number;
  value: string;
}

export default function StrategyEditableCard({
  name,
  rules,
  pattern,
  instrument,
  onSave,
  onParameterEdit,
  onDiscard,
  isSaving = false,
  isSaved = false,
}: StrategyEditableCardProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showTooltip, setShowTooltip] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const editBoxRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Close edit/tooltip when clicking outside their specific containers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Bug #8: Close edit box only if clicking another rule or outside card
      if (editing && editBoxRef.current && !editBoxRef.current.contains(event.target as Node)) {
        const clickedRule = (event.target as HTMLElement).closest('[data-rule-index]');
        if (clickedRule || !cardRef.current?.contains(event.target as Node)) {
          setEditing(null);
        }
      }
      // Close tooltip if clicking outside it
      if (showTooltip !== null && tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editing, showTooltip]);
  
  // Group rules by category (filter out instrument since it's in header)
  const groupedRules = useMemo(() => {
    const groups: Record<string, { rules: StrategyRule[]; indices: number[] }> = {};
    
    rules.forEach((rule, index) => {
      // Skip instrument - it's already shown in header badge
      if (rule.label.toLowerCase().includes('instrument')) {
        return;
      }
      
      const category = rule.category || 'filters';
      if (!groups[category]) {
        groups[category] = { rules: [], indices: [] };
      }
      groups[category].rules.push(rule);
      groups[category].indices.push(index);
    });
    
    // Sort by category order
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const orderA = CATEGORY_CONFIG[a]?.order ?? 99;
        const orderB = CATEGORY_CONFIG[b]?.order ?? 99;
        return orderA - orderB;
      });
  }, [rules]);
  
  // Count defaults
  const defaultsCount = useMemo(() => 
    rules.filter(r => r.isDefaulted).length
  , [rules]);
  
  // Format pattern name for display
  const patternDisplay = pattern?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  // Handle edit start
  const handleEditStart = (index: number, currentValue: string) => {
    setShowTooltip(null); // Bug #10: Close tooltip when editing
    setEditing({ ruleIndex: index, value: currentValue });
  };
  
  // Bug #9: Auto-apply unsaved edit before saving strategy
  const handleStrategySave = () => {
    if (editing) {
      // Auto-apply current edit before saving
      if (editing.value !== rules[editing.ruleIndex].value) {
        onParameterEdit(rules[editing.ruleIndex], editing.value);
      }
      setEditing(null);
    }
    onSave();
  };
  
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'border overflow-hidden font-mono',
        isSaved 
          ? 'border-[#00FFD1]/30 bg-[#00FFD1]/5' 
          : 'border-white/10 bg-[#000000]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {patternDisplay && pattern && !['custom', 'strategy'].includes(pattern.toLowerCase()) && (
                <span className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 text-white/50">
                  {patternDisplay}
                </span>
              )}
              {instrument && (
                <span className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 text-white/50">
                  {instrument}
                </span>
              )}
              {defaultsCount > 0 && (
                <span className="px-2 py-1 text-[10px] bg-[rgba(255,184,0,0.1)] border border-[rgba(255,184,0,0.2)] text-[#FFB800]">
                  {defaultsCount} default{defaultsCount !== 1 ? 's' : ''} applied
                </span>
              )}
            </div>
          </div>
        </div>
        
        {isSaved && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 text-[#00FFD1] text-sm"
          >
            <Check className="w-4 h-4" />
            <span>Saved</span>
          </motion.div>
        )}
      </div>
      
      {/* Content - Always Visible */}
      <div className="px-4 pb-4 space-y-4">
        {/* Rules by Category */}
              {groupedRules.map(([category, { rules: categoryRules, indices }]) => {
                const config = CATEGORY_CONFIG[category] || { label: category, color: 'text-zinc-400' };
                
                return (
                  <div key={category} className="space-y-2">
                    {/* Category Label */}
                    <p className={cn('text-[10px] uppercase tracking-wider font-medium', config.color)}>
                      {config.label}
                    </p>
                    
                    {/* Rules */}
                    <div className="space-y-1">
                      {categoryRules.map((rule, localIndex) => {
                        const globalIndex = indices[localIndex];
                        const isEditing = editing?.ruleIndex === globalIndex;
                        
                        return (
                          <div 
                            key={`${rule.label}-${globalIndex}`}
                            className="relative"
                          >
                            {isEditing ? (
                              /* Edit Mode - Use constrained inputs based on parameter type */
                              (() => {
                                const ConstrainedInput = getConstrainedInput(rule.label);
                                return (
                                  <div ref={editBoxRef}>
                                    <ConstrainedInput
                                      label={rule.label}
                                      currentValue={rule.value}
                                      onSave={(newValue) => {
                                        onParameterEdit(rule, newValue);
                                        setEditing(null);
                                      }}
                                      onCancel={() => setEditing(null)}
                                    />
                                  </div>
                                );
                              })()
                            ) : (
                              /* View Mode */
                              <div
                                onClick={() => !isSaved && handleEditStart(globalIndex, rule.value)}
                                className={cn(
                                  'group flex items-center justify-between p-2 transition-colors',
                                  !isSaved && 'cursor-pointer hover:bg-white/5',
                                  rule.isDefaulted && 'bg-white/[0.02]'
                                )}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-[13px] text-white/50 flex-shrink-0">
                                    {rule.label}:
                                  </span>
                                  <span className="text-[14px] text-white font-medium truncate">
                                    {rule.value}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {rule.isDefaulted && (
                                    <>
                                      <span className="px-2 py-0.5 text-[10px] bg-[rgba(255,184,0,0.1)] border border-[rgba(255,184,0,0.2)] text-[#FFB800]">
                                        default
                                      </span>
                                      {rule.explanation && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowTooltip(showTooltip === globalIndex ? null : globalIndex);
                                          }}
                                          className="p-1 hover:bg-white/10 text-white/30"
                                        >
                                          <Info className="w-3 h-3" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {!isSaved && (
                                    <Pencil className="w-4 h-4 text-white/30 group-hover:text-[#00FFD1] transition-colors" />
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Explanation Tooltip */}
                            <AnimatePresence>
                              {showTooltip === globalIndex && rule.explanation && (
                                <motion.div
                                  ref={tooltipRef}
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="absolute right-0 top-full mt-1 z-10 p-2 bg-[#0a0a0a] border border-white/10 shadow-lg max-w-xs"
                                >
                                  <p className="text-xs text-zinc-300">{rule.explanation}</p>
                                  <p className="text-xs text-zinc-500 mt-1">Click to change</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Action Buttons */}
              {!isSaved && (
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={handleStrategySave}
                    disabled={isSaving}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-3',
                      'bg-[#00FFD1] hover:bg-transparent text-black hover:text-[#00FFD1] font-semibold',
                      'transition-all hover:shadow-[inset_0_0_0_2px_#00FFD1]',
                      isSaving && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Strategy</span>
                      </>
                    )}
                  </button>
                  
                  {onDiscard && (
                    <button
                      onClick={onDiscard}
                      disabled={isSaving}
                      className={cn(
                        'px-4 py-3',
                        'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-medium',
                        'transition-colors border border-white/10',
                        isSaving && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      Start Over
                    </button>
                  )}
                </div>
              )}
      </div>
    </motion.div>
  );
}
