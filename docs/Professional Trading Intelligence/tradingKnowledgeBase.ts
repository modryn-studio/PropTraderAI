/**
 * FUTURES TRADING KNOWLEDGE BASE
 * 
 * Professional-grade trading knowledge extracted from institutional research.
 * This is the "brain" that makes Claude understand futures trading like a pro.
 * 
 * Based on: "Architecture of Professional Trading Strategies" research document
 */

// ============================================================================
// CORE TAXONOMIES
// ============================================================================

export const ENTRY_TAXONOMY = {
  breakout: {
    name: 'Breakout Entry',
    description: 'Price exceeds established levels',
    subtypes: {
      immediate: {
        execution: 'Stop order at breakout level',
        bestConditions: 'High volatility, trending markets',
        example: 'Buy stop 2 ticks above 15-min high',
        successRate: 'ORB: 17% upside breaks, 16% downside, 67% double-breaks',
      },
      withConfirmation: {
        execution: 'Wait for strong close + volume',
        bestConditions: 'Consolidation after major news',
        example: 'Enter on close above high with volume >1.5x average',
        professionalQuote: 'Al Brooks: "Every trend bar is a breakout of something"',
      },
    },
    commonMistakes: [
      'Entering on wick touch instead of close',
      'No volume confirmation in range markets',
      'Chasing after strong breakout move',
    ],
  },
  
  pullback: {
    name: 'Pullback/Retest Entry',
    description: 'Retracement within established trend',
    subtypes: {
      breakoutRetest: {
        execution: 'Limit order at breakout point',
        bestConditions: 'Strong trend with clear structure',
        example: 'Buy limit at previous resistance (now support)',
        keyLevel: 'First retest has highest success rate',
      },
      fibonacciRetracement: {
        execution: 'Limit order at key Fib level',
        bestConditions: 'Trending markets with clear swings',
        levels: [
          { level: '38.2%', usage: 'Shallow pullback in strong trend' },
          { level: '50%', usage: 'Standard retracement' },
          { level: '61.8%', usage: 'Deep pullback before reversal risk' },
        ],
        example: 'Buy at 50% retrace of prior leg in uptrend',
      },
      movingAveragePullback: {
        execution: 'Limit order at MA touch',
        bestConditions: 'Trending with MA respected',
        commonMAs: ['20 EMA (short-term)', '50 EMA (intermediate)', '200 SMA (major)'],
        example: 'Buy when price touches 20 EMA in uptrend',
        professionalQuote: 'CME: "Wait for brief retracement before entering trend direction"',
      },
    },
    filters: [
      'Only in direction of higher timeframe trend',
      'Volume should decrease on pullback',
      'Price shouldn\'t break prior swing low (for longs)',
    ],
  },
  
  reversal: {
    name: 'Reversal Entry',
    description: 'Anticipate trend change at exhaustion',
    subtypes: {
      minor: {
        outcome: 'Leads to pullback, not trend change',
        probability: '75% fail against strong channel',
        bestUse: 'Scalping in range',
      },
      major: {
        outcome: 'Potential trend change',
        probability: '25% success against channel breakout',
        warning: 'High risk - requires strong confirmation',
      },
    },
    requiredConfirmation: [
      'Reversal pattern (pin bar, engulfing)',
      'At key structure level',
      'Divergence on momentum indicator',
      'Volume spike on reversal bar',
    ],
    professionalQuote: 'Al Brooks: Major reversals only 25% successful against channel',
  },
  
  continuation: {
    name: 'Continuation Entry',
    description: 'Enter in direction of strong momentum',
    execution: 'Stop order beyond pattern',
    bestConditions: 'Strong directional bias, news catalyst',
    patterns: ['Flag', 'Pennant', 'Triangle breakout'],
    example: 'Buy stop above bull flag high in uptrend',
  },
  
  confirmation: {
    name: 'Confirmation-Based Entry',
    description: 'Wait for multiple signal alignment',
    execution: 'Market order after all confirmations',
    bestConditions: 'Any, with clear indicator setup',
    example: 'Enter when price above VWAP + RSI >50 + EMA crossover',
    minimumConfirmations: 2,
  },
  
  timeBased: {
    name: 'Time-Based Entry (ORB)',
    description: 'Opening range breakout',
    execution: 'Stop order beyond range high/low',
    bestConditions: 'Market open, high volatility expected',
    ranges: ['5-min', '15-min', '30-min', 'First hour'],
    statistics: {
      ES: 'Breakouts: 17%, Breakdowns: 16%, Double-breaks: 67%',
    },
    example: 'Buy stop 2 ticks above 15-min high at 9:45 AM ET',
  },
};

