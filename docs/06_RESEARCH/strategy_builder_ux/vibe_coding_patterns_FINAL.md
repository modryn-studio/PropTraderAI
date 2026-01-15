# PropTraderAI Strategy Builder UX: Phase 1 Implementation Guide

**Status:** Finalized (Issue #4)  
**Last Updated:** January 15, 2026  
**Consensus:** Agent 1 (Claude Desktop) + Agent 2 (VS Code Copilot)

---

## Executive Summary

PropTraderAI's strategy builder should adopt a **"Generate-First with Transparent Defaults"** approach, achieving **1-2 message completion** (down from current 10+ messages). Research across 10+ AI creation tools (Cursor, Claude Artifacts, Suno, Bolt.new, Replit) confirms that successful platforms prioritize **speed to first working output** over exhaustive upfront questioning.

### Critical Phase 1 Constraints

1. **Mobile-first** — Swipeable cards, not multi-parameter forms
2. **One thing at a time** — Sequential editing, not simultaneous decisions
3. **High-stakes awareness** — Trading ≠ creative tools (money at risk)
4. **Aggressive simplicity** — ONE mode only (no "Advanced" toggle until Phase 2)

### The Core Pattern

```
User describes strategy (Message 1)
  ↓
Generate complete strategy with safe defaults
  ↓
Ask ONE critical question inline (stop loss)
  ↓
Show editable strategy card (Message 2, optional)
```

**Max messages: 1-2** (not 10+)

---

## Research Findings: What Works Across AI Creation Tools

### The Dominant Pattern: Assume First, Refine After

Successful tools across multiple domains share a common approach:

| Tool | Primary Pattern | Key Insight |
|------|----------------|-------------|
| **Suno** | Simple/Custom tabs | Users see what AI would choose (transparency builds trust) |
| **Claude Artifacts** | One-shot generation → iterate | "Getting to 'a-ha!' moments faster" > perfect first attempt |
| **Cursor** | 4 autonomy modes | Users self-identify expertise through mode choice |
| **Bolt.new** | Plan vs Build separation | Natural clarification checkpoint without back-and-forth |
| **v0 by Vercel** | Generate → visual edit | Separate "what to build" from "how it looks" |
| **Replit Agent** | Autonomy level selection | Fast Build (3-5 min) vs Full Build (10+ min) |

### Nielsen Norman Group Research: User Types

Study of **425 AI conversations** identified user patterns:

| Type | User Need | PropTraderAI Target? |
|------|-----------|---------------------|
| Search Query | Quick factual lookup | ❌ Not our use case |
| **Funneling** | **Known need, unclear articulation** | **✅ YES (25-75% complete strategies)** |
| Exploring | Learning/discovery | 🟡 Phase 2+ |
| Pinpointing | Specific, well-defined | 🟡 Power users (Phase 2+) |

**PropTraderAI's target:** "Funneling" users who know their pattern but can't articulate every parameter.

### Progressive Disclosure Best Practices

Across all tools studied:

- **Start with essentials** (1-2 inputs max)
- **2-3 layers maximum** (more = frustration)
- **Clear triggers** ("Show more," tooltips, mode toggles)
- **Visual differentiation** (gray for defaults, black for user-specified)

---

## Phase 1 Implementation: Detailed Specification

### 1. Message Flow (Finalized)

**Target: 1-2 messages to complete strategy**

#### Message 1: User Describes Strategy
```
User: "ES opening range breakout"

Claude: "Got it. Building your ES opening range breakout strategy..."
[2 second pause with loading indicator]
"Strategy ready. One quick thing: where's your stop loss?"

[Below 15-min range low] [Fixed: 10 ticks] [Fixed: 20 ticks] [Other]
```

#### Message 2: User Confirms Critical Parameter (Optional)
```
User: [taps "Below 15-min range low"]

Claude: "Perfect. Strategy created."
[Shows editable strategy card with all parameters]
```

#### Alternative: Zero Clarification Questions
```
User: "ES opening range breakout with 10-tick stops"

Claude: "Strategy created."
[Shows editable strategy card immediately]
```

**Key principles:**
- **Assume most common instrument** (ES for futures, SPY for equities)
- **Only ask if truly ambiguous** (stop loss placement can't be safely assumed)
- **Show result immediately** if all critical params clear from description

---

### 2. Mobile-First Pattern: Sequential Swipeable Cards

**Desktop approach (multi-parameter visible):**
```
┌─────────────────────────────────────┐
│ ES Opening Range Breakout           │
│                                     │
│ Entry: Long above 15-min high      │
│ Stop: Below 15-min range low       │
│ Target: 2:1 R:R (default) [edit]   │
│ Risk: 1% per trade (default) [edit]│
│ Session: 9:30-12pm ET (default)    │
│                                     │
│ [Save Strategy]                     │
└─────────────────────────────────────┘
```

**Mobile approach (one card at a time):**
```
[Card 1/5: Pattern]
┌────────────────────┐
│ Opening Range      │
│ Breakout           │
│                    │
│ ✓ Confirmed        │
│                    │
│ [< Back] [Next >]  │
└────────────────────┘

[Swipe right →]

[Card 2/5: Entry]
┌────────────────────┐
│ Entry Trigger      │
│                    │
│ Long above 15-min  │
│ high               │
│                    │
│ ✓ [Confirm]        │
└────────────────────┘

[Swipe right →]

[Card 3/5: Stop Loss]
┌────────────────────┐
│ Stop Loss          │
│                    │
│ Below 15-min       │
│ range low          │
│                    │
│ ⚠️ Needs confirm   │
│ [Confirm] [Change] │
└────────────────────┘
```

**Sticky action bar (always visible at bottom):**
```
┌────────────────────────────────┐
│ ✓ 3/5 Complete                 │
│ [Review All] [Save Strategy]   │
└────────────────────────────────┘
```

**Design principles:**
- **One card = one concept** (not one screen = all concepts)
- **Swipe to navigate** (feel like Tinder/Instagram stories)
- **Visual progress indicator** (3/5 cards completed)
- **Sticky action bar** (always know where Save button is)
- **Critical params require explicit tap** (stop loss can't be auto-confirmed)

---

### 3. Critical vs Optional Parameters

**Never Default (Phase 1):**

| Parameter | Why Critical | UX Treatment |
|-----------|--------------|--------------|
| **Stop loss value/placement** | Wrong assumption = blown account | Always ask or require confirmation |
| **Entry trigger** (if ambiguous) | Wrong direction/timing = losses | Ask if unclear from description |
| **Instrument** (if multi mentioned) | Wrong market = invalid strategy | Ask if user mentions >1 instrument |

**Always Default (Phase 1):**

| Parameter | Default Value | Rationale | UX Treatment |
|-----------|---------------|-----------|--------------|
| **Target** | 2:1 R:R | Industry standard for swing trades | Show with "(default)" badge, editable |
| **Position sizing** | 1% risk per trade | Conservative, prop firm compliant | Show calculation, editable |
| **Session** | NY hours (9:30am-4pm ET) | Covers most active trading | Show with timezone, editable |
| **Direction** | Both long/short | Gives flexibility | Show both setups, user can disable one |

**Transparency requirement:**
```
Every default shows inline badge:
Target: 2:1 R:R (default - tap to change)
       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

---

### 4. High-Stakes Adaptation: Trading vs Creative Tools

#### The Critical Difference

| Creative Tool (Suno, Figma AI) | Trading Tool (PropTraderAI) |
|--------------------------------|------------------------------|
| Wrong song genre → regenerate, no harm | Wrong stop loss → blown account |
| "Close enough" is fine | "Close enough" is catastrophic |
| Speed prioritized over precision | Precision prioritized within speed |
| Users expect iteration | Users expect execution |

#### How This Changes UX

**For Suno:**
```
Generate song with ALL params defaulted
User iterates if they don't like it
Cost of bad default: Regeneration time
```

**For PropTraderAI:**
```
Generate strategy with SAFE params defaulted
User confirms CRITICAL params before live trading
Cost of bad default: Real money loss
```

#### Concrete Adaptations

1. **Show the math**
   ```
   Risk: 1% per trade
   ↓
   On your $50,000 account:
   - Max risk per trade: $500
   - With 10-tick stop on ES: 1 contract
   ```

2. **Paper trading first**
   ```
   [Save Strategy]
     ↓
   "Test this strategy in simulation before going live?"
   [Paper Trade] [Live Trade]
   ```

3. **Explicit risk confirmation**
   ```
   Stop Loss: 10 ticks
   ⚠️ This means you'll exit after $50 loss per contract
   
   [I Understand] [Change Stop]
   ```

4. **Conservative defaults**
   ```
   ✅ 1% risk (not 2-5%)
   ✅ 2:1 R:R (not 5:1 or 1:1)
   ✅ Standard session hours (not 24/7)
   ```

---

### 5. Handling Clarification Questions

**Problem:** Current flow asks 10+ questions sequentially.

**Solution:** Ask ZERO questions (prefer assume + edit) OR ask ONE inline question.

#### Option A: Assume + Allow Edit (Preferred)

```
User: "I trade opening range breakout"

Claude: "Creating ES opening range breakout..."
(assumes ES = most common futures contract)

[Strategy card shows]
Instrument: ES (tap to change to NQ, CL, etc.)
Entry: Long above 15-min high
Stop: ⚠️ Needs confirmation
```

**When to use:** 95% of cases. Only exception = truly ambiguous critical param.

#### Option B: Single Inline Question (Only if Truly Ambiguous)

```
User: "I trade breakout on the opening range"

Claude: "Which contract?"
[ES] [NQ] [CL] [Other]

(Next step happens AFTER this is answered, not in same message)
```

**When to use:** User mentions "breakout" but doesn't specify if long/short/both AND it fundamentally changes the strategy logic.

#### ❌ NEVER DO THIS (Phase 1):

```
❌ Multi-question message:
"I need two quick clarifications:
- Which instrument? [ES] [NQ] [CL] [Other]
- Your stop loss placement isn't clear—do you mean [10 ticks from entry]
  or [below the breakout candle low]?

Everything else I've assumed: 2:1 target, 1% risk, NY session."
```

**Why bad:** Still forces 2 decisions at once. Violates "one thing at a time."

---

### 6. Smart Defaults That Build Trust

Research shows successful defaults:

- **Serve 95%+ of users** without change
- **Are visible with edit option** for critical parameters
- **Are collapsed but accessible** for secondary options
- Use **visual differentiation** (gray for defaults, black for user-specified)

#### Implementation Pattern

```html
<div class="strategy-param">
  <label>Target</label>
  <div class="param-value">
    <span class="value">2:1 R:R</span>
    <span class="badge badge-default">default</span>
    <button class="edit-btn">change</button>
  </div>
  <div class="param-explanation">
    Industry standard for swing trades. You'll aim for $2 profit for every $1 risked.
  </div>
</div>

<div class="strategy-param critical">
  <label>Stop Loss</label>
  <div class="param-value">
    <span class="value">Below 15-min range low</span>
    <span class="badge badge-confirmed">✓ confirmed</span>
  </div>
</div>
```

**Visual hierarchy:**
- Critical params (confirmed) → Green checkmark, bold
- User-edited params → Black text, no badge
- Default params (unedited) → Gray badge, blue "change" link

---

## Phase Mapping: Now vs Later

| Pattern/Feature | Phase 1 (Weeks 1-8) | Phase 2 (Weeks 9-16) | Phase 3+ (Months 5+) |
|-----------------|---------------------|----------------------|----------------------|
| **Modes** | Simple only (no toggle) | Add "Advanced Mode" toggle | Custom mode, pro features |
| **Parameter Display** | Editable cards post-generation | Collapsible sections in Advanced | Full parameter grid |
| **Clarification Questions** | Assume + allow edit (0-1 questions) | Ask 1-2 critical questions | Structured multi-step wizard |
| **Plan Preview** | No preview (instant generation) | Optional preview for review | Full plan-before-execute mode |
| **Defaults Transparency** | Inline badges on cards | Expandable "Why this default?" | Defaults preference panel |
| **Mobile Adaptation** | Swipeable single-card editing | Multi-parameter list view | Desktop-equivalent complexity |
| **Memory/Preferences** | None (fresh each time) | Remember instrument preference | Full preference profiles |
| **Strategy Editing** | Regenerate only | Edit parameters inline | Full visual editor |

### Why Phase 1 is MORE Aggressive Than Research Tools

**Cursor:** Launched with 4 modes on Day 1  
**Suno:** Has Simple/Custom tabs from launch  
**Bolt.new:** Plan/Build toggle from Day 1  

**PropTraderAI Phase 1:** ONE mode, ZERO toggles, INSTANT generation

We're going **more aggressive than even the simplest tools studied** because:
1. Target users need speed (challenge accounts blow up fast)
2. Mobile-first constraint requires simplicity
3. High-stakes context demands clear defaults
4. "One thing at a time" mandate eliminates multi-mode complexity

---

## Anti-Patterns to Avoid

### 1. ❌ Exhaustive Upfront Questioning
```
❌ "What instrument?"
❌ "What's your entry?"
❌ "What's your stop?"
❌ "What's your target?"
❌ "What's your risk per trade?"
❌ "What session do you trade?"

Result: 10+ messages, user abandons
```

### 2. ❌ Hidden Defaults That Surprise
```
❌ User creates strategy
❌ Starts live trading
❌ Discovers it's trading 24/7 (not just NY session)
❌ "I didn't know it would do that!"

Result: Distrust, account blown
```

### 3. ❌ Chat-Only Interface
```
❌ All parameters communicated via text
❌ No visual parameter display
❌ No direct editing (must re-describe in chat)

Result: Slow iteration, frustration
```

### 4. ❌ Oversimplified for Professionals
```
❌ "Just tell us your pattern!"
❌ [Hides all technical details]
❌ No way to verify logic
❌ No access to parsed rules

Result: "This is a toy, not a tool"
```

### 5. ❌ Multiple Decisions Per Screen (Phase 1)
```
❌ Showing 6 parameters at once
❌ Requiring user to validate all simultaneously
❌ "Here's your strategy, check everything"

Result: Decision fatigue, abandonment
```

---

## Recommended Implementation Order

### Week 1-2: Core Generation Flow
1. Natural language input → Claude API parsing
2. Strategy generation with safe defaults
3. Single-question clarification (if needed)
4. Display strategy card (desktop)

### Week 3-4: Mobile Adaptation
1. Swipeable card component
2. Sticky action bar
3. Progress indicator (X/Y complete)
4. Touch-optimized parameter editing

### Week 5-6: Parameter Editing
1. Inline editing for each parameter
2. Default badge display
3. Confirmation UI for critical params
4. "Change" link → edit modal

### Week 7-8: Risk Display & Confirmation
1. Position sizing calculator
2. Risk math display ($X per contract)
3. Paper trading toggle
4. Explicit risk confirmation before live

### Phase 2 Planning (Week 9+)
1. Advanced Mode toggle design
2. Custom mode parameter grid
3. Plan preview functionality
4. Memory/preference system

---

## Success Metrics (Phase 1)

**Primary:**
- ✅ Average messages to strategy creation: **1-2** (down from 10+)
- ✅ Mobile completion rate: **>80%** (currently ~30%)
- ✅ Time to first strategy: **<60 seconds** (currently 5-10 minutes)

**Secondary:**
- ✅ Default acceptance rate: **60-80%** for optional params
- ✅ Critical param confirmation rate: **100%** (no skipping)
- ✅ Paper trading adoption: **>50%** of new strategies

**Quality:**
- ✅ Zero violations due to misunderstood defaults
- ✅ User satisfaction: "It just works" feedback
- ✅ Strategy accuracy: >95% match user intent

---

## Appendix: Tool-by-Tool Analysis

### Cursor AI
**Pattern:** 4 autonomy modes (Tab, Cmd+K, Chat, Agent)  
**Lesson:** Users self-identify expertise through mode choice  
**Phase 1 Adaptation:** ONE mode only, defer autonomy levels to Phase 2  

### Claude Artifacts
**Pattern:** Generate first, refine after  
**Lesson:** "Getting to 'a-ha!' moments faster" > perfect first attempt  
**Phase 1 Adaptation:** Instant generation with editable result  

### Suno
**Pattern:** Simple/Custom tabs with transparent defaults  
**Lesson:** Users see what AI would choose (builds trust)  
**Phase 1 Adaptation:** Simple mode only, Custom deferred to Phase 2  

### Bolt.new
**Pattern:** Plan Mode vs Build Mode  
**Lesson:** Natural clarification checkpoint without back-and-forth  
**Phase 1 Adaptation:** No plan preview, defer to Phase 2  

### v0 by Vercel
**Pattern:** Natural language → visual editing  
**Lesson:** Separate "what to build" from "how it looks"  
**Phase 1 Adaptation:** Chat creates structure, card editing handles specifics  

### Replit Agent
**Pattern:** Autonomy level selection (Fast/Full/Max)  
**Lesson:** Explicit user control over AI involvement  
**Phase 1 Adaptation:** Fixed autonomy (guided), add levels in Phase 2  

---

## Conclusion

PropTraderAI's Phase 1 strategy builder should be **more aggressive than any tool studied** in its pursuit of simplicity:

- **Message target:** 1-2 (not 2-3, not 10+)
- **Modes:** One (not tabs, not toggles)
- **Mobile:** Swipeable cards (not multi-parameter grids)
- **Defaults:** Safe + transparent (not hidden, not exhaustive)
- **Clarification:** Assume + edit (not multi-question flows)

The research validates "generate-first with transparent defaults" as the winning pattern. Phase 1 execution requires respecting **mobile-first, high-stakes, one-thing-at-a-time constraints** that differentiate PropTraderAI from creative tools.

**Custom modes, plan previews, and advanced features belong in Phase 2+.** Phase 1 succeeds by doing ONE thing exceptionally well: getting traders from idea to executable strategy in under 60 seconds.

---

**Status:** Ready for implementation  
**Next:** Implement Week 1-2 core generation flow  
**Issue:** #4 (closed after final doc merge)
