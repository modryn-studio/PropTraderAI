# Futures Prop Trading Platform: Complete Vision Document

## Executive Summary

**Product Name:** [To Be Determined - suggest: PropGuardian, TradeSync Pro, FundedFlow]

**Vision Statement:** Eliminate the chaos of managing multiple futures prop firm accounts by providing the industry's first unified platform that tracks performance, prevents rule violations, and automates risk management across all major prop firms using Tradovate.

**Mission:** Prevent futures traders from losing funded accounts due to administrative oversight, drawdown confusion, or subscription mismanagement—allowing them to focus on what they do best: trading.

**Target Market:** Futures prop traders actively managing 2-20 accounts across multiple prop firms (Apex, Topstep, Earn2Trade, My Funded Futures, Bulenox, Take Profit Trader, etc.) who use Tradovate as their trading platform.

**Core Problem Solved:** Traders are bleeding money through forgotten subscriptions ($50-375/month per account), losing funded accounts to trailing drawdown confusion, and wasting 2-4 hours daily managing administrative tasks across disconnected dashboards.

**Unique Value Proposition:** Real-time, API-connected monitoring that prevents violations BEFORE they happen, combined with comprehensive account lifecycle management—from evaluation purchase through payout tracking.

---

## Market Validation Summary

### Problem Intensity: **HIGH**
- **Financial Impact:** Traders lose $500-3,000+ annually on forgotten subscriptions, failed evaluations, and blown accounts
- **Time Drain:** 2-4 hours daily on manual tracking, spreadsheet maintenance, and dashboard monitoring
- **Emotional Toll:** Chronic frustration with "messy spreadsheets," "headaches," and preventable account losses
- **Industry Acknowledgment:** Apex changed policies in 2022 specifically to address subscription chaos

### Market Size:
- **Active Futures Prop Traders:** 50,000-100,000+ globally (conservative estimate)
- **Average Accounts Per Trader:** 3-5 active accounts
- **Monthly Subscription Spend:** $150-750 per trader on prop firm fees alone
- **Addressable Market:** Traders using Tradovate (10+ major prop firms support it)

### Competitive Landscape Gaps:
- **PropFirmTracker** ($5/mo): Manual entry, no real-time tracking, no automation
- **QuantGuard** ($75-150/mo): Expensive, risk-only focus, no subscription/ROI management
- **Prop Firm One:** New, not futures-specific, limited automation
- **TradesViz:** Trade journaling focus, not account lifecycle management

**Our Advantage:** Only platform combining real-time API integration, subscription intelligence, drawdown automation, and comprehensive account lifecycle tracking—specifically built for futures prop traders.

---

## Product Vision: Four-Phase Evolution

### **PHASE 1: Dashboard (MVP - Months 1-3)**
**Goal:** Provide immediate utility through unified account visibility

**Core Features:**
1. **Multi-Account Dashboard**
   - Aggregate view of all Tradovate-connected prop accounts
   - Real-time P&L across all accounts (individual + combined)
   - Account status indicators (Evaluation, Passed, Funded-Sim, Funded-Live, Blown, Pending)
   - Visual account health scores (green/yellow/red based on drawdown proximity)
   - Last sync timestamp for each account

2. **Drawdown Tracking**
   - Real-time trailing drawdown calculation for each account
   - Firm-specific rules engine (Apex intraday trailing vs. Topstep EOD)
   - Visual "buffer" display: how much room until violation
   - Daily max loss tracking
   - Highest account balance tracking (for trailing threshold)
   - Chart showing drawdown evolution over time

3. **Subscription Management**
   - Manual account entry: firm name, account number, fee amount, billing cycle
   - Upcoming charges calendar (7-day, 3-day, 1-day views)
   - Account expense tracking by firm
   - Total monthly burn rate calculator
   - Account ROI: (payouts - fees) per account

4. **Basic Account Lifecycle**
   - Add/edit/archive accounts
   - Mark accounts as: Active, Paused, Blown, Funded, Cancelled
   - Notes field for each account (tracking reset dates, special conditions)
   - Document upload (screenshots of account rules, fee receipts)

**Technical Foundation:**
- Tradovate API integration for live account data
- PostgreSQL database for account metadata, user preferences
- Next.js frontend with real-time dashboard updates
- TailwindCSS for responsive design
- Hosting: Vercel (frontend), Railway/Render (backend)

**Monetization (V1):**
- **Free Tier:** Up to 2 accounts, basic dashboard, manual sync
- **Pro Tier ($29/mo):** Unlimited accounts, real-time sync, drawdown tracking, subscription calendar
- **Launch Pricing:** 50% off first 3 months ($14.50/mo) to build early user base

**Success Metrics:**
- 100 beta users within 60 days
- Average 3.5 accounts connected per user
- 70%+ user retention month-over-month
- NPS score 40+

---

### **PHASE 2: Alerts & Intelligence (Months 4-6)**
**Goal:** Shift from passive tracking to proactive prevention

**New Features:**

1. **Smart Alerts System**
   - **Drawdown Proximity Alerts:**
     - Warning at 80% of drawdown limit ($400 buffer on $2,000 limit)
     - Critical alert at 90% ($200 buffer)
     - Real-time push notifications (web, email, SMS option)
     - Custom alert thresholds per account
   
   - **Subscription Renewal Alerts:**
     - 7-day warning before billing
     - 3-day reminder
     - 24-hour final notice
     - Option to cancel directly from alert
   
   - **Daily Loss Limit Alerts:**
     - Warning at 75% of daily limit
     - Critical at 90%
     - "Stop trading" recommendation
   
   - **Rule Violation Predictions:**
     - "At current trajectory, you'll hit drawdown in 3 trades"
     - "This position size risks 45% of daily limit"
     - Consistency rule tracking (max daily profit alerts for firms with caps)

2. **Intelligent Insights**
   - Weekly performance digest (email summary)
   - Account comparison: which firms are profitable vs. bleeding money
   - Fee efficiency score: cost per dollar earned across firms
   - Best/worst trading days patterns
   - Winning streak tracker
   - Identify accounts approaching funded status

3. **Notification Preferences Hub**
   - Granular control: alerts by type, severity, time of day
   - "Do Not Disturb" during non-trading hours
   - Delivery method per alert type (push, email, SMS)
   - Test alert button

4. **Mobile Companion App (iOS/Android)**
   - Simplified dashboard view
   - Push notifications
   - Quick account status check
   - Emergency "flatten all" button (for Phase 3 automation)

**Technical Additions:**
- WebSocket connections for real-time alerts
- Redis for alert queue management
- Twilio integration for SMS (premium add-on)
- Expo/React Native for mobile apps
- Background job processing (node-cron or Bull)

**Monetization (V2):**
- **Free Tier:** Basic email alerts only (daily summary)
- **Pro Tier ($39/mo):** Real-time push alerts, SMS (50/mo included), mobile app access
- **Premium Tier ($79/mo):** Unlimited SMS, custom alert rules, priority support
- **Add-on:** Extra SMS packs ($5 per 100 messages)

**Success Metrics:**
- 40%+ Pro users enable push notifications
- Average 15 alerts triggered per user per week
- 25%+ reduction in blown accounts (user survey)
- 200+ paying customers

---

