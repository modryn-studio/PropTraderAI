'use client';

/**
 * Pattern Confirmation Component
 * 
 * Shows detected pattern after Claude's response, before StrategyEditableCard.
 * Users confirm or change the pattern before seeing the full strategy card.
 * 
 * Key features:
 * - Inline card (not modal/overlay) to keep context visible
 * - Shows pattern name + field count
 * - [Confirm] [Change Pattern] buttons
 * - Mobile-optimized
 * 
 * @see Issue #44 - Enhanced Strategy Builder UX
 */

import { useState } from 'react';
import { Check, RefreshCw, Zap, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupportedPattern } from '@/lib/execution/canonical-schema';

// ============================================================================
// TYPES
// ============================================================================

interface PatternConfirmationProps {
  /** Detected pattern from Claude's analysis */
  detectedPattern: SupportedPattern;
  /** Called when user confirms the detected pattern */
  onConfirm: () => void;
  /** Called when user wants to change pattern */
  onChangePattern: () => void;
  /** Optional: Show pattern selector inline */
  showPatternSelector?: boolean;
  /** Called when user selects a different pattern */
  onPatternSelect?: (pattern: SupportedPattern) => void;
}

// ============================================================================
// PATTERN METADATA
// ============================================================================

interface PatternInfo {
  name: string;
  description: string;
  fieldCount: number;
  icon: React.ReactNode;
  popularity: string;
}

const PATTERN_INFO: Record<SupportedPattern, PatternInfo> = {
  opening_range_breakout: {
    name: 'Opening Range Breakout',
    description: 'Trade breakouts from the first 5-30 minutes of market open',
    fieldCount: 7,
    icon: <Zap className="w-5 h-5 text-amber-400" />,
    popularity: 'Most popular among prop traders',
  },
  ema_pullback: {
    name: 'EMA Pullback',
    description: 'Enter when price pulls back to a moving average in a trend',
    fieldCount: 8,
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    popularity: 'Favorite for trend following',
  },
  breakout: {
    name: 'Breakout',
    description: 'Trade when price breaks above resistance or below support',
    fieldCount: 8,
    icon: <BarChart3 className="w-5 h-5 text-blue-400" />,
    popularity: 'Classic momentum strategy',
  },
};

const ALL_PATTERNS: SupportedPattern[] = ['opening_range_breakout', 'ema_pullback', 'breakout'];

// ============================================================================
// COMPONENT
// ============================================================================

export function PatternConfirmation({
  detectedPattern,
  onConfirm,
  onChangePattern,
  showPatternSelector = false,
  onPatternSelect,
}: PatternConfirmationProps) {
  const [isChanging, setIsChanging] = useState(showPatternSelector);
  const patternInfo = PATTERN_INFO[detectedPattern];

  const handleChangeClick = () => {
    setIsChanging(true);
    onChangePattern();
  };

  const handlePatternSelect = (pattern: SupportedPattern) => {
    setIsChanging(false);
    onPatternSelect?.(pattern);
  };

  // Pattern selector view
  if (isChanging) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-zinc-950 border border-zinc-800 rounded-lg">
        <div className="border-b border-zinc-800 p-4">
          <h3 className="text-lg font-semibold text-zinc-200">
            Choose Your Pattern
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {ALL_PATTERNS.map((pattern) => {
              const info = PATTERN_INFO[pattern];
              const isSelected = pattern === detectedPattern;
              
              return (
                <button
                  key={pattern}
                  onClick={() => handlePatternSelect(pattern)}
                  className={cn(
                    'w-full p-4 rounded-lg border-2 text-left transition-all',
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-500/10' 
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800">
                      {info.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-zinc-200">{info.name}</h3>
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">{info.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {info.fieldCount} parameters
                        </span>
                        <span className="text-xs text-zinc-500">{info.popularity}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-zinc-800 p-4">
          <button 
            onClick={() => setIsChanging(false)}
            className="w-full px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Confirmation view
  return (
    <div className="w-full max-w-2xl mx-auto bg-zinc-950 border border-zinc-800 rounded-lg">
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-800">
            {patternInfo.icon}
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Pattern Detected</p>
            <h3 className="text-lg font-semibold text-zinc-200">
              {patternInfo.name}
            </h3>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-zinc-400">{patternInfo.description}</p>
        
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
          <div className="flex-1">
            <p className="text-xs text-zinc-500">Parameters</p>
            <p className="text-lg font-mono text-zinc-200">{patternInfo.fieldCount}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-zinc-500">Status</p>
            <div className="flex items-center gap-1 text-emerald-400">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Ready to configure</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-zinc-800 p-4 flex gap-3">
        <button 
          onClick={handleChangeClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-zinc-700 rounded-md text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Change Pattern
        </button>
        <button 
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 rounded-md text-white hover:bg-indigo-700 transition-colors"
        >
          <Check className="w-4 h-4" />
          Confirm
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// UNSUPPORTED PATTERN COMPONENT
// ============================================================================

interface UnsupportedPatternProps {
  /** The unsupported pattern that was detected */
  detectedPattern: string;
  /** Alternative patterns the user can try */
  alternatives: Array<{ pattern: SupportedPattern; reason: string }>;
  /** Called when user selects an alternative */
  onSelectAlternative: (pattern: SupportedPattern) => void;
  /** Called when user wants to join waitlist */
  onJoinWaitlist: () => void;
}

export function UnsupportedPattern({
  detectedPattern,
  alternatives,
  onSelectAlternative,
  onJoinWaitlist,
}: UnsupportedPatternProps) {
  const formattedPattern = detectedPattern
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="w-full max-w-2xl mx-auto bg-amber-900/10 border border-amber-500/50 rounded-lg">
      {/* Header */}
      <div className="border-b border-amber-500/30 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <span className="text-2xl">🔮</span>
          </div>
          <div>
            <p className="text-xs text-amber-400 uppercase tracking-wide">Coming Soon</p>
            <h3 className="text-lg font-semibold text-zinc-200">
              {formattedPattern} Detected
            </h3>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-zinc-300">
          We don&apos;t support {formattedPattern} strategies yet, but they&apos;re launching in February!
        </p>
        
        {alternatives.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-zinc-400 mb-3">In the meantime, try one of these:</p>
            <div className="space-y-2">
              {alternatives.map(({ pattern, reason }) => {
                const info = PATTERN_INFO[pattern];
                return (
                  <button
                    key={pattern}
                    onClick={() => onSelectAlternative(pattern)}
                    className="w-full p-3 rounded-lg border border-zinc-700 bg-zinc-900/50 
                             hover:border-indigo-500/50 hover:bg-indigo-500/5 
                             text-left transition-all flex items-center gap-3"
                  >
                    <div className="p-1.5 rounded bg-zinc-800">
                      {info.icon}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-200">{info.name}</p>
                      <p className="text-xs text-zinc-400">{reason}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t border-amber-500/30 p-4">
        <button 
          onClick={onJoinWaitlist}
          className="w-full px-4 py-2 border border-amber-500/50 text-amber-400 rounded-md hover:bg-amber-500/10 transition-colors"
        >
          Notify Me When {formattedPattern} Launches
        </button>
      </div>
    </div>
  );
}

export default PatternConfirmation;
