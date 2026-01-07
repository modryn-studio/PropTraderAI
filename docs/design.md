# PropTrader.AI Design Standard
## Elite UI/UX System for Mobile-First Trading Platform

**Created:** January 7, 2026  
**Version:** 1.0  
**Philosophy:** "Terminal Luxe" meets "Financial Brutalism"

---

## 🎯 What Would a Top 0.1% Designer Think?

### The Critical Questions

Before writing a single line of code, elite designers ask:

1. **What emotion should users feel?**
   - Fear → Confidence
   - Chaos → Control
   - Guessing → Knowing

2. **What's our signature move?**
   - The ONE thing competitors can't copy
   - The detail users screenshot and share
   - The moment that makes them say "wow"

3. **What are we NOT?**
   - Not TradingView (overwhelming charts)
   - Not Robinhood (gamified dopamine hits)
   - Not fintech banking apps (corporate blandness)

4. **Who are the design references OUTSIDE trading?**
   - **Linear** (command-line aesthetics, speed obsession)
   - **Arc Browser** (spatial thinking, beautiful defaults)
   - **Notion** (information density without clutter)
   - **Stripe** (technical excellence, restrained luxury)

---

## � The Vibe Spectrum in Trading Apps

### ❌ What to Avoid:

**Robinhood/Webull Territory (Too Toy-Like)**
- Confetti animations on wins
- Gamified streaks and badges
- Oversimplified (hiding important data)
- Emoji-heavy, casual tone
- Makes trading feel like a game

**TradeStation/Bloomberg Terminal (Too Overwhelming)**
- 47 windows open simultaneously
- Tiny fonts, dense grids everywhere
- Assumes you know 200+ abbreviations
- Ugly 1990s interfaces
- Intimidating for anyone not already a pro

### ✅ Your Sweet Spot: "Professional Simplicity"

Think of these reference points:

**Linear** (project management)
- Clean, fast, keyboard-driven
- Advanced features don't clutter the UI
- Feels professional but not corporate
- Progressive disclosure (simple by default, powerful when needed)

**Stripe Dashboard** (payments)
- Financial data presented elegantly
- Information density without chaos
- Restrained color (mostly grayscale + accent)
- You feel smart using it, not overwhelmed

**Arc Browser** (web browser)
- Spatial thinking (everything has its place)
- Beautiful defaults
- Power features hidden until needed
- Delightful without being childish

**Notion** (productivity)
- Approachable for beginners
- Powerful for experts
- Clean information hierarchy
- Customizable without being messy

---

## 🎨 Design Philosophy: "Terminal Luxe"

### The Core Formula

```
Professional = Data accuracy + Clear hierarchy + Monospace where it matters
Accessible = Natural language input + Progressive disclosure + Helpful context
Not Ugly = Modern spacing + Subtle animations + Quality typography
```

**The Tagline Vibe:** "Professional tools, human interface"

### Core Principles

**1. Information Supremacy**
- Data density is a feature, not a bug
- Every pixel earns its place
- No decorative bullshit

**2. Speed as Aesthetic**
- Instant feedback everywhere
- Skeleton screens, not spinners
- Optimistic UI updates
- Perceived performance > actual performance

**3. Monospace Honesty**
- Financial data = code = terminal output
- Monospace fonts for numbers/data
- Proportional fonts for prose
- NO mixing within the same context

**4. Dark-First, Always**
- Traders work at night
- OLED battery savings
- Professional trader aesthetic
- Light mode = optional accessibility feature

**5. Micro-Interactions as Language**
- Every tap has tactile feedback
- State changes are visible
- Loading states tell a story
- Errors feel human, not hostile

**6. Progressive Disclosure**
- Show simple by default, reveal complexity on demand
- Advanced features don't clutter the UI
- Power features hidden until needed

**7. Confidence Through Clarity**
- Users trust the app because it's honest and clear
- Transparent operations, no hidden costs
- Clear risk display at all times

**8. Fast Feedback**
- Every action gets immediate visual response
- Loading states tell a story, not just spin
- Optimistic updates where safe

**9. Smart Defaults That Prove Expertise**
- Defaults show you understand trading
- Industry-standard best practices built in
- Contextual suggestions based on situation

**10. Contextual Help, Not Tooltips Everywhere**
- Help when needed, invisible when not
- Natural guidance through the flow
- No tooltip spam on every field

---

## 📐 Visual System

### Visual Direction & Color Strategy

