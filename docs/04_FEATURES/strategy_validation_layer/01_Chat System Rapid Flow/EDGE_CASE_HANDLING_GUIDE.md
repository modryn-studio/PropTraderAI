# PropTraderAI Strategy Builder: Edge Case Handling & Final Refinements
**Addressing Critical Edge Cases and Missing Implementation Details**

---

## Part 1: Contradiction Detection in Verbal Descriptions

### The Problem

**User types:**
```
"I trade NQ with 20-tick stop... actually, maybe structure-based 
stop is better... or 20 ticks if structure is more than 25 ticks..."
```

**What you get:**
- Multiple stop loss values
- Conditional logic
- User uncertainty

**Current system:** Would extract ALL of these, causing confusion.

### The Solution: Contradiction Detection & Clarification

```typescript
interface Contradiction {
  component: string;
  values: string[];
  type: 'conflicting' | 'conditional' | 'uncertain';
}

function detectContradictions(extractedRules: StrategyRule[]): Contradiction[] {
  const contradictions: Contradiction[] = [];
  
  // Group rules by component
  const grouped = groupBy(extractedRules, rule => rule.label);
  
  for (const [component, rules] of Object.entries(grouped)) {
    if (rules.length > 1) {
      // Multiple values for same component
      const values = rules.map(r => r.value);
      
      // Check if it's conditional logic
      const hasConditional = values.some(v => 
        /if|when|unless|or|whichever/i.test(v)
      );
      
      // Check if it's uncertainty
      const hasUncertainty = values.some(v =>
        /maybe|actually|or|perhaps|not sure/i.test(v)
      );
      
      if (hasConditional) {
        contradictions.push({
          component,
          values,
          type: 'conditional'
        });
      } else if (hasUncertainty) {
        contradictions.push({
          component,
          values,
          type: 'uncertain'
        });
      } else {
        contradictions.push({
          component,
          values,
          type: 'conflicting'
        });
      }
    }
  }
  
  return contradictions;
}
```

### Response Strategies by Contradiction Type

**Type 1: Conditional Logic (Smart Handling)**

```
User: "Stop at 20 ticks or structure, whichever is smaller"

System detects: Conditional stop logic
→ This is ADVANCED, not a contradiction
→ Extract as: stop_loss_method: "adaptive"
→ stop_loss_primary: "20 ticks"
→ stop_loss_fallback: "structure-based"

Response:
"✓ Adaptive stop detected: 20 ticks OR structure (whichever hits first).
   This is an advanced risk management approach.
   
   [Keep This] [Simplify to Fixed]"
```

**Type 2: Uncertainty (Help Decide)**

```
User: "20-tick stop... actually maybe structure-based is better..."

System detects: Uncertain between two options

Response:
"I see you're deciding between fixed (20 ticks) vs structure-based stop.
 
 Quick comparison:
 • 20 ticks: Consistent risk ($100), easier to manage
 • Structure: Varies by volatility, more adaptive
 
 For ORB strategies, 80% of traders use fixed ticks.
 
 Your preference?
 a) 20 ticks (fixed)
 b) Structure-based
 c) Use both (adaptive - advanced)"
```

**Type 3: Direct Conflict (Clarify)**

```
User: "Stop at 20 ticks. Stop at 30 ticks."

System detects: Direct contradiction (no conditional words)

Response:
"You mentioned both 20-tick and 30-tick stops.
 Which should I use for this strategy?
 
 a) 20 ticks (tighter, more conservative)
 b) 30 ticks (wider, fewer stop-outs)"
```

### Implementation

```typescript
async function handleParsedStrategy(message: string) {
  const extraction = await ruleExtractionPass(message, '', []);
  const contradictions = detectContradictions(extraction.rules);
  
  if (contradictions.length > 0) {
    // Handle each contradiction type
    for (const contradiction of contradictions) {
      if (contradiction.type === 'conditional') {
        // Advanced user - preserve logic
        return buildConditionalStrategy(contradiction);
      } else if (contradiction.type === 'uncertain') {
        // Help them decide
        return askDecisionQuestion(contradiction);
      } else {
        // Direct conflict - need clarification
        return askClarification(contradiction);
      }
    }
  }
  
  // No contradictions - proceed normally
  return buildStrategy(extraction.rules);
}
```

