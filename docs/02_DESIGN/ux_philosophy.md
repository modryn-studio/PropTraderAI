# PROPTRADER AI - UX Philosophy & Product Roadmap
## "Vibe-First, Power Later, Platform Last"

**Version 1.0 | January 2026**  
**CONFIDENTIAL - CORE PRODUCT STRATEGY DOCUMENT**

---

## Executive Summary

This document defines the foundational UX philosophy for PropTraderAI. Every design decision, feature prioritization, and development sprint should be filtered through this framework.

### THE CORE INSIGHT

> **PATH 2 (Behavioral Intelligence) is our actual product. PATH 1 (Execution) is just the delivery mechanism.**

This means our UX must optimize for **behavioral data collection**, not feature exposure. The more users engage without friction, the faster we build an unbeatable data moat.

---

## The Strategic Framework

### Why This Matters

We are building a **compound system** where each path reinforces the others:

| Path | Purpose | Role in System |
|------|---------|----------------|
| **PATH 1** (Execution Engine) | Gets users in the door | Delivery mechanism |
| **PATH 2** (Behavioral Intelligence) | Creates the moat that can't be copied | **THE ACTUAL PRODUCT** |
| **PATH 3** (Platform Infrastructure) | Distributes at scale with zero CAC | Growth multiplier |

### The UX Tension (Resolved)

| If you optimize for... | You're really selling... | UX Philosophy |
|------------------------|--------------------------|---------------|
| PATH 1 (Execution) | Automation tool | Power (users need to trust/verify) |
| PATH 2 (Behavioral) | Self-improvement | **Vibe (AI knows you better than you know yourself)** |
| PATH 3 (Platform) | Infrastructure | Power (developers need control) |

**Resolution:** PATH 2 is our north star. Therefore: **Vibe-first.**

---

## The Product Evolution Strategy

### Phase Overview

| Phase | Timeline | What We Build | Why |
|-------|----------|---------------|-----|
| **Phase 1** | Weeks 1-8 | Vibe-only consumer app | Fastest to market, validates demand, starts data collection |
| **Phase 2** | Weeks 9-16 | Add "Advanced Mode" toggle | Power users don't churn, we learn what they actually want |
| **Phase 3** | Months 5-8 | Pro tier + API | Monetization, developer ecosystem begins |
| **Phase 4** | Months 9-12 | White-label + MCP | Platform flywheel kicks in |

---

## Phase 1: Vibe-Only Consumer App (Weeks 1-8)

### Philosophy

**Aggressively vibe. Hide everything.**

> **Important Clarification:** "Vibe" for traders means **"protective but respectful,"** not "friendly and playful." We're an AA sponsor, not a wellness app.

No parsed logic. No "see what the AI is doing." The user experience is simply:

1. "Describe your strategy"
2. "Connect your Tradovate"
3. "We'll protect you"

### Target User

Traders who fail challenges due to emotions, not strategy. They:
- Have failed 2+ prop challenges
- Know what they should do but can't stop themselves
- Will never learn Pine Script
- Need protection from themselves
- **Are addiction-aware** (know they're being irrational but can't stop)
- **Experience the revenge trade cycle** (loss → frustration → bigger trade → tilt)

### UX Principles

| Principle | Implementation |
|-----------|----------------|
| **Zero complexity** | No code, no logic trees, no escape hatches |
| **Trust by default** | AI makes decisions, user is notified after |
| **Behavioral protection as hero** | "We stopped you from revenge trading" > "We executed your order" |
| **Mobile-first** | Traders check on phone, not desktop |

### What We Show

- ✅ Challenge progress (simple progress bars)
- ✅ P&L summary (daily, weekly, overall)
- ✅ AI alerts ("You're approaching daily limit")
- ✅ Trade history (what happened, not why)
- ✅ Behavioral insights (after patterns emerge)
- ✅ **Discipline metrics ("Trades NOT taken", "Account protected", "Discipline streak")**

### What We Hide

- ❌ Parsed strategy logic
- ❌ Technical indicators
- ❌ Order flow details
- ❌ WebSocket status
- ❌ Anything that looks like code

### Success Metrics

- 10+ users signed up
- 5+ strategies created via natural language
- 3+ Tradovate accounts connected
- Data collection running from Day 1
- Users say: "It just works"

---

## Phase 2: Advanced Mode Toggle (Weeks 9-16)

### Philosophy

**Don't build until users demand it.**