**Color Strategy:**
- **Base:** Dark mode by default (professional trader aesthetic)
- **Accent:** One primary color (blue) for actions, used sparingly
- **Data:** Green/red ONLY for profit/loss (never decorative)
- **UI Chrome:** Subtle grays, barely-there borders
- **No:** Gradients everywhere, rainbow colors, decorative patterns

**Typography Hierarchy:**
```
Headers:        Clean sans-serif (Inter) - easy to scan
Body text:      Clean sans-serif (Inter) - readable
Financial data: Monospace (JetBrains Mono) - professional, accurate
Buttons:        Medium weight - confident but not shouty
```

**Information Density:**
- **Desktop:** More dense, multi-column layouts OK
- **Mobile:** One thing at a time, but don't hide critical info
- **Rule:** If a trader needs it to make a decision, show it

**Interactions:**
- **Micro-animations:** Yes, but subtle (fade, slide, scale)
- **Loading states:** Skeleton screens, not spinners with personality
- **Haptics on mobile:** Yes, for important confirmations
- **Success celebrations:** Simple checkmark animation, NOT confetti
- **Sound effects:** Optional, off by default

### Color Palette: "Market Pressure"

```css
/* Base - Terminal Black */
--bg-primary: #0a0e14;      /* Canvas */
--bg-secondary: #12171f;    /* Cards */
--bg-tertiary: #1a2029;     /* Elevated */

/* Borders - Subtle Containment */
--border-subtle: #1f2633;   /* Barely there */
--border-default: #2d3544;  /* Standard divider */
--border-strong: #3d4555;   /* Emphasis */

/* Text - Hierarchy */
--text-primary: #e6edf3;    /* Body */
--text-secondary: #8b949e;  /* Supporting */
--text-tertiary: #6e7681;   /* Subtle */
--text-inverse: #0a0e14;    /* On colored backgrounds */

/* Data - Financial Truth */
--profit-green: #00897b;    /* Gains (Aqua) */
--loss-red: #b5323d;        /* Losses (Marron) */
--neutral-gray: #64748b;    /* Breakeven */
--warning-amber: #f59e0b;   /* Caution */

/* Accent - Intelligence */
--accent-cyan: #00bbd4;     /* Primary action */
--accent-purple: #8b5cf6;   /* AI features */
--accent-blue: #3b82f6;     /* Data highlights */

/* Status - System Health */
--success: #00897b;
--error: #b5323d;
--warning: #f59e0b;
--info: #0ea5e9;
```

### Typography System

```css
/* Display Font - "Terminal Grotesque" Aesthetic */
--font-display: 'Space Mono', 'IBM Plex Mono', 'Courier New', monospace;

/* Body Font - Refined Sans-Serif */
--font-body: 'Inter var', system-ui, -apple-system, sans-serif;

/* Data Font - Monospace Authority */
--font-data: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

/* Scale - Mobile-Optimized */
--text-xs: 0.75rem;    /* 12px - Captions */
--text-sm: 0.875rem;   /* 14px - Supporting */
--text-base: 1rem;     /* 16px - Body */
--text-lg: 1.125rem;   /* 18px - Emphasis */
--text-xl: 1.25rem;    /* 20px - Subheadings */
--text-2xl: 1.5rem;    /* 24px - Headings */
--text-3xl: 2rem;      /* 32px - Hero */
--text-4xl: 2.5rem;    /* 40px - Display */

/* Weight */
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

### Spacing System - "8pt Grid with Exceptions"

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px - Micro adjustments */
--space-2: 0.5rem;    /* 8px - Tight spacing */
--space-3: 0.75rem;   /* 12px - Component spacing */
--space-4: 1rem;      /* 16px - Standard spacing */
--space-5: 1.25rem;   /* 20px - Generous */
--space-6: 1.5rem;    /* 24px - Section spacing */
--space-8: 2rem;      /* 32px - Large sections */
--space-12: 3rem;     /* 48px - Page sections */
--space-16: 4rem;     /* 64px - Hero spacing */

/* Mobile-specific (override for mobile) */
--space-mobile-tight: 0.875rem;  /* 14px - Mobile component spacing */
--space-mobile-base: 1.25rem;    /* 20px - Mobile section spacing */
```

### Border Radius - "Subtle Sophistication"

```css
--radius-none: 0;
--radius-sm: 0.25rem;    /* 4px - Tight elements */
--radius-md: 0.5rem;     /* 8px - Buttons, cards */
--radius-lg: 0.75rem;    /* 12px - Large cards */
--radius-xl: 1rem;       /* 16px - Modals */
--radius-full: 9999px;   /* Pills, avatars */
```

### Elevation - "Layered Depth"