---

## Part 2: Improved Completeness Regex Patterns

### The Problem

**Current patterns miss variations:**
- "e-mini" (hyphenated)
- "mini nasdaq" (two words)
- "S&P 500" (with space)
- "opening range" vs "ORB"

### The Solution: Robust Pattern Matching

```typescript
const INSTRUMENT_PATTERNS = {
  ES: /\b(e-?mini\s?)?(ES|s&?p\s?500?|s\s?and\s?p|spx)\b/i,
  NQ: /\b(e-?mini\s?)?(NQ|nasdaq|nas\s?100|ndx|qqq)\b/i,
  MES: /\b(micro\s?)?(MES|micro\s?e-?mini\s?s&?p)\b/i,
  MNQ: /\b(micro\s?)?(MNQ|micro\s?e-?mini\s?nasdaq)\b/i,
};

const PATTERN_TYPES = {
  orb: /\b(ORB|opening\s?range|open\s?range|opening\s?range\s?breakout|range\s?break)\b/i,
  breakout: /\b(break\s?out|breakout|break\s?above|break\s?below|breaks?\s?through)\b/i,
  pullback: /\b(pull\s?back|pullback|retrace|retracement|dip|bounce)\b/i,
  momentum: /\b(momentum|trend|trending|directional|continuation)\b/i,
  reversal: /\b(reversal|reverse|flip|change\s?direction|contra)\b/i,
  vwap: /\b(VWAP|volume\s?weighted|vol\s?weighted)\b/i,
  ema: /\b(EMA|exponential|moving\s?average|ma\s?\d+)\b/i,
  sma: /\b(SMA|simple\s?moving|moving\s?average)\b/i,
};

const STOP_PATTERNS = {
  fixed_ticks: /\b(\d+)\s?(tick|pt|point)s?\s?stop\b/i,
  fixed_dollars: /\$?(\d+)\s?(dollar|USD)?\s?stop\b/i,
  percentage: /(\d+\.?\d*)\s?%\s?stop\b/i,
  atr: /\b(\d+\.?\d*)?\s?x?\s?ATR\s?stop\b/i,
  structure: /\b(structure|swing|support|resistance|level)\s?(based|stop)?\b/i,
};

const TARGET_PATTERNS = {
  risk_reward: /\b1\s?:\s?(\d+)|(\d+)\s?:\s?1|(\d+)\s?R\b/i,
  ticks: /\b(\d+)\s?(tick|pt|point)s?\s?(target|profit|tp)\b/i,
  dollars: /\$?(\d+)\s?(dollar|USD)?\s?(target|profit|tp)\b/i,
  percentage: /(\d+\.?\d*)\s?%\s?(target|profit|gain)\b/i,
  multiple: /\b(\d+\.?\d*)\s?x\s?(range|extension|target)\b/i,
};

function detectInstrument(message: string): string | null {
  for (const [instrument, pattern] of Object.entries(INSTRUMENT_PATTERNS)) {
    if (pattern.test(message)) {
      return instrument;
    }
  }
  return null;
}

function detectPattern(message: string): string | null {
  for (const [pattern, regex] of Object.entries(PATTERN_TYPES)) {
    if (regex.test(message)) {
      return pattern;
    }
  }
  return null;
}

function extractStopLoss(message: string): { type: string; value: string } | null {
  for (const [type, pattern] of Object.entries(STOP_PATTERNS)) {
    const match = message.match(pattern);
    if (match) {
      return {
        type,
        value: type === 'structure' ? 'structure-based' : match[1] || 'detected'
      };
    }
  }
  return null;
}
```

### Test Cases

```typescript
// Test instrument detection
detectInstrument("e-mini S&P") // → "ES"
detectInstrument("mini nasdaq") // → "NQ"
detectInstrument("S and P 500") // → "ES"
detectInstrument("micro ES contract") // → "MES"

// Test pattern detection
detectPattern("opening range") // → "orb"
detectPattern("pull back to EMA") // → "pullback"
detectPattern("break out above") // → "breakout"

// Test stop loss extraction
extractStopLoss("20 tick stop") // → { type: 'fixed_ticks', value: '20' }
extractStopLoss("stop at structure") // → { type: 'structure', value: 'structure-based' }
extractStopLoss("2 x ATR stop") // → { type: 'atr', value: '2' }
```

