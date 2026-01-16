# Smart Tools: Architecture Decisions

> **Last Updated:** January 16, 2026  
> **Status:** In Development

## Overview

This document captures the key architectural decisions for Smart Tools — AI-powered trading utilities that enhance trader decision-making.

---

## Decision 1: Tools Invoked via Natural Language

**Date:** January 2026  
**Status:** 🟡 In Progress

### Context
How should traders access smart tools? Options: dedicated UI buttons, command syntax, or natural language detection.

### Decision
Smart tools are invoked through **natural language detection** during strategy building:
- No special commands or buttons required
- Claude detects intent and invokes appropriate tool
- Results inline in conversation

### Examples
- "Size my position for 1% risk on ES" → Position Sizing Tool
- "When should I trade?" → Session Timing Tool
- "What's volatility on NQ?" → Volatility Check Tool

### Rationale
- Matches PropTraderAI's "natural language first" philosophy
- Lower friction than learning commands
- Feels like conversation, not software

### Trade-offs
- ✅ Frictionless access
- ✅ Discoverable through conversation
- ⚠️ Ambiguity in intent detection
- ⚠️ Users might not know tools exist

---

## Decision 2: Position Sizing as First Tool

**Date:** January 2026  
**Status:** 🟡 In Progress

### Context
Which tool to build first?

### Decision
**Position Sizing Tool** is the priority:
- Input: Account size, risk percentage, stop loss distance, instrument
- Output: Exact position size (contracts/lots)

### Rationale
- Most common mistake: wrong position size
- Directly prevents blown challenges
- Clear inputs/outputs (less ambiguity)

### Calculation
```
Position Size = (Account Size × Risk %) / (Stop Loss Ticks × Tick Value)
```

---

## Decision 3: Tools Return Structured Data, Not Just Text

**Date:** January 2026  
**Status:** 📋 Planned

### Context
Should tools return plain text responses or structured data?

### Decision
Tools return **structured JSON** that the UI can render appropriately:
- Position size → number + unit
- Session timing → time ranges with confidence
- Volatility → number + percentile

### Rationale
- Enables rich UI rendering (not just text)
- Allows saving/referencing tool outputs
- Supports future automation (use output in rules)

### Trade-offs
- ✅ Better UI possibilities
- ✅ Machine-readable outputs
- ⚠️ More complex tool implementation
- ⚠️ Need UI components for each tool type

---

## Future Decisions (Needed)

- **Tool Chaining** — Can one tool's output feed another?
- **Caching** — How long are tool results valid?
- **Fallbacks** — What happens when a tool fails?

---

## Related Documents

- [README.md](README.md) — Overview and tool list
- [smart_tools.md](smart_tools.md) — Detailed specifications
- [Strategy Validation Layer](../strategy_validation_layer/) — Parent system
