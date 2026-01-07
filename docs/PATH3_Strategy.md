# PROPTRADER AI - PATH 3: Platform Infrastructure
## "The Pipes That Prop Trading Runs Through"

**Version 1.0 | January 2026**  
**CONFIDENTIAL - PLATFORM STRATEGY DOCUMENT**

---

## Executive Summary

PATH 3 (Platform Infrastructure) transforms PropTraderAI from a product into infrastructure that others build on. While PATH 1 provides execution and PATH 2 creates the data moat, PATH 3 enables **network effects** and **distribution at scale**.

### WHY THIS IS PATH #3 (NOT PATH #1)

- ✅ **Free Distribution:** MCP registry = millions of AI users discover you (zero CAC)
- ✅ **Network Effects:** More integrations = more users = more data
- ✅ **B2B Revenue:** Prop firms pay for white-label, per-seat licensing
- ✅ **Defensibility:** When others depend on your infrastructure, they can't leave
- ✅ **Valuation Multiplier:** Platforms trade at 10-20x higher multiples than products

**Critical Insight:** Build PATH 3 AFTER proving product-market fit (PATH 1) and starting data collection (PATH 2). Don't become infrastructure before you're a product people want.

---

## The Three Pillars of PATH 3

| Pillar | What It Does | Revenue Model |
|--------|--------------|---------------|
| **MCP Servers** | Free tools for AI assistants (ChatGPT, Claude, Gemini) | Lead generation (free) |
| **Public API** | Developer platform for integrations | Usage-based pricing |
| **White-Label** | Prop firms offer PropTraderAI under their brand | Per-seat licensing + revenue share |

---

## Pillar 1: MCP Server Ecosystem

### What Is MCP?

**Model Context Protocol (MCP)** is the emerging standard for AI assistant tool integration. Think of it as "npm for AI tools."

**Adoption:**
- Anthropic (Claude), OpenAI (ChatGPT), Google (Gemini), Microsoft (Copilot)
- 8M+ downloads of MCP SDK
- Published to modelcontextprotocol.io/registry (free, indexed)

### Why MCP Is Transformative

**Traditional Discovery:**
- User finds your website via Google search
- User signs up, onboards, pays
- **Cost:** $50-200 CAC

**MCP Discovery:**
- Trader asks ChatGPT: "What prop firm rules allow hedging?"
- ChatGPT uses your MCP server to answer
- User says: "Wow, what is this? Show me more"
- User clicks through to PropTraderAI
- **Cost:** $0 CAC

**Example User Journey:**
1. Trader uses ChatGPT daily for trading questions
2. ChatGPT pulls data from `prop-trading-mcp` server
3. After 3rd use, ChatGPT suggests: "Want live challenge tracking? Try PropTraderAI"
4. User clicks through → already sold on value
5. Conversion rate: 20-40% (vs 2-5% cold traffic)

### MCP Servers to Build

#### Server 1: prop-trading-mcp
**Purpose:** Prop firm information and comparison

**Tools Provided:**
- `list_prop_firms()` - Returns all firms with rules, pricing, features
- `compare_firms(firm1, firm2)` - Side-by-side comparison
- `get_firm_rules(firm_name)` - Detailed rule breakdown
- `check_promo_codes(firm_name)` - Active discount codes
- `recommend_firm(trader_profile)` - Personalized recommendation

**Example Usage:**
```
User: "Which prop firm allows news trading?"
ChatGPT calls: list_prop_firms()
ChatGPT responds: "FTMO and Apex Trader Funding both allow news trading. Here's their comparison..."
[Link to PropTraderAI for live tracking]
```

**Data Source:** Firm database (same as web app)

---

#### Server 2: challenge-tracker-mcp
**Purpose:** Challenge status and compliance monitoring

**Tools Provided:**
- `get_challenge_status(user_id)` - Current P&L, drawdown, days remaining
- `check_rule_compliance(user_id)` - Are any rules close to violation?
- `predict_violation_risk(user_id)` - Risk score based on current trajectory
- `get_daily_summary(user_id)` - Today's performance summary

**Example Usage:**
```
User: "Am I on track to pass my challenge?"
ChatGPT calls: get_challenge_status(user_id)
ChatGPT responds: "You're at $2,450 profit ($2,500 goal), 3 days remaining. Drawdown: 42% used. You're on track if you avoid further losses."
[Link to full dashboard]
```