---

## Part 3: Beginner Non-Response Handling

### The Problem

```
Bot: "What catches your eye?
     a) Breakouts
     b) Pullbacks
     c) ORB
     d) Not sure"

User: "I just want to make money"
```

**User didn't choose a/b/c/d.**

### The Solution: Template Offer + Escape Hatch

```typescript
function handleBeginnerResponse(userResponse: string, options: string[]) {
  // Check if response matches any option
  const matchesOption = /^[a-e]$/i.test(userResponse.trim()) ||
    options.some(opt => userResponse.toLowerCase().includes(opt.toLowerCase()));
  
  if (!matchesOption) {
    // User gave irrelevant answer or expressed frustration
    
    // Detect frustration/impatience
    const isFrustrated = /just|money|profit|quick|easy|simple/i.test(userResponse);
    
    if (isFrustrated) {
      return {
        message: `I hear you - let's get straight to it.
        
Most successful new traders start with Opening Range Breakout (ORB):
• Simple rules: price breaks above/below opening range
• Clear entry and exit
• Works well on NQ
• You can start trading today

Want to build this first? Takes 30 seconds.
You can always create custom strategies later.

[Start with ORB Template] [No, I Have Something Specific]`,
        action: 'offer_template_or_custom',
        templateId: 'basic_orb'
      };
    }
    
    // User just didn't understand options
    return {
      message: `No problem! Let me simplify:
      
