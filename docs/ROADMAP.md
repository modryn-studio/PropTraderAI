# PropTraderAI — Master Roadmap

**Version:** 1.0  
**Created:** January 7, 2026  
**Status:** Pre-Development

---

## Overview

This roadmap consolidates PATH 1, PATH 2, and PATH 3 from the Build Specification into a phased execution plan.

| Phase | Maps To | Core Outcome |
|-------|---------|--------------|
| Phase 0 | Foundation | Tradovate API validated, project scaffolded |
| Phase 1A | PATH 1 (Copilot) | User-approved trade execution |
| Phase 1B | PATH 1 (Autopilot) | Autonomous trade execution |
| Phase 2 | PATH 2 | Behavioral intelligence & tilt detection |
| Phase 3 | PATH 3 | Platform APIs, MCP servers, white-label |

---

## Phase 0: Foundation

**Goal:** Validate critical dependencies, establish project infrastructure.

- [ ] Tradovate API access approval
- [ ] Tradovate OAuth flow validation (standalone test)
- [ ] Tradovate WebSocket connection test
- [ ] Tradovate order placement test (paper/demo)
- [ ] Next.js 14 + TypeScript project setup
- [ ] Supabase project & database schema
- [ ] Environment configuration (secrets, API keys)
- [ ] Vercel deployment pipeline
- [ ] Claude API integration test

---

## Phase 1A: PATH 1 — Copilot Mode

**Goal:** Natural language strategy → user-approved execution.

### Authentication & Accounts
- [ ] Supabase auth (magic link or OAuth)
- [ ] User profile & preferences
- [ ] Tradovate OAuth integration (production)
- [ ] Token storage & refresh logic

### Strategy Builder
- [ ] Natural language input interface
- [ ] Claude strategy parsing (Socratic questioning)
- [ ] Parsed rules display & confirmation
- [ ] Strategy storage (database)
- [ ] Basic backtest results display

### Challenge Tracking
- [ ] Challenge creation & configuration
- [ ] Prop firm rules database (Tradeify first)
- [ ] Daily P&L calculation
- [ ] Drawdown monitoring
- [ ] Trading hours enforcement

### Trade Execution (Copilot)
- [ ] Setup detection (manual trigger)
- [ ] Pre-trade validation (position sizing, risk check)
- [ ] Trade approval UI
- [ ] Order execution via Tradovate REST API
- [ ] Trade confirmation & logging
- [ ] Push notifications

### Dashboard
- [ ] Home screen (P&L, drawdown, challenge status)
- [ ] Trade history
- [ ] Strategy list
- [ ] Mobile-first PWA shell

---

## Phase 1B: PATH 1 — Autopilot Mode

**Goal:** 24/7 autonomous execution without user approval.

### Execution Server
- [ ] Node.js server (Railway/Render/Fly.io)
- [ ] Persistent process management
- [ ] Health checks & monitoring
- [ ] Crash recovery & alerting

### Real-Time Market Data
- [ ] Tradovate WebSocket client
- [ ] Quote subscription (md/subscribeQuote)
- [ ] OHLCV candle maintenance
- [ ] Indicator calculations (EMA, RSI, MACD, etc.)
- [ ] Redis/in-memory caching

### Autonomous Execution
- [ ] Strategy rule matching engine
- [ ] Automated setup detection
- [ ] Autonomous order placement
- [ ] Stop loss & take profit management
- [ ] Position sizing (risk-based)

### Challenge Guardian
- [ ] Hard limit enforcement (daily loss, max drawdown)
- [ ] Trading hours enforcement
- [ ] Execution override capability
- [ ] Violation prevention alerts

### Autonomy Tiers
- [ ] Copilot toggle (approval required)
- [ ] Autopilot toggle (autonomous)
- [ ] Fleet mode foundation (multi-strategy)

---

## Phase 2: PATH 2 — Behavioral Intelligence Layer

**Goal:** Learn trader patterns, prevent self-sabotage.

### Event Logging (Foundation — starts Phase 0)
- [ ] Behavioral data schema
- [ ] Event capture pipeline
- [ ] Trade execution events
- [ ] Pre-trade check events
- [ ] Alert/warning events
- [ ] Session start/end events

### Contextual Feedback Prompts
Ask for feedback at high-emotion moments for honest, actionable insights.

| Trigger | Prompt | Rationale |
|---------|--------|-----------|
| Challenge passed | "You passed! 🎯 What helped most?" | High emotion = honest feedback |
| Violation prevented | "We caught this trade. Did we save you?" | Validate protection value |
| 7 days inactive | "Haven't seen you trade. What's blocking you?" | Identify drop-off reasons |
| After tilt alert | "Did this warning help or annoy you?" | Tune intervention aggressiveness |
| First week complete | "How's it going so far?" | Early friction detection |
| After 3 prevented trades | "We've stopped 3 trades. Too aggressive?" | Calibrate protection sensitivity |

