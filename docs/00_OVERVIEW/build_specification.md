**PROPTRADER AI**

Build Specification

*Three Core Paths to Market Dominance*

Version 1.0

January 2026

**CONFIDENTIAL**

**Executive Summary**

PropTraderAI is the natural language trading automation platform that
transforms how prop traders pass funding challenges. This specification
defines three core paths that, when built in sequence, create an
unassailable competitive position in the \$2B+ prop trading market.

  ---------------------- ------------------------------------------------
  **The Problem**        90% of prop traders fail challenges due to
                         execution failure, not strategy failure

  **The Solution**       AI that executes perfectly, learns trader
                         patterns, and becomes infrastructure others
                         build on

  **The Moat**           Years of behavioral data + platform lock-in +
                         network effects

  **The Positioning**    \"Cursor for traders. v0 for trading strategies.
                         The end of Pine Script.\"
  ---------------------- ------------------------------------------------

**The Three Core Paths**

  ----------- -------------------------- ---------------------------------
  **Path**    **Name**                   **Core Value**

  **PATH 1**  Autonomous Execution       Natural language → AI trades for
              Engine                     you

  **PATH 2**  Behavioral Intelligence    AI learns patterns, prevents
              Layer                      self-sabotage

  **PATH 3**  Platform Infrastructure    MCP + APIs + white-label = others
                                         build on you
  ----------- -------------------------- ---------------------------------

**PATH 1: Autonomous Execution Engine**

*\"AI that executes YOUR strategy perfectly, every time\"*

**What It Is**

The Autonomous Execution Engine transforms natural language strategy
descriptions into perfectly executed trades. Traders describe what they
want in plain English. AI handles everything else.

**The User Experience**

  ----------- -----------------------------------------------------------
  **Step 1**  User describes strategy: \"Trade pullbacks to 20 EMA when
              RSI is below 40 during morning session\"

  **Step 2**  AI asks clarifying questions using Socratic method to fill
              gaps

  **Step 3**  AI validates strategy, shows backtest results, confirms
              parameters

  **Step 4**  AI monitors markets 24/7 via Tradovate WebSocket, detects
              setups

  **Step 5**  AI executes trades autonomously when conditions match,
              managing stops and targets
  ----------- -----------------------------------------------------------

**Why This Is Path #1**

-   Solves the REAL problem: Execution failure, not strategy failure

-   Creates insurance-model lock-in: Users depend on it, can\'t leave

-   Eliminates human emotion: The actual cause of 90% of failures

-   Differentiates from every competitor: TraderSync is reactive,
    TradingView requires code

-   Natural language is the unlock: \"Cursor for traders\" positioning

**Technical Architecture**

**Core Components**

  ------------------ ----------------------------------------------------
  **Component**      **Description**

  **Strategy         Claude-powered NLP that converts natural language to
  Parser**           executable rules. Uses Socratic questioning to
                     clarify ambiguity.

  **Rules Engine**   Converts parsed strategy into condition→action
                     rules. Supports complex logic: AND/OR, time windows,
                     indicator combinations.

  **Market Monitor** WebSocket connection to Tradovate. Maintains
                     real-time OHLCV data, calculates indicators, detects
                     pattern matches.

  **Execution        Places orders via Tradovate API. Handles entry, stop
  Engine**           loss, take profit. Manages position sizing based on
                     challenge rules.

  **Challenge        Enforces prop firm rules as hard limits. Monitors
  Guardian**         P&L, drawdown, trading hours. Can override execution
                     engine.
  ------------------ ----------------------------------------------------

**Data Models**

**strategies table:**

  ------------------ --------------- ------------------------------------
  **Field**          **Type**        **Description**

  id                 UUID            Primary key

  user_id            UUID            Foreign key to users

  name               VARCHAR         User-friendly strategy name

  natural_language   TEXT            Original user input

  parsed_rules       JSONB           Structured rules from AI parsing

  backtest_results   JSONB           Win rate, R:R, drawdown, etc.

  status             ENUM            draft, active, paused, archived

  autonomy_level     ENUM            copilot (approval required),
                                     autopilot (autonomous)
  ------------------ --------------- ------------------------------------

**parsed_rules JSONB structure:**

{

\"entry_conditions\": \[{ \"indicator\": \"EMA\", \"period\": 20,
\"relation\": \"price_above\" }\],

\"exit_conditions\": \[{ \"type\": \"stop_loss\", \"value\": 20,
\"unit\": \"ticks\" }\],

\"filters\": \[{ \"type\": \"time_window\", \"start\": \"09:30\",
\"end\": \"11:30\" }\],

\"position_sizing\": { \"method\": \"risk_percent\", \"value\": 1 }

}