**Data Source:** Live data from PropTraderAI (requires user authentication)

---

#### Server 3: position-calc-mcp
**Purpose:** Risk calculation and position sizing

**Tools Provided:**
- `calculate_position_size(account_size, risk_percent, stop_loss_ticks)` - Position size calculator
- `calculate_risk_reward(entry, stop, target)` - R:R ratio
- `validate_trade(trade_params, challenge_rules)` - Pre-trade check
- `suggest_position_size(user_id, symbol, direction)` - Personalized based on history

**Example Usage:**
```
User: "What position size should I use for NQ with a 15-tick stop on a $50k account?"
ChatGPT calls: calculate_position_size(50000, 1, 15)
ChatGPT responds: "1 contract (1% risk = $500 max loss). With 15-tick stop on NQ ($300), 1 contract keeps you within risk parameters."
```

**Data Source:** Pure calculation (no user data required for basic version)

---

#### Server 4: market-data-mcp
**Purpose:** Real-time market data and technical analysis

**Tools Provided:**
- `get_support_resistance(symbol)` - Key levels from recent data
- `detect_patterns(symbol)` - Chart patterns (head & shoulders, triangles, etc.)
- `get_market_sentiment(symbol)` - Sentiment indicators
- `analyze_volume_profile(symbol)` - Volume analysis

**Example Usage:**
```
User: "What are key support levels on NQ right now?"
ChatGPT calls: get_support_resistance("NQ")
ChatGPT responds: "NQ support levels: 18,250 (strong), 18,150 (medium), 18,050 (weak). Resistance: 18,450 (medium), 18,550 (strong)."
```

**Data Source:** Live market data (WebSocket from Tradovate)

---

### MCP Server Implementation

#### Technology Stack
- **Language:** Python (MCP SDK natively supports Python)
- **Framework:** FastMCP or Starlette
- **Hosting:** Railway or Fly.io (needs persistent connection)
- **Authentication:** API keys for user-specific tools

#### Basic MCP Server Structure

```python
# mcp_servers/prop_trading/server.py
from mcp import McpServer, Tool
from typing import List, Dict

server = McpServer(
    name="prop-trading",
    version="1.0.0",
    description="Prop firm rules, comparison, and recommendations"
)

@server.tool()
async def list_prop_firms() -> List[Dict]:
    """
    Returns list of all prop firms with rules, pricing, and features.
    No authentication required.
    """
    # Fetch from database
    firms = await db.query("SELECT * FROM prop_firms")
    return [
        {
            "name": firm.name,
            "initial_balance": firm.initial_balance,
            "profit_target": firm.profit_target,
            "daily_loss_limit": firm.daily_loss_limit,
            "max_drawdown": firm.max_drawdown,
            "rules": firm.rules,
            "pricing": firm.pricing,
            "features": firm.features
        }
        for firm in firms
    ]

@server.tool()
async def compare_firms(firm1: str, firm2: str) -> Dict:
    """
    Compare two prop firms side-by-side.
    Args:
        firm1: Name of first firm
        firm2: Name of second firm
    """
    data1 = await db.get_firm(firm1)
    data2 = await db.get_firm(firm2)
    
    return {
        "comparison": {
            "initial_balance": {firm1: data1.initial_balance, firm2: data2.initial_balance},
            "profit_target": {firm1: data1.profit_target, firm2: data2.profit_target},
            "daily_loss_limit": {firm1: data1.daily_loss_limit, firm2: data2.daily_loss_limit},
            # ... more comparisons
        },
        "recommendation": generate_recommendation(data1, data2)
    }

@server.tool()
async def get_challenge_status(user_api_key: str) -> Dict:
    """
    Get user's current challenge status.
    Requires authentication via API key.
    """
    user = await authenticate(user_api_key)
    challenge = await db.get_active_challenge(user.id)
    
    return {
        "current_pnl": challenge.current_pnl,
        "profit_target": challenge.profit_target,
        "daily_loss": challenge.daily_loss,
        "daily_loss_limit": challenge.daily_loss_limit,
        "max_drawdown": challenge.max_drawdown,
        "drawdown_limit": challenge.drawdown_limit,
        "days_remaining": challenge.days_remaining,
        "status": challenge.status,
        "violation_risk": calculate_violation_risk(challenge)
    }

if __name__ == "__main__":
    server.run()
```

