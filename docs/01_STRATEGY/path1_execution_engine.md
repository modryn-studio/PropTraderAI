**PROPTRADER AI**

PATH 1: Autonomous Execution Engine

Strategic Architecture & Implementation Roadmap

**CONFIDENTIAL - STRATEGIC PLANNING DOCUMENT**

Version 1.0 \| January 2026

Executive Summary

This document provides the definitive strategic architecture for PATH 1
of PropTraderAI: the Autonomous Execution Engine. It reconciles the
seemingly contradictory requirements in the Build
Specification---namely, building a \'mobile-first PWA\' that also
supports \'24/7 WebSocket monitoring\' and \'autonomous execution.\'

+-----------------------------------------------------------------------+
| **KEY FINDING**                                                       |
|                                                                       |
| PATH 1 requires a HYBRID web architecture, not a pure web app. The    |
| solution splits into two phases:                                      |
|                                                                       |
| -   **Phase 1A (Weeks 1-4): Pure web app with Copilot mode            |
|     (user-initiated execution)**                                      |
|                                                                       |
| -   **Phase 1B (Weeks 5-8): Hybrid architecture with execution server |
|     for Autopilot mode (autonomous execution)**                       |
+-----------------------------------------------------------------------+

The Architectural Challenge

The Contradiction in the Build Spec

The Build Specification document contains three requirements that appear
contradictory:

  --------------------- -------------------------------------------------
  **Requirement**       **Implication**

  *\"Mobile-first       Suggests a client-side web application running in
  PWA\"*                the user\'s browser

  *\"WebSocket 24/7     Requires persistent server connection that cannot
  monitoring\"*         sleep

  *\"Autonomous         Must operate even when user closes browser/phone
  execution\"*          
  --------------------- -------------------------------------------------

**The Problem:**

A PWA running in a user\'s browser cannot maintain 24/7 WebSocket
connections. Mobile devices put browsers to sleep. Desktop browsers
throttle background tabs. This creates an impossible architecture if
taken literally.

The Strategic Solution: Hybrid Architecture

Two-Phase Implementation

The resolution is to build PATH 1 in two distinct phases, each with its
own architecture:

+-----------------------------------------------------------------------+
| **PHASE 1A: Pure Web App (Weeks 1-4)**                                |
|                                                                       |
| **Architecture:**                                                     |
|                                                                       |
| -   Next.js 14 PWA (client-side web app)                              |
|                                                                       |
| -   Serverless API routes (Vercel Edge Functions)                     |
|                                                                       |
| -   Supabase database                                                 |
|                                                                       |
| -   Tradovate REST API (stateless)                                    |
|                                                                       |
| **Deliverables:**                                                     |
|                                                                       |
| -   Natural language strategy builder                                 |
|                                                                       |
| -   OAuth flow for Tradovate connection                               |
|                                                                       |
| -   Copilot mode: AI detects setup → notifies user → user approves →  |
|     AI executes                                                       |
|                                                                       |
| -   Challenge tracking dashboard                                      |
|                                                                       |
| -   Push notifications                                                |
|                                                                       |
| **Cost:**                                                             |
|                                                                       |
| \$0/month (Vercel free tier, Supabase free tier)                      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **PHASE 1B: Hybrid Architecture (Weeks 5-8)**                         |
|                                                                       |
| **Architecture:**                                                     |
|                                                                       |
| -   Same Next.js PWA (client interface)                               |
|                                                                       |
| -   **NEW: Node.js execution server (Railway/Render/Fly.io)**         |
|                                                                       |
| -   **NEW: Persistent WebSocket connection to Tradovate**             |
|                                                                       |
| -   Same Supabase database (shared state)                             |
|                                                                       |
| **Additional Deliverables:**                                          |
|                                                                       |
| -   24/7 market monitoring via WebSocket                              |
|                                                                       |
| -   Autopilot mode: AI detects setup → AI executes automatically →    |
|     user notified after                                               |
|                                                                       |
| -   Real-time indicator calculations                                  |
|                                                                       |
| -   Autonomous position management                                    |
|                                                                       |
| **Cost:**                                                             |
|                                                                       |
| \~\$20/month (execution server hosting)                               |
+-----------------------------------------------------------------------+

Technical Architecture Details

Phase 1A: Pure Web App Architecture

**Component Stack:**

  --------------------- ------------------------ ------------------------
  **Layer**             **Technology**           **Purpose**

  Frontend              Next.js 14 + React       User interface, PWA
                                                 features

  API Layer             Next.js API Routes       OAuth, strategy parsing,
                                                 data ops

  Database              Supabase PostgreSQL      Auth, strategies,
                                                 trades, users

  AI                    Claude 3.5 Sonnet API    Natural language parsing

  Broker                Tradovate REST API       Order execution, OAuth

  Hosting               Vercel                   Edge functions, CDN, SSL
  --------------------- ------------------------ ------------------------

User Flow: Copilot Mode

1.  **User describes strategy:** \"Trade pullbacks to 20 EMA when RSI \<
    40 during morning session\"

2.  **Web app sends to API route:** POST /api/strategy/parse

3.  **API calls Claude:** Socratic questioning to clarify strategy

4.  **Strategy stored:** Parsed rules saved to Supabase

5.  **User opens app periodically:** Manual check for setups

6.  **Setup detected:** Push notification sent

7.  **User approves:** Clicks \"Execute Trade\" button

8.  **API executes:** POST to Tradovate API with order details

Phase 1B: Hybrid Architecture

**Component Stack (Additions):**

  --------------------- ------------------------ ------------------------
  **NEW Layer**         **Technology**           **Purpose**

  Execution Server      Node.js 20+ (Railway)    24/7 market monitoring

  WebSocket             Tradovate WebSocket      Real-time quotes, fills

  Caching               Redis (in-memory)        OHLCV data, indicators
  --------------------- ------------------------ ------------------------

