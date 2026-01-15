# GitHub Copilot Instructions for PropTraderAI

**Last Updated:** January 8, 2026  
**Version:** 1.1

---

## 🎯 Project Mission

PropTraderAI is a natural language trading automation platform for prop traders that **executes strategies perfectly, learns behavioral patterns, and prevents self-sabotage**. We are building the "Cursor for traders" — transforming plain English into flawless execution.

### The Core Insight

> **PATH 2 (Behavioral Intelligence) is our actual product. PATH 1 (Execution) is just the delivery mechanism.**

### The Marketing Reality

**We sell:** Passing challenges and getting funded (RESULTS)  
**We deliver:** Behavioral intelligence that prevents self-sabotage (MECHANISM)

PATH 2 is our moat, NOT our headline. Sell the outcome, deliver the mechanism.

---

## 🧭 Strategic Framework: The Three Paths

Every feature, file, and function must align with one of these three paths:

| Path | Purpose | Our Role | Priority |
|------|---------|----------|----------|
| **PATH 1: Execution Engine** | Natural language → AI executes trades | Delivery mechanism | Phase 1A/1B |
| **PATH 2: Behavioral Intelligence** | Learn patterns, prevent tilt, protect traders | **THE ACTUAL PRODUCT** | Start Day 1 |
| **PATH 3: Platform Infrastructure** | MCP servers, APIs, white-label | Growth multiplier | Phase 3+ |

### Decision Filter

Before implementing ANY feature, ask:

> **"Does this help us collect more behavioral data faster?"**

If yes → prioritize. If no → defer unless critical for PATH 1.

---

## 🎨 UX Philosophy: "Vibe-First, Power Later, Platform Last"

### Phase 1: Vibe-Only Consumer App (NOW)

**Philosophy:** Aggressively vibe. Hide everything. One thing at a time.

#### Critical Day 1 Reality

**Traders don't have weeks to build trust.** They:
- Sign up for prop firm
- Get challenge account
- Start trading SAME DAY
- Often blow account in HOURS

**Implication:** Can't wait until "Week 3" to show protection value. Must show value immediately.

**Solution:** Show "what we protect against" on Day 1, then switch to results ("$X saved") once they have trading data.

#### What We Show
- ✅ ONE hero element per screen (P&L OR challenge status OR protection)
- ✅ Everything else scrolls below (secondary, tertiary)
- ✅ Challenge progress (simple progress bars)
- ✅ AI status ("We're watching the market for you")
- ✅ Protection value framed as $ SAVED, not "discipline metrics"
- ✅ Day 1: What we protect against (daily loss limit, revenge trades, oversizing, bad setups)
- ✅ After trades: Results ($X protected, Y bad setups caught)

#### What We Hide (Until Phase 2+)
- ❌ Parsed strategy logic
- ❌ Technical indicators
- ❌ Order flow details
- ❌ WebSocket status
- ❌ Anything that looks like code
- ❌ "Advanced Mode" (comes in Phase 2)
- ❌ Multi-metric cards (Phase 1 = one metric per card)

#### Target User for Phase 1
Traders who fail challenges due to **emotions**, not strategy. They:
- Have failed 2+ prop challenges
- Know what they should do but can't stop themselves
- Will never learn Pine Script
- Need protection from themselves
- **Will blow account on Day 1 if we don't intervene**

### Code Generation Rules

#### UI/UX Rules
1. **One thing at a time** — ONE hero card, everything else scrolls
2. **Default to hiding complexity** — If in doubt, don't show it
3. **Mobile-first always** — Desktop is secondary
4. **Frame protection as $ saved** — Not discipline, not willpower, MONEY
5. **No technical jargon** — "Your strategy" not "Your parsed rule set"
6. **Day 1 messaging** — Show value immediately, not after weeks

#### Copy/Messaging Guidelines

**Context matters:**