```css
/* Shadows - Subtle Depth */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

/* Glows - Accent Emphasis */
--glow-blue: 0 0 20px rgba(59, 130, 246, 0.3);
--glow-green: 0 0 20px rgba(0, 137, 123, 0.3);
--glow-red: 0 0 20px rgba(181, 50, 61, 0.3);
--glow-purple: 0 0 20px rgba(139, 92, 246, 0.3);
```

---

## 🎭 Aesthetic Directions Explored

### Option 1: "Terminal Command" (Chosen Direction)

**Inspiration:** Developer tools, command-line interfaces, hacker aesthetic

**Characteristics:**
- Monospace everything for data
- Green accent for "success" operations
- Red accent for "danger" zones
- Subtle grid backgrounds (terminal lines)
- Keyboard shortcut hints everywhere
- Command palette as primary navigation

**Typography:**
- Display: Space Mono (bold, technical)
- Body: Inter (clean, readable)
- Data: JetBrains Mono (tabular perfection)

**Example Component:**

```jsx
// P&L Display - Terminal Style
<div className="font-mono text-lg">
  <span className="text-secondary">$</span>
  <span className="text-profit-green font-bold">+1,247</span>
  <span className="text-tertiary ml-2">↑ 12.4%</span>
</div>
```

**Why This Works:**
- Traders already use terminals
- Authenticity (financial data IS technical data)
- Differentiates from "friendly" fintech apps
- Scales from mobile to desktop

---

### Option 2: "Glass Morphism Luxury" (Rejected - Too Trendy)

**Inspiration:** Apple's iOS design language, frosted glass

**Characteristics:**
- Translucent cards with blur
- Soft shadows
- Light gradients
- SF Pro / San Francisco fonts

**Why Rejected:**
- Already dated (2021 trend)
- Performance issues on mobile
- Lacks personality
- Every fintech app looks like this

---

### Option 3: "Brutal Minimalism" (Rejected - Too Cold)

**Inspiration:** Stripe, Linear, Vercel

**Characteristics:**
- Stark black and white
- No rounded corners
- Extremely limited color
- Helvetica Neue or Inter

**Why Rejected:**
- Too harsh for emotional trading context
- Lacks warmth for community features
- Doesn't celebrate the "win" moments

---

### Option 4: "Neo-Financial Terminal" (Strong Alternative)

**Inspiration:** Bloomberg Terminal, Reuters Eikon, professional trading desks

**Characteristics:**
- Orange/amber accent (Bloomberg signature)
- Dense information grids
- Multiple data streams visible
- Professional trader aesthetic

**Why Considered:**
- Authentic to prop trading culture
- Information density as feature
- Clear visual hierarchy

**Why Not Chosen:**
- Requires larger screens to shine
- Mobile-first constraint
- Risk of overwhelming new users

---

## � Tone of Voice & UI Copy

### In UI Copy

```
❌ "Woohoo! You're killing it! 🎉"
❌ "WARNING: RULE VIOLATION IMMINENT. CEASE TRADING."
✅ "You're $200 from your daily loss limit."

❌ "Let's make some money!"
✅ "Ready to execute your strategy."

❌ "Oopsie! Something broke 😅"
✅ "Unable to connect to Tradovate. Retrying in 10 seconds."
```

### Personality Attributes

- **Confident, not cocky** - We know our stuff, but we're not arrogant
- **Helpful, not hand-holding** - Guide users, don't patronize them
- **Clear, not technical jargon** - Use real trading terms, but explain when needed
- **Calm, not anxious** - Even in critical situations, stay composed

### The Emotional Journey

**When a user opens PropTraderAI, they should feel:**

1. **"This understands trading"** - Real terminology, smart defaults, accurate data
2. **"I can trust this"** - Clear risk display, honest about limitations, transparent operations
3. **"This respects my time"** - Fast, no unnecessary clicks, shows what matters
4. **"I'm in control"** - Can approve/reject, can pause anytime, can see everything
5. **"This is professional"** - Clean design, no gimmicks, serious about results

**They should NOT feel:**
- Overwhelmed (too much at once)
- Patronized (dumbed down explanations)
- Anxious (alarmist warnings, red everywhere)
- Confused (unclear hierarchy, hidden info)
- Like it's a game (confetti, streaks, emoji spam)

---

## 🎯 Key UI Patterns & Examples

### Pattern 1: The Dashboard - "Everything Critical in One Glance"

**Goal:** Show everything critical in one glance, expandable for detail

```
┌─────────────────────────────────────┐
│ Challenge: Topstep 50K              │
│                                     │
│ Today: +$340 ↑ 12.4%               │
│ Drawdown: ████░░░░░░ 24% / 100%    │  <- Visual bar
│                                     │
│ Daily Limit: $200 remaining         │  <- Clear number
│                                     │
│ [2 Active Strategies]               │  <- Expandable
└─────────────────────────────────────┘
```