Choose the pattern that sounds most interesting:
a) **Breakouts** - when price breaks above key levels
b) **Pullbacks** - when price bounces off support
c) **Show me the fastest path** (I'll pick for you)

Just type the letter (a, b, or c).`,
      action: 'simplify_options'
    };
  }
  
  // User chose valid option - proceed
  return handleValidOption(userResponse);
}
```

### Template Strategy System

```typescript
interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  defaultRules: {
    instrument: string;
    pattern: string;
    entry: string;
    stop: string;
    target: string;
    sizing: string;
  };
  customizableComponents: string[];
}

const BEGINNER_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'basic_orb',
    name: 'Opening Range Breakout',
    description: 'Trade breakouts from the first 15 minutes',
    difficulty: 'beginner',
    defaultRules: {
      instrument: 'NQ',
      pattern: 'ORB',
      entry: 'Break above 15-min range high',
      stop: '20 ticks ($100)',
      target: '1:2 R:R (40 ticks)',
      sizing: '1% risk per trade'
    },
    customizableComponents: ['instrument', 'stop', 'target']
  },
  {
    id: 'ema_pullback',
    name: '20 EMA Pullback',
    description: 'Buy dips to moving average in uptrend',
    difficulty: 'beginner',
    defaultRules: {
      instrument: 'ES',
      pattern: 'EMA Pullback',
      entry: 'Price touches 20 EMA in uptrend',
      stop: 'Below swing low',
      target: '1:1.5 R:R',
      sizing: '1% risk per trade'
    },
    customizableComponents: ['instrument', 'ema_period', 'target']
  }
];

function offerTemplate(templateId: string) {
  const template = BEGINNER_TEMPLATES.find(t => t.id === templateId);
  
  return {
    message: `✓ ${template.name} Template
    
${template.description}

Default Setup:
• ${template.defaultRules.instrument} futures
• Entry: ${template.defaultRules.entry}
• Stop: ${template.defaultRules.stop}
• Target: ${template.defaultRules.target}
• Risk: ${template.defaultRules.sizing}

[Use This Template] [Customize First]`,
    template,
    action: 'template_offered'
  };
}
```

---

## Part 4: Session Boundary Detection

### The Problem

**How do you know when trading session ended?**
- User closes app?
- User inactive 30 min?
- Market closes?
- User builds another strategy?

### The Solution: Multi-Signal Session Detection

```typescript
interface TradingSession {
  id: string;
  userId: string;
  startTime: Date;
  lastActivityTime: Date;
  lastTradeTime: Date | null;
  isActive: boolean;
  tradesCount: number;
  strategyId: string;
  endReason?: 'market_close' | 'inactivity' | 'user_action' | 'new_session';
}

class SessionManager {
  private readonly INACTIVITY_THRESHOLD_MINUTES = 30;
  private readonly MARKET_CLOSE_HOUR = 16; // 4 PM ET
  
  checkSessionEnd(session: TradingSession): boolean {
    const now = new Date();
    
    // Signal 1: Market closed
    const marketClosed = this.isMarketClosed(now);
    
    // Signal 2: Inactivity
    const inactiveMinutes = (now.getTime() - session.lastActivityTime.getTime()) / 60000;
    const isInactive = inactiveMinutes > this.INACTIVITY_THRESHOLD_MINUTES;
    
    // Signal 3: User started new session
    const newSessionStarted = this.hasNewSession(session.userId, session.id);
    
    if (marketClosed && session.isActive) {
      this.endSession(session, 'market_close');
      return true;
    }
    
    if (isInactive && session.tradesCount > 0) {
      this.endSession(session, 'inactivity');
      return true;
    }
    
    if (newSessionStarted) {
      this.endSession(session, 'new_session');
      return true;
    }
    
    return false;
  }
  
  endSession(session: TradingSession, reason: string) {
    session.isActive = false;
    session.endReason = reason as any;
    
    // Trigger end-of-session activities
    this.sendEducationalInsights(session);
    this.generatePerformanceReport(session);
    this.updateBehavioralData(session);
  }
  
  isMarketClosed(time: Date): boolean {
    const etHour = this.convertToET(time).getHours();
    // Market hours: 9:30 AM - 4:00 PM ET (Monday-Friday)
    const isWeekend = [0, 6].includes(time.getDay());
    const afterClose = etHour >= this.MARKET_CLOSE_HOUR;
    const beforeOpen = etHour < 9;
    
    return isWeekend || afterClose || beforeOpen;
  }
  
  async sendEducationalInsights(session: TradingSession) {
    // Only if user had actual trades
    if (session.tradesCount === 0) return;
    
    const insights = await this.generateInsights(session);
    
    // Send via email or in-app notification
    await this.notificationService.send({
      userId: session.userId,
      type: 'end_of_session_review',
      title: 'Your Trading Session Summary',
      insights,
      timing: 'immediate' // Send right away while fresh
    });
  }
}
```

### Session Activity Tracking

```typescript
// Update session on any activity
function trackActivity(userId: string, activityType: string) {
  const session = getActiveSession(userId);
  
  if (session) {
    session.lastActivityTime = new Date();
    
    if (activityType === 'trade_executed') {
      session.lastTradeTime = new Date();
      session.tradesCount++;
    }
    
    // Check if session should end
    sessionManager.checkSessionEnd(session);
  }
}

// Activities that keep session alive
const TRACKED_ACTIVITIES = [
  'trade_executed',
  'strategy_viewed',
  'tool_used',
  'settings_changed',
  'chat_message',
  'backtest_run'
];
```

---

## Part 5: Strategy Quality Metric

### The Problem

Fast completion is useless if strategies can't execute.

### The Solution: Backtestability Score

```typescript
interface StrategyQualityMetrics {
  strategyId: string;
  isBacktestable: boolean;
  errors: string[];
  warnings: string[];
  completeness: number; // 0.0 to 1.0
  defaultsUsed: string[];
  backtestResults?: {
    trades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
  };
}

async function validateStrategyQuality(strategy: Strategy): Promise<StrategyQualityMetrics> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required components
  if (!strategy.entry) errors.push('Missing entry criteria');
  if (!strategy.stop) errors.push('Missing stop loss');
  if (!strategy.target) errors.push('Missing profit target');
  if (!strategy.sizing) errors.push('Missing position sizing');
  if (!strategy.instrument) errors.push('Missing instrument');
  
  // Check for logical issues
  if (strategy.stop && strategy.target) {
    const stopValue = parseValue(strategy.stop);
    const targetValue = parseValue(strategy.target);
    
    if (stopValue >= targetValue) {
      errors.push('Stop loss larger than target (negative risk:reward)');
    }
  }
  
  // Check if defaults make sense for strategy type
  if (strategy.pattern === 'ORB' && !strategy.rangePeriod) {
    warnings.push('ORB strategy without range period specified - using 15 min default');
  }
  
  // Try to run backtest
  let isBacktestable = false;
  let backtestResults;
  
  if (errors.length === 0) {
    try {
      backtestResults = await runQuickBacktest(strategy);
      isBacktestable = true;
    } catch (error) {
      errors.push(`Backtest failed: ${error.message}`);
    }
  }
  
  return {
    strategyId: strategy.id,
    isBacktestable,
    errors,
    warnings,
    completeness: (5 - errors.length) / 5,
    defaultsUsed: identifyDefaultsUsed(strategy),
    backtestResults
  };
}

// Track quality metrics
async function trackStrategyQuality(strategyId: string) {
  const strategy = await getStrategy(strategyId);
  const quality = await validateStrategyQuality(strategy);
  
  await logEvent({
    event: 'strategy_quality_measured',
    data: {
      strategyId,
      isBacktestable: quality.isBacktestable,
      errorCount: quality.errors.length,
      warningCount: quality.warnings.length,
      completeness: quality.completeness,
      defaultsCount: quality.defaultsUsed.length,
      timeToComplete: strategy.createdAt - strategy.conversationStartedAt
    }
  });
  
  // Alert if quality is poor
  if (!quality.isBacktestable) {
    console.error(`Strategy ${strategyId} not backtestable:`, quality.errors);
  }
}
```

---

## Part 6: Multi-Instrument Edge Case

### The Problem

```
User: "I trade this setup on both ES and NQ"
```

**Current system:** Extracts both, breaks strategy object.

### The Solution: Multi-Strategy Creation

```typescript
function handleMultiInstrument(message: string, extractedRules: StrategyRule[]) {
  const instruments = extractAllInstruments(message);
  
  if (instruments.length > 1) {
    return {
      type: 'multi_instrument_detected',
      message: `I see you want to trade this on ${instruments.join(' and ')}.
      
Most traders create separate strategies for each instrument since 
ES and NQ have different volatility characteristics.

Want me to:
a) Create ${instruments.length} separate strategies (recommended)
b) Pick one primary instrument for now
c) Create multi-instrument strategy (advanced)