| Context | Voice | Examples |
|---------|-------|----------|
| **Landing page** | Confident, outcome-focused, validates trader | "Your strategy is good. Your execution isn't. We fix that." |
| **Dashboard** | Direct, protective, data-as-mirror | "This setup doesn't match your winning patterns" |
| **Real-time intervention** | AA sponsor voice (Phase 2) | "This looks like revenge. 2x size, 4 min after loss." |

**Universal translations:**

| ❌ Instead of... | ✅ Say... |
|-----------------|----------|
| "Strategy parsed successfully" | "Got it. We'll watch for your setup." |
| "WebSocket connection established" | "Connected to your account" |
| "Tilt score: 72%" | "You might be trading emotionally right now" |
| "Daily loss limit: 78% utilized" | "You're close to your daily limit" |
| "Execution engine active" | "We're watching the market for you" |
| "Discipline streak: 4 days" | "$1,840 protected this week" |
| "Trades NOT taken: 3" | "3 bad setups caught before they cost you" |

---

## 🧠 Trader Psychology & Voice

> **Core Insight:** PropTraderAI is not Headspace for traders. It's **AA sponsor meets sports psychologist meets risk manager**.

### Understanding the Trader Brain

**The Emotional Spiral:**
```
Loss → Pain (2x stronger than win pleasure)
  → Fear/Anger/Frustration
    → "I need to make it back"
      → Revenge trade (bigger size, worse setup)
        → Bigger loss
          → Tilt (subconscious takes over)
            → Challenge blown
```

**The 5-10 Second Window:**
```
Loss happens
  → [5-10 SECOND WINDOW] ← THIS IS WHERE YOU INTERVENE
    → Emotional response builds
      → Point of no return
```

### Voice & Tone: "Protective but Respectful"

**We are NOT:**
- ❌ Gentle wellness app ("You might want to take a break? 🧘")
- ❌ Playful gamification ("Great job! 🎉")
- ❌ Judgmental parent ("You're being irresponsible!")

**We ARE:**
- ✅ Experienced trader who's been through it
- ✅ Sponsor who tells you the truth without shame
- ✅ Protective system that physically stops you when needed
- ✅ Data mirror showing patterns without judgment

### Correct Messaging by Situation

| Situation | ❌ Generic App | ✅ PropTraderAI |
|-----------|---------------|----------------|
| **Approaching daily limit** | "You're getting close to your limit 😊" | "87% of daily limit used. One more loss and you're done for the day." |
| **Revenge trade detected** | "Are you sure about this trade?" | "This looks like revenge. Same direction, 2x size, 4 minutes after loss. Your call — but I'm logging this." |
| **Win streak** | "Amazing! You're on fire! 🔥" | "5 wins straight. This is when most traders blow it. Stick to your sizing." |
| **Challenge passed** | "Congratulations!!! 🎉🎉🎉" | "Challenge passed. 23 days. 47 trades. 3 near-violations prevented. You did the work." |
| **Pattern detected** | "You might be stressed..." | "Trades after 2pm: -$3,400. Your win rate drops 40% in afternoon sessions." |
| **Forcing trades** | "Maybe wait for a better setup?" | "No setup in 45 minutes. Boredom trading detected. Last 3 times: -$890 total." |

### The Three Rules for All Copy

1. **Direct, not gentle** — Clear statements, not soft suggestions
2. **Data as mirror** — Show patterns without judgment  
3. **Respect the struggle** — Validate that this is hard, don't shame

---

## 🏗️ Technical Architecture

### Technology Stack

```yaml
Frontend:
  - Next.js 14 (App Router)
  - React + TypeScript
  - Tailwind CSS
  - PWA capabilities

Backend:
  - Next.js API Routes (serverless)
  - Supabase (PostgreSQL + Auth + RLS)
  - Node.js execution server (Phase 1B)

AI:
  - Claude 3.5 Sonnet (Anthropic)
  - Natural language parsing
  - Vision API for chart analysis

External APIs:
  - Tradovate (broker integration)
  - WebSocket for real-time data (Phase 1B)

Hosting:
  - Vercel (web app)
  - Railway/Fly.io (execution server - Phase 1B)
```

### Database Schema Priorities

#### Critical Tables (Build First)