User Flow: Autopilot Mode

9.  **User creates strategy:** (Same as Copilot mode)

10. **User enables Autopilot:** Toggle in web app

11. **Execution server monitors 24/7:** Persistent WebSocket connection

12. **Setup detected:** Server calculates indicators, matches strategy
    rules

13. **Server executes automatically:** Places order via Tradovate API

14. **User notified after:** Push notification with trade details

15. **User checks web app:** Views trade history, performance

Implementation Roadmap

Phase 1A Timeline (Weeks 1-4)

**Week 1: Core Infrastructure**

-   Next.js 14 setup with TypeScript + Tailwind CSS

-   Supabase project: database schema + auth

-   Deploy to Vercel with environment variables

-   Landing page (mobile-first design)

-   Sign up/login flow

-   Basic chat interface with Claude API

**Week 2: Strategy Builder**

-   Natural language strategy input component

-   API route: /api/strategy/parse (Claude integration)

-   Socratic questioning flow

-   Strategy validation + display

-   Database: strategies table implementation

-   Mock backtesting results display

**Week 3: Tradovate Integration**

-   OAuth flow: Tradovate connection

-   Store encrypted access tokens

-   Fetch account info (verify connection)

-   Challenge tracking dashboard UI

-   Daily P&L calculation

-   Drawdown monitoring

**Week 4: Copilot Mode**

-   Manual setup detection (user checks app)

-   \"Execute Trade\" approval button

-   Order execution via Tradovate REST API

-   Trade history + analytics

-   Push notification setup

-   Beta testing with 5-10 users

Phase 1B Timeline (Weeks 5-8)

**Week 5: Execution Server Foundation**

-   Create Node.js server project

-   Deploy to Railway (or Render/Fly.io)

-   Supabase connection (same database)

-   Basic health check endpoints

-   Environment variable configuration

-   Logging infrastructure

**Week 6: WebSocket Integration**

-   Tradovate WebSocket client implementation

-   Subscribe to quote streams (md/subscribeQuote)

-   Maintain last 200 candles in Redis

-   Indicator calculations (EMA, RSI, MACD)

-   Connection recovery logic

-   Token refresh automation

**Week 7: Autonomous Execution**

-   Strategy rule matching engine

-   Setup detection logic

-   Autonomous order placement

-   Position sizing calculations

-   Stop loss + take profit management

-   Challenge Guardian integration (rule enforcement)

**Week 8: Autopilot Mode + Testing**

-   Web app: Autopilot toggle UI

-   Server: Monitor active Autopilot strategies

-   Post-execution notifications

-   Error handling + alerting

-   Live trading validation (paper trading first)

-   Beta expansion to 20-50 users

Cost Analysis

  ----------------------- ----------------------- -----------------------
  **Service**             **Phase 1A Cost**       **Phase 1B Cost**

  Vercel (hosting)        \$0/month (free tier)   \$0/month (same)

  Supabase (database)     \$0/month (free tier)   \$0/month (same)

  Claude API              Pay-per-use (\~\$10-50) Same

  Execution Server        N/A                     **\$20/month
                                                  (Railway)**

  **Total**               **\$10-50/month**       **\$30-70/month**
  ----------------------- ----------------------- -----------------------

Risk Mitigation Strategy

Technical Risks

  ----------------------- -----------------------------------------------
  **Risk**                **Mitigation**

  WebSocket disconnection Auto-reconnect with exponential backoff. Alert
                          user if connection lost \> 5 minutes.

  API token expiration    Auto-refresh 10 minutes before expiration.
                          Store refresh token securely.

  Execution server crash  Process manager (PM2) with auto-restart.
                          Railway health checks. Alert founder on crash.

  Incorrect strategy      User review step before activating. Show
  parsing                 backtest results. Allow manual editing of
                          parsed rules.

  User loses money due to Extensive disclaimer. Paper trading mode first.
  AI error                Daily loss limits enforced. Challenge Guardian
                          overrides.
  ----------------------- -----------------------------------------------

Success Metrics

Phase 1A Success Criteria (Week 4)

-   **10+ users signed up**

-   **5+ strategies created**

-   **3+ Tradovate accounts connected**

-   **10+ trades executed via Copilot mode**

-   **NPS \> 40 from beta users**

Phase 1B Success Criteria (Week 8)

-   **3+ users enabled Autopilot mode**

-   **20+ autonomous trades executed**

-   **WebSocket uptime \> 99%**

-   **Zero execution errors causing financial loss**

-   **Users report: \"This saved me from hesitation/emotional
    trading\"**

Conclusion

PATH 1 (Autonomous Execution Engine) requires a hybrid web architecture
that evolves over two phases:

-   **Phase 1A:** Pure web app for rapid validation and Copilot mode
    (\$0-50/month)

-   **Phase 1B:** Add execution server for 24/7 monitoring and Autopilot
    mode (\$30-70/month)

This phased approach allows you to:

-   Ship fast (Week 4 vs Week 8+)

-   Validate product-market fit before adding complexity

-   Minimize costs during early validation

-   Add autonomous execution only after proving demand

-   Maintain a single codebase throughout (no rebuild required)

+-----------------------------------------------------------------------+
| **RECOMMENDATION**                                                    |
|                                                                       |
| Start with Phase 1A immediately. Build the pure web app with Copilot  |
| mode. Ship in Week 4. Validate with real users. Only proceed to Phase |
| 1B if users demonstrate clear demand for autonomous execution.        |
+-----------------------------------------------------------------------+

*Document prepared by: PropTrader AI Strategy Team*

*Last updated: January 7, 2026*