**Tradovate Integration**

**OAuth Flow:**

-   User clicks \"Connect Tradovate\" → Redirect to Tradovate OAuth

-   User authorizes → Callback with auth code

-   Exchange code for access token + refresh token

-   Store encrypted tokens in database

-   Auto-refresh before expiration (90 minute lifespan)

**WebSocket Subscriptions:**

-   md/subscribeQuote: Real-time quotes for monitored symbols

-   md/subscribeHistogram: Volume profile data

-   user/syncrequest: Account balance, P&L updates

**Order Execution:**

-   POST /order/placeorder: Market, limit, stop orders

-   POST /order/modifyorder: Adjust stops, targets

-   POST /order/cancelorder: Exit positions

-   GET /fill/list: Trade confirmation, fill prices

**Autonomy Levels**

  --------------- --------------------------- ---------------------------
  **Level**       **User Experience**         **Pricing**

  **Copilot**     AI detects setup → Push     \$79/month
                  notification → User         
                  approves → AI executes      

  **Autopilot**   AI detects setup → AI       \$149/month
                  executes automatically →    
                  User notified after         

  **Fleet**       Multiple strategies across  \$299/month
                  multiple accounts,          
                  portfolio-level             
                  optimization                
  --------------- --------------------------- ---------------------------

**PATH 2: Behavioral Intelligence Layer**

*\"AI that learns YOUR patterns and protects you from yourself\"*

**What It Is**

The Behavioral Intelligence Layer is the data moat that makes
PropTraderAI unbeatable. It collects every user interaction from Day 1,
learns individual trader patterns, and creates predictive models that
prevent failures before they happen.

**Why This Is The Moat**

-   Competitors can copy features; they cannot copy years of behavioral
    data

-   The more you use it, the smarter it gets (increasing switching cost)

-   Enables premium pricing: personalized AI is worth more than generic
    AI

-   Network effects: aggregate patterns improve predictions for everyone

-   By 2028, 2+ years of data that no competitor can replicate

**Core Capabilities**

**1. Tilt Detection**

Identifies when traders are emotionally compromised before they realize
it.

  -------------------------- --------------- -----------------------------
  **Signal**                 **Weight**      **Detection Method**

  Time since last loss \< 10 25%             Timestamp comparison
  min                                        

  Position size \> 150% of   20%             Rolling 30-day average
  average                                    

  Direction flip after loss  15%             Compare to prior trade

  Messages \> 5 in last 5    15%             Message frequency tracking
  min                                        

  Rejected pre-trade         10%             Warning response tracking
  warnings                                   

  Multiple losses today (\>  10%             Daily trade count
  2)                                         

  Session duration \> 4      5%              Session timer
  hours                                      
  -------------------------- --------------- -----------------------------

Tilt Score \> 50%: Warning alert displayed

Tilt Score \> 70%: Trading lockout recommendation

Tilt Score \> 85%: Automatic pause (Autopilot mode)

**2. Violation Prediction**

Predicts rule violations before they happen based on current trajectory.

-   Pre-trade check: \"If this trade hits stop loss, you will violate
    daily loss limit\"

-   Session monitoring: \"You are 2 trades from max trades rule at
    current loss rate\"

-   Pattern matching: \"Traders with your current pattern violate 78% of
    the time\"

**3. Session Optimization**

Learns when each trader performs best and worst.

-   \"Your win rate on Friday afternoons is 28%. Stop trading at 12
    PM.\"

-   \"Your best setups occur between 9:45-10:30 AM. Focus here.\"

-   \"You lose money on NQ after 2 consecutive losses. Switch to MNQ or
    stop.\"

**4. Setup Recognition**

Identifies which setups work for each specific trader.

-   \"This setup matches 7/10 of your winners this month. Grade: A\"

-   \"You have 23% win rate on breakouts. Consider avoiding.\"

-   \"Your pullback entries work best with RSI \< 35, not \< 40.\"

**Data Schema**

**behavioral_data table:**

  ------------------ --------------- ------------------------------------
  **Field**          **Type**        **Description**

  id                 UUID            Primary key

  user_id            UUID            Foreign key to users

  event_type         VARCHAR         trade_executed, near_violation,
                                     tilt_detected, etc.

  event_data         JSONB           Flexible payload for each event type

  challenge_status   JSONB           Snapshot of challenge state at event
                                     time

  session_context    JSONB           Session duration, trades count, etc.

  timestamp          TIMESTAMPTZ     When event occurred
  ------------------ --------------- ------------------------------------