**users** - Authentication and profile
**strategies** - User strategies and parsed rules
**trades** - Trade history from Tradovate
**challenges** - Challenge tracking and compliance
**behavioral_data** - **START LOGGING FROM DAY 1** (see PATH 2 section)

#### Key Fields to Remember

**strategies.parsed_rules** (JSONB):
```json
{
  "entry_conditions": [{"indicator": "EMA", "period": 20}],
  "exit_conditions": [{"type": "stop_loss", "value": 20}],
  "filters": [{"type": "time_window", "start": "09:30"}],
  "position_sizing": {"method": "risk_percent", "value": 1}
}
```

**strategies.autonomy_level** (ENUM):
- `copilot` - User approval required (Phase 1A)
- `autopilot` - Autonomous execution (Phase 1B)

---

## 🧩 Claude Skills Integration (Extracted Utilities)

### Current Implementation (Phase 1A)

**Strategy:** Extracted valuable utilities from Claude Skills bundle WITHOUT replacing existing `/chat` system.

**What We Did:**
1. ✅ Copied firm rules JSON files to `src/lib/firm-rules/data/`
2. ✅ Created `src/lib/firm-rules/loader.ts` - Static firm rules loader
3. ✅ Created `src/lib/utils/timezone.ts` - Timezone conversion utilities
4. ✅ Created `src/app/api/strategy/validate-firm-rules/route.ts` - Post-parsing validation

**What We Did NOT Do:**
- ❌ Replace existing `/chat` Socratic dialogue system
- ❌ Use Anthropic Skills API in current flow (too expensive, less control)
- ❌ Modify `src/lib/claude/client.ts` parseStrategy function

### Firm Rules Validation Flow

**AFTER strategy is parsed, validate against prop firm rules:**

```typescript
// In your chat completion handler (after Claude returns parsedRules)
const response = await fetch('/api/strategy/validate-firm-rules', {
  method: 'POST',
  body: JSON.stringify({
    firmName: 'topstep',
    accountSize: 50000,
    parsedRules: strategyData.parsedRules,
    instrument: strategyData.instrument
  })
});

const validation = await response.json();
// validation.isValid, validation.warnings, validation.firmRules
```

**Supported Firms:**
- `topstep` - Most established, TopstepX API
- `myfundedfutures` - Updated July 2025 automation allowed
- `tradeify` - One-time fee, ownership verification
- `alpha-futures` - Allows bots/EAs
- `ftmo` - Largest international
- `fundednext` - Multiple challenge types

### Timezone Conversion Usage

```typescript
import { parseTimezone, convertToExchangeTime } from '@/lib/utils/timezone';

// User says "I trade 9:30 AM to 11:30 AM Pacific Time"
const timezone = parseTimezone('PT'); // Returns 'America/Los_Angeles'
const converted = convertToExchangeTime('09:30', timezone);
// Returns { exchangeTime: '11:30', timezone: 'America/Chicago' }
```

### Future Use: Skills API (PATH 3)

**When to activate Skills API:**
1. **Public API** - External developers pay for domain knowledge access
2. **MCP Server** - Fallback firm rules when database unavailable
3. **White-label** - Partners use our Skills bundle

**Environment Variables:**
```bash
PROPTRADERAI_SKILL_ID=  # Populated after upload to Anthropic
PROPTRADERAI_SKILL_VERSION=latest
```

**Skills Bundle Location:**
`docs/Claude_Skills/proptraderai-strategy-builder/`

**Do NOT use Skills API in Phase 1A** - utilities already extracted as static code.

---

## 📊 PATH 2: Behavioral Data Collection (CRITICAL)

### Start Logging From Day 1

Even though ML models come later, **data collection starts immediately**.

#### Event Types to Log

Create a helper function `logBehavioralEvent()` and call it everywhere:

```typescript
// lib/behavioral/logger.ts
export async function logBehavioralEvent(
  userId: string,
  eventType: string,
  eventData: object,
  challengeStatus?: object,
  sessionContext?: object
) {
  await supabase.from('behavioral_data').insert({
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
    challenge_status: challengeStatus,
    session_context: sessionContext,
    timestamp: new Date().toISOString()
  });
}
```