Watch user feedback. When power users say "I want to see the logic" or "I want to edit the rules" — that's the signal.

### Target User

Traders who graduated from Phase 1 and want more control. They:
- Trust the AI (proven by weeks of use)
- Want to understand why it works
- May want to tweak parameters
- Are willing to pay more for control

### UX Principles

| Principle | Implementation |
|-----------|----------------|
| **Progressive disclosure** | Default is still vibe, power is opt-in |
| **Same backend** | No separate codebase, just UI layers |
| **Data as insight** | Show patterns, not raw data |
| **Trust maintained** | Post-trade transparency, not pre-trade control |

### What Advanced Mode Unlocks

- ✅ Parsed strategy view (read-only initially)
- ✅ Indicator values when trades executed
- ✅ Tilt score breakdown (what triggered it)
- ✅ Session performance heatmaps
- ✅ Setup grade explanations
- ✅ **Friction patterns (10-second countdown for revenge trades)**
- ✅ **Pattern mirror ("You've done this 4 times, lost $X each time")**
- ✅ **Post-session behavioral review**

### What Remains Hidden

- ❌ Real-time indicator feeds
- ❌ Pre-trade override capability (Phase 3)
- ❌ API access (Phase 3)
- ❌ Raw behavioral data export (Phase 3)

### Success Metrics

- 20% of users enable Advanced Mode
- Power users don't churn
- Feature requests inform Phase 3
- Users say: "Now I understand why it saved me"

---

## Phase 3: Pro Tier + API (Months 5-8)

### Philosophy

**Monetization requires control.**

Pro users pay for:
1. More control over execution
2. API access for custom integrations
3. Data exports for personal analysis
4. Priority support

### Target User

- Semi-technical traders who want to build on top of PropTraderAI
- Funded traders (passed challenges) who want to scale
- Traders who use other tools (TradingView, NinjaTrader) and want integration

### Pro Tier Features

| Feature | Description |
|---------|-------------|
| **Strategy editing** | Modify parsed logic, adjust parameters |
| **Pre-trade confirmation** | Option to approve before execution |
| **API access** | REST API for custom integrations |
| **Webhook support** | Receive trade notifications programmatically |
| **Data export** | CSV/JSON export of trades, behavioral data |
| **Multi-account** | Manage multiple Tradovate accounts |

### Pricing (Preliminary)

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Vibe mode, 1 account, basic alerts |
| **Pro** | $49/mo | Advanced mode, API, data export |
| **Team** | $149/mo | Multi-account, priority support, custom integrations |

### Success Metrics

- 10% conversion to Pro tier
- 5+ external integrations using API
- $5,000+ MRR
- Developer community forming

---

## Phase 4: White-Label + MCP (Months 9-12)

### Philosophy

**Become infrastructure, not just product.**

When prop firms depend on your platform, you've won.

### Target Users

- **Prop firms:** Want to offer AI monitoring to their traders
- **Developers:** Want to build trading tools using your API
- **AI assistants:** ChatGPT, Claude, Gemini users asking trading questions

### Platform Components

| Component | Purpose | Revenue Model |
|-----------|---------|---------------|
| **MCP Servers** | Free tools for AI assistants | Lead generation |
| **Public API** | Developer integrations | Usage-based pricing |
| **White-Label** | Prop firms offer PropTraderAI under their brand | Per-seat licensing |

### Success Metrics

- 1-2 white-label partners live
- 10,000+ MCP tool invocations/month
- 20+ active API keys
- $15,000+ MRR from platform revenue

---

## The Data-First Decision Framework

### For Every Feature Decision, Ask:

> "Does this help us collect more behavioral data faster?"

| Decision | Data Impact | Verdict |
|----------|-------------|---------|
| Add "see parsed logic" in Phase 1? | Adds friction, slows engagement | ❌ Wait for Phase 2 |
| Add tilt alerts immediately? | High engagement, rich behavioral signals | ✅ Build now |
| Add manual trade override? | Users bypass AI, messier data | ❌ Wait for Phase 3 |
| Add challenge tracking dashboard? | Daily engagement, compliance data | ✅ Build now |

### Why Vibe Generates Better Data

| Vibe Users | Power Users |
|------------|-------------|
| Engage more frequently | Debug when things break |
| Generate cleaner data | Override AI decisions |
| Trust AI recommendations | Second-guess everything |
| Core target audience | Edge case audience |