**Example - Progressive Disclosure:**
```
Default view:
- Current P&L: +$247
- Drawdown: 12% of limit
- Active strategies: 2

Tap to expand:
- Detailed breakdown by strategy
- Individual trade history
- Risk metrics
- Time-based analytics
```

### Pattern 2: Natural Language Input - "Chat-Like but Structured"

**Goal:** Chat-like but structured, guides without restricting

```
┌─────────────────────────────────────┐
│ Describe your strategy:             │
│                                     │
│ [Text input area]                   │
│                                     │
│ Examples:                           │
│ • Trade pullbacks to 20 EMA         │
│ • Buy when RSI < 30                 │
│ • Scalp ES during morning session   │
│                                     │
│ [Continue] →                        │
└─────────────────────────────────────┘
```

**Example - Contextual Help:**
```
User types: "Trade pullbacks to EMA"

AI asks naturally:
"Which EMA period? (Most traders use 9, 20, or 50)"

Not: [?] tooltip on every single field
```

### Pattern 3: Data-Dense Cards - "Professional Information Density"

**Goal:** Professional information density without visual clutter

```
┌─────────────────────────────────────┐
│ EMA Pullback Strategy          [•]  │  <- Status indicator
├─────────────────────────────────────┤
│ Entry: Price crosses above 20 EMA   │
│ Exit:  2:1 R:R or EMA cross         │
│ Time:  9:30 AM - 11:30 AM EST       │
├─────────────────────────────────────┤
│ Win Rate  Avg Win   Trades          │
│ 67%       $85       23              │  <- Monospace alignment
└─────────────────────────────────────┘
```

### Pattern 4: Trade Approval with Confidence

**Goal:** Users trust the app because it's honest and clear

```
Clear presentation:
Entry: 19,245.50
Stop Loss: 19,235.50 (-10 ticks = $50 risk)
Take Profit: 19,265.50 (+20 ticks = $100 target)
Challenge Impact: 1.2% of daily limit used

Not: Hidden fees, unclear risk, vague confirmation
```

### Pattern 5: Smart Defaults That Show Expertise

**Goal:** Prove you understand the domain through intelligent defaults

```
Default to: 1% risk per trade (industry standard)
Suggest: Adjust to 0.5% if challenge has strict drawdown
Warn: "2%+ is aggressive for evaluation accounts"

Not: No default, make user figure it out
Not: "Select risk level: Low | Medium | High" (vague)
```

### Pattern 6: Fast Feedback Loop

**Goal:** Every action gets immediate visual response

```
User finishes describing strategy →
Immediate: "Parsing your strategy..." (0.5s)
Then: Strategy card appears with animation
Then: Backtest results load progressively
```

---

## �📱 Mobile-First Components

### 1. Bottom Navigation (The Thumb Zone)

**Design Requirements:**
- 44px minimum tap targets
- Safe area insets for notch/home indicator
- Active state glow (not just color change)
- Haptic feedback on tap