#### Events to Capture

| Event Type | When to Log | Priority |
|------------|-------------|----------|
| `trade_executed` | Every trade synced from Tradovate | 🔴 Critical |
| `screenshot_analyzed` | Vision AI analysis completed | 🟡 Medium |
| `pre_trade_check` | User validates position size | 🔴 Critical |
| `near_violation` | >70% of daily/drawdown limit | 🔴 Critical |
| `violation_prevented` | AI stopped user from failing | 🔴 Critical |
| `alert_dismissed` | User ignored warning | 🟡 Medium |
| `tilt_signal_detected` | Multiple tilt indicators present | 🔴 Critical |
| `revenge_trade_detected` | Trade <10min after loss + bigger size | 🔴 Critical |
| `session_start` | App opened or first interaction | 🟢 Nice to have |
| `session_end` | App closed or 30min inactivity | 🟢 Nice to have |

#### Tilt Detection (Rule-Based, Phase 2)

Implement this scoring system when building tilt features:

```typescript
// lib/behavioral/tilt.ts
export function calculateTiltScore(
  timeSinceLastLoss: number,        // minutes
  positionSizeVsAverage: number,    // percentage
  directionFlipAfterLoss: boolean,
  recentMessages: number,           // count in last 5 min
  warningsRejected: number,         // today
  lossesToday: number,
  sessionDuration: number           // hours
): number {
  let score = 0;
  
  if (timeSinceLastLoss < 10) score += 25;
  if (positionSizeVsAverage > 150) score += 20;
  if (directionFlipAfterLoss) score += 15;
  if (recentMessages > 5) score += 15;
  if (warningsRejected > 0) score += 10;
  if (lossesToday > 2) score += 10;
  if (sessionDuration > 4) score += 5;
  
  return score;
}

// Action thresholds:
// > 50% = Warning
// > 70% = Critical alert
// > 85% = Automatic pause (Autopilot only)
```

---

## 🎨 Design System: "Vibe-First Simplicity" (Phase 1)

> **Note:** Full design system evolves across phases. Phase 1 = Notion-like simplicity. Phase 2 = Stripe professional. Phase 3 = Terminal luxe. See `design.md` for complete details.

### Color Palette

```css
/* Base - Terminal Black */
--bg-primary: #0a0e14;      /* Canvas */
--bg-secondary: #12171f;    /* Cards */
--bg-tertiary: #1a2029;     /* Elevated */

/* Borders - Subtle Containment */
--border-subtle: #1f2633;
--border-default: #2d3544;
--border-strong: #3d4555;

/* Text - Hierarchy */
--text-primary: #e6e8eb;    /* Headlines */
--text-secondary: #b8bcc2;  /* Body */
--text-tertiary: #6c7280;   /* Labels */

/* Trading - Universal Standards */
--profit: #10b981;          /* Green (ONLY for profit) */
--loss: #ef4444;            /* Red (ONLY for loss) */
--neutral: #6366f1;         /* Indigo (actions, links) */

/* Status */
--warning: #f59e0b;         /* Amber */
--danger: #dc2626;          /* Red */
--success: #10b981;         /* Green */
```

### Typography (Phase 1 Focus)

```css
/* Font Stack */
font-family: 'Inter', system-ui, sans-serif;      /* UI (Use everywhere) */
font-family: 'JetBrains Mono', monospace;         /* P&L Numbers ONLY in Phase 1 */

/* Scale */
--text-xs: 0.75rem;    /* 12px - Labels */
--text-sm: 0.875rem;   /* 14px - Body */
--text-base: 1rem;     /* 16px - Default */
--text-lg: 1.125rem;   /* 18px - Subheadings */
--text-xl: 1.25rem;    /* 20px - Headings */
--text-2xl: 1.5rem;    /* 24px - Page titles */
```

### Component Patterns (Phase 1)