**Vibe users are our moat builders.** Power users pay more but generate messier data.

---

## Building Trust Without Control

### The Trust Paradox

"Traders need to trust AI with real money. Don't they need to see what it's doing?"

### The Solution: Progressive Trust

| Week | Trust Level | What User Sees |
|------|-------------|----------------|
| **Week 1** | Blind trust | "Strategy saved. We'll monitor for you." |
| **Week 2** | Results trust | "We executed 3 trades. Net +$450." |
| **Week 3** | Pattern trust | "We stopped you from trading during your worst hours." |
| **Week 4** | Insight trust | "Here's why you perform better before 11 AM." |

### Trust-Building Features

1. **Paper trading first** — Users see AI work before real money
2. **Post-trade transparency** — Show what happened AFTER execution
3. **Behavioral receipts** — "We prevented a revenge trade at 2:47 PM"
4. **Progressive disclosure** — Unlock insights as trust builds

---

## Implementation Guidelines for Development Team

### UI/UX Rules

1. **Default to hiding complexity** — If in doubt, don't show it
2. **Mobile-first always** — Desktop is secondary
3. **One action per screen** — Don't overwhelm
4. **Celebrate saves, not trades** — "We protected you" > "We executed"
5. **No technical jargon** — "Your strategy" not "Your parsed rule set"

### Copy/Messaging Guidelines

| Instead of... | Say... |
|---------------|--------|
| "Strategy parsed successfully" | "Got it. We'll watch for your setup." |
| "WebSocket connection established" | "Connected to your account" |
| "Tilt score: 72%" | "You might be trading emotionally right now" |
| "Daily loss limit: 78% utilized" | "You're close to your daily limit" |
| "Execution engine active" | "We're watching the market for you" |

### Trader-Specific Messaging (AA Sponsor Voice)

| Situation | Say |
|-----------|-----|
| **Approaching limit** | "87% of daily limit used. One more loss and you're done for the day." |
| **Revenge trade detected** | "This looks like revenge. Same direction, 2x size, 4 minutes after loss. Your call — but I'm logging this." |
| **Win streak** | "5 wins straight. This is when most traders blow it. Stick to your sizing." |
| **Challenge passed** | "Challenge passed. 23 days. 47 trades. 3 near-violations prevented. You did the work." |
| **Pattern detected** | "Trades after 2pm: -$3,400. Your win rate drops 40% in afternoon sessions." |
| **Boredom trading** | "No setup in 45 minutes. Boredom trading detected. Last 3 times: -$890 total." |

### Feature Flags by Phase

```
PHASE_1_FEATURES:
  - natural_language_strategy: true
  - tradovate_oauth: true
  - challenge_tracking: true
  - tilt_alerts: true
  - copilot_mode: true
  - autopilot_mode: true
  - advanced_mode: false  # Phase 2
  - api_access: false     # Phase 3
  - strategy_editing: false # Phase 3

PHASE_2_FEATURES:
  - advanced_mode: true
  - parsed_logic_view: true
  - indicator_breakdown: true
  - session_heatmaps: true
  - strategy_editing: false # Phase 3

PHASE_3_FEATURES:
  - strategy_editing: true
  - api_access: true
  - data_export: true
  - webhooks: true
  - multi_account: true
```

---

## Competitive Positioning

### The Analogy

| Coding Space | Trading Space | Our Position |
|--------------|---------------|--------------|
| VSCode | TrendSpider | Power-first (not us) |
| Cursor | — | Power with AI assist (not us yet) |
| Lovable/Bolt | Capitalise.ai | **Vibe-first (THIS IS US)** |

### Our Unique Position

We're building the **"Lovable for prop traders"** — but with a behavioral intelligence layer that nobody else has.

- **TrendSpider:** Power users who want control
- **Capitalise.ai:** Generic retail traders
- **PropTraderAI:** Prop traders who need protection from themselves

---

## Summary

### The One-Line Strategy

> **"Vibe-only for v1. Power available for v2. Platform for v3."**

### The Decision Filter

> **"Does this help us collect more behavioral data faster?"**

### The User Promise

> **"Describe your strategy. We protect you from yourself."**

---

## Document Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 7, 2026 | Initial document |

**Document prepared by: PropTrader AI Strategy Team**  
**Last updated: January 7, 2026**

---

*This document should be referenced for all UI/UX decisions, feature prioritization, and development planning. When in doubt, default to vibe.*
