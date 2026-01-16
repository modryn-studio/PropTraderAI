# Strategy Validation Layer: Architecture Decisions

> **Last Updated:** January 16, 2026  
> **Status:** Active Development

## Overview

This document captures the key architectural decisions for the Strategy Validation Layer — PropTraderAI's core system for parsing natural language trading strategies into executable rules.

---

## Decision 1: Generate-First with Transparent Defaults

**Date:** January 2026  
**Status:** ✅ Implemented

### Context
Traditional strategy builders use exhaustive questioning (10+ messages) to gather all parameters before generating a strategy. Research across 10+ AI creation tools (Cursor, Claude Artifacts, Suno, Bolt.new) showed this pattern frustrates users.

### Decision
Adopt **"Generate-First with Transparent Defaults"** approach:
- Target: 1-2 messages to complete strategy (down from 10+)
- Generate complete strategy with safe defaults immediately
- Ask only ONE critical question inline (stop loss)
- Show editable strategy card for refinements

### Rationale
- **Speed to first working output** > exhaustive upfront questioning
- Successful AI tools prioritize "getting to 'a-ha!' moments faster"
- Trading users have "funneling" pattern: known need, unclear articulation

### Trade-offs
- ✅ Faster user experience
- ✅ Higher completion rates
- ⚠️ Defaults might not match user intent (mitigated by clear editing)
- ⚠️ Requires good default selection logic

### Source
Research: [vibe_coding_patterns_FINAL.md](../../06_RESEARCH/strategy_builder_ux/vibe_coding_patterns_FINAL.md)

---

## Decision 2: Rapid Flow Chat System (vs Two-Pass Architecture)

**Date:** January 2026  
**Status:** ✅ Implemented

### Context
Original implementation used a Two-Pass Architecture:
1. First pass: Parse strategy
2. Second pass: Validate and ask clarifications

This caused latency issues and confusing UX.

### Decision
Replace with **Rapid Flow Chat System**:
- Single-pass strategy generation
- Inline clarification questions
- Streaming responses for perceived speed

### Rationale
- Two-pass was too slow (users waited twice)
- Single-pass with streaming feels faster
- Clarification questions integrated into natural conversation

### Trade-offs
- ✅ Faster perceived response time
- ✅ More natural conversation flow
- ⚠️ More complex prompt engineering
- ⚠️ Harder to separate concerns

### Legacy
Two-Pass Architecture docs archived in: `archive/2025-12-chat-system-v1/`

---

## Decision 3: Five Non-Negotiable Strategy Components

**Date:** January 2026  
**Status:** ✅ Implemented

### Context
What makes a "complete" trading strategy? Research into professional prop firm standards identified consistent requirements.

### Decision
Every strategy MUST have these 5 components before execution:

1. **Entry Criteria** — Specific, measurable conditions
2. **Stop-Loss** — Maximum acceptable loss (not "mental stops")
3. **Profit Target** — Gain realization point (1.5R - 3R standard)
4. **Position Sizing** — Formula-based (1-2% risk standard)
5. **Instrument** — Exact contracts (ES, NQ, MES, etc.)

### Rationale
- Prop firms require these for challenge compliance
- Missing any component = guaranteed blown challenge
- "Mental stops" fail under emotional pressure

### Trade-offs
- ✅ Complete strategies that pass prop firm requirements
- ✅ Protects traders from incomplete planning
- ⚠️ Might feel restrictive to experienced traders
- ⚠️ Requires validation UI to guide completion

---

## Decision 4: Prop Firm Rules as JSON Data

**Date:** January 2026  
**Status:** ✅ Implemented

### Context
Different prop firms have different rules (daily loss limits, drawdown rules, scaling plans). Strategies must validate against specific firm requirements.

### Decision
Store prop firm rules as JSON files in `data/integrations/claude-skills/`:
- Each firm has a separate JSON file
- Validation layer loads and applies firm-specific rules
- Easy to update when firms change rules

### Rationale
- Firm rules change frequently (must be easy to update)
- JSON is machine-readable and human-editable
- Separation of data from code

### Supported Firms
- TopStep (`topstep.json`)
- MyFundedFutures (`myfundedfutures.json`)
- Tradeify (`tradeify.json`)
- Alpha Futures (`alpha-futures.json`)
- FTMO (`ftmo.json`)
- FundedNext (`fundednext.json`)

---

## Decision 5: Mobile-First, One Thing at a Time

**Date:** January 2026  
**Status:** ✅ Implemented

### Context
PropTraderAI's Phase 1 UX philosophy is "Vibe-First" — aggressive simplicity for mobile users.

### Decision
Strategy builder follows mobile-first patterns:
- Swipeable cards, not multi-parameter forms
- Sequential editing, not simultaneous decisions
- ONE mode only (no "Advanced" toggle until Phase 2)

### Rationale
- Target users are mobile traders
- Desktop is secondary for Phase 1
- Complexity kills completion rates

### Trade-offs
- ✅ Higher mobile conversion
- ✅ Simpler mental model
- ⚠️ Power users might feel limited
- ⚠️ Advanced features deferred to Phase 2

---

## Decision 6: Claude 3.5 Sonnet for Parsing

**Date:** January 2026  
**Status:** ✅ Implemented

### Context
Need AI model for natural language → structured strategy parsing.

### Decision
Use **Anthropic Claude 3.5 Sonnet**:
- Best balance of speed, cost, and accuracy for this use case
- Supports streaming for perceived speed
- Good at structured output (JSON)

### Rationale
- GPT-4 too slow/expensive for real-time parsing
- Claude 3.5 Haiku too limited for complex strategy understanding
- Sonnet hits the sweet spot

### Trade-offs
- ✅ Fast enough for real-time chat
- ✅ Accurate structured output
- ⚠️ Anthropic API dependency
- ⚠️ Cost per parse (~$0.01-0.02)

---

## Future Decisions (Planned)

- **Smart Tools Integration** — How to invoke context-aware tools during parsing
- **Copilot vs Autopilot Mode** — When to require user approval vs autonomous execution
- **Behavioral Data Logging** — What to log during strategy creation

---

## Related Documents

- [README.md](README.md) — Overview and quick start
- [Implementation Guide](01_Rapid_Flow_Chat_System/STRATEGY_BUILDER_UNIFIED_GUIDE.md) — Current implementation
- [Edge Case Handling](01_Rapid_Flow_Chat_System/EDGE_CASE_HANDLING_GUIDE.md) — How we handle edge cases
- [Research](../../06_RESEARCH/strategy_builder_ux/vibe_coding_patterns_FINAL.md) — Original UX research