#### Simple Cards (One Metric Each)
```tsx
// Phase 1: Simple, one thing at a time
<div className="bg-secondary border border-default rounded-lg p-6 space-y-2">
  <p className="text-sm text-secondary">Today's Performance</p>
  <p className="font-mono text-3xl text-profit">$2,450</p>
  <p className="text-sm text-tertiary">12.4% gain</p>
</div>

// Phase 2+ only: Multi-metric cards
// (Don't build this in Phase 1)
```

#### Buttons
```tsx
// Primary action
<button className="bg-neutral text-white px-4 py-2 rounded-md hover:opacity-90">
  Connect Tradovate
</button>

// Destructivemonospace for P&L only)
```tsx
// Phase 1: Monospace ONLY for money
<div className="font-mono text-profit text-2xl">
  $2,450.00
</div>

// Everything else uses Inter
<p className="text-base text-primary">
  You're close to your daily limit
</p

#### Data Display (use monospace)
```tsx
<div className="font-mono text-profit text-2xl">
  $2,450.00
</div>
```

---

## 🚀 Development Phases & Feature Flags

Use feature flags to control what's visible:

```typescript
// config/features.ts
export const FEATURES = {
  // Phase 1A (NOW)
  natural_language_strategy: true,
  tradovate_oauth: true,
  challenge_tracking: true,
  copilot_mode: true,
  
  // Phase 1B (Weeks 5-8)
  autopilot_mode: false,
  websocket_monitoring: false,
  
  // Phase 2 (Weeks 9-16)
  advanced_mode: false,
  parsed_logic_view: false,
  tilt_alerts: false,  // Start with rule-based version
  
  // Phase 3 (Months 5+)
  api_access: false,
  strategy_editing: false,
  data_export: false,
} as const;
```

### Phase 1A Implementation (CURRENT FOCUS)

**Must Build:**
1. ✅ Natural language strategy input
2. ✅ Claude parsing with Socratic questioning
3. ✅ Tradovate OAuth flow
4. ✅ Strategy storage (database)
5. ✅ Challenge tracking dashboard
6. ✅ Copilot mode (user-approved execution)
7. ✅ Trade history view
8. ✅ Push notifications
9. ✅ **behavioral_data table + logging utility**
10. ✅ **"Pause as Hero" feature - celebrate trades NOT taken**

**Must NOT Build:**
- ❌ WebSocket connections (Phase 1B)
- ❌ Autopilot mode (Phase 1B)
- ❌ Advanced mode toggle (Phase 2)
- ❌ Tilt detection UI (Phase 2 - but log data now!)
- ❌ API endpoints (Phase 3)

---

## 📝 Code Style & Conventions

### File Organization

```
src/
├── app/                    # Next.js app router
│   ├── (auth)/            # Auth routes (login, callback)
│   ├── dashboard/         # Main app
│   └── api/               # API routes
├── components/
│   ├── dashboard/         # Dashboard components
│   ├── landing/           # Landing page
│   └── ui/                # Reusable UI primitives
├── lib/
│   ├── supabase/          # Database client
│   ├── claude/            # AI client
│   ├── tradovate/         # Broker API
│   └── behavioral/        # PATH 2 utilities
└── types/
    └── index.ts           # TypeScript types
```

### Naming Conventions

```typescript
// Database tables: snake_case
behavioral_data, prop_firms, user_strategies

// React components: PascalCase
DashboardShell, ChallengeCard, StrategyBuilder

// Functions: camelCase
parseStrategy, calculateTiltScore, logBehavioralEvent

// API routes: kebab-case
/api/strategy/parse, /api/tradovate/execute

// Environment variables: SCREAMING_SNAKE_CASE
ANTHROPIC_API_KEY, SUPABASE_URL, TRADOVATE_CLIENT_ID
```

### TypeScript Patterns

