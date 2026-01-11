/**
 * RULE EXTRACTOR
 * 
 * Hybrid approach for extracting strategy rules:
 * 1. Stream phase: Pattern matching on Claude's natural language responses
 * 2. Final phase: Map parsedRules from API to StrategyRule format
 * 
 * This gives instant feedback during conversation AND accurate final state.
 */

export interface StrategyRule {
  label: string;
  value: string;
  category: 'setup' | 'entry' | 'exit' | 'risk' | 'timeframe' | 'filters';
}

// ============================================================================
// PHASE 1: STREAM-BASED EXTRACTION (Pattern Matching)
// ============================================================================

interface ExtractionPattern {
  regex: RegExp;
  category: StrategyRule['category'];
  label: string;
  valueTransform?: (match: RegExpMatchArray) => string;
}

const EXTRACTION_PATTERNS: ExtractionPattern[] = [
  // Entry patterns
  { 
    regex: /entry(?:\s+trigger)?[:\s]+(.+?)(?:\n|$|\.(?=\s))/gi, 
    category: 'entry', 
    label: 'Entry Trigger' 
  },
  { 
    regex: /break(?:out)?\s+(?:above|below)\s+(.+?)(?:\n|$|\.(?=\s))/gi, 
    category: 'entry', 
    label: 'Entry Trigger',
    valueTransform: (m) => `Break ${m[0].includes('above') ? 'above' : 'below'} ${m[1]}`
  },
  { 
    regex: /enter\s+(?:when|on|at)\s+(.+?)(?:\n|$|\.(?=\s))/gi, 
    category: 'entry', 
    label: 'Entry Condition' 
  },

  // Stop loss patterns
  { 
    regex: /stop(?:\s+loss)?[:\s]+(.+?)(?:\n|$|\.(?=\s))/gi, 
    category: 'risk', 
    label: 'Stop Loss' 
  },
  { 
    regex: /stop\s+(?:is|=|at)\s+(.+?)(?:\n|$|\.(?=\s))/gi, 
    category: 'risk', 
    label: 'Stop Loss' 
  },
  { 
    regex: /(\d+)\s*(?:tick|point|pt)s?\s+stop/gi, 
    category: 'risk', 
    label: 'Stop Loss',
    valueTransform: (m) => `${m[1]} ${m[0].includes('tick') ? 'ticks' : 'points'}`
  },

  // Target patterns
  { 
    regex: /(?:profit\s+)?target[:\s]+(.+?)(?:\n|$|\.(?=\s))/gi, 
    category: 'exit', 
    label: 'Target' 
  },
  { 
    regex: /take\s+profit\s+(?:at|is|=)\s+(.+?)(?:\n|$|\.(?=\s))/gi, 
    category: 'exit', 
    label: 'Take Profit' 
  },

  // Risk:Reward patterns
  { 
    regex: /(\d+:\d+)\s*(?:rr|r:r|risk.?reward)/gi, 
    category: 'risk', 
    label: 'Risk:Reward',
    valueTransform: (m) => m[1]
  },
  { 
    regex: /risk.?reward\s*(?:of|is|=)?\s*(\d+:\d+)/gi, 
    category: 'risk', 
    label: 'Risk:Reward',
    valueTransform: (m) => m[1]
  },

  // Position sizing
  { 
    regex: /(?:risk|position)\s*(?:size)?[:\s]+(\d+(?:\.\d+)?%?\s*(?:per\s+trade|of\s+account)?)/gi, 
    category: 'risk', 
    label: 'Position Size' 
  },
  { 
    regex: /(\d+)\s*contracts?/gi, 
    category: 'risk', 
    label: 'Position Size',
    valueTransform: (m) => `${m[1]} contract${parseInt(m[1]) > 1 ? 's' : ''}`
  },

  // Setup patterns
  { 
    regex: /opening\s+range(?:\s+breakout)?/gi, 
    category: 'setup', 
    label: 'Pattern',
    valueTransform: () => 'Opening Range Breakout'
  },
  { 
    regex: /(?:trading\s+)?(?:long|short)\s+only/gi, 
    category: 'setup', 
    label: 'Direction',
    valueTransform: (m) => m[0].includes('long') ? 'Long only' : 'Short only'
  },
  { 
    regex: /(?:both|long\s+and\s+short|bi-?directional)/gi, 
    category: 'setup', 
    label: 'Direction',
    valueTransform: () => 'Long and Short'
  },
  { 
    regex: /pullback\s+(?:entry|strategy|setup)/gi, 
    category: 'setup', 
    label: 'Pattern',
    valueTransform: () => 'Pullback Entry'
  },
  { 
    regex: /trend\s+(?:following|continuation)/gi, 
    category: 'setup', 
    label: 'Pattern',
    valueTransform: () => 'Trend Following'
  },

  // Timeframe patterns
  { 
    regex: /(\d+)[-\s]?min(?:ute)?\s+(?:range|chart|timeframe)/gi, 
    category: 'timeframe', 
    label: 'Timeframe',
    valueTransform: (m) => `${m[1]} minute`
  },
  { 
    regex: /(?:rth|regular\s+trading\s+hours)/gi, 
    category: 'timeframe', 
    label: 'Session',
    valueTransform: () => 'RTH (9:30 AM - 4:00 PM ET)'
  },
  { 
    regex: /globex/gi, 
    category: 'timeframe', 
    label: 'Session',
    valueTransform: () => 'Globex (Overnight)'
  },
  { 
    regex: /(?:first|opening)\s+(\d+)\s+min(?:ute)?s?/gi, 
    category: 'timeframe', 
    label: 'Range Period',
    valueTransform: (m) => `First ${m[1]} minutes`
  },

  // Filter patterns
  { 
    regex: /(\d+)[-\s]?(?:ema|ma|sma)/gi, 
    category: 'filters', 
    label: 'Moving Average',
    valueTransform: (m) => `${m[1]} ${m[0].toLowerCase().includes('ema') ? 'EMA' : 'SMA'}`
  },
  { 
    regex: /vwap/gi, 
    category: 'filters', 
    label: 'VWAP Filter',
    valueTransform: () => 'VWAP confirmation'
  },
  { 
    regex: /rsi\s*(?:above|below|>|<)?\s*(\d+)/gi, 
    category: 'filters', 
    label: 'RSI Filter' 
  },
  { 
    regex: /volume\s*(?:above|>)\s*(\d+)/gi, 
    category: 'filters', 
    label: 'Volume Filter' 
  },

  // Instrument patterns
  { 
    regex: /(?:trading|on)\s+(NQ|ES|MNQ|MES|YM|RTY|CL|GC)/gi, 
    category: 'setup', 
    label: 'Instrument',
    valueTransform: (m) => m[1].toUpperCase()
  },
];

