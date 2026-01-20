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
    description: 'Trade breakouts from the first 5-30 minutes of market open. Solid choice for momentum.',
    fieldCount: 7,
    icon: <Zap className="w-5 h-5 text-[#00FFD1]" />,
    popularity: 'Most popular among prop traders',
  },
  ema_pullback: {
    name: 'EMA Pullback',
    description: 'Enter when price pulls back to a moving average in a trend. Solid choice for trend following.',
    fieldCount: 8,
    icon: <TrendingUp className="w-5 h-5 text-[#00FFD1]" />,
    popularity: 'Favorite for trend following',
  },
  breakout: {
    name: 'Breakout',
    description: 'Trade when price breaks above resistance or below support. Solid choice for momentum.',
    fieldCount: 8,
    icon: <BarChart3 className="w-5 h-5 text-[#00FFD1]" />,
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
      <div className="w-full max-w-2xl mx-auto bg-[#000000] border border-white/10">
        <div className="border-b border-white/10 p-4">
          <h3 className="text-lg font-semibold text-white font-mono">
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
                    'w-full p-4 border-2 text-left transition-all',
                    isSelected 
                      ? 'border-[#00FFD1] bg-[#00FFD1]/10' 
                      : 'border-white/10 bg-[#000000] hover:border-[#00FFD1]/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#00FFD1]/15">
                      {info.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white font-mono">{info.name}</h3>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#00FFD1]" />
                        )}
                      </div>
                      <p className="text-sm text-white/85 mt-1">{info.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 bg-white/5 text-white/50 font-mono">
                          {info.fieldCount} settings
                        </span>
                        <span className="text-xs text-white/50">{info.popularity}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-white/10 p-4">
          <button 
            onClick={() => setIsChanging(false)}
            className="w-full px-4 py-2 text-white/85 hover:bg-white/5 transition-colors font-mono"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Confirmation view
  return (
    <div className="w-full max-w-2xl mx-auto bg-[#000000] border border-white/10 overflow-hidden">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00FFD1]/15">
            {patternInfo.icon}
          </div>
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wide font-mono">YOUR STRATEGY</p>
            <h3 className="text-lg font-semibold text-white font-mono">
              {patternInfo.name}
            </h3>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-white/85">{patternInfo.description}</p>
        
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <div className="flex-1">
            <p className="text-xs text-white/50 uppercase tracking-wide font-mono">SETTINGS</p>
            <p className="text-lg font-mono text-white">{patternInfo.fieldCount}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/50 uppercase tracking-wide font-mono">STATUS</p>
            <div className="flex items-center gap-1 text-[#00FFD1]">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium font-mono">SET UP NEXT</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-white/10 p-4 flex gap-3">
        <button 
          onClick={handleChangeClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-white/10 text-white/85 hover:border-[#00FFD1] hover:text-[#00FFD1] transition-all font-mono"
        >
          <RefreshCw className="w-4 h-4" />
          Change
        </button>
        <button 
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#00FFD1] text-[#000000] hover:bg-[#00e6bc] transition-colors font-mono font-semibold"
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
    <div className="w-full max-w-2xl mx-auto bg-[#000000] border border-[#00FFD1]/30">
      {/* Header */}
      <div className="border-b border-[#00FFD1]/30 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00FFD1]/15">
            <span className="text-2xl">🔮</span>
          </div>
          <div>
            <p className="text-xs text-[#00FFD1]/70 uppercase tracking-wide font-mono">Coming Soon</p>
            <h3 className="text-lg font-semibold text-white font-mono">
              {formattedPattern} Detected
            </h3>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-white/85">
          We don&apos;t support {formattedPattern} strategies yet, but they&apos;re launching in February!
        </p>
        
        {alternatives.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-white/50 mb-3 font-mono">In the meantime, try one of these:</p>
            <div className="space-y-2">
              {alternatives.map(({ pattern, reason }) => {
                const info = PATTERN_INFO[pattern];
                return (
                  <button
                    key={pattern}
                    onClick={() => onSelectAlternative(pattern)}
                    className="w-full p-3 border border-white/10 bg-[#000000]
                             hover:border-[#00FFD1]/50 hover:bg-[#00FFD1]/5 
                             text-left transition-all flex items-center gap-3"
                  >
                    <div className="p-1.5 rounded bg-[#00FFD1]/15">
                      {info.icon}
                    </div>
                    <div>
                      <p className="font-medium text-white font-mono">{info.name}</p>
                      <p className="text-xs text-white/50">{reason}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t border-[#00FFD1]/30 p-4">
        <button
          onClick={onJoinWaitlist}
          className="w-full px-4 py-2 border border-[#00FFD1]/50 text-[#00FFD1] hover:bg-[#00FFD1]/10 transition-colors font-mono"
        >
          Notify Me When {formattedPattern} Launches
        </button>
      </div>
    </div>
  );
}

export default PatternConfirmation;