**Event Types to Capture**

  ------------------------ ------------------------------------------------
  **Event**                **When Logged**

  trade_executed           Every trade synced from Tradovate

  pre_trade_check          User runs position size validation

  screenshot_analyzed      Visual AI analysis completed

  near_violation           \> 70% of daily/drawdown limit used

  violation_prevented      User stopped after warning

  alert_dismissed          User ignored warning

  tilt_signal_detected     Tilt indicators present

  revenge_trade_detected   Trade within 10 min of loss + size increase

  session_start /          App opened / closed or inactivity timeout
  session_end              
  ------------------------ ------------------------------------------------

**ML Model Timeline**

  --------------- ---------------------- ---------------------------------
  **Timeline**    **Model**              **Training Data Required**

  **Q3 2026**     Tilt Predictor         1,000+ user sessions

  **Q4 2026**     Violation Predictor    500+ near-violation events

  **Q1 2027**     Session Optimizer      6+ months data per user

  **Q2 2027**     Setup Recognizer       10,000+ labeled setups across all
                                         users
  --------------- ---------------------- ---------------------------------

**CRITICAL: Data collection must start from Day 1. You can always ignore
data later; you can never go back in time to collect it.**

**PATH 3: Platform Infrastructure**

*\"The pipes that prop trading runs through\"*

**What It Is**

Platform Infrastructure transforms PropTraderAI from a product into
infrastructure that others build on. MCP servers provide free
distribution across all AI platforms. APIs enable developer
integrations. White-label capability unlocks B2B revenue.

**Why This Is Path #3**

-   Free distribution: MCP registry = millions of AI users discover you

-   Network effects: More integrations = more users = more data

-   B2B revenue: Prop firms pay for white-label, per-seat licensing

-   Defensibility: When others depend on your infrastructure, they
    can\'t leave

-   Valuation multiplier: Platforms trade at higher multiples than
    products

**MCP Server Architecture**

Model Context Protocol (MCP) is the emerging standard for AI assistant
tool integration. Adopted by Anthropic, OpenAI, Google, Microsoft. 8M+
downloads. PropTraderAI publishes specialized MCP servers that any AI
can use.

**MCP Servers to Build**

  --------------------------- ----------------------------------------------------
  **Server**                  **Capabilities**

  **prop-trading-mcp**        Prop firm comparison, rule lookup, promo codes,
                              account recommendations

  **challenge-tracker-mcp**   Challenge status, P&L tracking, drawdown monitoring,
                              rule compliance

  **position-calc-mcp**       Position sizing, risk calculation, R:R analysis,
                              trade validation

  **market-data-mcp**         Real-time quotes, support/resistance levels, pattern
                              detection
  --------------------------- ----------------------------------------------------

**Distribution Strategy:**

-   Publish to modelcontextprotocol.io/registry (free, indexed)

-   When traders ask ChatGPT about prop trading, your tools provide
    answers

-   Zero CAC acquisition channel

**Public API Design**

**REST API Endpoints:**

  ------------ -------------------------- ---------------------------------
  **Method**   **Endpoint**               **Description**

  GET          /api/v1/firms              List all prop firms with rules

  GET          /api/v1/firms/:id          Single firm details

  POST         /api/v1/challenges         Create challenge tracking

  GET          /api/v1/challenges/:id     Challenge status

  POST         /api/v1/position-size      Calculate position size

  POST         /api/v1/pre-trade-check    Validate trade against rules

  POST         /api/v1/analyze-chart      Visual AI chart analysis
  ------------ -------------------------- ---------------------------------

**API Pricing:**

-   Free tier: 100 requests/day (lead gen)

-   Developer: \$49/mo for 10,000 requests

-   Enterprise: Custom pricing for unlimited

**White-Label Capability**

Enable prop firms to offer PropTraderAI under their own brand.

**White-Label Features:**

-   Custom branding (logo, colors, domain)

-   Pre-configured rules for their specific firm

-   Embedded in their trader dashboard

-   Co-branded with \"Powered by PropTraderAI\"

**Revenue Model:**

-   Per-seat licensing: \$10-20/active user/month

-   Revenue share: 20-30% of subscription revenue

-   Setup fee: \$5,000-10,000 one-time

**Target Partners:**

-   Topstep (largest, most recognized)

-   Apex Trader Funding (fast growing)

-   MFFU / My Funded Futures

-   Earn2Trade, TradeDay, etc.

**Build Sequence**

*How the three paths work together in practice.*

**Phase 1: Execution Foundation**

Focus: PATH 1 (Autonomous Execution Engine)

-   Tradovate OAuth integration

-   Natural language strategy builder

-   Basic autonomous execution (Copilot mode)

-   Challenge tracking dashboard

-   Mobile-first PWA

**Parallel from Day 1:**