Recommendation: (a) - you can manage each independently.`,
      instruments,
      action: 'await_multi_instrument_choice'
    };
  }
  
  return null; // Single instrument, proceed normally
}

async function createMultipleStrategies(baseStrategy: Partial<Strategy>, instruments: string[]) {
  const strategies = [];
  
  for (const instrument of instruments) {
    const strategy = {
      ...baseStrategy,
      instrument,
      name: `${baseStrategy.pattern} - ${instrument}`,
      // Adjust defaults by instrument
      stop: adjustStopForInstrument(baseStrategy.stop, instrument),
      target: adjustTargetForInstrument(baseStrategy.target, instrument)
    };
    
    strategies.push(await saveStrategy(strategy));
  }
  
  return {
    message: `✓ Created ${strategies.length} strategies:
    
${strategies.map(s => `• ${s.name}`).join('\n')}

All use the same pattern with instrument-specific risk parameters.

[View All] [Backtest Both]`,
    strategies
  };
}

function adjustStopForInstrument(stop: string, instrument: string): string {
  // ES and NQ have different point values
  if (stop.includes('tick')) {
    const ticks = parseInt(stop);
    
    // If user specified ticks for one, adjust for different value
    if (instrument === 'ES' && ticks === 20) {
      // ES = $50/point, NQ = $20/point
      // 20 ticks on NQ ($400) ≈ 8 ticks on ES ($400)
      return '8 ticks';
    } else if (instrument === 'NQ' && ticks === 8) {
      return '20 ticks';
    }
  }
  
  return stop; // Keep as-is if dollar-based or structure
}
```

---

## Part 7: Cross-Message Contradiction Tracking

### The Problem

```
Message 1: "I trade NQ ORB"
Message 2: "Actually ES is better"
Message 3: "What about MNQ?"
```

User changed mind multiple times across messages.

### The Solution: Component Change Tracking

