# PropTraderAI Contextual Smart Tools Specification
**Version 1.0 | January 2026**

---

## Executive Summary

This specification defines a system of inline, context-aware calculators and tools that appear automatically during strategy building conversations. The goal is to **eliminate token-wasting back-and-forth** by providing users with interactive tools exactly when needed, allowing them to input precise values instead of typing estimates.

### Core Principle
> **Tools appear when Claude asks the question, not when the user mentions the topic.**

Example:
```
❌ BAD: User says "I need help with position sizing" → tool appears
✅ GOOD: Claude asks "What's your risk per trade?" → tool appears
```

---

## Design Philosophy

### Alignment with PropTraderAI UX
- **Vibe-first**: Tools feel native to conversation, not "features"
- **AA Sponsor tone**: Direct, data-driven, protective
- **Zero fluff**: No explanatory text, just inputs and calculations
- **Mobile-first**: Touch-friendly, collapsible
- **Dark professional**: Match existing design system

### User Psychology
Traders are:
- Impatient (don't want to type paragraphs)
- Data-driven (trust numbers over words)
- Often on mobile (checking between trades)
- Prone to estimation errors (need precision tools)

---

## Tool Activation System

### Trigger Detection

Tools are triggered by **Claude's questions/prompts**, not user input. The backend analyzes Claude's streaming response for specific patterns.

#### Detection Patterns (Backend)

```typescript
const TOOL_TRIGGERS = {
  position_size_calculator: [
    /what'?s your risk per trade/i,
    /how much (?:are you|do you want to) risk/i,
    /risk amount/i,
    /position siz(?:e|ing)/i,
  ],
  
  contract_selector: [
    /(?:trading|trade) (?:full )?(?:NQ|ES|CL|GC) or (?:M(?:NQ|ES|CL|GC)|micro)/i,
    /which contract/i,
    /full size or micro/i,
  ],
  
  drawdown_visualizer: [
    /daily (?:loss )?limit/i,
    /max (?:daily )?drawdown/i,
    /how much can you lose/i,
  ],
  
  timeframe_helper: [
    /what time(?:s|frame)/i,
    /when (?:do you|will you) trade/i,
    /trading hours/i,
    /session/i,
  ],
  
  stop_loss_calculator: [
    /stop loss/i,
    /where'?s your stop/i,
    /how (?:big|wide) (?:is )?(?:your|the) stop/i,
  ],
};
```

### Tool Placement in Stream

Tools are injected into Claude's response using a marker system:

```
Claude's response text...

[TOOL:position_size_calculator]
{
  "accountSize": null,
  "drawdownLimit": null,
  "prefilledFromContext": {
    "accountSize": 150000,  // if mentioned earlier
    "drawdownLimit": 6000
  }
}
[/TOOL]

...Claude continues response
```

Frontend detects `[TOOL:...]` markers during streaming and renders the appropriate component inline.

---

## Tool Components

### 1. Position Size Calculator

**When it appears:**
- Claude asks: "What's your risk per trade?"
- Claude asks: "How much do you want to risk per trade?"
- During: Risk management discussion

**Purpose:**
Calculate exact risk dollar amount and contract quantities across all supported instruments.

**UI Layout:**

```
┌─────────────────────────────────────────────────┐
│ POSITION SIZE CALCULATOR                         │
├─────────────────────────────────────────────────┤
│                                                  │
│ Account Size                                     │
│ [$150,000          ] (prefilled if mentioned)    │
│                                                  │
│ Drawdown Limit                                   │
│ [$6,000            ]                             │
│                                                  │
│ Risk Per Trade                                   │
│ [▓▓▓░░░░░░░] 1.0%                               │
│ 0.5%     1%     2%     3%                        │
│ Conservative  Aggressive                         │
│                                                  │
│ ┌─────────────────────────────────────────┐     │
│ │ Risk Amount: $1,500                      │     │
│ │                                          │     │
│ │ Trades until drawdown: 4 losses          │     │
│ │ (at 100% loss per trade)                 │     │
│ └─────────────────────────────────────────┘     │
│                                                  │
│ [Use these values] [Let me type instead]         │
└─────────────────────────────────────────────────┘
```

**Inputs:**
1. **Account Size** (number input, prefilled from context)
2. **Drawdown Limit** (number input, prefilled from context)
3. **Risk Per Trade** (slider: 0.25% - 5%, default 1%)

**Calculations:**
```typescript
riskAmount = accountSize * (riskPercent / 100)
tradesUntilDrawdown = Math.floor(drawdownLimit / riskAmount)
```

**Outputs:**
- Dollar risk amount (auto-calculated, live updates)
- Trades until drawdown (protective metric)

**Validation/Warnings:**
- If risk > 2%: Show warning "⚠️ >2% is aggressive for prop trading"
- If tradesUntilDrawdown < 3: Show warning "⚠️ Very little cushion. Most traders use 0.5-1%."
- If risk > (drawdownLimit / 3): Show error "🚫 Risk too high. You'd hit drawdown in 3 losses or less."

**Interaction:**
1. User adjusts slider or types values
2. Calculations update in real-time
3. Clicks "Use these values"
4. Tool collapses to summary: "Risk: $1,500 per trade (1% of $150k)"
5. Values auto-populate in conversation context for Claude

**Mobile Considerations:**
- Slider has large touch target (48px min)
- Number inputs open numeric keyboard
- Collapsible after selection

---

### 2. Contract Selector & Quantity Calculator

**When it appears:**
- Claude asks: "Trading NQ or MNQ?"
- Claude asks: "Which contract size?"
- After position size is determined

**Purpose:**
Show which instrument/contract size fits the risk amount best, calculate exact quantities.

**UI Layout:**

```
┌─────────────────────────────────────────────────┐
│ CONTRACT SELECTOR                                │
├─────────────────────────────────────────────────┤
│ Risk per trade: $1,500                           │
│                                                  │
│ Select Instrument:                               │
│ ( ) NQ  (Mini Nasdaq)                           │
│ (•) MNQ (Micro Nasdaq)        ← RECOMMENDED     │
│ ( ) ES  (S&P 500)                               │
│ ( ) MES (Micro S&P)                             │
│ ( ) CL  (Crude Oil)                             │
│ ( ) MCL (Micro Crude)                           │
│ ( ) GC  (Gold)                                  │
│ ( ) MGC (Micro Gold)                            │
│                                                  │
│ Stop Loss (ticks/points)                         │
│ [20] ticks                                       │
│                                                  │
│ ┌─────────────────────────────────────────┐     │
│ │ MNQ:                                     │     │
│ │ • Tick value: $0.50                     │     │
│ │ • 20 tick stop = $10 risk per contract  │     │
│ │ • Contracts: 150 ($1,500 ÷ $10)         │     │
│ │                                          │     │
│ │ ⚠️ 150 contracts is high. Consider:     │     │
│ │ • Wider stop (40 ticks = 75 contracts)  │     │
│ │ • Lower risk (0.5% = 75 contracts)      │     │
│ └─────────────────────────────────────────┘     │
│                                                  │
│ [Use MNQ with 20 tick stop] [Change]             │
└─────────────────────────────────────────────────┘
```

**Instrument Data (Built-in):**

```typescript
const INSTRUMENTS = {
  NQ: {
    name: 'E-mini Nasdaq',
    tickValue: 5,
    pointValue: 20,
    typical_stop_range: [10, 30], // ticks
  },
  MNQ: {
    name: 'Micro E-mini Nasdaq',
    tickValue: 0.5,
    pointValue: 2,
    typical_stop_range: [20, 60],
  },
  ES: {
    name: 'E-mini S&P 500',
    tickValue: 12.5,
    pointValue: 50,
    typical_stop_range: [8, 20],
  },
  MES: {
    name: 'Micro E-mini S&P 500',
    tickValue: 1.25,
    pointValue: 5,
    typical_stop_range: [16, 40],
  },
  CL: {
    name: 'Crude Oil',
    tickValue: 10,
    pointValue: 1000,
    typical_stop_range: [10, 30],
  },
  MCL: {
    name: 'Micro Crude Oil',
    tickValue: 1,
    pointValue: 100,
    typical_stop_range: [20, 60],
  },
  GC: {
    name: 'Gold',
    tickValue: 10,
    pointValue: 100,
    typical_stop_range: [10, 40],
  },
  MGC: {
    name: 'Micro Gold',
    tickValue: 1,
    pointValue: 10,
    typical_stop_range: [20, 80],
  },
};
```

**Calculations:**
```typescript
riskPerContract = stopLossTicks * instrument.tickValue
contractQuantity = Math.floor(riskAmount / riskPerContract)
totalRisk = contractQuantity * riskPerContract
```

**Auto-Recommendation Logic:**
```typescript
// Recommend micro if full-size would result in <5 contracts
if (contractQuantity < 5 && hasMicroVersion) {
  recommendMicro = true;
}

// Recommend full-size if micro would result in >100 contracts
if (microContractQuantity > 100) {
  recommendFullSize = true;
}
```

**Validation/Warnings:**
- If contracts > 100: "⚠️ High contract count. Consider wider stop or lower risk."
- If contracts < 2: "⚠️ Very few contracts. Consider tighter stop or higher risk."
- If stop outside typical range: "ℹ️ Your stop is [wider/tighter] than typical for this instrument."

**Interaction:**
1. User selects instrument (or keeps recommendation)
2. User inputs stop loss size
3. Calculations update live
4. Clicks "Use [instrument]"
5. Tool collapses to: "MNQ: 75 contracts, 20-tick stop, $1,500 risk"

---

### 3. Drawdown Limit Visualizer

**When it appears:**
- Claude asks: "What's your daily limit?"
- Claude asks: "How much can you lose per day?"
- During: Challenge/firm rule discussion

**Purpose:**
Visualize daily/total drawdown limits, show "runway" remaining.

**UI Layout:**

```
┌─────────────────────────────────────────────────┐
│ DRAWDOWN LIMITS                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│ Daily Loss Limit                                 │
│ [$2,000            ]                             │
│                                                  │
│ Total Drawdown Limit (Challenge)                 │
│ [$6,000            ]                             │
│                                                  │
│ Current P&L Today: $0                            │
│ [▓▓▓▓▓▓▓▓░░] 0% of daily limit used             │
│                                                  │
│ Total Drawdown: $0                               │
│ [▓▓▓▓▓▓▓▓░░] 0% of total limit used             │
│                                                  │
│ ┌─────────────────────────────────────────┐     │
│ │ Runway Analysis:                         │     │
│ │                                          │     │
│ │ • Daily: 3 more losses before limit      │     │
│ │   (at $1,500 risk per trade)             │     │
│ │                                          │     │
│ │ • Total: 4 more losses before challenge  │     │
│ │   failure                                │     │
│ └─────────────────────────────────────────┘     │
│                                                  │
│ [Set these limits]                               │
└─────────────────────────────────────────────────┘
```

**Inputs:**
1. **Daily Loss Limit** (dollar amount)
2. **Total Drawdown Limit** (dollar amount)
3. **Current P&L Today** (defaults to $0, can be updated if continuing existing strategy)

**Calculations:**
```typescript
dailyLimitRemaining = dailyLimit - Math.abs(currentPnL)
totalDrawdownRemaining = totalDrawdown - Math.abs(cumulativeLosses)

tradesRemainingDaily = Math.floor(dailyLimitRemaining / riskPerTrade)
tradesRemainingTotal = Math.floor(totalDrawdownRemaining / riskPerTrade)
```

**Visual Elements:**
- Progress bars (green → yellow → red as limits approach)
- Color coding:
  - 0-50% used: Green `#00ff41`
  - 50-75% used: Yellow `#ffd700`
  - 75-90% used: Orange `#ff8c00`
  - 90-100% used: Red `#b5323d`

**Warnings:**
- If daily limit < (3 × riskPerTrade): "⚠️ Very tight daily limit. Consider lower risk per trade."
- If total drawdown < (5 × riskPerTrade): "⚠️ Total drawdown only allows 4-5 losses. Risky."

---

### 4. Stop Loss Calculator

**When it appears:**
- Claude asks: "What's your stop loss?"
- Claude asks: "Where do you place your stop?"
- During: Entry/exit rule discussion

**Purpose:**
Convert between ticks, points, dollars, and ATR multipliers.

**UI Layout:**

```
┌─────────────────────────────────────────────────┐
│ STOP LOSS CALCULATOR                             │
├─────────────────────────────────────────────────┤
│ Instrument: MNQ                                  │
│                                                  │
│ Stop Loss Size:                                  │
│ ( ) Fixed Ticks:  [20] ticks = $10 risk         │
│ (•) ATR Multiple: [1.5] × ATR                    │
│ ( ) Dollar Amount: [$10] per contract            │
│                                                  │
│ Average ATR (last 14 bars): 13.2 ticks           │
│                                                  │
│ ┌─────────────────────────────────────────┐     │
│ │ Your Stop:                               │     │
│ │ • 1.5 × 13.2 = 19.8 ticks (~20 ticks)   │     │
│ │ • Risk per contract: $10                │     │
│ │ • With 150 contracts: $1,500 total risk │     │
│ └─────────────────────────────────────────┘     │
│                                                  │
│ [Use this stop]                                  │
└─────────────────────────────────────────────────┘
```

**Inputs:**
1. **Stop type** (radio: Fixed Ticks, ATR Multiple, Dollar Amount)
2. **Value** (depends on type selected)
3. **Average ATR** (optional, defaults to typical for instrument)

**Calculations:**
```typescript
if (stopType === 'atr') {
  stopTicks = atrMultiple * avgATR;
}
riskPerContract = stopTicks * instrument.tickValue;
totalRisk = contractQuantity * riskPerContract;
```

**Auto-Suggestions:**
- Based on instrument volatility
- "Typical for MNQ: 15-25 ticks (1-2 ATR)"

---

### 5. Timeframe Helper

**When it appears:**
- Claude asks: "What times do you trade?"
- Claude asks: "What's your session?"
- During: Trading hours discussion

**Purpose:**
Quick timezone-aware time selection, visualize market hours.

**UI Layout:**

```
┌─────────────────────────────────────────────────┐
│ TRADING HOURS                                    │
├─────────────────────────────────────────────────┤
│                                                  │
│ Your Timezone:                                   │
│ [Eastern (ET) ▼]                                │
│                                                  │
│ Market Sessions (in ET):                         │
│ ┌─────────────────────────────────────────┐     │
│ │         6am   9am   12pm   3pm   6pm     │     │
│ │ ┌─────┬─────┬─────┬─────┬─────┬─────┐   │     │
│ │ │ Pre │ Reg │     │     │After│     │   │     │
│ │ └─────┴─────┴─────┴─────┴─────┴─────┘   │     │
│ │   [▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░]                │     │
│ │   Your Selection: 8:30 AM - 11:00 AM     │     │
│ └─────────────────────────────────────────┘     │
│                                                  │
│ Or select preset:                                │
│ ( ) Opening Range (9:30-10:30 AM ET)            │
│ (•) Morning Session (8:30 AM - 12:00 PM ET)     │
│ ( ) Afternoon Session (12:00-4:00 PM ET)        │
│ ( ) Custom Range                                 │
│                                                  │
│ Days:                                            │
│ [✓] Mon [✓] Tue [✓] Wed [✓] Thu [✓] Fri        │
│ [ ] Sat [ ] Sun                                  │
│                                                  │
│ [Set trading hours]                              │
└─────────────────────────────────────────────────┘
```

**Features:**
- Visual timeline with market session overlays
- Timezone conversion (auto-detect from profile or browser)
- Quick presets for common sessions
- Drag-to-select time range on visual timeline

**Outputs:**
- Start time (ET and user's timezone)
- End time (ET and user's timezone)
- Days of week
- Collapsed summary: "Mon-Fri, 8:30 AM - 12:00 PM ET"

---

## Technical Implementation

### Frontend Components

**File Structure:**
```
src/components/chat/SmartTools/
├── index.tsx                    // ToolsManager component
├── ToolWrapper.tsx              // Wrapper with collapse/expand
├── PositionSizeCalculator.tsx
├── ContractSelector.tsx
├── DrawdownVisualizer.tsx
├── StopLossCalculator.tsx
├── TimeframeHelper.tsx
└── types.ts                     // Shared types
```

**ToolsManager Component:**

```typescript
interface Tool {
  type: string;
  config: Record<string, any>;
  prefilledData?: Record<string, any>;
}

interface ToolsManagerProps {
  tool: Tool;
  onComplete: (values: Record<string, any>) => void;
  onDismiss: () => void;
}

export function ToolsManager({ tool, onComplete, onDismiss }: ToolsManagerProps) {
  // Route to appropriate tool component
  switch (tool.type) {
    case 'position_size_calculator':
      return <PositionSizeCalculator {...tool} onComplete={onComplete} />;
    case 'contract_selector':
      return <ContractSelector {...tool} onComplete={onComplete} />;
    // ... etc
  }
}
```

**Integration with ChatMessageList:**

```typescript
// In ChatMessageList.tsx, parse messages for tool markers
const parseMessageContent = (content: string) => {
  const parts = content.split(/\[TOOL:(\w+)\](.*?)\[\/TOOL\]/gs);
  
  return parts.map((part, i) => {
    if (i % 3 === 1) {
      // This is a tool type
      const toolType = part;
      const toolConfig = JSON.parse(parts[i + 1]);
      
      return (
        <ToolsManager
          tool={{ type: toolType, config: toolConfig }}
          onComplete={(values) => handleToolComplete(toolType, values)}
          onDismiss={() => handleToolDismiss(toolType)}
        />
      );
    } else if (i % 3 === 0) {
      // Regular text
      return <MarkdownContent content={part} />;
    }
  });
};
```

### Backend Tool Injection

**API Route: `/api/strategy/parse-stream`**

```typescript
// After generating Claude's response chunk
const responseText = chunk.text;

// Detect tool triggers
const toolToInject = detectToolTrigger(responseText, conversationContext);

if (toolToInject) {
  // Inject tool marker into stream
  const toolMarker = `\n\n[TOOL:${toolToInject.type}]\n${JSON.stringify(toolToInject.config)}\n[/TOOL]\n\n`;
  
  // Send to client
  res.write(`data: ${JSON.stringify({ 
    type: 'text', 
    content: toolMarker 
  })}\n\n`);
}
```

**Tool Detection Logic:**

```typescript
function detectToolTrigger(
  responseText: string, 
  context: ConversationContext
): Tool | null {
  
  // Position size calculator
  if (/what'?s your risk per trade/i.test(responseText)) {
    return {
      type: 'position_size_calculator',
      config: {},
      prefilledData: {
        accountSize: context.extractedData.accountSize,
        drawdownLimit: context.extractedData.drawdownLimit,
      },
    };
  }
  
  // Contract selector (only if risk amount is known)
  if (/trading (?:full )?NQ or MNQ/i.test(responseText) && context.riskAmount) {
    return {
      type: 'contract_selector',
      config: { riskAmount: context.riskAmount },
      prefilledData: {
        stopLossTicks: context.extractedData.stopLoss,
      },
    };
  }
  
  // ... other tools
  
  return null;
}
```

**Context Tracking:**

```typescript
// Track extracted data from conversation
interface ConversationContext {
  extractedData: {
    accountSize?: number;
    drawdownLimit?: number;
    dailyLimit?: number;
    riskPercent?: number;
    riskAmount?: number;
    stopLoss?: number;
    instrument?: string;
    timezone?: string;
  };
  toolsShown: string[]; // Don't show same tool twice
}

// Update context as conversation progresses
function updateContext(
  context: ConversationContext,
  userMessage: string
): ConversationContext {
  
  // Extract numbers mentioned in conversation
  const accountSizeMatch = userMessage.match(/\$?([\d,]+)(?:k|\s+thousand)?\s+account/i);
  if (accountSizeMatch) {
    context.extractedData.accountSize = parseNumber(accountSizeMatch[1]);
  }
  
  // ... extract other values
  
  return context;
}
```

### Sending Tool Values Back to Conversation

When user completes a tool:

```typescript
// Frontend: User clicks "Use these values"
function handleToolComplete(toolType: string, values: Record<string, any>) {
  // Send values as hidden message to continue conversation
  fetch('/api/strategy/parse-stream', {
    method: 'POST',
    body: JSON.stringify({
      message: `[TOOL_RESPONSE:${toolType}] ${JSON.stringify(values)}`,
      conversationId,
    }),
  });
}
```

Backend processes tool response:

```typescript
// Backend detects tool response
if (message.startsWith('[TOOL_RESPONSE:')) {
  const [_, toolType, valuesJson] = message.match(/\[TOOL_RESPONSE:(\w+)\] (.*)/);
  const values = JSON.parse(valuesJson);
  
  // Add to context
  conversationContext.extractedData = {
    ...conversationContext.extractedData,
    ...values,
  };
  
  // Inform Claude
  systemPrompt += `\n\nUser selected from ${toolType}:\n${formatToolValues(values)}`;
  
  // Claude continues naturally: "Got it. 1% risk ($1,500 per trade)..."
}
```

---

## Design Specifications

### Visual Design

**Color Palette (from existing design system):**
```css
--background: #000000;
--surface: #0a0a0a;
--border: rgba(255, 255, 255, 0.1);
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.85);
--text-muted: rgba(255, 255, 255, 0.5);
--accent-green: #00ff41;
--accent-red: #b5323d;
--warning-yellow: #ffd700;
--warning-orange: #ff8c00;
```

**Typography:**
```css
--font-mono: 'JetBrains Mono', monospace;
--font-sans: system-ui, -apple-system, sans-serif;

Tool titles: 11px, uppercase, tracking-wide, text-muted
Input labels: 13px, text-secondary
Values/outputs: 15px, font-mono, text-primary
Warnings: 12px, text-warning
```

**Spacing:**
```css
Tool padding: 16px
Input spacing: 12px vertical gap
Button padding: 12px 24px
Mobile touch targets: min 48px height
```

**Animation:**
```css
Tool expansion: 200ms ease-out
Value updates: no animation (instant feedback)
Slider: 100ms ease for smooth dragging
```

### Component States

**Default State:**
```
┌─────────────────────────────┐
│ TOOL NAME                    │
├─────────────────────────────┤
│ [inputs and outputs]         │
│ [Use these values]           │
└─────────────────────────────┘
```

**Collapsed State (after use):**
```
┌─────────────────────────────┐
│ ▼ TOOL NAME                  │
│   Summary: Risk $1,500 (1%)  │
└─────────────────────────────┘
```
(Click to re-expand and edit)

**Error State:**
```
┌─────────────────────────────┐
│ TOOL NAME                    │
├─────────────────────────────┤
│ Account Size                 │
│ [Invalid] ← red border       │
│ ⚠️ Enter valid number        │
└─────────────────────────────┘
```

### Mobile Optimizations

**Responsive Breakpoints:**
```typescript
const BREAKPOINTS = {
  mobile: '< 768px',
  tablet: '768px - 1024px',
  desktop: '> 1024px',
};
```

**Mobile-Specific Changes:**
- Stack inputs vertically (no side-by-side)
- Larger touch targets (48px min)
- Numeric keyboard for number inputs
- Simplified slider with larger thumb
- Collapsible by default (expand to interact)
- Sticky "Use values" button at bottom

**Example Mobile Layout:**
```
Mobile (< 768px):
┌─────────────────┐
│ POSITION CALC   │
├─────────────────┤
│ Account         │
│ [150000      ]  │
│                 │
│ Drawdown        │
│ [6000        ]  │
│                 │
│ Risk %          │
│ [▓▓░░░░░] 1%   │
│                 │
│ ┌─────────────┐ │
│ │ $1,500      │ │
│ │ 4 trades    │ │
│ └─────────────┘ │
│                 │
│ [Use values  ]  │ ← sticky
└─────────────────┘
```

---

## Behavioral Analytics (PATH 2)

### Tool Usage Tracking

Every tool interaction should log to `behavioral_events` table:

```typescript
// When tool is shown
await logBehavioralEvent(userId, 'tool_shown', {
  toolType: 'position_size_calculator',
  conversationId,
  messageIndex,
  triggerPattern: 'risk_per_trade_question',
});

// When user interacts with tool
await logBehavioralEvent(userId, 'tool_interaction', {
  toolType: 'position_size_calculator',
  action: 'slider_moved',
  fromValue: 0.5,
  toValue: 1.0,
  conversationId,
});

// When user completes tool
await logBehavioralEvent(userId, 'tool_completed', {
  toolType: 'position_size_calculator',
  values: {
    accountSize: 150000,
    riskPercent: 1.0,
    riskAmount: 1500,
  },
  timeSpent: 12, // seconds
  conversationId,
});

// When user dismisses without completing
await logBehavioralEvent(userId, 'tool_dismissed', {
  toolType: 'position_size_calculator',
  reason: 'clicked_type_instead',
  conversationId,
});
```

**Analytics Questions to Answer:**
1. Which tools reduce back-and-forth the most?
2. Do users prefer tools or typing?
3. Which tools cause confusion (dismissals)?
4. Average time saved per tool usage
5. Error patterns (what inputs cause validation warnings?)

---

## Edge Cases & Fallbacks

### Tool Trigger Failures

**Problem:** Claude asks about risk, but detection fails
**Solution:** User can manually type values. No breaking.

**Problem:** Tool shows at wrong time
**Solution:** User can dismiss with "Let me type instead"

### Conflicting Context

**Problem:** User mentioned $100k earlier, now says $150k
**Solution:** Use most recent value, show: "(Updated from $100k)"

### Incomplete Tool Usage

**Problem:** User starts filling tool, then types message instead
**Solution:** Tool collapses to "Partially filled" state, values saved in context

### Mobile Performance

**Problem:** Complex calculations lag on slider drag
**Solution:** Debounce calculations by 100ms, show spinner for >200ms delays

---

## Success Metrics

### Token Savings
**Current flow:**
```
User: "I have 150k account, 6k drawdown"
Claude: "What's your risk per trade?"
User: "5% of account"
Claude: "That's aggressive. 5% is $7,500..."
User: "You're right. What do you suggest?"
Claude: "With 150k and 6k drawdown, try 1.25%..."
User: "Let's do 1%"
Claude: "1% is $1,500..."
```
**Tokens used:** ~350 tokens (6 messages)

**New flow:**
```
User: "I have 150k account, 6k drawdown"
Claude: "Let's dial in your risk."
[Tool renders with prefilled 150k, 6k]
User: [adjusts slider to 1%]
Claude: "1% gives you breathing room. $1,500 per trade."
```
**Tokens used:** ~80 tokens (2 messages)

**Target:** 70% reduction in tokens for calculator-style questions

### User Satisfaction
- Completion rate: >90% (users complete strategy without abandoning)
- Tool usage rate: >60% (when tool appears, user uses it vs typing)
- Time to complete strategy: <5 minutes (vs 10+ minutes with all Q&A)

### Behavioral Insights
- Correlation: Tool usage → higher strategy completion
- Pattern: Users who use Position Calculator → more likely to complete entire strategy
- Risk taking: Average risk % selected in tool vs manually typed

---

## Future Enhancements (Post-MVP)

### Smart Presets
- "NQ scalper preset" (0.5% risk, 10-tick stops, micro contracts)
- "ES swing trader preset" (1% risk, 30-tick stops, full contracts)
- Learn from user's previous strategies

### AI Suggestions Within Tools
```
┌─────────────────────────────┐
│ POSITION SIZE CALCULATOR     │
├─────────────────────────────┤
│ Risk: 2.5%                   │
│                              │
│ 💡 AI Suggestion:            │
│ Based on 1,247 similar       │
│ traders, 1% risk has 73%     │
│ success rate vs 2.5% at 31%  │
│ [Use 1% instead]             │
└─────────────────────────────┘
```

### Multi-Step Calculators
- Combined position size + contract selector in one flow
- "Wizard mode" that walks through all calculations

### Historical Data Integration
- "Your last strategy used 1% risk. Use same?"
- Show user's typical risk tolerance from past strategies

---

## Appendix: Complete Example Flow

**User starts conversation:**

```
User: "I want to build a strategy for trading the Nasdaq. I have 
a $150k account with a $6,000 max drawdown limit."

Claude: "Got it. Let's build your NQ strategy. First, let's nail 
down your risk management."

[No tool yet - just acknowledgment]
```

**Claude asks about risk:**

```
Claude: "What's your risk per trade?"

[TOOL:position_size_calculator]
{
  "prefilledData": {
    "accountSize": 150000,
    "drawdownLimit": 6000
  }
}
[/TOOL]
```

**Tool renders:**
```
┌──────────────────────────────┐
│ POSITION SIZE CALCULATOR      │
├──────────────────────────────┤
│ Account: $150,000             │
│ Drawdown: $6,000              │
│ Risk: [▓▓░░░] 1.0%           │
│                               │
│ Risk Amount: $1,500           │
│ Trades until drawdown: 4      │
│                               │
│ [Use these values]            │
└──────────────────────────────┘
```

**User adjusts slider to 1%, clicks "Use these values"**

**Tool collapses:**
```
┌──────────────────────────────┐
│ ▼ Risk: $1,500 per trade (1%) │
└──────────────────────────────┘
```

**Claude continues:**
```
Claude: "Solid. 1% gives you breathing room. Now, are you trading 
full NQ or MNQ (micros)?"

[TOOL:contract_selector]
{
  "prefilledData": {
    "riskAmount": 1500
  }
}
[/TOOL]
```

**Contract selector renders with recommendation...**

**And so on.**

Total messages: **3-4** instead of **8-10**
Total tokens saved: **~250 tokens (70% reduction)**
Time saved: **~3 minutes**
User clarity: **Higher** (visual tools vs mental math)

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Tool detection system (backend)
- [ ] Tool marker parsing (frontend)
- [ ] ToolsManager component
- [ ] ToolWrapper component (expand/collapse)
- [ ] Context tracking system
- [ ] Tool response handling

### Phase 2: Essential Tools
- [ ] Position Size Calculator
- [ ] Contract Selector
- [ ] Drawdown Visualizer

### Phase 3: Advanced Tools
- [ ] Stop Loss Calculator
- [ ] Timeframe Helper

### Phase 4: Polish
- [ ] Mobile responsive design
- [ ] Error handling & validation
- [ ] Behavioral analytics logging
- [ ] Performance optimization

### Phase 5: Testing
- [ ] Unit tests for calculations
- [ ] Integration tests for tool triggering
- [ ] User testing with real traders
- [ ] Token savings measurement

---

## Questions for Engineering Review

1. **SSE Compatibility:** Tool markers in streaming response - any issues with existing SSE setup?
2. **State Management:** Should tool values live in ChatInterface state or separate context?
3. **Prefill Logic:** Best way to extract values from conversation history?
4. **Mobile Testing:** Target devices for responsive testing?
5. **Analytics Schema:** Additional fields needed in behavioral_events?

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Ready for Implementation  
**Estimated Dev Time:** 2-3 weeks (Phase 1-3)

