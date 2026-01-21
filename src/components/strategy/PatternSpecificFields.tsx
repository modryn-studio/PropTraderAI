'use client';

import { useMemo } from 'react';
import { Settings2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

/**
 * PATTERN-SPECIFIC FIELDS COMPONENT
 * 
 * Renders pattern-aware fields for the Advanced view.
 * Each pattern has unique entry configuration fields beyond the core fields.
 * 
 * Pattern-Specific Fields:
 * - Opening Range Breakout: Range Period, Entry On
 * - EMA Pullback: EMA Period, Pullback Confirmation, RSI Filter (optional)
 * - Breakout: Lookback Period, Level Type, Confirmation
 * 
 * Core Fields (shown for ALL patterns):
 * - Instrument, Stop Loss, Target, Position Sizing, Direction, Session
 * 
 * @see Issue #49 - Pattern-specific field requirements
 * @see canonical-schema.ts - Pattern type definitions
 */

// ============================================================================
// TYPES
// ============================================================================

export type CanonicalPatternType = 
  | 'opening_range_breakout' 
  | 'ema_pullback' 
  | 'breakout';

interface PatternFieldConfig {
  label: string;
  ruleLabels: string[];  // Possible labels in parsed_rules to match
  defaultValue: string;
  options?: string[];
  unit?: string;
  description?: string;
}

interface PatternSpecificFieldsProps {
  /** Detected pattern type */
  pattern: CanonicalPatternType | string | undefined;
  /** Parsed strategy rules */
  rules: StrategyRule[];
  /** Currently editing rule index */
  editingIndex?: number | null;
  /** Callback when user starts editing a field */
  onEditStart?: (index: number, currentValue: string) => void;
  /** Callback when user wants to add a new rule (for default fields) */
  onAddRule?: (rule: StrategyRule) => void;
  /** Callback when user clicks info tooltip */
  onShowInfo?: (index: number) => void;
  /** Whether to show as read-only */
  readOnly?: boolean;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// PATTERN FIELD CONFIGURATIONS
// ============================================================================

const PATTERN_FIELDS: Record<CanonicalPatternType, PatternFieldConfig[]> = {
  opening_range_breakout: [
    {
      label: 'Range Period',
      ruleLabels: ['Range Period', 'Opening Range Period', 'OR Period', 'Range Duration'],
      defaultValue: '15 minutes',
      options: ['5 minutes', '10 minutes', '15 minutes', '30 minutes', '60 minutes'],
      description: 'Duration of the opening range after market open',
    },
    {
      label: 'Entry On',
      ruleLabels: ['Entry On', 'Breakout Direction', 'Entry Direction', 'Trade Direction'],
      defaultValue: 'Both (high and low)',
      options: ['Break above high only', 'Break below low only', 'Both (high and low)'],
      description: 'Which breakout to trade - above range high, below range low, or both',
    },
  ],
  
  ema_pullback: [
    {
      label: 'EMA Period',
      ruleLabels: ['EMA Period', 'EMA Length', 'Moving Average Period', 'MA Period'],
      defaultValue: '20',
      options: ['9', '20', '50', '100', '200'],
      unit: 'periods',
      description: 'Exponential Moving Average period for pullback reference',
    },
    {
      label: 'Pullback Confirmation',
      ruleLabels: ['Pullback Confirmation', 'Entry Confirmation', 'Confirmation Type'],
      defaultValue: 'Touch',
      options: ['Touch', 'Close above', 'Bounce (engulfing)'],
      description: 'How to confirm the pullback is complete before entry',
    },
    {
      label: 'RSI Filter',
      ruleLabels: ['RSI Filter', 'RSI', 'RSI Period', 'RSI Threshold'],
      defaultValue: 'Off',
      options: ['Off', 'RSI < 30 (oversold)', 'RSI > 70 (overbought)', 'Custom'],
      description: 'Optional RSI filter to confirm oversold/overbought conditions',
    },
  ],
  
  breakout: [
    {
      label: 'Lookback Period',
      ruleLabels: ['Lookback Period', 'Lookback', 'Period', 'N Bars'],
      defaultValue: '20',
      options: ['10', '20', '50', '100'],
      unit: 'bars',
      description: 'Number of bars to look back for high/low levels',
    },
    {
      label: 'Level Type',
      ruleLabels: ['Level Type', 'Breakout Level', 'Level', 'Break Type'],
      defaultValue: 'Resistance',
      options: ['Resistance', 'Support', 'Both'],
      description: 'Which level type to trade breakouts from',
    },
    {
      label: 'Confirmation',
      ruleLabels: ['Confirmation', 'Breakout Confirmation', 'Confirm Type'],
      defaultValue: 'Close',
      options: ['Close above/below', 'Volume spike', 'None (immediate)'],
      description: 'How to confirm the breakout is valid',
    },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find a rule matching any of the possible labels
 */
function findRuleByLabels(
  rules: StrategyRule[], 
  possibleLabels: string[]
): { rule: StrategyRule; index: number } | null {
  const normalizedLabels = possibleLabels.map(l => l.toLowerCase());
  
  for (let i = 0; i < rules.length; i++) {
    const ruleLabel = rules[i].label.toLowerCase();
    if (normalizedLabels.some(l => ruleLabel.includes(l) || l.includes(ruleLabel))) {
      return { rule: rules[i], index: i };
    }
  }
  return null;
}

/**
 * Get pattern display name
 */
export function getPatternDisplayName(pattern: string): string {
  const names: Record<string, string> = {
    'opening_range_breakout': 'Opening Range Breakout',
    'ema_pullback': 'EMA Pullback',
    'breakout': 'Breakout',
    'vwap': 'VWAP',
  };
  return names[pattern] || pattern.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PatternSpecificFields({
  pattern,
  rules,
  editingIndex,
  onEditStart,
  onAddRule,
  onShowInfo,
  readOnly = false,
  className,
}: PatternSpecificFieldsProps) {
  // Get pattern-specific field configs
  const fieldConfigs = useMemo(() => {
    if (!pattern || !(pattern in PATTERN_FIELDS)) {
      return [];
    }
    return PATTERN_FIELDS[pattern as CanonicalPatternType];
  }, [pattern]);
  
  // If no pattern or unsupported pattern, return null
  if (fieldConfigs.length === 0) {
    return null;
  }
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* Pattern Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
          {getPatternDisplayName(pattern || '')} Settings
        </span>
      </div>
      
      {/* Pattern-Specific Fields */}
      {fieldConfigs.map((fieldConfig, configIndex) => {
        const match = findRuleByLabels(rules, fieldConfig.ruleLabels);
        const value = match?.rule.value || fieldConfig.defaultValue;
        const isDefault = !match || match.rule.isDefaulted;
        const ruleIndex = match?.index ?? -1;
        const isEditing = editingIndex === ruleIndex;
        
        return (
          <div
            key={fieldConfig.label}
            data-rule-index={ruleIndex}
            className={cn(
              'group flex items-center justify-between px-3 py-2.5 rounded-lg',
              'bg-white/[0.03] hover:bg-white/[0.06] transition-colors',
              isEditing && 'ring-1 ring-indigo-500/50',
              !readOnly && 'cursor-pointer'
            )}
            onClick={() => {
              if (readOnly) return;
              
              // If rule exists, edit it
              if (ruleIndex >= 0 && onEditStart) {
                onEditStart(ruleIndex, value);
              }
              // If rule doesn't exist (showing default), add it first
              else if (ruleIndex === -1 && onAddRule) {
                const newRule: StrategyRule = {
                  category: 'setup',
                  label: fieldConfig.label,
                  value: fieldConfig.defaultValue,
                  isDefaulted: true,
                  source: 'default',
                };
                onAddRule(newRule);
              }
            }}
          >
            {/* Label */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">{fieldConfig.label}</span>
              {fieldConfig.description && onShowInfo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowInfo(configIndex);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Info className="w-3.5 h-3.5 text-white/40" />
                </button>
              )}
            </div>
            
            {/* Value */}
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-sm font-medium',
                isDefault ? 'text-white/50' : 'text-white'
              )}>
                {value}
                {fieldConfig.unit && <span className="text-white/40 ml-1">{fieldConfig.unit}</span>}
              </span>
              
              {/* Default indicator */}
              {isDefault && (
                <Settings2 className="w-3.5 h-3.5 text-white/30" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PATTERN_FIELDS };
export type { PatternFieldConfig, PatternSpecificFieldsProps };