```typescript
interface ComponentHistory {
  component: string;
  changes: Array<{
    value: string;
    timestamp: Date;
    messageIndex: number;
  }>;
}

class ConversationTracker {
  private componentHistory: Map<string, ComponentHistory> = new Map();
  
  trackComponentChange(component: string, value: string, messageIndex: number) {
    if (!this.componentHistory.has(component)) {
      this.componentHistory.set(component, {
        component,
        changes: []
      });
    }
    
    const history = this.componentHistory.get(component)!;
    history.changes.push({
      value,
      timestamp: new Date(),
      messageIndex
    });
    
    // Detect indecision (3+ changes)
    if (history.changes.length >= 3) {
      return this.handleIndecision(component, history);
    }
    
    return null;
  }
  
  handleIndecision(component: string, history: ComponentHistory) {
    const values = history.changes.map(c => c.value);
    
    if (component === 'instrument') {
      return {
        message: `I notice you've mentioned ${values.join(', ')}.
        
Let me help you choose:

${this.generateInstrumentComparison(values)}

Which fits your trading style and risk tolerance best?`,
        action: 'help_decide_instrument'
      };
    }
    
    if (component === 'stop') {
      return {
        message: `You've considered several stop approaches: ${values.join(', ')}.
        
This is important - let's lock it in.

For ${this.getCurrentStrategy().pattern}, most traders use:
${this.getRecommendedStop()}

Your final choice?`,
        action: 'help_decide_stop'
      };
    }
    
    return null;
  }
  
  generateInstrumentComparison(instruments: string[]): string {
    const comparisons = {
      ES: '• ES: Slower, $50/point, more forgiving for learning',
      NQ: '• NQ: Faster, $20/point, more opportunities',
      MES: '• MES: Same as ES but 1/10 size ($5/point)',
      MNQ: '• MNQ: Same as NQ but 1/10 size ($2/point)'
    };
    
    return instruments
      .filter(i => comparisons[i])
      .map(i => comparisons[i])
      .join('\n');
  }
}
```

---

## Part 8: Default Disclosure UI Placement

### The Problem

**Where to show what was defaulted?**
- Chat message (immediate but cluttered)
- Summary panel (clean but might miss)

### The Solution: Dual Placement Strategy

**In Chat (Compact):**
```typescript
function generateCompletionMessage(strategy: Strategy, defaultsUsed: string[]) {
  const specifiedCount = 5 - defaultsUsed.length;
  
  return `✓ ${strategy.name} Complete

Your specifications: ${specifiedCount}
Standard defaults: ${defaultsUsed.length}

[View Full Strategy] [Customize Defaults] [Backtest]`;
}
```

**In Summary Panel (Detailed):**
```tsx
interface StrategyPreviewProps {
  strategy: Strategy;
  defaultsUsed: string[];
}

function StrategyPreview({ strategy, defaultsUsed }: StrategyPreviewProps) {
  const isDefaulted = (component: string) => defaultsUsed.includes(component);
  
  return (
    <div className="strategy-preview">
      <h3>✓ {strategy.name}</h3>
      
      <div className="components">
        <ComponentRow 
          label="Entry"
          value={strategy.entry}
          isDefault={isDefaulted('entry')}
          explanation={isDefaulted('entry') ? 'Standard ORB entry' : null}
        />
        
        <ComponentRow 
          label="Stop Loss"
          value={strategy.stop}
          isDefault={isDefaulted('stop')}
          explanation={isDefaulted('stop') ? '2 ATR (volatility-adjusted)' : null}
        />
        
        <ComponentRow 
          label="Target"
          value={strategy.target}
          isDefault={isDefaulted('target')}
          explanation={isDefaulted('target') ? '1:2 R:R (industry standard)' : null}
        />
        
        {/* etc */}
      </div>
      
      {defaultsUsed.length > 0 && (
        <div className="defaults-notice">
          <InfoIcon />
          <span>
            {defaultsUsed.length} component{defaultsUsed.length > 1 ? 's' : ''} using 
            professional standards. Click any ⚙ to customize.
          </span>
        </div>
      )}
    </div>
  );
}

function ComponentRow({ label, value, isDefault, explanation }) {
  const [showExplanation, setShowExplanation] = useState(false);
  
  return (
    <div className="component-row">
      <div className="component-main">
        <span className="label">{label}:</span>
        <span className="value">{value}</span>
        {isDefault && (
          <button 
            className="default-badge"
            onClick={() => setShowExplanation(!showExplanation)}
          >
            ⚙ default
          </button>
        )}
        {!isDefault && <span className="specified-badge">✓</span>}
      </div>
      
      {isDefault && showExplanation && (
        <div className="explanation">
          {explanation}
          <button onClick={() => /* open customizer */}>Change This</button>
        </div>
      )}
    </div>
  );
}
```