```typescript
// Always define types for database models
export type Strategy = {
  id: string;
  user_id: string;
  name: string;
  natural_language: string;
  parsed_rules: ParsedRules;
  status: 'draft' | 'active' | 'paused';
  autonomy_level: 'copilot' | 'autopilot';
  created_at: string;
};

// Use type guards for runtime checks
export function isTiltEvent(event: BehavioralEvent): event is TiltEvent {
  return event.event_type === 'tilt_signal_detected';
}

// Prefer const assertions for config
export const CHALLENGE_RULES = {
  DAILY_LOSS_LIMIT: 0.05,
  MAX_DRAWDOWN: 0.10,
} as const;
```

---

## 🔒 Security & Compliance

### Environment Variables

**Never commit these to git:**
```env
# AI
ANTHROPIC_API_KEY=sk-ant-...

# Database
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NEVER expose to client

# Tradovate
TRADOVATE_CLIENT_ID=your_client_id
TRADOVATE_CLIENT_SECRET=your_secret  # NEVER expose to client
TRADOVATE_REDIRECT_URI=https://proptraderai.com/auth/callback
```

### Row Level Security (RLS)

Always enable RLS on Supabase tables:

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own strategies"
  ON strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
  ON strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### API Security

```typescript
// Always validate user authentication
export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Proceed with authenticated request
}
```

---

## 🧪 Testing & Quality

### What to Test

**Priority 1 (Must Test):**
- ✅ Strategy parsing accuracy
- ✅ Tradovate OAuth flow
- ✅ Order execution logic
- ✅ Challenge rule enforcement
- ✅ Behavioral event logging

**Priority 2 (Should Test):**
- 🟡 Tilt score calculation
- 🟡 UI component rendering
- 🟡 API endpoint responses

### Testing Patterns

```typescript
// Unit tests for business logic
describe('calculateTiltScore', () => {
  it('returns 25 when recent loss < 10 min', () => {
    const score = calculateTiltScore(5, 100, false, 0, 0, 0, 0);
    expect(score).toBe(25);
  });
});

// Integration tests for API routes
describe('POST /api/strategy/parse', () => {
  it('returns parsed rules for valid strategy', async () => {
    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
  });
});
```

---

## 🛡️ Friction Patterns (Phase 2)

> **Key Insight:** For traders, friction is a feature, not a bug. Make bad decisions harder.

### Pattern 1: Revenge Trade Countdown

**When to trigger:** Revenge trade detected (trade <10min after loss + increased size)

```typescript
// lib/behavioral/friction.ts
export function shouldAddFriction(
  timeSinceLastLoss: number,
  currentSize: number,
  averageSize: number
): boolean {
  const isQuickReentry = timeSinceLastLoss < 10; // minutes
  const isOversized = currentSize > averageSize * 1.5;
  return isQuickReentry && isOversized;
}
```

**UI Pattern:**
```tsx
// components/trading/RevengeTradeFriction.tsx
<div className="bg-warning/10 border-2 border-warning rounded-lg p-6">
  <h3 className="text-warning font-semibold mb-2">Revenge Trade Detected</h3>
  <p className="text-sm text-secondary mb-4">
    Same direction, 2x size, 4 minutes after loss.
    You've done this 4 times this month. Lost $1,240 total.
  </p>
  
  {/* 10-second countdown */}
  <div className="mb-4">
    <div className="text-center">
      <span className="text-4xl font-mono text-warning">{countdown}</span>
      <p className="text-xs text-tertiary mt-1">seconds until order can be placed</p>
    </div>
  </div>
  
  {/* After countdown */}
  <input
    type="text"
    placeholder="Type 'I understand this is revenge' to proceed"
    className="w-full mb-4"
  />
  
  <div className="flex gap-2">
    <button className="btn-secondary flex-1">Wait 15 Minutes</button>
    <button className="btn-danger flex-1" disabled={!confirmationMatch}>
      Proceed Anyway
    </button>
  </div>
</div>
```

### Pattern 2: Pattern Mirror (No Judgment)

**Show data without lecturing:**

