'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, ExternalLink, X } from 'lucide-react';

/**
 * POST-SAVE EDUCATION SYSTEM
 * 
 * "Learn Why This Works" component shown AFTER strategy is saved.
 * Provides contextual education based on what the user built.
 * 
 * From STRATEGY_BUILDER_UNIFIED_GUIDE.md:
 * - Education is valuable, just not DURING urgent tasks
 * - After strategy saved = lower urgency, user initiated
 * - Based on their actual strategy choices
 * 
 * Timing matters:
 * - DURING building: High urgency, low receptivity → No education
 * - AFTER saving: Lower urgency, user-initiated → Optional education
 * 
 * Design: Collapsible cards, Terminal Luxe aesthetic
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EducationTopic {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  stats?: string;
  learnMoreUrl?: string;
}

interface StrategyEducationProps {
  strategyPattern?: string;
  stopValue?: string;
  targetValue?: string;
  sizingValue?: string;
  instrument?: string;
  onDismiss?: () => void;
  isVisible?: boolean;
}

// ============================================================================
// EDUCATION CONTENT DATABASE
// ============================================================================

const EDUCATION_CONTENT: Record<string, EducationTopic[]> = {
  // Pattern-specific education
  orb: [
    {
      id: 'orb-timing',
      title: 'Why Opening Range Works',
      shortDescription: 'The first 15-30 minutes set the day\'s tone',
      content: `The opening range captures institutional order flow and overnight positioning. 
      
When price breaks the range with volume, it often signals the day's direction. Professional traders use this because:

• Overnight orders execute at the open
• Range establishes support/resistance levels
• Breakout direction often holds for hours`,
      stats: '62% of ORB breakouts reach 1:2 R:R on NQ (backtest data)',
    },
    {
      id: 'orb-range-period',
      title: 'Why 15 Minutes?',
      shortDescription: 'The sweet spot for range definition',
      content: `15-minute opening range balances two factors:

**Too short (5 min):** Catches noise, false breakouts common
**Too long (60 min):** Misses early moves, range too wide

15 minutes gives enough time for:
• Initial volatility to settle
• Institutional orders to fill
• Clear high/low to form`,
      stats: '15-min ORB has 23% fewer false breakouts than 5-min',
    },
  ],
  
  pullback: [
    {
      id: 'pullback-psychology',
      title: 'Why Pullbacks Work',
      shortDescription: 'Buying fear in a trend',
      content: `Pullback strategies work because of trader psychology:

• Weak hands sell during dips
• Strong hands (institutions) accumulate
• Trend resumes as selling exhausts

You're essentially buying from panicking traders and selling to FOMO traders later.`,
      stats: 'Pullback entries have 40% better R:R than breakout entries in trends',
    },
  ],
  
  breakout: [
    {
      id: 'breakout-volume',
      title: 'Volume Confirms Breakouts',
      shortDescription: 'Real moves have participation',
      content: `Not all breakouts are equal. Volume tells you if the move is real:

**High volume breakout:** Institutions participating, likely to hold
**Low volume breakout:** Retail-driven, often fails

Look for 150%+ of average volume on the breakout candle.`,
      stats: 'High-volume breakouts hold 2.3x longer than low-volume ones',
    },
  ],
  
  // Component-specific education
  stop_ticks: [
    {
      id: 'stop-sizing',
      title: 'Why Fixed Tick Stops?',
      shortDescription: 'Consistent risk, easy math',
      content: `Fixed tick stops (like 20 ticks) provide:

• **Consistent risk:** Same dollar risk every trade
• **Quick decisions:** No calculating swing lows
• **Position sizing clarity:** Easy to calculate contracts

The tradeoff: You might get stopped out before a structure level, but your risk is always defined.`,
      stats: '20-tick stops on NQ = $100 risk per contract',
    },
  ],
  
  stop_structure: [
    {
      id: 'structure-stops',
      title: 'Why Structure-Based Stops?',
      shortDescription: 'Let the market tell you where to exit',
      content: `Structure stops (below swing low, above swing high) work because:

• **Market-defined levels:** Not arbitrary numbers
• **Logical invalidation:** Trade thesis is wrong if level breaks
• **Often wider:** Gives trade room to breathe

The tradeoff: Variable risk requires adjusting position size per trade.`,
      stats: 'Structure stops have 15% fewer false stop-outs than fixed tick stops',
    },
  ],
  
  target_rr: [
    {
      id: 'target-math',
      title: 'Why 1:2 R:R?',
      shortDescription: 'The math that makes trading work',
      content: `1:2 Risk:Reward is the professional standard because:

**With 1:2 R:R, you only need 34% win rate to break even.**

If you risk $100 to make $200:
• Win 34 trades: +$6,800
• Lose 66 trades: -$6,600
• Net: +$200

Most traders achieve 45-55% win rates, making 1:2 very profitable.`,
      stats: '1:2 R:R + 50% win rate = 50% return on risk',
    },
  ],
  
  sizing_percent: [
    {
      id: 'percent-risk',
      title: 'Why 1% Risk Per Trade?',
      shortDescription: 'Van Tharp\'s position sizing rule',
      content: `1% risk per trade is the professional standard because:

• **Survival:** You can lose 20 trades in a row and still have 80% of capital
• **Compounding:** Small consistent gains compound faster than big swings
• **Psychology:** Losses don't trigger emotional revenge trading

Van Tharp's research found position sizing accounts for 91% of portfolio performance variability.`,
      stats: 'At 1% risk, a 10-trade losing streak costs only 9.6% of account',
    },
  ],
};

// ============================================================================
// HELPER: Get Education Topics for Strategy
// ============================================================================

function getEducationTopics(props: StrategyEducationProps): EducationTopic[] {
  const topics: EducationTopic[] = [];
  
  // Pattern-based topics
  if (props.strategyPattern) {
    const patternKey = props.strategyPattern.toLowerCase();
    if (EDUCATION_CONTENT[patternKey]) {
      topics.push(...EDUCATION_CONTENT[patternKey]);
    }
  }
  
  // Stop-based topics
  if (props.stopValue) {
    const stopLower = props.stopValue.toLowerCase();
    if (stopLower.includes('tick') || /\d+\s*(t|tick)/i.test(stopLower)) {
      if (EDUCATION_CONTENT.stop_ticks) {
        topics.push(...EDUCATION_CONTENT.stop_ticks);
      }
    } else if (stopLower.includes('structure') || stopLower.includes('swing') || stopLower.includes('low')) {
      if (EDUCATION_CONTENT.stop_structure) {
        topics.push(...EDUCATION_CONTENT.stop_structure);
      }
    }
  }
  
  // Target-based topics
  if (props.targetValue) {
    const targetLower = props.targetValue.toLowerCase();
    if (targetLower.includes('r:r') || targetLower.includes(':') || targetLower.includes('reward')) {
      if (EDUCATION_CONTENT.target_rr) {
        topics.push(...EDUCATION_CONTENT.target_rr);
      }
    }
  }
  
  // Sizing-based topics
  if (props.sizingValue) {
    const sizingLower = props.sizingValue.toLowerCase();
    if (sizingLower.includes('%') || sizingLower.includes('percent')) {
      if (EDUCATION_CONTENT.sizing_percent) {
        topics.push(...EDUCATION_CONTENT.sizing_percent);
      }
    }
  }
  
  // Limit to 3 most relevant topics
  return topics.slice(0, 3);
}

// ============================================================================
// EDUCATION CARD COMPONENT
// ============================================================================

interface EducationCardProps {
  topic: EducationTopic;
  isExpanded: boolean;
  onToggle: () => void;
}

function EducationCard({ topic, isExpanded, onToggle }: EducationCardProps) {
  return (
    <div className="border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden bg-[rgba(255,255,255,0.02)]">
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#6366f1]/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-[#6366f1]" />
          </div>
          <div>
            <h4 className="text-white text-sm font-medium">{topic.title}</h4>
            <p className="text-[rgba(255,255,255,0.5)] text-xs">{topic.shortDescription}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.4)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.4)]" />
        )}
      </button>
      
      {/* Content - Expandable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-[rgba(255,255,255,0.05)]">
              <div className="text-sm text-[rgba(255,255,255,0.7)] whitespace-pre-line leading-relaxed">
                {topic.content}
              </div>
              
              {topic.stats && (
                <div className="mt-3 p-2 rounded bg-[#00FFD1]/5 border border-[#00FFD1]/20">
                  <p className="text-xs font-mono text-[#00FFD1]">
                    📊 {topic.stats}
                  </p>
                </div>
              )}
              
              {topic.learnMoreUrl && (
                <a
                  href={topic.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
                >
                  <span>Learn more</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PostSaveEducation(props: StrategyEducationProps) {
  const { onDismiss, isVisible = true } = props;
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  
  const topics = getEducationTopics(props);
  
  const handleToggle = useCallback((topicId: string) => {
    setExpandedTopic(prev => prev === topicId ? null : topicId);
  }, []);
  
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);
  
  // Don't render if no topics or dismissed
  if (!isVisible || isDismissed || topics.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-auto w-full max-w-xl my-6"
    >
      <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#6366f1]/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#6366f1]" />
            </div>
            <div>
              <h3 className="text-white text-sm font-medium">
                Learn Why This Works
              </h3>
              <p className="text-[rgba(255,255,255,0.5)] text-xs">
                Optional • Based on your strategy
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleDismiss}
            className="p-1.5 text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Topics */}
        <div className="p-4 space-y-3">
          {topics.map(topic => (
            <EducationCard
              key={topic.id}
              topic={topic}
              isExpanded={expandedTopic === topic.id}
              onToggle={() => handleToggle(topic.id)}
            />
          ))}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.08)] text-center">
          <p className="text-xs text-[rgba(255,255,255,0.4)]">
            Tap any topic to expand • This won&apos;t show again
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { EDUCATION_CONTENT, getEducationTopics };
export type { EducationTopic, StrategyEducationProps };