**Visual Example:**
```
┌────────────────────────────────────────┐
│ ✓ NQ Opening Range Breakout           │
├────────────────────────────────────────┤
│ Entry: Break above 15-min high    ✓   │
│ Stop: 20 ticks ($100)             ✓   │
│ Target: 1:2 R:R (40 ticks)        ⚙   │ ← Click to expand
│ Sizing: 1% risk per trade         ⚙   │
│ Session: NY hours (9:30-4pm)      ⚙   │
├────────────────────────────────────────┤
│ ℹ 3 components using professional      │
│   standards. Click any ⚙ to customize. │
├────────────────────────────────────────┤
│ [Backtest] [Trade Live] [Customize]   │
└────────────────────────────────────────┘
```

---

## Part 9: Implementation Checklist

### Phase 1: Edge Case Handling

- [ ] **Contradiction Detection**
  - [ ] Build detectContradictions() function
  - [ ] Handle conditional, uncertain, conflicting types
  - [ ] Test with complex user inputs

- [ ] **Improved Regex Patterns**
  - [ ] Update instrument patterns (hyphenation, spacing)
  - [ ] Update pattern detection (variations)
  - [ ] Add comprehensive test suite
  - [ ] Test with 50+ real user inputs

- [ ] **Beginner Non-Response**
  - [ ] Build template system
  - [ ] Add escape hatch for frustrated users
  - [ ] Create 3-5 beginner templates
  - [ ] Test with non-choosing users

### Phase 2: Quality & Tracking

- [ ] **Session Management**
  - [ ] Build SessionManager class
  - [ ] Implement multi-signal detection
  - [ ] Track activity types
  - [ ] Test session end triggers

- [ ] **Strategy Quality Metrics**
  - [ ] Build validation system
  - [ ] Add backtestability check
  - [ ] Track quality over time
  - [ ] Alert on poor quality

- [ ] **Multi-Instrument Handling**
  - [ ] Detect multi-instrument requests
  - [ ] Build instrument comparison
  - [ ] Create multi-strategy flow
  - [ ] Adjust defaults per instrument

### Phase 3: UX Polish

- [ ] **Cross-Message Tracking**
  - [ ] Build ComponentHistory system
  - [ ] Detect indecision patterns
  - [ ] Provide decision support
  - [ ] Test with changing inputs

- [ ] **Default Disclosure UI**
  - [ ] Design dual-placement system
  - [ ] Build expandable explanations
  - [ ] Add customization flows
  - [ ] Test visibility and clarity

---

## Part 10: Final Architecture Diagram

```
USER INPUT
    ↓
┌─────────────────────────────────────────┐
│ EXPERTISE DETECTION                     │
│ • Completeness: 0-30%, 30-70%, 70%+    │
│ • Regex pattern matching (improved)    │
│ • Multi-instrument detection           │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ CONTRADICTION DETECTION                 │
│ • Conditional: "20 ticks OR structure" │
│ • Uncertain: "maybe...actually..."     │
│ • Conflicting: "20 ticks...30 ticks"   │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ ADAPTIVE FLOW SELECTION                 │
│ • Beginner → 3 structured questions    │
│ • Intermediate → 1-2 critical questions│
│ • Advanced → Parse and confirm         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STRATEGY BUILDING                       │
│ • Component tracking (cross-message)   │
│ • Smart defaults application           │
│ • Multi-instrument handling            │
│ • Quality validation                   │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STRATEGY PREVIEW                        │
│ • Dual-placement disclosure (chat + panel)│
│ • ✓ for specified, ⚙ for defaulted    │
│ • Expandable explanations              │
│ • [Backtest] [Customize] [Trade]       │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ SESSION TRACKING                        │
│ • Multi-signal detection               │
│ • Activity monitoring                  │
│ • End-of-session insights              │
│ • Timing-based education               │
└─────────────────────────────────────────┘
```