### **PHASE 3: Automation & Risk Tools (Months 7-12)**
**Goal:** Automate risk management to prevent human error

**New Features:**

1. **Auto-Flatten Protection**
   - **Drawdown Circuit Breaker:**
     - Automatically close all positions when within X% of drawdown limit
     - User-configurable trigger threshold (default: 95% of limit)
     - Whitelist specific positions to exclude
     - Confirmation required mode vs. instant execution
     - Activity log of all auto-flattens
   
   - **Daily Loss Cutoff:**
     - Auto-close when daily loss reaches limit
     - "Soft stop" option: close new positions but keep existing
     - Time-based cutoffs: "Stop trading after 2 losses before 10am"
   
   - **Time-Based Rules:**
     - "Don't let me trade after 3pm EST" (prevent revenge trading)
     - "Close all positions 5 minutes before news events"
     - Maximum trade duration limits

2. **Position Sizing Calculator**
   - **Account-Aware Sizing:**
     - Input: desired risk amount ($500 stop loss)
     - Output: maximum contracts to stay within daily/total drawdown
     - Considers ALL open positions across all accounts
     - "Risk budget remaining today" display
   
   - **Multi-Account Coordination:**
     - Prevent correlated risk: "You're long 5 ES contracts across 3 accounts"
     - Warning if taking same trade direction on multiple accounts
     - Aggregate risk view: total exposure across all accounts
   
   - **Pre-Trade Validator:**
     - Before opening position: "This trade risks 30% of your daily limit"
     - "This will leave you $300 from drawdown violation"
     - Approval required for high-risk trades

3. **Correlation Analysis**
   - Detect when multiple accounts are in correlated positions
   - "You have $15,000 in NQ long exposure across 4 accounts"
   - Diversification score by instrument/direction
   - Suggest hedging opportunities