```jsx
// Bottom Navigation Component
export function BottomNav() {
  const navItems = [
    { icon: Activity, label: 'Command', href: '/command' },
    { icon: MessageSquare, label: 'AI Chat', href: '/chat' },
    { icon: Camera, label: 'Analyze', href: '/analyze' },
    { icon: BarChart3, label: 'History', href: '/history' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-bg-secondary/80 backdrop-blur-xl border-t border-border-subtle pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center flex-1 h-full
                transition-all duration-200 active:scale-95
                ${isActive 
                  ? 'text-accent-cyan' 
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              <Icon 
                className={`w-6 h-6 mb-1 ${
                  isActive ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''
                }`}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Key Details:**
- Glow effect on active state
- Haptic feedback via `active:scale-95`
- Safe area padding for modern iPhones
- Backdrop blur for depth

---

### 2. Alert Banner (The Panic Button)

**Design Requirements:**
- Unmissable when critical
- Calm when informational
- Dismissible but persistent
- Shows distance to limit

```jsx
// Alert Banner Component
export function AlertBanner({ 
  severity = 'info', 
  title, 
  message, 
  currentPnL, 
  limitPnL,
  onDismiss 
}) {
  const severityStyles = {
    critical: 'bg-error/10 border-error/50 text-error',
    warning: 'bg-warning/10 border-warning/50 text-warning',
    info: 'bg-info/10 border-info/50 text-info',
    success: 'bg-success/10 border-success/50 text-success',
  };

  const distance = Math.abs(limitPnL - currentPnL);
  const percentageToLimit = ((currentPnL / limitPnL) * 100).toFixed(1);

  return (
    <div 
      className={`
        ${severityStyles[severity]}
        border-2 rounded-lg p-4 mb-4
        animate-in slide-in-from-top duration-300
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {severity === 'critical' && <AlertTriangle className="w-5 h-5 animate-pulse" />}
          {severity === 'warning' && <AlertCircle className="w-5 h-5" />}
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="opacity-50 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <p className="text-sm mb-3 opacity-90">{message}</p>
      
      {/* Distance to Limit Meter */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono">
          <span>Distance to Limit</span>
          <span className="font-bold">${distance.toFixed(2)}</span>
        </div>
        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              severity === 'critical' ? 'bg-error' : 'bg-warning'
            }`}
            style={{ width: `${percentageToLimit}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

**Key Details:**
- Color-coded severity
- Animated entrance
- Visual progress meter
- Monospace numbers for precision

---

### 3. P&L Card (The Truth Display)

**Design Requirements:**
- Numbers dominate
- Color conveys sentiment immediately
- Context (today vs total) clear
- Celebrate wins, acknowledge losses

```jsx
// P&L Display Component
export function PnLCard({ dailyPnL, totalPnL, accountSize }) {
  const dailyPercentage = ((dailyPnL / accountSize) * 100).toFixed(2);
  const totalPercentage = ((totalPnL / accountSize) * 100).toFixed(2);
  
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
      {/* Daily P&L - Primary Focus */}
      <div className="mb-6">
        <label className="text-text-tertiary text-xs uppercase tracking-wide mb-2 block">
          Today's P&L
        </label>
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl font-bold font-mono ${
            dailyPnL >= 0 ? 'text-profit-green' : 'text-loss-red'
          }`}>
            {dailyPnL >= 0 ? '+' : ''}{dailyPnL.toLocaleString('en-US', { 
              style: 'currency', 
              currency: 'USD',
              minimumFractionDigits: 2 
            })}
          </span>
          <span className={`text-lg font-medium ${
            dailyPnL >= 0 ? 'text-profit-green/70' : 'text-loss-red/70'
          }`}>
            {dailyPercentage >= 0 ? '+' : ''}{dailyPercentage}%
          </span>
        </div>
      </div>

      {/* Total P&L - Secondary */}
      <div className="pt-6 border-t border-border-subtle">
        <label className="text-text-tertiary text-xs uppercase tracking-wide mb-2 block">
          Challenge Total
        </label>
        <div className="flex items-baseline gap-3">
          <span className={`text-2xl font-bold font-mono ${
            totalPnL >= 0 ? 'text-profit-green' : 'text-loss-red'
          }`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString('en-US', { 
              style: 'currency', 
              currency: 'USD',
              minimumFractionDigits: 2 
            })}
          </span>
          <span className={`text-base font-medium ${
            totalPnL >= 0 ? 'text-profit-green/70' : 'text-loss-red/70'
          }`}>
            {totalPercentage >= 0 ? '+' : ''}{totalPercentage}%
          </span>
        </div>
      </div>

      {/* Subtle Animation on Update */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-update {
          animation: pulse-subtle 1s ease-in-out;
        }
      `}</style>
    </div>
  );
}
```

**Key Details:**
- Monospace for numbers
- Color signals sentiment
- Size hierarchy (today > total)
- Smooth animations on updates

---

### 4. Chart Analysis Result (The AI Insight)

**Design Requirements:**
- Screenshot preview with overlays
- Extracted data clearly visible
- Support/Resistance levels marked
- AI confidence indicators

```jsx
// Chart Analysis Display
export function ChartAnalysisResult({ analysis, imageUrl }) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
      {/* Screenshot with Overlays */}
      <div className="relative">
        <img 
          src={imageUrl} 
          alt="Chart analysis" 
          className="w-full h-auto"
        />
        
        {/* AI-detected levels overlaid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {analysis.supportLevels.map((level, i) => (
            <line
              key={`support-${i}`}
              x1="0"
              y1={level.yPosition}
              x2="100%"
              y2={level.yPosition}
              stroke="#00897b"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.7"
            />
          ))}
          {analysis.resistanceLevels.map((level, i) => (
            <line
              key={`resistance-${i}`}
              x1="0"
              y1={level.yPosition}
              x2="100%"
              y2={level.yPosition}
              stroke="#b5323d"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.7"
            />
          ))}
        </svg>
      </div>

      {/* Analysis Data */}
      <div className="p-6 space-y-4">
        {/* Support Levels */}
        <div>
          <h4 className="text-xs uppercase tracking-wide text-text-tertiary mb-2">
            Support Levels
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.supportLevels.map((level, i) => (
              <span 
                key={i}
                className="px-3 py-1.5 bg-profit-green/10 text-profit-green border border-profit-green/30 rounded-md font-mono text-sm"
              >
                {level.price.toFixed(2)}
              </span>
            ))}
          </div>
        </div>

        {/* Resistance Levels */}
        <div>
          <h4 className="text-xs uppercase tracking-wide text-text-tertiary mb-2">
            Resistance Levels
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.resistanceLevels.map((level, i) => (
              <span 
                key={i}
                className="px-3 py-1.5 bg-loss-red/10 text-loss-red border border-loss-red/30 rounded-md font-mono text-sm"
              >
                {level.price.toFixed(2)}
              </span>
            ))}
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="pt-4 border-t border-border-subtle">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">AI Analysis</h4>
              <p className="text-sm text-text-secondary">
                {analysis.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Confidence Indicator */}
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < Math.round(analysis.confidence * 5)
                    ? 'bg-accent-cyan'
                    : 'bg-border-default'
                }`}
              />
            ))}
          </div>
          <span>{Math.round(analysis.confidence * 100)}% confidence</span>
        </div>
      </div>
    </div>
  );
}
```

