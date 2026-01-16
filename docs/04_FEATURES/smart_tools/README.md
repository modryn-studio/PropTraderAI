# Smart Tools

> **Last Updated:** January 16, 2026

## Overview

Smart Tools are AI-powered trading utilities that enhance trader decision-making without requiring manual calculations. They integrate with the strategy validation layer to provide context-aware recommendations.

## Quick Start

Smart Tools are accessed through natural language in the strategy builder:
- "Size my position for 1% risk on ES"
- "When should I trade based on my historical performance?"
- "What's the volatility on NQ right now?"

## Current Tools

| Tool | Status | Description |
|------|--------|-------------|
| Position Sizing | 🟡 In Progress | Risk-based position calculation |
| Session Timing | 📋 Planned | Optimal trading windows |
| Volatility Check | 📋 Planned | Real-time volatility assessment |
| Setup Validation | 📋 Planned | Pattern matching against historical winners |

## Documents in This Folder

- [smart_tools.md](smart_tools.md) — Core smart tools architecture
- [4_remaining_tools_spec.md](4_remaining_tools_spec.md) — Specs for planned tools
- [testing.md](testing.md) — Testing strategy for smart tools

## Deep Dive

See [smart_tools.md](smart_tools.md) for full architecture and implementation details.

## Related

- [Strategy Validation Layer](../strategy_validation_layer/) — Parent system that invokes smart tools
- [Claude Skills Integration](../../05_INTEGRATIONS/claude_skills/) — AI backend for tool execution