- [ ] Post-challenge-pass feedback prompt
- [ ] Post-violation-prevented feedback prompt
- [ ] Inactivity re-engagement prompt (7 days)
- [ ] Tilt alert effectiveness feedback
- [ ] First week check-in prompt
- [ ] Protection calibration prompt
- [ ] Feedback data analysis dashboard

### Tilt Detection
- [ ] Rule-based tilt scoring
- [ ] Time since last loss tracking
- [ ] Position size anomaly detection
- [ ] Direction flip detection
- [ ] Message frequency tracking
- [ ] Tilt warnings & lockout recommendations

### Violation Prediction
- [ ] Pre-trade limit check ("this trade could violate...")
- [ ] Session trajectory monitoring
- [ ] Pattern matching (historical violations)

### Session Optimization
- [ ] Performance by time-of-day analysis
- [ ] Win rate by session/day analytics
- [ ] Personalized trading window recommendations

### Setup Recognition
- [ ] Setup grading (A/B/C based on history)
- [ ] Win rate by setup type
- [ ] Personalized setup recommendations

### ML Models (Future)
- [ ] Tilt Predictor model
- [ ] Violation Predictor model
- [ ] Session Optimizer model
- [ ] Setup Recognizer model

---

## Phase 3: PATH 3 — Platform Infrastructure

**Goal:** Become infrastructure others build on.

### MCP Servers
- [ ] prop-trading-mcp (firm comparison, rules)
- [ ] challenge-tracker-mcp (status, compliance)
- [ ] position-calc-mcp (sizing, risk)
- [ ] market-data-mcp (quotes, levels)
- [ ] Publish to MCP registry

### Public API
- [ ] REST API design & documentation
- [ ] /api/v1/firms endpoints
- [ ] /api/v1/challenges endpoints
- [ ] /api/v1/position-size endpoint
- [ ] /api/v1/pre-trade-check endpoint
- [ ] /api/v1/analyze-chart endpoint (Vision AI)
- [ ] API authentication & rate limiting
- [ ] Developer portal

### Visual AI (Chart Analysis)
- [ ] Screenshot upload flow
- [ ] Claude Vision API integration
- [ ] Support/resistance extraction
- [ ] Pattern detection
- [ ] Trade recommendations

### White-Label Capability
- [ ] Multi-tenant architecture
- [ ] Custom branding (logo, colors, domain)
- [ ] Pre-configured firm rules
- [ ] Partner onboarding flow
- [ ] Per-seat licensing infrastructure

### Fleet Tier
- [ ] Multi-account management
- [ ] Multi-strategy orchestration
- [ ] Portfolio-level optimization
- [ ] Cross-account risk management

---

## Parallel Tracks (Throughout All Phases)

### Data Collection (Day 1)
- [ ] Behavioral event logging active from first user
- [ ] Trade data capture
- [ ] Usage analytics

### Landing Page & Marketing
- [ ] Landing page (interactive terminal style)
- [ ] Waitlist/early access signup
- [ ] Demo video

### Legal & Compliance
- [ ] LLC formation
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Trading disclaimer (liability waiver)
- [ ] Tradovate ToS compliance review

### Infrastructure
- [ ] Error monitoring (Sentry or similar)
- [ ] Logging infrastructure
- [ ] Alerting (server health, trade failures)
- [ ] Backup strategy

---

## Milestone Summary

| Milestone | Target | Success Criteria |
|-----------|--------|------------------|
| **M0: API Validated** | Phase 0 complete | Can place order via Tradovate API |
| **M1: Copilot Live** | Phase 1A complete | 1 user executing trades with approval |
| **M2: Autopilot Live** | Phase 1B complete | Autonomous trades executing 24/7 |
| **M3: Intelligence Active** | Phase 2 complete | Tilt detection preventing bad trades |
| **M4: Platform Ready** | Phase 3 complete | MCP servers published, API live |

---

## Current Status

**Position:** Pre-Phase 0  
**Next Action:** Secure Tradovate API access  
**Blocker:** None (pending API approval)

---

## Notes

- Phases are sequential but some work runs in parallel (data collection, landing page, legal)
- Phase 1A is the true MVP — validate here before investing in 1B
- Phase 2 ML models require months of data; rule-based versions ship first
- Phase 3 is post-PMF; only build after proving user demand