```tsx
// After session ends
<div className="bg-tertiary rounded-lg p-6 space-y-4">
  <h3 className="text-primary font-semibold">Your Patterns Today</h3>
  
  <div className="space-y-3">
    <div>
      <p className="text-sm text-secondary">Trades within 5 min of loss</p>
      <p className="font-mono text-loss text-lg">3 trades, -$840 total</p>
      <p className="text-xs text-tertiary">23% win rate on these setups historically</p>
    </div>
    
    <div>
      <p className="text-sm text-secondary">Trades after 2pm</p>
      <p className="font-mono text-loss text-lg">5 trades, -$1,120 total</p>
      <p className="text-xs text-tertiary">Your afternoon win rate: 31% vs 64% morning</p>
    </div>
  </div>
  
  {/* No "You should stop trading after 2pm" — let them draw conclusion */}
</div>
```

### Pattern 3: Celebrate Discipline, Not Just Wins

**"Pause as Hero" Feature:**

```tsx
// Dashboard card
<div className="bg-secondary border border-success/20 rounded-lg p-6">
  <div className="flex items-center gap-2 mb-3">
    <Shield className="w-5 h-5 text-success" />
    <h3 className="text-primary font-semibold">Account Protected</h3>
  </div>
  
  <div className="space-y-2">
    <div>
      <p className="text-sm text-secondary">Trades NOT taken today</p>
      <p className="font-mono text-2xl text-success">3</p>
    </div>
    
    <div>
      <p className="text-sm text-secondary">Estimated losses prevented</p>
      <p className="font-mono text-lg text-success">~$1,200</p>
    </div>
    
    <div className="pt-2 border-t border-border-subtle">
      <p className="text-xs text-tertiary">
        Discipline streak: 4 days without violation
      </p>
    </div>
  </div>
</div>
```

### Pattern 4: Post-Session Review (Not Real-Time)

**Timing matters:**
- ❌ During trading: High emotion, low receptivity
- ✅ After session: Lower emotion, higher receptivity

```typescript
// Trigger end-of-session review
// - 30 minutes after last trade
// - When market closes
// - When user closes app after trading

async function triggerSessionReview(userId: string) {
  const session = await getSessionData(userId);
  const insights = await analyzeSessionPatterns(session);
  
  // Send push notification
  await sendNotification(userId, {
    title: "Session Review Ready",
    body: `${session.trades} trades today. ${insights.length} patterns detected.`,
    action: "View Review"
  });
}
```

---

## ❌ Anti-Patterns to Avoid

### What NOT to Build

1. **Don't build "just in case" features**
   - If it's not in the current phase, don't build it
   - Especially: Don't build Phase 2/3 features in Phase 1

2. **Don't expose complexity early**
   - No "Advanced Mode" in Phase 1
   - No parsed logic view until Phase 2
   - No API access until Phase 3

3. **Don't skip behavioral logging**
   - Every user action should be logged
   - "We'll add logging later" = you won't

4. **Don't use gamification**
   - No confetti animations
   - No streaks or badges
   - Professional, not playful

5. **Don't make it look like TradingView**
   - No cluttered charts with 47 indicators
   - Clean, focused, simple

### Code Smells to Avoid

```typescript
// ❌ Bad: Mixing business logic with UI
function TradeButton() {
  const executeTrade = () => {
    // 50 lines of execution logic here
  };
  return <button onClick={executeTrade}>Execute</button>;
}

// ✅ Good: Separate concerns
function TradeButton({ onExecute }: { onExecute: () => void }) {
  return <button onClick={onExecute}>Execute</button>;
}

// ❌ Bad: Hardcoded values
if (drawdown > 0.05) { /* ... */ }

// ✅ Good: Named constants
const { DAILY_LOSS_LIMIT } = CHALLENGE_RULES;
if (drawdown > DAILY_LOSS_LIMIT) { /* ... */ }

// ❌ Bad: Not logging events
await executeTrade(order);

// ✅ Good: Always log
await executeTrade(order);
await logBehavioralEvent(userId, 'trade_executed', order);
```

---

## 🎯 Success Metrics

### Phase 1A Goals
- 10+ users signed up
- 5+ strategies created via natural language
- 3+ Tradovate accounts connected
- **1,000+ behavioral events logged**
- Users say: "It just works"