4. **Rule Compliance Automation**
   - **Consistency Rules (for firms with caps):**
     - Track daily profit caps (e.g., Topstep's 50% of target rule)
     - Auto-close when approaching cap
     - "You're $200 from exceeding daily max profit"
   
   - **Trading Time Restrictions:**
     - Enforce firm-specific trading hour rules
     - Block trades during prohibited times
     - News event calendar integration
   
   - **Contract Limit Enforcement:**
     - Prevent exceeding max position size rules
     - Instrument-specific limits

5. **Automated Record Keeping**
   - Auto-screenshot account dashboard at daily close
   - PDF export of daily trading activity
   - Proof of rule compliance for disputes
   - Downloadable audit trail

**Technical Additions:**
- Tradovate Order Entry API for position management
- Real-time market data feed (for pre-trade calculations)
- Complex event processing engine (detect patterns/violations)
- Automated screenshot service (Puppeteer/Playwright)
- S3/Cloudflare R2 for document storage

**Safety & Compliance:**
- **Kill Switch Feature:**
  - User-controlled master OFF switch for all automation
  - Disable all auto-actions with one click
  - Manual mode override
- **Audit Log:**
  - Every automated action logged with timestamp
  - User can review and challenge any action
  - Export to CSV for analysis
- **Liability Protection:**
  - Clear ToS: automation is assistive, not guaranteed
  - Users maintain ultimate trading responsibility
  - Recommendations vs. mandatory actions clearly labeled

**Monetization (V3):**
- **Free Tier:** Position calculator only (no automation)
- **Pro Tier ($59/mo):** Basic alerts + position calculator + 1 automated rule
- **Premium Tier ($99/mo):** All automation features, unlimited rules, correlation analysis
- **Enterprise Tier ($199/mo):** API access, white-label option, custom rule builder
- **Add-on:** Professional trade journaling integration ($19/mo)

**Success Metrics:**
- 30%+ of Pro users upgrade to Premium for automation
- 50%+ reduction in drawdown violations (tracked via user accounts)
- Average 15 automated actions per user per week
- 500+ paying customers
- Churn rate under 8% monthly

---

### **PHASE 4: Advanced Analytics & Scale (Months 13-18)**
**Goal:** Transform into comprehensive trading business intelligence platform

**New Features:**

1. **Performance Analytics Dashboard**
   - **Profitability by Firm:**
     - ROI comparison: Apex vs. Topstep vs. Earn2Trade
     - Cost per dollar earned
     - Time to profitability per firm
     - Recommendation: "Cancel Firm X, they're costing you $300/mo net"
   
   - **Trading Patterns:**
     - Best/worst instruments
     - Win rate by time of day
     - Optimal session length before performance degrades
     - Consecutive loss streaks detection
   
   - **Account Lifecycle Tracking:**
     - Average time from evaluation start to funded
     - Reset frequency by firm
     - Payout frequency and amounts
     - True cost per payout (fees + time)

2. **Trade Journaling Integration**
   - Full trade log with P&L, screenshots, notes
   - Tag trades: "good setup," "revenge trade," "news play"
   - Playbook builder: save successful setups
   - Review mode: filter trades by profitability, instrument, time
   - AI-powered pattern recognition: "You lose money 78% of the time when trading before 9:45am"

3. **Goal Tracking & Progress**
   - Set monthly profit targets
   - Track progress toward funded account goals
   - Milestone celebrations (first payout, 10th funded account)
   - Leaderboards (optional, opt-in community feature)

4. **Community Features**
   - Anonymous aggregate stats: "How do I compare to other traders?"
   - Firm pass rate statistics (crowdsourced data)
   - Best practices library
   - Forum/Discord integration for support

5. **Payout Optimization**
   - Payout request tracker across all firms
   - Expected payout dates calendar
   - Total earnings YTD, QTD
   - Tax estimator (1099 preparation)
   - Bank account/payment method management

6. **API & Integrations**
   - **Public API:**
     - Allow third-party tools to connect
     - Webhooks for custom automation
     - Zapier integration
   
   - **Platform Integrations:**
     - TradingView alert integration
     - Discord bot for account status
     - Google Sheets export
     - QuickBooks integration for expense tracking

7. **Team/Mentor Mode**
   - Allow mentors to view student accounts (permission-based)
   - Trading group shared analytics
   - Prop firm operators can use for client management
   - Multi-user accounts for trading businesses

**Technical Additions:**
- Advanced analytics engine (Python/Pandas for data science)
- Machine learning models for pattern detection
- GraphQL API for flexible data access
- Data warehouse (Snowflake or BigQuery) for historical analysis
- Caching layer (Redis) for performance at scale

**Monetization (V4):**
- **Free Tier:** Limited to 30-day data retention
- **Pro Tier ($79/mo):** 1-year retention, basic analytics
- **Premium Tier ($149/mo):** Unlimited retention, advanced analytics, API access
- **Enterprise Tier ($299/mo):** Team accounts (up to 5 users), mentor mode, white-label option
- **Marketplace:** Paid community playbooks, strategy templates ($5-50 each)

**Success Metrics:**
- 1,000+ paying customers
- 20%+ on Premium/Enterprise tiers
- API usage: 10,000+ calls/day from third-party tools
- Community: 5,000+ forum members
- LTV:CAC ratio of 3:1 or better

---

## Technical Architecture

### Technology Stack

**Frontend:**
- **Framework:** Next.js 14+ (React) with App Router
- **Styling:** TailwindCSS + shadcn/ui components
- **State Management:** Zustand or React Context
- **Real-time:** Socket.io client
- **Charts:** Recharts or Chart.js
- **Mobile:** React Native (Expo) for iOS/Android

**Backend:**
- **API Framework:** Node.js with Express or Fastify
- **Language:** TypeScript throughout
- **Real-time:** Socket.io server
- **Background Jobs:** Bull (Redis-based queue)
- **API Gateway:** Kong or custom middleware

**Database:**
- **Primary:** PostgreSQL (account data, user profiles, settings)
- **Time-Series:** TimescaleDB extension (trade history, P&L over time)
- **Cache:** Redis (sessions, real-time data, job queues)
- **Search:** PostgreSQL full-text search initially, Elasticsearch if needed

**External Services:**
- **Trading Platform:** Tradovate API (REST + WebSocket)
- **Notifications:** 
  - Email: SendGrid or AWS SES
  - Push: Firebase Cloud Messaging
  - SMS: Twilio
- **Storage:** AWS S3 or Cloudflare R2 (screenshots, documents)
- **Monitoring:** Sentry (errors), Datadog or Grafana (metrics)
- **Analytics:** Mixpanel or Amplitude (product usage)

**Infrastructure:**
- **Hosting:** 
  - Frontend: Vercel
  - Backend: Railway, Render, or AWS ECS
  - Database: Supabase (managed Postgres) or Neon
- **CDN:** Cloudflare
- **Secrets:** Doppler or AWS Secrets Manager
- **CI/CD:** GitHub Actions

### Data Models (Core Entities)

**User**
```typescript
{
  id: uuid
  email: string
  created_at: timestamp
  subscription_tier: 'free' | 'pro' | 'premium' | 'enterprise'
  preferences: {
    timezone: string
    alert_settings: object
    theme: 'light' | 'dark'
  }
}
```

**Account**
```typescript
{
  id: uuid
  user_id: uuid (foreign key)
  firm_name: string // 'apex', 'topstep', etc.
  account_number: string
  account_type: 'evaluation' | 'funded_sim' | 'funded_live'
  account_size: number // $50000, $150000, etc.
  status: 'active' | 'blown' | 'passed' | 'paused' | 'cancelled'
  
  // Tradovate connection
  tradovate_account_id: string
  tradovate_access_token: encrypted_string
  last_sync: timestamp
  
  // Firm-specific rules
  rules: {
    max_daily_loss: number
    max_trailing_drawdown: number
    drawdown_type: 'eod' | 'intraday_trailing'
    drawdown_basis: 'balance' | 'equity'
    max_contracts: number
    trading_days_required: number
    profit_target: number
    consistency_rule: object
  }
  
  // Subscription tracking
  monthly_fee: number
  billing_cycle_day: number // 1-31
  next_billing_date: date
  activation_fee: number
  activation_date: date
  
  // Financial tracking
  initial_balance: number
  current_balance: number
  highest_balance: number
  total_fees_paid: number
  total_payouts: number
  
  created_at: timestamp
  updated_at: timestamp
}
```

**Trade** (synced from Tradovate)
```typescript
{
  id: uuid
  account_id: uuid (foreign key)
  tradovate_trade_id: string
  
  instrument: string // 'MES', 'MNQ', 'ES', 'NQ'
  direction: 'long' | 'short'
  quantity: number
  entry_price: number
  exit_price: number
  entry_time: timestamp
  exit_time: timestamp
  
  realized_pnl: number
  commission: number
  net_pnl: number
  
  // Context
  session: 'pre_market' | 'regular' | 'after_hours'
  tags: string[] // user-added tags
  notes: text
  
  created_at: timestamp
}
```

**AccountSnapshot** (daily time-series)
```typescript
{
  id: uuid
  account_id: uuid (foreign key)
  snapshot_date: date
  
  balance_start: number
  balance_end: number
  highest_intraday: number
  
  daily_pnl: number
  daily_drawdown_used: number
  trailing_drawdown_buffer: number
  
  trades_count: number
  winning_trades: number
  
  screenshot_url: string
  
  created_at: timestamp
}
```

**Alert**
```typescript
{
  id: uuid
  user_id: uuid
  account_id: uuid (nullable for user-level alerts)
  
  type: 'drawdown_warning' | 'subscription_renewal' | 'daily_loss' | 'rule_violation'
  severity: 'info' | 'warning' | 'critical'
  message: string
  
  triggered_at: timestamp
  acknowledged_at: timestamp (nullable)
  dismissed: boolean
  
  // Delivery
  sent_push: boolean
  sent_email: boolean
  sent_sms: boolean
}
```

**AutomationRule**
```typescript
{
  id: uuid
  account_id: uuid (foreign key)
  
  rule_type: 'flatten_positions' | 'block_trades' | 'size_limit'
  trigger: {
    condition: 'drawdown_percent' | 'daily_loss' | 'time_of_day'
    threshold: number
    comparison: 'greater_than' | 'less_than' | 'equals'
  }
  
  action: {
    type: 'close_all' | 'close_new' | 'notify_only' | 'block_orders'
    parameters: object
  }
  
  enabled: boolean
  last_triggered: timestamp
  trigger_count: number
  
  created_at: timestamp
}
```

### API Design

**REST Endpoints:**

```
Authentication:
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

Accounts:
GET    /api/accounts                     # List all user accounts
POST   /api/accounts                     # Add new account
GET    /api/accounts/:id                 # Get account details
PUT    /api/accounts/:id                 # Update account
DELETE /api/accounts/:id                 # Archive account
POST   /api/accounts/:id/connect         # Connect to Tradovate
GET    /api/accounts/:id/sync            # Force sync
GET    /api/accounts/:id/balance-history # Time-series data

Trades:
GET    /api/accounts/:id/trades          # List trades for account
GET    /api/trades/:id                   # Trade details
PUT    /api/trades/:id                   # Update tags/notes
POST   /api/trades/:id/screenshot        # Upload trade screenshot

Dashboard:
GET    /api/dashboard                    # Aggregate stats across all accounts
GET    /api/dashboard/performance        # Performance analytics
GET    /api/dashboard/fees               # Fee summary

Alerts:
GET    /api/alerts                       # List user alerts
PUT    /api/alerts/:id/acknowledge       # Mark as read
DELETE /api/alerts/:id                   # Dismiss alert
PUT    /api/alerts/preferences           # Update notification settings

Automation:
GET    /api/automation/rules             # List automation rules
POST   /api/automation/rules             # Create rule
PUT    /api/automation/rules/:id         # Update rule
DELETE /api/automation/rules/:id         # Delete rule
POST   /api/automation/rules/:id/test    # Test rule logic
GET    /api/automation/logs              # Automation execution history

Billing:
GET    /api/billing/subscription         # Current plan
POST   /api/billing/upgrade              # Change plan
POST   /api/billing/cancel               # Cancel subscription
GET    /api/billing/invoices             # Invoice history

Admin (Enterprise):
GET    /api/admin/users                  # Team members
POST   /api/admin/users/invite           # Invite user
DELETE /api/admin/users/:id              # Remove user
```

**WebSocket Events:**

```
Client → Server:
- subscribe_account       # Start receiving account updates
- unsubscribe_account     # Stop updates

Server → Client:
- account_update          # Balance/position changed
- alert_triggered         # New alert
- automation_executed     # Rule fired
- trade_opened            # New trade detected
- trade_closed            # Trade closed
- sync_status             # Tradovate sync status
```

### Third-Party Integrations

**Tradovate API Integration:**

1. **Authentication Flow:**
   - User provides Tradovate credentials
   - App obtains OAuth access token
   - Store encrypted refresh token
   - Auto-refresh before expiration

2. **Data Sync Strategy:**
   - **Real-time (WebSocket):** Account balance, open positions, order fills
   - **Polling (REST):** Every 60 seconds for backup/reconciliation
   - **Batch (Daily):** Historical trades, account snapshots

3. **API Rate Limits:**
   - Tradovate: 1000 requests/hour per account
   - Strategy: Implement client-side rate limiting, queue requests
   - Cache frequently accessed data (account rules, user preferences)

4. **Error Handling:**
   - Tradovate connection loss: Switch to polling, notify user
   - Invalid credentials: Prompt re-authentication
   - API errors: Log, retry with exponential backoff, alert if persistent

**Stripe Integration (Payments):**
- Subscription management
- Usage-based billing (SMS overages)
- Invoicing
- Payment method storage

**SendGrid/Twilio:**
- Transactional emails (alerts, receipts)
- SMS notifications
- Delivery tracking and analytics

### Security & Compliance

**Data Protection:**
- All Tradovate credentials encrypted at rest (AES-256)
- TLS 1.3 for all data in transit
- API keys rotated quarterly
- Regular security audits

**Access Control:**
- JWT-based authentication
- Role-based access (user, admin, enterprise_admin)
- API rate limiting per user tier
- Account isolation (users can't see others' data)

**Privacy:**
- GDPR-compliant data handling
- User data export on request
- Account deletion with full data purge
- Anonymous usage analytics only

**Disaster Recovery:**
- Daily database backups (retained 30 days)
- Point-in-time recovery available
- Multi-region redundancy for critical services
- RTO: 4 hours, RPO: 1 hour

---

## User Experience & Design

### Core UX Principles

1. **Minimize Cognitive Load**
   - Dashboard shows only critical info at a glance
   - Color coding: Green (safe), Yellow (caution), Red (danger)
   - Progressive disclosure: details on click/hover
   - Sensible defaults for all settings

2. **Speed Over Beauty**
   - Prioritize fast page loads (<1 second)
   - Real-time updates without refresh
   - Lazy load non-critical components
   - Mobile-first responsive design

3. **Trust Through Transparency**
   - Always show "last synced" timestamps
   - Explain every alert/automation action
   - No hidden fees or surprise charges
   - Clear ToS and privacy policy

4. **Prevent Errors, Enable Recovery**
   - Confirmation dialogs for destructive actions
   - Undo capability where possible
   - Draft mode for automation rules (test before enable)
   - Export data before account deletion

### Key User Flows

**Onboarding Flow (First-Time User):**

1. **Sign Up** (Email + password or Google OAuth)
2. **Welcome Survey** (3 questions):
   - How many prop firm accounts do you have? [1-2 / 3-5 / 6-10 / 10+]
   - Which firms do you use? [Checkboxes: Apex, Topstep, etc.]
   - What's your biggest challenge? [Dropdown: Subscription tracking / Drawdown violations / Time management]
3. **Subscription Selection:**
   - Start with Free (no card required)
   - Option to upgrade immediately (50% off first 3 months)
4. **Add First Account:**
   - Firm selection dropdown
   - Account number input
   - Connect Tradovate button → OAuth flow
   - Rules auto-populated based on firm
5. **Dashboard Tour** (Interactive walkthrough):
   - "This is your account health score"
   - "Set up your first alert here"
   - "Your subscription renewal date is shown here"
6. **First Alert Setup:**
   - Guided wizard: "Let's set up a drawdown warning at 80%"
   - Success message + encouragement

**Daily Active User Flow:**

1. **Login → Dashboard**
   - See all accounts at a glance
   - Check for alerts (red notification badge)
   - Quick scan of today's P&L
2. **Pre-Trade Check:**
   - Open position calculator
   - Input trade idea (instrument, size, stop)
   - See remaining risk budget
   - Confirm trade is safe
3. **During Trade:**
   - Mobile app open in background
   - Push alert if approaching drawdown
   - Automated flatten if critical threshold hit
4. **End of Day:**
   - Review performance across accounts
   - Check subscription calendar for upcoming charges
   - Add trade notes/tags
   - Receive daily summary email

**Automation Setup Flow:**

1. **Navigate to Automation Tab**
2. **Click "New Rule"**
3. **Rule Builder Wizard:**
   - Select account (or apply to all)
   - Choose trigger type (drawdown / daily loss / time)
   - Set threshold (slider or input)
   - Choose action (flatten / notify / block)
   - Preview rule logic
4. **Test Mode:**
   - "Test this rule" button
   - Simulated scenarios shown
   - "What would happen if..." examples
5. **Enable Rule:**
   - Toggle from test → live
   - Confirmation dialog with summary
   - "You can disable this anytime" reassurance

### Design System

**Color Palette:**
- **Primary:** Blue (#3B82F6) - trustworthy, professional
- **Success:** Green (#10B981) - safe, positive
- **Warning:** Yellow (#F59E0B) - caution, attention needed
- **Danger:** Red (#EF4444) - critical, urgent action required
- **Neutral:** Gray scale (#F9FAFB → #111827)

**Typography:**
- **Headers:** Inter (clean, modern)
- **Body:** Inter or System UI
- **Numbers/Data:** JetBrains Mono (monospace for clarity)

**Components:**
- Card-based layout for accounts
- Toast notifications for alerts
- Modal dialogs for confirmations
- Skeleton loaders during data fetch
- Empty states with helpful CTAs

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Logo    Dashboard    Accounts    Alerts    Settings│  ← Nav
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │ Total P&L Today │  │  Accounts At Risk: 2     │ │
│  │    +$1,247      │  │  Upcoming Charges: $450  │ │
│  └─────────────────┘  └──────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Account Health Overview                             │
│  ┌──────────────┬──────────────┬──────────────────┐│
│  │ Apex #1234   │ Topstep #567 │ MFF #890         ││
│  │ ● Funded     │ ● Evaluation │ ● Funded         ││
│  │ $52,340      │ $47,200      │ $148,900         ││
│  │ Buffer: $800 │ Buffer: $150 │ Buffer: $2,100   ││
│  │ [View]       │ [⚠️ View]    │ [View]           ││
│  └──────────────┴──────────────┴──────────────────┘│
├─────────────────────────────────────────────────────┤
│  Recent Alerts                                       │
│  ⚠️ Topstep #567 approaching daily limit (15m ago)  │
│  💰 Subscription renewal in 3 days - Apex ($165)    │
│  ✅ Auto-flatten executed on MFF #890 (2h ago)      │
└─────────────────────────────────────────────────────┘
```

---

## Go-To-Market Strategy

### Phase 1: Beta Launch (Months 1-3)

**Goal:** Validate product-market fit with 100 early adopters

**Tactics:**
1. **Direct Outreach:**
   - Post in r/Futurestrading, r/FuturesTrading subreddits
   - Share in futures prop trading Discord servers (TopstepTrader, Apex, etc.)
   - DM active traders on Twitter/X who complain about prop firm issues
   - Cold email prop trading YouTube channels for review/feature

2. **Content Marketing:**
   - Publish "The Ultimate Guide to Managing Multiple Prop Firm Accounts"
   - Create YouTube video: "I Tracked 10 Prop Accounts for 30 Days—Here's What I Learned"
   - Twitter thread: "3 mistakes that cost me $2,000 in prop firm fees (and how to avoid them)"
   - Guest post on prop trading blogs

3. **Beta Incentives:**
   - Free Pro tier for life to first 50 users
   - Feature requests prioritized for beta users
   - Exclusive Discord/Slack channel for feedback
   - Recognition as "Founding Member" with badge

**Channels:**
- Reddit (organic posts, not ads yet)
- Discord communities
- Twitter/X
- YouTube (educational content)
- Email list (from content downloads)

**KPIs:**
- 100 beta signups in 90 days
- 60% activation rate (add at least 1 account)
- 10+ user interviews completed
- NPS score 40+

### Phase 2: Public Launch (Months 4-6)

**Goal:** Scale to 500 paying customers

**Tactics:**
1. **Paid Advertising:**
   - Google Ads: Target "futures prop firm," "Topstep review," "Apex Trader Funding"
   - YouTube ads: Pre-roll on prop trading channels
   - Facebook/Instagram: Target futures traders, day traders (lookalike audiences)
   - Reddit ads: r/Futurestrading, r/Daytrading

2. **Influencer Partnerships:**
   - Sponsor 3-5 prop trading YouTubers (10K-100K subscribers)
   - Affiliate program: 30% recurring commission for referrals
   - Provide free Premium tier for content creators

3. **SEO & Content:**
   - Blog: "Apex vs Topstep: Which Prop Firm is Right for You?"
   - Comparison pages for each major prop firm
   - Tutorials: "How to Pass Your Futures Prop Firm Evaluation"
   - Case studies from beta users

4. **Email Drip Campaigns:**
   - 7-day onboarding sequence for new signups
   - Monthly newsletter with tips, feature updates
   - Re-engagement campaigns for inactive users

**Channels (Prioritized):**
1. Google Ads (high intent keywords)
2. YouTube (video content + ads)
3. SEO/Blog
4. Affiliate program
5. Reddit/Discord (organic community building)

**KPIs:**
- 500 paying customers (any tier)
- 20% free-to-paid conversion
- CAC under $60
- Monthly churn under 10%

### Phase 3: Growth & Scale (Months 7-12)

**Goal:** 1,000+ paying customers, establish market leadership

**Tactics:**
1. **Product-Led Growth:**
   - Viral loop: "Invite a friend, both get 1 month free"
   - Share features: "Tweet your account stats" (redacted, anonymous)
   - Integrations marketplace: Partner with trade journaling tools

2. **B2B Partnerships:**
   - White-label for prop firms: "Offer our tool to your traders"
   - Referral deals with prop firms: "Get 10% off with code PROPGUARDIAN"
   - Trading educators: Bundle with courses

3. **Community Building:**
   - Weekly webinars: "Ask Me Anything" with prop traders
   - Public leaderboard (opt-in): Top performers by ROI
   - User-generated content: "Share your funded account journey"

4. **PR & Media:**
   - Press release for major milestones (1,000 users, $1M in prevented losses)
   - Podcast appearances (trading, fintech, SaaS podcasts)
   - Case studies: "How Trader X Manages 15 Funded Accounts"

**KPIs:**
- 1,000 paying customers
- 30% MoM growth
- 25%+ on Premium/Enterprise tiers
- LTV:CAC ratio of 3:1

### Pricing Strategy

**Free Tier:**
- Up to 2 accounts
- Manual sync (once per hour)
- Basic dashboard
- Email alerts only (daily summary)
- 30-day data retention
- **Goal:** Lead generation, viral awareness

**Pro Tier - $39/mo (or $390/year, save 17%):**
- Unlimited accounts
- Real-time sync (Tradovate WebSocket)
- Advanced dashboard with drawdown tracking
- Push notifications + email alerts
- 50 SMS alerts/month included
- 1-year data retention
- Priority email support
- **Target:** Solo traders with 3-5 accounts

**Premium Tier - $99/mo (or $990/year, save 17%):**
- Everything in Pro
- Full automation (auto-flatten, position limits)
- Unlimited SMS alerts
- Correlation analysis
- Advanced analytics & reporting
- API access
- Trade journaling
- Unlimited data retention
- Priority support + live chat
- **Target:** Serious traders with 6+ accounts, consistent profitability

**Enterprise Tier - $299/mo (custom annual pricing):**
- Everything in Premium
- Team accounts (up to 5 users)
- Mentor mode (view student accounts)
- White-label option
- Custom automation rules
- Dedicated account manager
- SLA guarantee (99.9% uptime)
- **Target:** Trading educators, prop firm operators, trading groups

**Add-Ons:**
- Extra SMS: $5 per 100 messages
- Priority feature requests: $99 one-time
- 1-on-1 setup consultation: $149

**Pricing Psychology:**
- Anchor high with Premium/Enterprise to make Pro feel affordable
- Annual discount encourages commitment
- SMS overages are revenue boost without feeling expensive
- Free tier is genuinely useful to build trust

### Customer Acquisition Channels (Ranked by Priority)

1. **SEO/Content (Long-term, low CAC)**
   - Comparison content ranks well
   - High buyer intent
   - Compounds over time

2. **Google Ads (High intent, scalable)**
   - Target bottom-of-funnel keywords
   - Proven conversion in SaaS

3. **YouTube (Educational + Ads)**
   - Traders watch hours of prop firm content
   - Video demos convert well

4. **Affiliate Program (Performance-based)**
   - Influencers already reviewing prop firms
   - 30% commission aligns incentives

5. **Reddit/Discord (Community)**
   - Where target users already hang out
   - High engagement, low cost

6. **Email Marketing (Owned audience)**
   - Nurture leads from content
   - Re-engage churned users

---

## Financial Projections (18-Month Forecast)

### Assumptions:
- Launch Month 1 (MVP complete)
- Free → Pro conversion: 20%
- Pro → Premium upgrade: 15%
- Monthly churn: 8% (industry avg for trading tools)
- Average customer lifetime: 12.5 months
- CAC: $60 (blended across channels)

### Revenue Projections:

**Month 3 (End of Phase 1):**
- Free users: 100
- Pro ($39/mo): 15
- Premium ($99/mo): 3
- **MRR: $882**

**Month 6 (End of Phase 2):**
- Free users: 800
- Pro ($39/mo): 120
- Premium ($99/mo): 30
- **MRR: $7,650**

**Month 12 (End of Phase 3):**
- Free users: 2,000
- Pro ($39/mo): 350
- Premium ($99/mo): 100
- Enterprise ($299/mo): 5
- **MRR: $24,545**
- **ARR: $294,540**

**Month 18 (Maturity):**
- Free users: 4,000
- Pro ($39/mo): 600
- Premium ($99/mo): 250
- Enterprise ($299/mo): 15
- **MRR: $52,635**
- **ARR: $631,620**

### Cost Structure (Month 12):

**Fixed Costs:**
- Founder salary (deferred): $0
- Infrastructure (AWS, APIs): $800/mo
- Software subscriptions: $300/mo
- **Total Fixed: $1,100/mo**

**Variable Costs:**
- SMS (Twilio): $500/mo (overage charges passed to users)
- Customer support: $1,500/mo (part-time contractor)
- Payment processing (2.9% + $0.30): ~$750/mo
- **Total Variable: $2,750/mo**

**Marketing:**
- Google Ads: $3,000/mo
- Content creation: $1,000/mo
- Affiliate commissions: $2,500/mo (30% of new MRR)
- **Total Marketing: $6,500/mo**

**Total Monthly Costs: $10,350**

**Month 12 Profit: $24,545 - $10,350 = $14,195/mo**

### Unit Economics:

**Average Revenue Per Account (ARPA):**
- Pro: $39/mo
- Premium: $99/mo
- Blended (weighted): ~$52/mo

**Customer Lifetime Value (LTV):**
- ARPA: $52
- Avg lifetime: 12.5 months
- **LTV = $650**

**Customer Acquisition Cost (CAC):**
- Blended across channels: **$60**

**LTV:CAC Ratio: 10.8:1** (Excellent - healthy is 3:1+)

**Payback Period: 1.2 months** (Time to recover CAC)

### Funding Requirements:

**Bootstrap Scenario (Recommended):**
- Personal investment: $10,000 (infrastructure, initial marketing)
- Runway to Month 6 (break-even): ~$30,000
- Founder works full-time with deferred salary
- Revenue funds growth post-Month 6

**Seed Round Scenario (Optional):**
- Raise: $250,000
- Use: Hire 2 developers, 1 marketer, scale ads faster
- Goal: Hit 1,000 customers by Month 9 instead of Month 12
- Valuation: $1-1.5M pre-money

**Recommendation:** Bootstrap to $10K MRR, then decide on funding based on growth trajectory.

---

## Success Metrics & KPIs

### North Star Metric:
**Prevented Account Losses** - Total number of drawdown violations, blown accounts, and forgotten subscriptions prevented by the platform

### Product Metrics:

**Activation:**
- % of signups who add ≥1 account: Target 70%
- % who complete Tradovate connection: Target 60%
- Time to first value (dashboard view): Target <5 minutes

**Engagement:**
- DAU/MAU ratio: Target 40%+ (daily active usage)
- Avg logins per week: Target 5+
- % users checking dashboard daily: Target 50%+
- Alerts triggered per user/week: Target 10-15

**Retention:**
- Day 1, 7, 30 retention: Target 80%, 60%, 40%
- Monthly churn rate: Target <8%
- Reasons for churn (tracked via exit survey)

**Monetization:**
- Free → Pro conversion: Target 20%
- Pro → Premium upgrade: Target 15%
- ARPU growth MoM: Target 5%+
- Expansion revenue (upgrades): Target 30% of total revenue

### Business Metrics:

**Growth:**
- MoM user growth: Target 20%+
- MoM revenue growth: Target 25%+
- Viral coefficient (invites → signups): Target 0.3+

**Financial Health:**
- CAC: Target <$60
- LTV: Target >$600
- LTV:CAC: Target >3:1
- Gross margin: Target 85%+
- Burn rate (if funded): Extend runway to 18+ months

**Customer Satisfaction:**
- NPS score: Target 40+
- Support ticket resolution time: Target <24 hours
- Feature request voting engagement: Target 30%+ of users

### Technical Metrics:

**Performance:**
- Page load time: <1 second
- API response time (p95): <300ms
- WebSocket latency: <100ms
- Uptime: 99.9%+

**Data Quality:**
- Tradovate sync success rate: >99%
- Alert delivery rate: 99.9%
- Automation execution reliability: 99.95%

---

## Risk Analysis & Mitigation

### Technical Risks:

**Risk 1: Tradovate API Changes or Downtime**
- **Impact:** Loss of real-time data, broken features
- **Probability:** Medium (APIs evolve, outages happen)
- **Mitigation:** 
  - Build fallback to manual CSV import
  - Polling backup if WebSocket fails
  - Multi-broker support roadmap (Rithmic, NinjaTrader)
  - Transparent communication with users during outages

**Risk 2: Data Accuracy Issues**
- **Impact:** Incorrect drawdown calculations → blown accounts
- **Probability:** Low-Medium (complex rules engine)
- **Mitigation:**
  - Extensive testing with real account data
  - User-reported discrepancy tool
  - Conservative buffers in automation (never flatten at exact limit)
  - Clear ToS: tool is assistive, not guaranteed

**Risk 3: Scalability Bottlenecks**
- **Impact:** Slow performance as user base grows
- **Probability:** Medium (at 1,000+ users with real-time data)
- **Mitigation:**
  - Horizontal scaling (add servers)
  - Database optimization (indexes, partitioning)
  - Caching strategy (Redis)
  - Load testing before scaling

### Business Risks:

**Risk 4: Prop Firms Build In-House Solution**
- **Impact:** Loss of competitive advantage
- **Probability:** Low-Medium (firms focus on evaluation business, not software)
- **Mitigation:**
  - Multi-firm aggregation is our moat (firms can't replicate this)
  - Move upmarket to features firms don't care about (trade journaling, analytics)
  - Consider B2B partnerships (white-label for smaller firms)

**Risk 5: Low Free → Paid Conversion**
- **Impact:** Revenue below projections
- **Probability:** Medium (freemium is hard)
- **Mitigation:**
  - Limit free tier meaningfully (2 accounts, no real-time)
  - Clear upgrade prompts at friction points
  - Time-limited free trials of Pro features
  - A/B test pricing and packaging

**Risk 6: High Churn Rate**
- **Impact:** Growth stalls, LTV tanks
- **Probability:** Medium (traders blow all accounts, quit prop trading)
- **Mitigation:**
  - Track churn reasons (exit surveys)
  - Winback campaigns for churned users
  - Educational content to help traders pass evaluations
  - Community features to increase stickiness

### Legal/Compliance Risks:

**Risk 7: Liability for Automated Actions**
- **Impact:** Lawsuit if automation fails and user loses money
- **Probability:** Low (with proper ToS)
- **Mitigation:**
  - Crystal-clear ToS: tool is assistive, not trading advice
  - Users manually approve automation rules
  - Audit log of all actions
  - Errors & omissions insurance

**Risk 8: Data Privacy Violations (GDPR, CCPA)**
- **Impact:** Fines, loss of trust
- **Probability:** Low (if designed correctly from start)
- **Mitigation:**
  - Privacy-first architecture
  - Data encryption at rest and in transit
  - User data export/deletion tools
  - Regular compliance audits

### Market Risks:

**Risk 9: Prop Firm Industry Collapse**
- **Impact:** Total addressable market shrinks
- **Probability:** Low (industry growing, not shrinking)
- **Mitigation:**
  - Expand to retail traders (future roadmap)
  - Pivot to general futures trade management if needed
  - Diversify revenue streams (B2B, marketplace)

**Risk 10: Competition from Well-Funded Startup**
- **Impact:** Outspent on marketing, lose users
- **Probability:** Low-Medium (niche market, not obvious to VCs yet)
- **Mitigation:**
  - Speed to market advantage (launch fast)
  - Deep domain expertise (trader-founder)
  - Community moat (active users, content)
  - Superior product (better UX, more features)

---

## Roadmap & Milestones

### Phase 1: MVP (Months 1-3)
**Goal:** Launch basic dashboard and validate core value prop

**Key Deliverables:**
- [ ] User authentication (email/password, Google OAuth)
- [ ] Account management (add, edit, archive)
- [ ] Tradovate API integration (OAuth, WebSocket, polling)
- [ ] Real-time dashboard with P&L aggregation
- [ ] Drawdown tracking (with firm-specific rules)
- [ ] Subscription calendar (manual entry, upcoming charges)
- [ ] Basic alert system (email only)
- [ ] Responsive web UI (desktop + mobile)
- [ ] Stripe integration (Pro tier only for MVP)
- [ ] Landing page + documentation

**Milestone:** 100 beta users, 60% activation rate

---

### Phase 2: Alerts & Intelligence (Months 4-6)
**Goal:** Add proactive notifications and mobile experience

**Key Deliverables:**
- [ ] Smart alerts (drawdown, daily loss, subscription renewals)
- [ ] Push notifications (web push API)
- [ ] SMS alerts via Twilio (Premium tier)
- [ ] Mobile app (React Native) - iOS and Android
- [ ] Alert preferences hub (granular control)
- [ ] Weekly performance digest (email)
- [ ] Account comparison analytics
- [ ] Premium tier launch

**Milestone:** 500 paying customers, 20% free-to-paid conversion

---

### Phase 3: Automation & Risk Tools (Months 7-12)
**Goal:** Enable automated risk management

**Key Deliverables:**
- [ ] Auto-flatten protection (drawdown circuit breaker)
- [ ] Daily loss cutoff automation
- [ ] Position sizing calculator (account-aware)
- [ ] Multi-account risk aggregation
- [ ] Correlation analysis
- [ ] Rule compliance automation (consistency rules, time restrictions)
- [ ] Pre-trade validator ("this trade risks X% of your limit")
- [ ] Automation rule builder (UI)
- [ ] Test mode for rules (simulate before enabling)
- [ ] Audit log for all automated actions
- [ ] Kill switch (disable all automation)
- [ ] Automated record-keeping (daily screenshots)

**Milestone:** 1,000 paying customers, 30% on Premium/Enterprise

---

### Phase 4: Advanced Analytics & Scale (Months 13-18)
**Goal:** Become comprehensive trading business intelligence platform

**Key Deliverables:**
- [ ] Performance analytics dashboard (profitability by firm, patterns)
- [ ] Trade journaling integration
- [ ] Goal tracking & progress
- [ ] Payout optimization (request tracker, tax estimator)
- [ ] Community features (leaderboards, forums, best practices)
- [ ] Public API (REST + webhooks)
- [ ] Third-party integrations (TradingView, Discord, Zapier)
- [ ] Team/mentor mode (multi-user accounts)
- [ ] Advanced ML-powered insights ("You lose 78% of trades before 9:45am")
- [ ] Marketplace (strategy templates, playbooks)
- [ ] White-label option (Enterprise)

**Milestone:** 2,000+ users, $50K+ MRR, market leader status

---

### Long-Term Vision (18+ Months):

**Expand Beyond Tradovate:**
- Support for Rithmic, NinjaTrader, Sierra Chart
- Partner directly with prop firms for native integrations

**Retail Trader Pivot:**
- Open platform to non-prop traders
- Multi-broker support (TD Ameritrade, Interactive Brokers)
- Becomes "trading operations platform" for all futures traders

**AI-Powered Coaching:**
- Personalized recommendations: "Stop trading after 2 losses"
- Predictive alerts: "At current trajectory, you'll violate in 3 trades"
- Automated strategy backtesting

**Marketplace Ecosystem:**
- Users sell their successful playbooks/strategies
- Trading educators offer courses through platform
- Revenue share model (20% platform fee)

**Institutional/B2B:**
- Prop firms use our tech to monitor their traders
- Trading education companies bundle our tool
- White-label for brokers

---

## Team & Roles (Future Hiring Plan)

### Current Team (Solo Founder):
- **You:** Full-stack developer, trader, product vision
- **Strengths:** Domain expertise, technical execution, trader credibility
- **Gaps:** Marketing, design, scale operations

### First Hires (Month 6-9, if funded or at $15K MRR):

**Hire 1: Marketing Lead (Contractor → Full-time)**
- Owns: Content, SEO, paid ads, affiliate program
- Background: SaaS marketing, ideally fintech/trading
- Salary: $60-80K + equity (0.5-1%)

**Hire 2: Customer Success / Support (Part-time → Full-time)**
- Owns: Onboarding, support tickets, user feedback
- Background: Trading knowledge helpful, excellent communicator
- Salary: $40-50K + equity (0.25%)

### Future Hires (Month 12+):

**Hire 3: Backend Engineer**
- Owns: API, automation, scaling infrastructure
- Background: Node.js, real-time systems, fintech
- Salary: $100-120K + equity (0.5-1%)

**Hire 4: Designer (Contract or Full-time)**
- Owns: UI/UX, brand, product design
- Background: SaaS product design, data visualization
- Salary: $80-100K or $5-10K/month contract

**Hire 5: Sales (Enterprise focus)**
- Owns: B2B partnerships, white-label deals, prop firm relationships
- Background: SaaS sales, trading industry connections
- Salary: $60K base + commission (OTE $120K+)

### Advisory Board (Equity-only, 0.25% each):
- **Successful Prop Trader:** Product feedback, user credibility
- **Fintech/Trading Lawyer:** Compliance, risk management
- **SaaS Growth Expert:** Go-to-market, scaling playbook

---

## Why This Will Succeed

### 1. Founder-Market Fit
- You're a futures prop trader experiencing these exact problems
- You understand the pain viscerally, not academically
- You have domain expertise competitors lack
- You have technical skills to build the solution

### 2. Genuine, Validated Pain
- Traders are already losing thousands annually to preventable issues
- Existing solutions are fragmented and inadequate
- Willingness to pay is proven ($5-150/mo for partial solutions)
- Market size is substantial and growing

### 3. Defensible Moat
- **Technical:** API integrations, complex rules engine, real-time infrastructure
- **Data:** Aggregate analytics become more valuable with scale
- **Community:** Active users create network effects
- **Switching Costs:** Once automated, painful to leave

### 4. Scalable Business Model
- SaaS with 85%+ gross margins
- Recurring revenue, not one-time sales
- Product-led growth potential (free tier → viral loop)
- Clear upgrade path (Free → Pro → Premium → Enterprise)

### 5. Timing
- Prop trading industry is booming (more firms launching)
- Traders managing more accounts than ever (5-20 is common)
- No dominant player has emerged yet
- Technology (APIs, real-time infra) is mature and accessible

### 6. Execution Advantage
- You can build MVP solo in 2-3 months
- Bootstrap-friendly (low infrastructure costs)
- Fast iteration based on user feedback
- Direct access to target users (you are one)

---

## Appendix

### Competitive Analysis Matrix

| Feature | PropGuardian (Us) | PropFirmTracker | QuantGuard | Prop Firm One | TradesViz |
|---------|-------------------|-----------------|------------|---------------|-----------|
| **Real-time Sync** | ✅ API | ❌ Manual | ✅ API | ⚠️ Limited | ✅ API |
| **Multi-Firm Support** | ✅ | ✅ | ⚠️ Limited | ✅ | ✅ |
| **Drawdown Tracking** | ✅ Live | ⚠️ Manual | ✅ Live | ⚠️ Basic | ❌ |
| **Subscription Management** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Alerts (Push/SMS)** | ✅ | ❌ Email only | ⚠️ Email | ⚠️ Limited | ❌ |
| **Automation** | ✅ Full | ❌ | ✅ Risk only | ❌ | ❌ |
| **Position Calculator** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Mobile App** | ✅ Native | ❌ | ❌ | 🔄 Coming | ❌ Web only |
| **Trade Journal** | ✅ Phase 4 | ❌ | ❌ | ❌ | ✅ Core feature |
| **API Access** | ✅ Premium | ❌ | ❌ | ❌ | ⚠️ Limited |
| **Price** | $39-99/mo | $5/mo | $75-150/mo | ??? | $39/mo |
| **Focus** | Futures Prop | All Prop | Risk Mgmt | All Prop | Trade Analytics |

**Unique Advantages:**
1. Only platform with BOTH real-time automation AND subscription management
2. Futures-specific (not diluted with forex/stocks)
3. Mobile-first experience (native apps)
4. Comprehensive free tier (builds trust)
5. Trader-founder credibility

---

### Technology Stack Rationale

**Why Next.js?**
- Fast development (built-in routing, API routes)
- SEO-friendly (critical for content marketing)
- Excellent TypeScript support
- Large ecosystem (shadcn/ui, etc.)
- Easy deployment (Vercel)

**Why PostgreSQL?**
- Rock-solid reliability
- JSON support (flexible schema for firm-specific rules)
- TimescaleDB extension (time-series data)
- Mature ecosystem, excellent ORMs (Prisma)

**Why Tradovate API?**
- 10+ major prop firms use it
- Good documentation
- WebSocket support (real-time)
- OAuth authentication
- Sufficient rate limits

**Why React Native (Expo)?**
- Code sharing with web (80%+ reuse)
- Fast iteration
- Over-the-air updates
- Good enough performance for our use case

**Why NOT:**
- ❌ Supabase: Want more control over backend logic, automation complexity
- ❌ Firebase: Vendor lock-in, cost at scale
- ❌ Django/Flask: Node.js better for real-time WebSocket handling
- ❌ Flutter: Different language, less web code reuse

---

### User Personas

**Persona 1: "Grinder Gary"**
- Age: 28-35
- Experience: 2-3 years futures trading
- Accounts: 5-8 across 3 firms (Apex, Topstep, Earn2Trade)
- Pain: Wasting time on admin, missed a renewal charge last month ($165)
- Goal: Get to funded status faster, reduce overhead
- Tier: Pro ($39/mo) - willing to pay if it saves time
- Usage: Checks dashboard 2x/day, relies on alerts

**Persona 2: "Pro Paula"**
- Age: 35-45
- Experience: 5+ years, full-time trader
- Accounts: 10-15 funded accounts across 4-5 firms
- Pain: Can't mentally track drawdown across all accounts, lost a funded account last quarter
- Goal: Scale to 20 funded accounts without blowing any
- Tier: Premium ($99/mo) - automation is essential
- Usage: Lives in the mobile app, automation running 24/7

**Persona 3: "Educator Eddie"**
- Age: 40-50
- Experience: 10+ years, runs trading education business
- Accounts: Manages own + monitors 20 students
- Pain: Students ask for help tracking accounts, wants to offer value-add
- Goal: White-label solution for students, increase course value
- Tier: Enterprise ($299/mo) - needs team features
- Usage: Mentor mode, views student dashboards, provides coaching

**Persona 4: "Newbie Nick"**
- Age: 22-28
- Experience: <1 year trading, just started prop firms
- Accounts: 1-2 evaluation accounts
- Pain: Confused by trailing drawdown, almost blew account
- Goal: Pass first evaluation, understand the rules
- Tier: Free (testing the waters) → Pro after first payout
- Usage: Reads guides, watches YouTube tutorials, checks dashboard occasionally

---

### FAQs (For Sales/Marketing)

**Q: How is this different from a trading journal?**
A: Journals track *what* you traded. We track *how much you can trade* without violating rules. We prevent blown accounts, not just analyze them after.

**Q: Can this guarantee I won't blow my account?**
A: No tool can guarantee that—you're still responsible for your trading. But we dramatically reduce the risk of *preventable* violations (drawdown confusion, forgotten subscriptions, mental math errors).

**Q: What if I use NinjaTrader, not Tradovate?**
A: Currently we only support Tradovate. NinjaTrader and Rithmic support is on our roadmap for 2026.

**Q: Do you store my Tradovate password?**
A: No. We use OAuth (the same tech Google uses). You authorize access, we get a secure token, and you can revoke it anytime.

**Q: What happens if your automation fails and I lose my account?**
A: Our automation is assistive, not guaranteed. You set the rules, we execute them—but you're ultimately responsible. We recommend conservative buffers (e.g., auto-flatten at 95%, not 100%).

**Q: Why should I pay when I can use a spreadsheet for free?**
A: You can. But how much is your time worth? How much does a blown account cost? If you manage 5+ accounts, you're likely spending 1-2 hours daily on admin. We save that time and prevent costly mistakes.

**Q: What if I only have 1 account?**
A: Our free tier works great for 1-2 accounts. But most successful prop traders scale to multiple accounts—we're built for when you get there.

**Q: Can I cancel anytime?**
A: Yes. No contracts, no cancellation fees. Cancel with one click in settings.

**Q: Do you work with [specific prop firm]?**
A: If they use Tradovate, yes. We support Apex, Topstep, Earn2Trade, My Funded Futures, Bulenox, Take Profit Trader, and 10+ others.

---

## Conclusion

This vision document outlines a **clear, validated opportunity** to build the definitive futures prop trading account management platform. 

**The market is ready:**
- Traders are suffering with spreadsheets and forgotten subscriptions
- Existing solutions are fragmented and incomplete
- Willingness to pay is proven ($5-150/mo)

**The timing is right:**
- Prop trading industry is exploding
- Tradovate API makes integration feasible
- No dominant player has emerged yet

**You're the right founder:**
- Domain expertise (you're a trader)
- Technical skills (you can build this)
- Problem-solution fit (you've experienced the pain)

**The path forward is clear:**
1. Build MVP in 3 months (dashboard + basic alerts)
2. Get 100 beta users for validation
3. Launch Pro tier, scale to 500 customers
4. Add automation, hit 1,000 customers
5. Expand features, dominate the market

**Next Steps:**
1. Finalize product name and branding
2. Set up development environment (Next.js, Postgres, Tradovate sandbox)
3. Build user auth + account management (Week 1-2)
4. Integrate Tradovate API (Week 3-4)
5. Build dashboard UI (Week 5-6)
6. Beta launch (Week 7-8)
7. Iterate based on feedback (ongoing)

**You have everything you need to succeed. Now go build it.**

---

*Document Version: 1.0*  
*Last Updated: January 17, 2026*  
*Author: [Your Name]*  
*Confidential - Do Not Distribute*