export const EXIT_TAXONOMY = {
  stopLoss: {
    types: {
      fixedPointTick: {
        description: 'Predetermined distance in points/ticks',
        ES: { scalping: '4-8 ticks ($50-100)', dayTrading: '8-16 ticks ($100-200)' },
        NQ: { scalping: '8-16 ticks ($80-160)', dayTrading: '16-32 ticks ($160-320)' },
        pros: 'Simple, consistent risk',
        cons: 'Ignores volatility and structure',
        example: '10-tick stop on ES = $125 risk',
      },
      
      atrBased: {
        description: 'Multiple of Average True Range',
        calculation: 'Stop = Entry ± (ATR × Multiplier)',
        multipliers: {
          scalping: '0.5-1.0x ATR',
          dayTrading: '1.5-2.0x ATR',
          swingTrading: '2.0-3.0x ATR',
        },
        period: '14-period ATR (standard)',
        marketConditions: {
          quiet: '1.5-2x ATR',
          normal: '2-2.5x ATR',
          highVolatility: '2.5-3x ATR',
          extreme: '3-4x ATR',
        },
        pros: 'Adapts to volatility',
        cons: 'Requires calculation, varies daily',
        example: 'ES ATR = 20 points, 2x ATR stop = 40 points ($500)',
      },
      
      structureBased: {
        description: 'Beyond swing points + buffer',
        placement: 'Below swing low (longs) or above swing high (shorts)',
        buffer: '1-2 ticks beyond structure',
        pros: 'Respects market structure',
        cons: 'Variable risk per trade',
        example: 'Swing low at 4500, stop at 4499 (1 tick buffer)',
        professionalQuote: 'Most reliable - respects where market proves you wrong',
      },
      
      timeStop: {
        description: 'Exit if no movement in X time',
        usage: 'Prevents capital tie-up in dead trades',
        typical: '30-60 minutes for day trades',
        professionalQuote: 'John Henry: Favors time-based exits over price-based',
        example: 'Exit if trade hasn\'t moved 5 ticks in 45 minutes',
      },
    },
    
    criticalRule: 'CME Group: "Mental stops don\'t count; it must be written down"',
  },
  
  profitTarget: {
    types: {
      fixed: {
        description: 'Predetermined distance',
        ES: 'Day trades: 8-12 points typical',
        NQ: 'Day trades: 20-50 points typical',
        example: '12-point target on ES = $150 profit',
      },
      
      rMultiple: {
        description: 'Profit normalized to initial risk',
        standard: '2R (profit = 2× risk)',
        professionalQuote: 'Industry standard: most important number, most likely to obtain',
        minimumViable: '1.5R',
        calculation: 'If risk = 10 points, 2R = 20 points profit',
        breakeven: {
          '1:1': '50% win rate required',
          '1:1.5': '40% win rate required',
          '1:2': '33.3% win rate required',
          '1:3': '25% win rate required',
        },
        example: 'Risk 10 points ($125), target 20 points ($250) = 2R',
      },
      
      trailing: {
        description: 'Stop follows price at distance',
        atrBased: '2-3x ATR below price (for longs)',
        pros: 'Captures extended moves',
        cons: 'May give back profits',
        example: 'Trail stop 15 points behind price as it rises',
      },
      
      scaling: {
        description: 'Exit in multiple parts',
        professional: 'Thirds approach: 33% at 1R, 33% at 2R, trail 33%',
        conservative: '50% at target, 50% trail',
        consistency: '70% at target, 30% runner',
        example: '3 contracts: exit 1 at 1R, 1 at 2R, trail last',
      },
    },
  },
};

