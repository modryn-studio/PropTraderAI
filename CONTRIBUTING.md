# Contributing to PropTraderAI

Fork freely — no permission needed. PRs welcome.

---

## What This Project Is

PropTraderAI is a natural language trading automation platform for prop traders. Traders describe their strategy in plain English, the AI parses it into executable rules, and the system monitors compliance with prop firm challenge limits.

There are three strategic paths:
- **PATH 1 (Execution)** — Natural language → AI-executed trades. Phase 1A (strategy builder) is complete. Phase 1B (live execution, WebSocket, autopilot) is in progress.
- **PATH 2 (Behavioral Intelligence)** — Pattern detection, tilt prevention. Data logging is live; UI features are deferred to Phase 2.
- **PATH 3 (Platform)** — Public API, white-label. Future.

---

## Before You Start

Read these to understand the architecture decisions:
- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) — Core principles, UX philosophy, code conventions
- [`docs/00_OVERVIEW/canonical_schema_architecture.md`](docs/00_OVERVIEW/canonical_schema_architecture.md) — How strategy parsing works (critical for execution/strategy work)

---

## Architecture You Must Know

### Canonical Schema (strategy/execution work)
All strategy parsing follows a 4-layer pipeline:
```
Claude AI → claudeToCanonical() → Zod validation → Pattern compilers
```
Never bypass Zod validation or parse text inside compilers. See `src/lib/execution/canonical-schema.ts`.

### Feature Flags
All features are gated by phase in `src/config/features.ts`. Don't enable Phase 2+ flags — they exist but are intentionally hidden.

### Behavioral Logging
Every meaningful user action should call `logBehavioralEvent()` from `src/lib/behavioral/logger.ts`. This is non-negotiable — the data collection is the product.

### TypeScript
Strict mode, no `any` types.

---

## What's Open for Contributions

Good areas to contribute:
- **Performance** (Issue #24) — bundle optimization, image optimization, React memoization, dynamic imports
- **UI polish** — Landing page, dashboard components, mobile responsiveness
- **Tests** — Coverage for strategy parsing, canonical compilers, utility functions
- **Bug fixes** — Anything reproducible with clear steps

Please avoid (for now):
- **Database schema changes** — Migrations need careful coordination
- **Phase 1B execution layer** — Active development in progress
- **Feature flag changes** — Don't enable hidden features

---

## PR Guidelines

- One focused change per PR — don't bundle unrelated things
- Match the existing code style and naming conventions (see copilot-instructions.md)
- All commits go to a branch on your fork, then PR to `main` here

---

## Code Conventions

```
Components:     PascalCase     (StrategyCard, DashboardShell)
Functions:      camelCase      (parseStrategy, logBehavioralEvent)
API routes:     kebab-case     (/api/strategy/parse)
DB tables:      snake_case     (behavioral_data, user_strategies)
Env vars:       SCREAMING_SNAKE_CASE
```

Monospace font is for P&L numbers only. Everything else uses Inter. Colors: `#10b981` for profit, `#ef4444` for loss — don't repurpose these.

---

## Questions

Open an issue or comment on an existing one.