-   Behavioral data collection (PATH 2 foundation)

**Phase 2: Intelligence Layer**

Focus: PATH 2 (Behavioral Intelligence)

-   Tilt detection system

-   Violation prediction

-   Session optimization

-   Setup recognition

-   Full Autopilot mode

**Parallel:**

-   Continue PATH 1 refinement (strategy parser improvements)

**Phase 3: Platform Expansion**

Focus: PATH 3 (Platform Infrastructure)

-   MCP servers published to registry

-   Public REST API

-   Developer documentation

-   White-label capability

-   Partner onboarding

**Parallel:**

-   ML models from behavioral data (PATH 2)

-   Fleet tier for multi-account (PATH 1)

**The Flywheel Effect**

  ------- ------------------------------------------------------------------
  **1**   User describes strategy → PATH 1 parses and validates

  **2**   AI executes trades → generates behavioral data

  **3**   PATH 2 learns patterns → improves predictions

  **4**   Better predictions → users depend on AI more

  **5**   PATH 3 distributes through MCP → more users discover

  **6**   More users → more data → better models → stronger moat
  ------- ------------------------------------------------------------------

**Technical Stack**

  ------------------ ---------------------- -----------------------------
  **Layer**          **Technology**         **Rationale**

  **Frontend**       Next.js 14 +           Mobile-first PWA, SSR, API
                     TypeScript             routes

  **Styling**        Tailwind CSS           Rapid development, mobile
                                            responsive

  **Database**       Supabase (PostgreSQL)  Auth, real-time, RLS,
                                            generous free tier

  **AI**             Claude API (Anthropic) NL parsing, Vision API, tool
                                            use

  **Broker           Tradovate API          OAuth + WebSocket, dominant
  Integration**                             in prop

  **Caching**        Upstash Redis          Real-time data, rate limiting

  **Hosting**        Vercel                 Edge functions, auto-scaling,
                                            CDN

  **Payments**       Stripe                 Subscriptions, usage billing

  **MCP Servers**    TypeScript + MCP SDK   Standard protocol, wide
                                            distribution
  ------------------ ---------------------- -----------------------------

**Database Schema Overview**

**Core Tables:**

-   users: Authentication, profile, preferences

-   challenges: Active challenge tracking, firm rules

-   strategies: Natural language strategies, parsed rules

-   trades: Executed trades, P&L, metadata

-   behavioral_data: All user events (THE MOAT)

-   trading_rules: Personal rules per user

-   chat_messages: Conversation history

-   screenshot_analyses: Visual AI results

**Competitive Advantage Summary**

  ------------------ ----------------------------------------------------
  **Moat Type**      **How PropTraderAI Builds It**

  **Data Moat**      Years of behavioral data from Day 1. By 2028: 2+
                     years of patterns competitors cannot replicate.

  **Complexity       Natural language strategy parsing requires AI +
  Moat**             trading expertise. High barrier to entry.

  **Infrastructure   Direct Tradovate WebSocket integration. Sub-second
  Moat**             execution. No fragile webhook chains.

  **Network Moat**   MCP ecosystem. Others build on your infrastructure.
                     Switching costs increase over time.

  **Lock-in Moat**   Insurance model. Users depend on AI for execution.
                     Can\'t leave without losing personalized
                     intelligence.
  ------------------ ----------------------------------------------------

**Why Competitors Cannot Catch Up**

  ------------------ ------------------------ ---------------------------
  **Competitor**     **Their Weakness**       **Your Advantage**

  TraderSync         Generalist, reactive, no Prop-specific, autonomous,
                     execution                trades for you

  TradingView        Requires Pine Script     Natural language, 3 minutes
                     coding                   vs weeks

  TradersPost        Fragile webhooks, dumb   Direct API, intelligent
                     execution                agents

  Generic AI         No trading context, no   Full context fusion, actual
                     execution                trades
  ------------------ ------------------------ ---------------------------

**Conclusion**

PropTraderAI is not building another trading tool. It is building the
natural language trading automation platform that makes coding obsolete
and execution perfect.

**The Three Core Paths:**

  ----------- ------------------------------ -----------------------------
  **PATH 1**  **Autonomous Execution         Solves execution failure
              Engine**                       

  **PATH 2**  **Behavioral Intelligence      Creates the data moat
              Layer**                        

  **PATH 3**  **Platform Infrastructure**    Enables network effects
  ----------- ------------------------------ -----------------------------

**The Tagline:**

*\"You bring the vision. We handle everything else.\"*

The trader is Dr. Frankenstein (the visionary).

The AI is Igor (the perfect executor).

*\"Yes, master.\"*

**Now build it.**