export const POSITION_SIZING_METHODS = {
  riskPercentage: {
    name: 'Risk Percentage Method (Industry Standard)',
    formula: '(Account Equity × Risk %) / (Stop Distance × Point Value)',
    standardRisk: '1-2% per trade',
    maxRisk: '3% (beyond this is "financial suicide" - Van Tharp)',
    example: {
      account: 50000,
      risk: 0.01, // 1%
      stopDistance: 8, // points
      pointValue: 50, // ES
      calculation: '($50,000 × 1%) / (8 × $50) = $500 / $400 = 1.25 → 1 contract',
    },
    professionalQuote: 'Van Tharp: Position sizing accounts for 91% of performance',
  },
  
  atrBased: {
    name: 'Volatility-Based Sizing (ATR Method)',
    formula: '(Account × Volatility %) / (ATR × Point Value)',
    multipliers: {
      quiet: '1.5-2x ATR',
      normal: '2-2.5x ATR',
      high: '2.5-3x ATR',
    },
    example: 'Account $50K, 1% risk, ATR 20 points: ($500) / (20 × $50) = 0.5 contracts',
  },
  
  kellyCriterion: {
    name: 'Kelly Criterion (Mathematical Optimization)',
    formula: '(Win% - Loss%) / (AvgWin / AvgLoss)',
    warning: 'Full Kelly too aggressive - use half or quarter Kelly',
    example: {
      winRate: 0.55,
      rewardRisk: 1.5,
      fullKelly: '25% position (too aggressive)',
      halfKelly: '12.5% (recommended)',
      quarterKelly: '6.25% (conservative)',
    },
  },
  
  fixed: {
    name: 'Fixed Contracts',
    usage: 'Simple but ignores account growth',
    warning: 'Should still be tied to risk percentage',
    example: '2 contracts always = need to know your risk per contract',
  },
};

export const PROP_FIRM_STANDARDS = {
  FTMO: {
    dailyLoss: 0.05, // 5%
    maxDrawdown: 0.10, // 10% static
    drawdownType: 'static',
    consistencyRule: null,
    contracts: {
      50000: 'N/A (forex primarily)',
      100000: 'N/A',
    },
  },
  
  TopStep: {
    dailyLoss: 0.02, // 2%
    maxDrawdown: 'trailing',
    drawdownType: 'trailing',
    consistencyRule: '50% profit from single day',
    contracts: {
      50000: 10,
      100000: 10,
      150000: 15,
    },
    microRatio: '10 MES = 1 ES equivalent',
  },
  
  Apex: {
    dailyLoss: null,
    maxDrawdown: 'trailing',
    drawdownType: 'trailing',
    consistencyRule: '30% for payout eligibility',
    contracts: {
      50000: 14,
      100000: 14,
      150000: 20,
    },
  },
  
  Earn2Trade: {
    dailyLoss: 0.02, // 2%
    maxDrawdown: 0.03, // 3% EOD
    drawdownType: 'static EOD',
    consistencyRule: '30%',
    contracts: {
      50000: 12,
      100000: 12,
      150000: 18,
    },
  },
  
  Leeloo: {
    dailyLoss: null,
    maxDrawdown: 'trailing',
    drawdownType: 'trailing',
    consistencyRule: '30% for payout',
    contracts: {
      50000: 12,
      100000: 12,
      150000: 18,
    },
  },
};

export const PROFESSIONAL_STANDARDS = {
  minBacktestTrades: 100, // Minimum for statistical validity
  recommendedBacktestTrades: 200,
  forwardTestDuration: '1-3 months',
  forwardTestMinTrades: 100,
  
  dataSplit: {
    training: '60-70%',
    validation: '15-20%',
    outOfSample: '15-20%',
  },
  
  performanceMetrics: {
    sharpeRatio: { acceptable: 1.0, excellent: 1.4 },
    profitFactor: { minimum: 1.5 },
    maxDrawdown: { typical: 0.10, warning: 0.15 },
  },
  
  riskLimits: {
    perTrade: { min: 0.01, max: 0.02, suicide: 0.03 },
    dailyLoss: { min: 0.02, max: 0.05 },
    weeklyLoss: 0.08,
    maxDrawdown: 0.10,
  },
};