**Key Details:**
- Screenshot with SVG overlays
- Color-coded levels
- AI branding with purple accent
- Confidence visualization

---

## 🎬 Motion Design

### Animation Principles

**1. Purposeful Motion**
- Every animation communicates state
- No decoration-only animations
- Speed = 150-250ms (snappy, not sluggish)

**2. Easing Functions**

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

**3. Micro-Interactions**

```jsx
// Button Press
<button className="
  active:scale-95 
  transition-transform duration-100
  hover:brightness-110
">
  Execute Trade
</button>

// Card Hover (Desktop)
<div className="
  transition-all duration-200
  hover:shadow-lg hover:-translate-y-1
  hover:border-accent-cyan/50
">
  {/* Card content */}
</div>

// Loading State
<div className="
  animate-pulse
  bg-gradient-to-r from-bg-secondary via-bg-tertiary to-bg-secondary
  bg-[length:200%_100%]
  animate-shimmer
">
  {/* Loading skeleton */}
</div>
```

**4. Page Transitions**

```jsx
// Framer Motion Page Transitions
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3
};

export function Page({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
```

---

## 🎯 Interaction Patterns

### 1. Pull-to-Refresh (Mobile Native)

```jsx
function usePullToRefresh(onRefresh) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && startY > 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setStartY(0);
    setPullDistance(0);
  };

  return { pullDistance, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd };
}
```

### 2. Swipe Actions (Delete, Archive)

```jsx
function SwipeableListItem({ children, onDelete, onArchive }) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [startX, setStartX] = useState(0);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    const distance = currentX - startX;
    setSwipeDistance(Math.max(-100, Math.min(0, distance)));
  };

  const handleTouchEnd = () => {
    if (swipeDistance < -80) {
      onDelete();
    }
    setSwipeDistance(0);
    setStartX(0);
  };

  return (
    <div 
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete action revealed */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-error flex items-center justify-center">
        <Trash2 className="w-5 h-5 text-white" />
      </div>
      
      {/* Main content */}
      <div 
        className="bg-bg-secondary transition-transform"
        style={{ transform: `translateX(${swipeDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
```

### 3. Haptic Feedback (iOS)

```javascript
// Haptic feedback utility
export const haptics = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 10, 30]);
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  }
};

// Usage in components
<button 
  onClick={() => {
    haptics.light();
    handleClick();
  }}
>
  Submit