#### Publishing to MCP Registry

```json
// package.json for MCP server
{
  "name": "@proptraderai/prop-trading-mcp",
  "version": "1.0.0",
  "description": "Prop firm rules and challenge tracking for AI assistants",
  "main": "server.py",
  "keywords": ["prop trading", "futures", "trading", "risk management"],
  "author": "PropTrader AI",
  "license": "MIT",
  "mcp": {
    "tools": [
      {
        "name": "list_prop_firms",
        "description": "Get list of all prop firms with rules and pricing"
      },
      {
        "name": "compare_firms",
        "description": "Compare two prop firms side-by-side"
      },
      {
        "name": "get_challenge_status",
        "description": "Get user's live challenge status (requires auth)"
      }
    ]
  }
}
```

**Submission:**
1. Publish to GitHub: `github.com/proptraderai/prop-trading-mcp`
2. Submit to registry: modelcontextprotocol.io/submit
3. Indexed within 24-48 hours
4. Available in ChatGPT, Claude, Gemini plugin stores

---

## Pillar 2: Public REST API

### API Strategy

**Philosophy:** "Make it easier for developers to build with PropTraderAI than to build it themselves."

**Target Developers:**
- TradingView indicator developers
- NinjaTrader/TradeStation plugin developers
- Trading journal apps (Edgewonk, TraderSync competitors)
- Discord bot creators
- Mobile app developers

### API Endpoints

#### Public Endpoints (No Auth Required)

```
GET  /api/v1/firms
GET  /api/v1/firms/:id
GET  /api/v1/firms/:id/rules
POST /api/v1/position-size/calculate
POST /api/v1/risk-reward/calculate
```

#### User Endpoints (API Key Required)

```
POST /api/v1/auth/api-key              # Generate API key
GET  /api/v1/challenges                # List user's challenges
GET  /api/v1/challenges/:id            # Single challenge details
POST /api/v1/challenges/:id/trades     # Log manual trade
GET  /api/v1/trades                    # User's trade history
POST /api/v1/pre-trade-check           # Validate trade before execution
POST /api/v1/analyze-chart             # Visual AI analysis (image upload)
GET  /api/v1/behavioral-insights       # Tilt warnings, patterns, etc.
```

#### Webhook Endpoints (For Integrations)

```
POST /api/v1/webhooks/tradingview      # Receive TradingView alerts
POST /api/v1/webhooks/tradovate        # Receive Tradovate fills
POST /api/v1/webhooks/stripe           # Subscription events
```

### API Pricing Tiers

| Tier | Requests/Month | Price | Use Case |
|------|----------------|-------|----------|
| **Free** | 100/day | $0 | Testing, personal projects |
| **Developer** | 10,000 | $49/mo | Small integrations, hobbyists |
| **Professional** | 100,000 | $199/mo | Trading apps, SaaS products |
| **Enterprise** | Unlimited | Custom | Prop firms, large platforms |

### API Documentation

**Must-Haves:**
- OpenAPI/Swagger spec (auto-generated)
- Interactive API explorer (Swagger UI or Redoc)
- Code examples in Python, JavaScript, cURL
- Webhook debugging playground
- Rate limit headers clearly documented
- Error codes with explanations

**Documentation Site Structure:**
```
docs.proptraderai.com/
├── /getting-started
│   ├── Authentication
│   ├── Quick Start
│   └── Rate Limits
├── /api-reference
│   ├── Firms API
│   ├── Challenges API
│   ├── Trades API
│   └── Webhooks
├── /guides
│   ├── TradingView Integration
│   ├── Discord Bot Example
│   └── Mobile App Integration
├── /mcp-servers
│   ├── Installation
│   ├── Usage Examples
│   └── Tool Reference
└── /sdks
    ├── JavaScript SDK
    ├── Python SDK
    └── Community SDKs
```

---

## Pillar 3: White-Label Platform

### What Is White-Label?

Enable prop firms to offer PropTraderAI under their own brand, embedded in their trader dashboard.

### Value Proposition to Prop Firms

**For Prop Firms:**
- ✅ Increase pass rates (better for retention)
- ✅ Differentiate from competitors ("We have AI monitoring")
- ✅ Additional revenue stream (upsell to traders)
- ✅ Zero development cost (we build, they brand)