// ============================================================================
// COMMON MISTAKES DATABASE
// ============================================================================

export const COMMON_MISTAKES = {
  vagueEntries: {
    bad: ['I enter when it looks good', 'When momentum picks up', 'When I feel it'],
    fix: 'Specify exact conditions: "Break above 15-min high with volume >1000"',
    severity: 'critical',
  },
  
  noStopLoss: {
    bad: ['I\'ll figure it out', 'Depends on the trade', 'Mental stop'],
    fix: 'Define exact placement: "2 ticks below swing low" or "50% of range"',
    severity: 'critical',
    professionalQuote: 'CME: "Mental stops don\'t count"',
  },
  
  excessiveRisk: {
    bad: ['5% per trade', '10% on high confidence', 'All-in on perfect setup'],
    fix: 'Cap at 1-2% per trade. Van Tharp: >3% is "financial suicide"',
    severity: 'critical',
  },
  
  poorRiskReward: {
    bad: ['1:1 ratio', 'Equal risk and reward'],
    fix: 'Minimum 1.5:1, standard 2:1. Lower R:R requires very high win rate',
    severity: 'warning',
    math: '1:1 requires 50% win rate, 1:2 only requires 33.3%',
  },
  
  fixedSizingWithoutRisk: {
    bad: ['I always trade 2 contracts', '5 lots every trade'],
    fix: 'Tie size to risk: "2 contracts = 1% risk" or "calculate from stop distance"',
    severity: 'warning',
  },
  
  ignoringTimeframe: {
    bad: ['I trade ES', 'I trade breakouts'],
    fix: 'Specify: "5-min chart for entry, 15-min for confirmation"',
    severity: 'warning',
  },
};

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

export const CALCULATIONS = {
  positionSize: (accountSize: number, riskPercent: number, stopPoints: number, pointValue: number): number => {
    const riskDollars = accountSize * riskPercent;
    const riskPerContract = stopPoints * pointValue;
    return Math.floor(riskDollars / riskPerContract);
  },
  
  riskRewardRatio: (stopPoints: number, targetPoints: number): string => {
    const ratio = targetPoints / stopPoints;
    return `1:${ratio.toFixed(1)}`;
  },
  
  breakEvenWinRate: (riskReward: number): number => {
    return 1 / (1 + riskReward);
  },
  
  expectancy: (winRate: number, avgWinR: number, avgLossR: number = 1): number => {
    return (winRate * avgWinR) - ((1 - winRate) * avgLossR);
  },
};

// ============================================================================
// INSTRUMENT SPECIFICATIONS
// ============================================================================

export const INSTRUMENTS = {
  ES: {
    name: 'E-mini S&P 500',
    symbol: 'ES',
    tickSize: 0.25,
    tickValue: 12.50,
    pointValue: 50,
    typicalRange: '30-50 points per day',
    tradingHours: {
      RTH: '9:30 AM - 4:00 PM ET',
      Globex: '6:00 PM - 5:00 PM ET (next day)',
    },
  },
  
  NQ: {
    name: 'E-mini Nasdaq-100',
    symbol: 'NQ',
    tickSize: 0.25,
    tickValue: 5,
    pointValue: 20,
    typicalRange: '100-200 points per day',
    tradingHours: {
      RTH: '9:30 AM - 4:00 PM ET',
      Globex: '6:00 PM - 5:00 PM ET (next day)',
    },
  },
  
  MES: {
    name: 'Micro E-mini S&P 500',
    symbol: 'MES',
    tickSize: 0.25,
    tickValue: 1.25,
    pointValue: 5,
    ratio: '10 MES = 1 ES',
  },
  
  MNQ: {
    name: 'Micro E-mini Nasdaq-100',
    symbol: 'MNQ',
    tickSize: 0.25,
    tickValue: 0.50,
    pointValue: 2,
    ratio: '10 MNQ = 1 NQ',
  },
};