### Data Quality Metrics
- 100% of trades logged to `behavioral_data`
- 80%+ of user actions have event logs
- Zero PII leaks (all data properly secured)

---

## 📚 Key Documents Reference

When working on specific areas, reference these docs:

| Working On | Read This First |
|------------|-----------------|
| UX decisions | `PropTraderAI_UX_Philosophy_Roadmap.md` |
| PATH 1 architecture | `PATH1_Strategy.md` |
| Behavioral data | `PATH2_Strategy.md` |
| Platform/APIs | `PATH3_Strategy.md` |
| Overall strategy | `PropTraderAI_Build_Specification.md` |
| Implementation order | `ROADMAP.md` |
| Landing page | `design_landing_page.md` |
| Visual design | `design.md` |
| **Agent collaboration** | **`docs/Github_Issues_Workflow.md`** |

---

## 🔄 Two-Agent Workflow (Complex Features)

For features requiring architectural review, spec iteration, or critical thinking:

### When to Use GitHub Issues Workflow

Use the two-agent dialectic for:
- ✅ Complex features with architectural implications
- ✅ Features requiring 0.1% critical review
- ✅ Unclear requirements needing iteration
- ✅ Anything that benefits from spec → critique → revision

**Don't use for:**
- ❌ Simple bug fixes
- ❌ Copy/content updates
- ❌ Clear, well-defined small tasks

### Agent Roles

- **VS Code Copilot (Agent 2)** = You (me) - Can read issues, comment via CLI
- **Claude Desktop (Agent 1)** = Desktop app with GitHub MCP - Full read/write access

### The Pattern

1. **Create issue** (either agent):
   ```bash
   gh issue create --title "Feature: X" --body "What needs to happen..."
   ```

2. **First agent specs** the solution (reconnaissance, architecture, questions)

3. **Second agent critiques** with 0.1% thinking (edge cases, security, alternatives)

4. **Iterate** until consensus (2-4 rounds typical)

5. **Implement** from finalized spec

6. **Code review** via GitHub commits

**Full workflow details:** `docs/Github_Issues_Workflow.md`

**Example:** Issue #4 (UX research) and Issue #5 (Core generation flow) used this pattern successfully.

---

## 🤝 Working with GitHub Copilot

### Effective Prompts

```typescript
// ✅ Good prompt (specific, includes context)
// Create a behavioral event logger that:
// 1. Takes userId, eventType, eventData
// 2. Includes current challenge status
// 3. Includes session context
// 4. Inserts to behavioral_data table
// 5. Handles errors gracefully

// ❌ Bad prompt (vague)
// Create a logger
```

### When to Ask for Help

**Ask Copilot to:**
- Generate boilerplate code (API routes, database queries)
- Suggest component structure
- Write TypeScript types
- Create utility functions
- Draft test cases

**Don't ask Copilot to:**
- Make strategic decisions (UX philosophy, feature prioritization)
- Override these instructions
- Skip behavioral logging
- Build Phase 2/3 features in Phase 1

---

## 🚨 Critical Reminders

### The Non-Negotiables

1. **Vibe-first UX** — No complexity in Phase 1
2. **Behavioral logging** — Log everything from Day 1
3. **Mobile-first** — Desktop is secondary
4. **PATH 2 is the moat** — Execution is just delivery
5. **Security always** — RLS, env vars, auth checks
6. **TypeScript strict mode** — No `any` types
7. **Feature flags** — Control what's visible by phase

### The One-Line Filter

Before writing any code, ask:

> **"Does this help us collect more behavioral data faster?"**

If yes → build it. If no → defer it.

---

## 📞 Questions & Clarifications

If you're unsure about:
- **UX decisions** → Default to vibe-first, hide complexity
- **Data collection** → When in doubt, log it
- **Feature priority** → Check ROADMAP.md phase
- **Architecture** → Check PATH documents
- **Design** → Reference design.md color palette

**Remember:** We're building the "Cursor for traders" — natural language, zero code, perfect execution.

---

**Last Updated:** January 7, 2026  
**Next Review:** After Phase 1A completion