**For PropTraderAI:**
- ✅ Per-seat licensing revenue ($10-20/trader/month)
- ✅ Or revenue share (20-30% of subscription)
- ✅ Distribution through firm's existing user base
- ✅ Lock-in effect (firms depend on our platform)

### White-Label Features

#### Technical Implementation

**1. Custom Branding:**
- Firm logo and colors throughout UI
- Custom domain (e.g., `ai.topsteptrader.com`)
- Co-branded with "Powered by PropTraderAI" footer

**2. Pre-configured Rules:**
- Firm's specific challenge rules pre-loaded
- Automatic sync with firm's account system
- Real-time P&L from firm's backend

**3. Embedded Dashboard:**
- iframe or full subdomain deployment
- Single sign-on (SSO) integration
- White-labeled mobile app (optional)

**4. Custom Features (Optional):**
- Firm-specific alerts
- Custom violation thresholds
- Branded email notifications

#### White-Label Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Prop Firm's Website (topstep.com)                      │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Trader Dashboard                                │    │
│  │                                                  │    │
│  │ ┌──────────────────────────────────────────┐  │    │
│  │ │ PropTraderAI Widget (Embedded)           │  │    │
│  │ │                                          │  │    │
│  │ │ • Challenge Status                       │  │    │
│  │ │ • AI Alerts                              │  │    │
│  │ │ • Pre-trade Checks                       │  │    │
│  │ │ • Behavioral Insights                    │  │    │
│  │ │                                          │  │    │
│  │ │ "Powered by PropTraderAI"                │  │    │
│  │ └──────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                      ↓ API Calls
┌─────────────────────────────────────────────────────────┐
│  PropTraderAI Platform (Multi-tenant)                    │
│                                                          │
│  • Separate database per firm                           │
│  • Firm-specific rules engine                           │
│  • Shared behavioral intelligence models                │
│  • Usage tracking and billing                           │
└─────────────────────────────────────────────────────────┘
```

### White-Label Revenue Model

**Option 1: Per-Seat Licensing**
- $10-20 per active trader per month
- Billed monthly to prop firm
- Example: 1,000 active traders × $15 = $15,000/month

**Option 2: Revenue Share**
- 20-30% of subscription revenue
- Traders pay prop firm, firm pays us
- Example: Trader pays firm $79/mo, we get $20-25

**Option 3: Hybrid**
- Base licensing fee + revenue share
- $5/seat/month + 15% of subscription
- More predictable revenue, still upside-aligned

### Target White-Label Partners (Priority Order)

| Priority | Firm | Traders | Why |
|----------|------|---------|-----|
| **1** | Topstep | 100,000+ | Largest, most recognized, sets standard |
| **2** | Apex Trader Funding | 50,000+ | Fast-growing, tech-forward |
| **3** | FTMO | 200,000+ | International, huge volume |
| **4** | My Funded Futures | 30,000+ | Strong community |
| **5** | Earn2Trade | 20,000+ | Established player |

### White-Label Pitch Deck

**Slide 1: The Problem**
- 90% of traders fail prop challenges
- Main reason: Emotional trading, not strategy
- Traders blame firms, firms lose reputation

**Slide 2: The Solution**
- AI monitoring that prevents emotional trading
- Real-time violation prediction
- Behavioral learning from millions of data points

**Slide 3: The Business Case**
- Increase pass rates by 15-30%
- Better pass rates = better retention
- Differentiate from 100+ competitors
- Additional revenue stream

**Slide 4: White-Label Options**
- Embedded widget in your dashboard
- Full branded subdomain
- Mobile app with your logo
- Zero development cost

**Slide 5: Pricing**
- $15/active trader/month
- Or 25% revenue share
- Example: 1,000 traders = $15,000/month revenue for you

**Slide 6: Proof**
- [Beta user testimonials]
- [Pass rate improvement data]
- [Engagement metrics]

---

## Implementation Timeline

### Phase 1: MCP Foundation (Weeks 9-10)

**Week 9: Build First MCP Server**
- Build `prop-trading-mcp` server
- Implement tools: list_firms, compare_firms, get_firm_rules
- Local testing with MCP Inspector
- Write documentation

**Week 10: Publish & Test**
- Publish to GitHub
- Submit to MCP registry
- Test with ChatGPT, Claude
- Monitor usage analytics

### Phase 2: API Platform (Weeks 11-12)

**Week 11: Public API**
- Build REST API endpoints (public + authenticated)
- OpenAPI spec generation
- Rate limiting implementation
- API key management system

**Week 12: Developer Portal**
- Build docs site (docs.proptraderai.com)
- Interactive API explorer
- Code examples and guides
- SDK development (Python, JavaScript)

### Phase 3: White-Label MVP (Months 4-5)

**Month 4: White-Label Architecture**
- Multi-tenant database design
- Custom branding system
- iframe embedding capability
- SSO integration

**Month 5: First Partner**
- Pitch to 5 firms
- Sign 1 pilot partner
- 30-day implementation
- Case study creation

---

## Success Metrics

### MCP Servers (Month 6)

- 4 servers published to registry
- 10,000+ tool invocations per month
- 500+ unique AI assistants using tools
- 50+ clickthroughs to PropTraderAI from MCP

### Public API (Month 6)

- 20+ active API keys issued
- 50,000+ API calls per month
- 5+ integrations live (TradingView, Discord bots, etc.)
- $500+ MRR from API subscriptions

### White-Label (Month 12)

- 1-2 pilot partners live
- 500-1,000 traders using white-label
- $5,000-15,000 MRR from white-label
- Proof of concept for scaling

---

## Cost Analysis

| Component | Month 1-3 | Month 6 | Month 12 |
|-----------|-----------|---------|----------|
| MCP Server Hosting | $20 | $50 | $100 |
| API Infrastructure | $0 (Vercel) | $50 | $200 |
| Database (Multi-tenant) | $0 (Supabase free) | $25 | $100 |
| Documentation Site | $0 (Vercel) | $0 | $0 |
| **Total** | **$20** | **$125** | **$400** |

**Revenue Potential (Month 12):**
- API subscriptions: $1,000-2,000
- White-label (2 partners): $10,000-30,000
- **Total: $11,000-32,000 MRR**

**ROI:** 27-80x on infrastructure costs

---

## The Platform Flywheel

```
1. User finds you via MCP (ChatGPT recommends PropTraderAI)
   ↓