</button>
```

---

## 🏗️ Component Architecture

### Design Token System

```typescript
// tokens.ts
export const tokens = {
  colors: {
    bg: {
      primary: '#0a0e14',
      secondary: '#12171f',
      tertiary: '#1a2029',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#8b949e',
      tertiary: '#6e7681',
    },
    accent: {
      blue: '#3b82f6',
      purple: '#8b5cf6',
      cyan: '#00bbd4',
    },
    semantic: {
      profit: '#00897b',
      loss: '#b5323d',
      neutral: '#64748b',
      warning: '#f59e0b',
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  typography: {
    fontFamily: {
      display: "'Space Mono', monospace",
      body: "'Inter var', sans-serif",
      data: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
      '4xl': '2.5rem',
    }
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: {
      blue: '0 0 20px rgba(59, 130, 246, 0.3)',
      green: '0 0 20px rgba(0, 137, 123, 0.3)',
      red: '0 0 20px rgba(181, 50, 61, 0.3)',
    }
  }
};
```

### Component Composition Pattern

```jsx
// Base Button Component
export function Button({ 
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  children,
  ...props 
}) {
  const variants = {
    primary: 'bg-accent-cyan hover:bg-accent-cyan/90 text-white',
    secondary: 'bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary',
    ghost: 'bg-transparent hover:bg-bg-tertiary/50 text-text-primary',
    danger: 'bg-error hover:bg-error/90 text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[52px]',
  };

  return (
    <button
      className={`
        ${variants[variant]}
        ${sizes[size]}
        inline-flex items-center justify-center gap-2
        font-medium rounded-lg
        transition-all duration-200
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2
      `}
      disabled={loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && leftIcon && leftIcon}
      {children}
      {!loading && rightIcon && rightIcon}
    </button>
  );
}
```

---

## 📏 Layout Patterns

### 1. Command Center Layout (Home)

```
┌─────────────────────────────┐
│  Header (Fixed)             │ ← Status bar, notifications
├─────────────────────────────┤
│                             │
│  Hero Metric                │ ← Daily P&L (huge)
│  (Today's P&L)              │
│                             │
├─────────────────────────────┤
│  Alert Banner               │ ← If approaching limit
├─────────────────────────────┤
│                             │
│  Challenge Stats Grid       │ ← Win rate, profit factor, etc.
│  ┌──────┬──────┬──────┐     │
│  │ Stat │ Stat │ Stat │     │
│  └──────┴──────┴──────┘     │
│                             │
├─────────────────────────────┤
│  Recent Trades List         │ ← Last 5 trades
│  • Trade 1                  │
│  • Trade 2                  │
│  • Trade 3                  │
│                             │
└─────────────────────────────┘
│  Bottom Nav (Fixed)         │ ← 4-5 icons
└─────────────────────────────┘
```

### 2. Chat Layout

```
┌─────────────────────────────┐
│  Header                     │ ← "AI Trading Assistant"
├─────────────────────────────┤
│                             │
│  ┌──────────────────────┐   │
│  │  AI Message          │   │ ← Left-aligned
│  │  (with avatar)       │   │
│  └──────────────────────┘   │
│                             │
│          ┌──────────────────┐│
│          │  User Message    ││ ← Right-aligned
│          │                  ││
│          └──────────────────┘│
│                             │
│  ┌──────────────────────┐   │
│  │  AI Message          │   │
│  │  (typing...)         │   │
│  └──────────────────────┘   │
│                             │
└─────────────────────────────┘
│  Input Bar (Fixed Bottom)   │ ← Text input + send
└─────────────────────────────┘
```

### 3. Chart Analysis Layout

```
┌─────────────────────────────┐
│  Header                     │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   Upload Area       │    │ ← Camera/gallery picker
│  │   (or preview)      │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  [Analyze Button]           │ ← Primary CTA
│                             │
├─────────────────────────────┤
│  Analysis Results           │ ← Appears after analysis
│  (if exists)                │
│                             │
│  • Support Levels           │
│  • Resistance Levels        │
│  • AI Recommendation        │
│                             │
└─────────────────────────────┘
```

---

## 🎨 Real-World Implementation Examples

### Landing Page Hero Section

```jsx
export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Background Grid (Terminal Aesthetic) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f263310_1px,transparent_1px),linear-gradient(to_bottom,#1f263310_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
      
      {/* Gradient Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-cyan/20 rounded-full blur-[128px]" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-br from-text-primary via-text-primary to-accent-cyan bg-clip-text text-transparent">
            PropTrader AI
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary mb-8 font-mono">
            AI Agent System for Trading Discipline
          </p>
          <p className="text-lg text-text-tertiary mb-12 max-w-2xl mx-auto">
            Stop failing prop firm challenges. Get real-time alerts before you violate rules,
            AI-powered chart analysis, and behavioral insights that prevent emotional trading.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="primary">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="ghost">
              Watch Demo
              <Play className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-16 flex items-center justify-center gap-8 text-sm text-text-tertiary"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>1,247 traders</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-accent-cyan text-accent-cyan" />
            <span>4.9/5 rating</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>64% pass rate</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

---

## 🧪 Accessibility Standards

### WCAG 2.1 AA Compliance

**1. Color Contrast**
- Text: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- Interactive elements: Minimum 3:1 ratio

**2. Keyboard Navigation**
- All interactive elements focusable
- Visible focus indicators
- Logical tab order

**3. Screen Reader Support**
- Semantic HTML
- ARIA labels for icons
- Alt text for images
- Live regions for dynamic content

```jsx
// Example: Accessible Button
<button
  aria-label="Open chart analysis"
  aria-pressed={isOpen}
  onClick={handleClick}
  className="..."
>
  <Camera className="w-5 h-5" aria-hidden="true" />
  <span>Analyze</span>
</button>

// Example: Alert with Live Region
<div 
  role="alert" 
  aria-live="assertive"
  className="..."
>
  You are $200 away from your daily loss limit
</div>
```

---

## 🚀 Performance Optimization

### Core Web Vitals Targets

- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Optimization Strategies

**1. Image Optimization**
```jsx
import Image from 'next/image';

<Image
  src="/chart-screenshot.jpg"
  alt="Chart analysis"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  loading="lazy"
/>
```

**2. Code Splitting**
```jsx
import dynamic from 'next/dynamic';

const ChartAnalyzer = dynamic(() => import('@/components/ChartAnalyzer'), {
  loading: () => <LoadingSkeleton />,
  ssr: false
});
```

**3. Font Loading**
```css
@font-face {
  font-family: 'Inter var';
  src: url('/fonts/Inter-var.woff2') format('woff2');
  font-display: swap;
  font-weight: 100 900;
}
```

---

## 📱 PWA Considerations

### Install Prompt

```jsx
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-accent-cyan text-white p-4 rounded-lg shadow-xl z-50">
      <div className="flex items-start gap-3">
        <Smartphone className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold mb-1">Install PropTrader AI</h4>
          <p className="text-sm opacity-90 mb-3">
            Add to your home screen for quick access and offline use
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-white text-accent-cyan rounded-md text-sm font-medium"
            >
              Install
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="px-4 py-2 bg-white/10 rounded-md text-sm font-medium"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎓 Design Principles Summary

### Top 10 Rules

1. **Mobile thumb zone is sacred** - 44px minimum, bottom navigation
2. **Financial data uses monospace** - Always. No exceptions.
3. **Color signals sentiment** - Green = profit, Red = loss, Blue = action
4. **Motion has purpose** - No decorative animations
5. **Dark is default** - Light mode is accessibility, not primary
6. **Information density wins** - Don't dumb down for "simplicity"
7. **Loading states tell stories** - Not just spinners
8. **Errors are human** - Not hostile "ERROR: 500"
9. **Micro-interactions matter** - Haptics, scale, glow
10. **Accessibility is non-negotiable** - WCAG 2.1 AA minimum

### The Balance We're Striking

**NOT Robinhood** (too toy-like, gamified, hides complexity)  
**NOT Bloomberg Terminal** (too overwhelming, assumes expert knowledge)  
**= PropTraderAI** (professional tools with human interface)

We give traders:
- **Professional-grade data** without 47 open windows
- **Clear risk metrics** without alarmist panic mode
- **AI assistance** without treating them like children
- **Information density** without visual chaos
- **Fast execution** without cutting corners on clarity

---

## 📚 References & Inspiration

### Design Systems to Study
- **Linear** - Command-line aesthetic done right
- **Stripe** - Technical elegance
- **Arc Browser** - Spatial innovation
- **Vercel** - Minimalist perfection
- **Bloomberg Terminal** - Information density mastery

### Typography Resources
- **Space Mono** (Google Fonts) - Display font
- **Inter Variable** (Google Fonts) - Body font
- **JetBrains Mono** (Free) - Data font

### Animation Libraries
- **Framer Motion** - React animations
- **AutoAnimate** - Zero-config animations
- **React Spring** - Physics-based animations

### Tools
- **Figma** - Design mockups
- **Excalidraw** - Quick sketches
- **Coolors** - Color palette generator
- **Type Scale** - Typography scales
- **Contrast Checker** - Accessibility validation

---

## 🎯 Next Steps

### Week 1: Foundation
- [ ] Implement design token system
- [ ] Build core component library
- [ ] Create mobile mockups in Figma
- [ ] Test on real devices (iOS + Android)

### Week 2: Refinement
- [ ] Add micro-interactions
- [ ] Implement dark mode variables
- [ ] Create loading states for all components
- [ ] Accessibility audit

### Week 3: Polish
- [ ] Animation polish pass
- [ ] Performance optimization
- [ ] User testing with 10 traders
- [ ] Iterate based on feedback

---

**Remember:** Design is not decoration. Design is how it works. Every pixel, every animation, every color choice should serve the user's goal: pass their prop firm challenge without violating rules.

The best design is invisible until it saves you from a $1,000 mistake.
