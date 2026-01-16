# Strategy: The Three Paths

> **Last Updated:** January 16, 2026

## Overview

PropTraderAI is built on three strategic paths. Every feature, file, and function must align with one of these paths.

**Key Insight:** PATH 2 (Behavioral Intelligence) is our actual product. PATH 1 (Execution) is just the delivery mechanism.

## Quick Reference

| Path | Purpose | Priority |
|------|---------|----------|
| [PATH 1: Execution Engine](path1_execution_engine.md) | Natural language → AI executes trades | Phase 1A/1B |
| [PATH 2: Behavioral Intelligence](path2_behavioral_intelligence.md) | Learn patterns, prevent tilt, protect traders | **THE PRODUCT** |
| [PATH 3: Platform Infrastructure](path3_platform_infrastructure.md) | MCP servers, APIs, white-label | Phase 3+ |

## Decision Filter

Before implementing ANY feature, ask:

> **"Does this help us collect more behavioral data faster?"**

If yes → prioritize. If no → defer unless critical for PATH 1.

## The Marketing Reality

**We sell:** Passing challenges and getting funded (RESULTS)  
**We deliver:** Behavioral intelligence that prevents self-sabotage (MECHANISM)

PATH 2 is our moat, NOT our headline. Sell the outcome, deliver the mechanism.

## Documents in This Folder

- [path1_execution_engine.md](path1_execution_engine.md) — Natural language to trade execution
- [path2_behavioral_intelligence.md](path2_behavioral_intelligence.md) — The actual product (behavioral patterns, tilt detection)
- [path3_platform_infrastructure.md](path3_platform_infrastructure.md) — MCP servers, APIs, platform growth