2. User signs up, uses product, generates behavioral data
   ↓
3. More data = better predictions = stickier product
   ↓
4. Developer uses API to build TradingView indicator
   ↓
5. Their users discover PropTraderAI through indicator
   ↓
6. More users = more data = more API usage
   ↓
7. Prop firm sees value, wants white-label
   ↓
8. White-label brings 1,000+ traders instantly
   ↓
9. Back to step 2 (1,000x)
```

Each pillar feeds the others. This is why PATH 3 is the final multiplier.

---

## Competitive Moats Created by PATH 3

### 1. Distribution Moat (MCP)
- First-mover advantage in MCP ecosystem
- By the time competitors publish MCP servers, you have 12-18 months of usage data
- Top-ranked servers get preferential placement

### 2. Developer Moat (API)
- Developers invest time learning your API
- Switching costs for developers (rewrite integrations)
- Network effects: more integrations = more value

### 3. Partnership Moat (White-Label)
- Exclusive contracts with prop firms
- Prop firms depend on your platform for trader retention
- Switching would disrupt their entire trader base

### 4. Platform Moat (Combined)
- "PropTraderAI is the standard for prop trading infrastructure"
- Others build on your platform, not compete with it
- Valuation multiplier: platforms trade at 10-20x SaaS multiples

---

## Conclusion

PATH 3 transforms PropTraderAI from a product into a platform:

- **PATH 1:** Solves execution failure (product)
- **PATH 2:** Creates data moat (defensibility)
- **PATH 3:** Enables network effects (platform)

### THE STRATEGIC SEQUENCE

1. ✅ **Months 1-3:** Build PATH 1, prove product-market fit
2. ✅ **Months 1-6:** Collect behavioral data (PATH 2 foundation)
3. ✅ **Months 3-6:** Build MCP servers, publish to registry
4. ✅ **Months 6-9:** Build public API, get first developers
5. ✅ **Months 9-12:** Secure first white-label partner
6. ✅ **Year 2:** Scale all three pillars simultaneously

### KEY INSIGHT

Don't become a platform before you're a product people want. But once you have product-market fit, PATH 3 accelerates growth 10-100x.

By 2028, when competitors finally react, you'll be the infrastructure they're trying to integrate with.

---

**Document prepared by: PropTrader AI Strategy Team**  
**Last updated: January 7, 2026**