/**
 * Extract rules from Claude's streaming response text
 * Used for instant feedback during conversation
 */
export function extractRulesFromStream(text: string): StrategyRule[] {
  const rules: StrategyRule[] = [];
  const seen = new Set<string>(); // Prevent duplicates

  for (const pattern of EXTRACTION_PATTERNS) {
    // Reset regex lastIndex for each use
    pattern.regex.lastIndex = 0;
    
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const value = pattern.valueTransform 
        ? pattern.valueTransform(match)
        : match[1]?.trim();
      
      if (value) {
        const key = `${pattern.label}:${value}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          rules.push({
            label: pattern.label,
            value: value,
            category: pattern.category,
          });
        }
      }
    }
  }

  return rules;
}

// ============================================================================
// PHASE 2: FINAL EXTRACTION (From ParsedRules)
// ============================================================================

interface ParsedRules {
  entry_conditions?: Array<{
    indicator?: string;
    condition?: string;
    value?: number | string;
    period?: number;
    direction?: string;
  }>;
  exit_conditions?: Array<{
    type?: string;
    value?: number | string;
    unit?: string;
  }>;
  filters?: Array<{
    type?: string;
    indicator?: string;
    condition?: string;
    value?: number | string;
    start?: string;
    end?: string;
    period?: number;
  }>;
  position_sizing?: {
    method?: string;
    value?: number;
    max_contracts?: number;
  };
  time_restrictions?: {
    trading_hours?: {
      start?: string;
      end?: string;
    };
    session?: string;
    days?: string[];
  };
  direction?: 'long' | 'short' | 'both';
  strategy_type?: string;
}

/**
 * Map parsed rules from API to StrategyRule format
 * Used for accurate final state after strategy is complete
 */
export function mapParsedRulesToStrategyRules(
  parsedRules: ParsedRules,
  strategyName?: string,
  instrument?: string
): StrategyRule[] {
  const rules: StrategyRule[] = [];

  // Strategy name
  if (strategyName) {
    rules.push({
      label: 'Strategy',
      value: strategyName,
      category: 'setup',
    });
  }

  // Instrument
  if (instrument) {
    rules.push({
      label: 'Instrument',
      value: instrument.toUpperCase(),
      category: 'setup',
    });
  }

  // Direction
  if (parsedRules.direction) {
    rules.push({
      label: 'Direction',
      value: parsedRules.direction === 'both' 
        ? 'Long and Short' 
        : parsedRules.direction.charAt(0).toUpperCase() + parsedRules.direction.slice(1) + ' only',
      category: 'setup',
    });
  }

  // Strategy type
  if (parsedRules.strategy_type) {
    rules.push({
      label: 'Pattern',
      value: parsedRules.strategy_type,
      category: 'setup',
    });
  }

  // Entry conditions
  parsedRules.entry_conditions?.forEach((entry, index) => {
    let value = '';
    if (entry.indicator && entry.condition) {
      value = `${entry.indicator}${entry.period ? ` (${entry.period})` : ''} ${entry.condition} ${entry.value ?? ''}`.trim();
    } else if (entry.direction) {
      value = `Break ${entry.direction}`;
    }
    
    if (value) {
      rules.push({
        label: index === 0 ? 'Entry Trigger' : 'Entry Condition',
        value,
        category: 'entry',
      });
    }
  });

  // Exit conditions (stop loss, take profit)
  parsedRules.exit_conditions?.forEach((exit) => {
    if (exit.type === 'stop_loss') {
      rules.push({
        label: 'Stop Loss',
        value: `${exit.value}${exit.unit ? ` ${exit.unit}` : ''}`,
        category: 'risk',
      });
    } else if (exit.type === 'take_profit' || exit.type === 'target') {
      rules.push({
        label: 'Target',
        value: `${exit.value}${exit.unit ? ` ${exit.unit}` : ''}`,
        category: 'exit',
      });
    } else if (exit.type === 'risk_reward') {
      rules.push({
        label: 'Risk:Reward',
        value: `${exit.value}`,
        category: 'risk',
      });
    }
  });

  // Filters
  parsedRules.filters?.forEach((filter) => {
    if (filter.type === 'indicator' && filter.indicator) {
      rules.push({
        label: `${filter.indicator} Filter`,
        value: `${filter.condition || ''} ${filter.value ?? ''}`.trim(),
        category: 'filters',
      });
    } else if (filter.type === 'time_window') {
      rules.push({
        label: 'Time Filter',
        value: `${filter.start} - ${filter.end}`,
        category: 'timeframe',
      });
    }
  });

  // Position sizing
  if (parsedRules.position_sizing) {
    const ps = parsedRules.position_sizing;
    if (ps.method === 'risk_percent' && ps.value) {
      rules.push({
        label: 'Position Size',
        value: `${ps.value}% risk per trade`,
        category: 'risk',
      });
    } else if (ps.method === 'fixed' && ps.max_contracts) {
      rules.push({
        label: 'Position Size',
        value: `${ps.max_contracts} contract${ps.max_contracts > 1 ? 's' : ''}`,
        category: 'risk',
      });
    }
  }

  // Time restrictions
  if (parsedRules.time_restrictions) {
    const tr = parsedRules.time_restrictions;
    if (tr.session) {
      rules.push({
        label: 'Session',
        value: tr.session === 'RTH' ? 'RTH (9:30 AM - 4:00 PM ET)' : tr.session,
        category: 'timeframe',
      });
    }
    if (tr.trading_hours?.start && tr.trading_hours?.end) {
      rules.push({
        label: 'Trading Hours',
        value: `${tr.trading_hours.start} - ${tr.trading_hours.end}`,
        category: 'timeframe',
      });
    }
  }

  return rules;
}

// ============================================================================
// HYBRID MERGE: Combine stream and final rules
// ============================================================================

/**
 * Merge stream-extracted rules with final parsed rules
 * Final rules take precedence where there's overlap
 */
export function mergeRules(
  streamRules: StrategyRule[],
  finalRules: StrategyRule[]
): StrategyRule[] {
  if (finalRules.length === 0) return streamRules;
  if (streamRules.length === 0) return finalRules;

  // Use final rules as base, add any unique stream rules
  const finalKeys = new Set(
    finalRules.map(r => `${r.category}:${r.label}`.toLowerCase())
  );

  const uniqueStreamRules = streamRules.filter(
    r => !finalKeys.has(`${r.category}:${r.label}`.toLowerCase())
  );

  return [...finalRules, ...uniqueStreamRules];
}
