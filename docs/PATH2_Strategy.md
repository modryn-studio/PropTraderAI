# PROPTRADER AI - PATH 2: Behavioral Intelligence Layer
## The Unbeatable Data Moat Strategy

**Version 1.0 | January 2026**  
**CONFIDENTIAL - THE MOAT DOCUMENT**

---

## Executive Summary

PATH 2 (Behavioral Intelligence Layer) is the strategic foundation that makes PropTraderAI unbeatable. While competitors can copy features, they cannot copy years of behavioral data.

### WHY THIS IS THE MOAT

- ✅ **Competitors can copy features; they cannot copy years of behavioral data**
- ✅ **The more users engage, the smarter the AI gets (increasing switching cost)**
- ✅ **Enables premium pricing: personalized AI is worth more than generic AI**
- ✅ **Network effects: aggregate patterns improve predictions for everyone**
- ✅ **By 2028: 2+ years of data that no competitor can replicate**

---

## The Core Principle

> *"Traders don't fail because they don't know what to do. They fail because they can't stop themselves from doing what they know they shouldn't."*

PATH 2 solves this by learning each trader's self-sabotage patterns and intervening before emotional decisions happen.

---

## What PATH 2 Does

### Four Core Capabilities

| Capability | What It Does |
|------------|--------------|
| **Tilt Detection** | Identifies when traders are emotionally compromised BEFORE they realize it |
| **Violation Prediction** | Predicts rule violations before they happen based on current trajectory |
| **Session Optimization** | Learns when each trader performs best and worst (time of day, market conditions) |
| **Setup Recognition** | Identifies which specific setups work for each individual trader |

---

## Technical Architecture

### Database Schema: behavioral_data Table

The foundation of PATH 2 is a single, flexible table that captures EVERY user interaction from Day 1:

```sql
CREATE TABLE behavioral_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,  -- THE KEY: Flexible payload
  challenge_status JSONB,      -- Snapshot of challenge state
  session_context JSONB,       -- Session metrics at event time
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_user_events (user_id, timestamp DESC),
  INDEX idx_event_type (event_type, timestamp DESC)
);
```

### Why JSONB is Critical

- **Flexibility:** Add new data points without schema migrations
- **Queryable:** PostgreSQL JSONB supports full querying
- **Future-proof:** Can capture data we don't yet know we need
- **ML-ready:** Easy export to training datasets

---

## Event Types to Capture

Start logging these from Day 1:

| Event Type | When Logged |
|------------|-------------|
| `trade_executed` | Every trade synced from Tradovate or manually logged |
| `screenshot_analyzed` | Visual AI analysis completed with support/resistance levels |
| `pre_trade_check` | User validates position size or risk before executing |
| **`near_violation`** | **>70% of daily/drawdown limit used** |
| **`violation_prevented`** | **User stopped after warning (AI prevented failure)** |
| `alert_dismissed` | User ignored warning (signals overconfidence) |
| **`tilt_signal_detected`** | **Multiple tilt indicators present (THE GOLD)** |
| `revenge_trade_detected` | Trade within 10 min of loss + increased position size |
| `session_start` | App opened or first interaction after 30+ min inactivity |
| `session_end` | App closed or 30+ min of inactivity |

---

## Capability 1: Tilt Detection

**Goal:** Identify when traders are emotionally compromised BEFORE they realize it.

###Tilt Indicator Scoring System

| Signal | Weight | Detection Method |
|--------|--------|------------------|
| Time since last loss < 10 min | **25%** | Timestamp comparison with last trade |
| Position size > 150% of average | **20%** | Rolling 30-day average comparison |
| Direction flip after loss | **15%** | Compare current direction to prior trade |
| Messages > 5 in last 5 min | **15%** | Message frequency tracking in session |
| Rejected pre-trade warnings | **10%** | Warning response tracking |
| Multiple losses today (> 2) | **10%** | Daily trade count with result tracking |
| Session duration > 4 hours | **5%** | Session timer tracking |

### Action Thresholds

| Tilt Score | Action |
|------------|--------|
| **> 50%** | Warning alert displayed: "You may be on tilt. Take a break?" |
| **> 70%** | Critical alert + trading lockout recommendation |
| **> 85%** | **Automatic pause (Autopilot mode only)** |

---

## Capability 2: Violation Prediction

Predicts rule violations before they happen based on current trajectory.

### Examples

- **Pre-trade check:** "If this trade hits stop loss, you will violate daily loss limit"
- **Session monitoring:** "You are 2 trades from max trades rule at current loss rate"
- **Pattern matching:** "Traders with your current pattern violate 78% of the time"

---

## Capability 3: Session Optimization

Learns when each trader performs best and worst.

### Examples

- "Your win rate on Friday afternoons is 28%. Stop trading at 12 PM."
- "Your best setups occur between 9:45-10:30 AM. Focus here."
- "You lose money on NQ after 2 consecutive losses. Switch to MNQ or stop."

---

## Capability 4: Setup Recognition

Identifies which setups work for each specific trader.

### Examples

- "This setup matches 7/10 of your winners this month. **Grade: A**"
- "You have 23% win rate on breakouts. Consider avoiding."
- "Your pullback entries work best with RSI < 35, not < 40."

---

## Implementation Timeline

### CRITICAL: Data collection starts from Day 1, even if ML models come later.

### PHASE 0: Foundation (Parallel with PATH 1, Week 1)

**Deliverables:**
- Create `behavioral_data` table in Supabase
- Enable Row Level Security (RLS) policies
- Build `logBehavioralEvent()` utility function
- Add indexes (user_id, event_type, timestamp)
- **Integrate logging in ALL API routes from Day 1**

### PHASE 1: Passive Data Collection (Weeks 1-8)

**Goal:** Collect data without any intelligence features. Just log everything.

**Events to Log:**
- Every trade (`trade_executed`)
- Every screenshot analysis (`screenshot_analyzed`)
- Every pre-trade check (`pre_trade_check`)
- Every chat message (`chat_sent`)
- Session start/end (`session_start`, `session_end`)

**By Week 8:** 1,000+ data points collected across 10-20 beta users

### PHASE 2: Rule-Based Intelligence (Weeks 9-12)

**Goal:** Implement simple rule-based features using collected data.

**Features to Ship:**
- **Tilt Detection v1:** Basic scoring system (no ML)
- **Violation Prediction v1:** "If this trade hits stop, you will violate"
- **Session Stats:** "Your win rate on Friday afternoons is 28%"
- **Revenge Trade Detection:** Flag trades <10 min after loss

**Value to Users:** Real behavioral insights without ML. Uses simple rules + historical data.

### PHASE 3: ML Models (Q3-Q4 2026)

**Goal:** Train predictive models using 6+ months of data.

**Required Data:**
- **Tilt Predictor:** 1,000+ user sessions
- **Violation Predictor:** 500+ near-violation events
- **Session Optimizer:** 6+ months data per user
- **Setup Recognizer:** 10,000+ labeled setups

**ML Models:**
- Tilt prediction (>70% accuracy)
- Violation risk scoring
- Optimal session timing predictions
- Setup quality grading (A-F)

---

## The Moat Timeline

Why timing matters:

| Date | Our Data | Competitors |
|------|----------|-------------|
| **Q1 2026** | 1,000+ data points | Not collecting yet |
| **Q2 2026** | 10,000+ data points | Just noticed us |
| **Q3 2026** | **50,000+ data points** | Starting to build |
| **Q4 2026** | **ML models live** | 3 months of data |
| **Q2 2027** | **18 months of data** | 9 months of data |
| **Q4 2027** | **24 months of data** | 15 months of data |
| **2028** | **UNBEATABLE** | Can't catch up |

---

## Cost & Resource Analysis

### Database Storage Costs

| Users | Data Points | Storage | Cost/Month |
|-------|-------------|---------|------------|
| 50 | 10,000 | ~50 MB | **$0 (free tier)** |
| 500 | 100,000 | ~500 MB | **$0 (free tier)** |
| 5,000 | 1,000,000 | ~5 GB | ~$25 |

**Note:** Supabase free tier includes 500 MB database storage. PATH 2 is essentially free until ~1,000 users.

---

## Success Metrics

### Data Collection Metrics

- **Week 4:** 1,000+ behavioral events logged
- **Week 8:** 10,000+ behavioral events logged
- **Month 6:** 100,000+ behavioral events logged
- **Year 1:** 1,000,000+ behavioral events logged

### User Value Metrics

- **Tilt Prevention:** "You saved me from a revenge trade" testimonials
- **Violation Prevention:** Warnings that actually stopped rule violations
- **Session Optimization:** Users stop trading during their worst hours
- **Setup Recognition:** Win rate improvement on A-grade setups

---

## Implementation Code Example

### Logger Utility Function

```typescript
// lib/behavioral/logger.ts
import { createClient } from '@/lib/supabase/server';

interface BehavioralEvent {
  eventType: string;
  eventData: Record<string, any>;
  challengeStatus?: Record<string, any>;
  sessionContext?: Record<string, any>;
}

export async function logBehavioralEvent(
  userId: string,
  event: BehavioralEvent
) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('behavioral_data')
    .insert({
      user_id: userId,
      event_type: event.eventType,
      event_data: event.eventData,
      challenge_status: event.challengeStatus,
      session_context: event.sessionContext,
      timestamp: new Date().toISOString()
    });
  
  if (error) {
    console.error('Failed to log behavioral event:', error);
  }
}

// Convenience functions for common events
export async function logTrade(userId: string, trade: any, challengeStatus: any) {
  return logBehavioralEvent(userId, {
    eventType: 'trade_executed',
    eventData: {
      symbol: trade.symbol,
      direction: trade.direction,
      size: trade.size,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      pnl: trade.pnl,
      setupType: trade.setupType
    },
    challengeStatus
  });
}

export async function logTiltSignal(
  userId: string, 
  tiltScore: number, 
  indicators: string[]
) {
  return logBehavioralEvent(userId, {
    eventType: 'tilt_signal_detected',
    eventData: {
      tiltScore,
      indicators,
      alertShown: tiltScore > 50
    }
  });
}

export async function logNearViolation(
  userId: string,
  violationType: string,
  percentageUsed: number
) {
  return logBehavioralEvent(userId, {
    eventType: 'near_violation',
    eventData: {
      type: violationType,
      percentageUsed,
      alertShown: true
    }
  });
}
```

### Integration Example

```typescript
// app/api/chat/route.ts
import { logBehavioralEvent } from '@/lib/behavioral/logger';

export async function POST(request: Request) {
  const { message, userId } = await request.json();
  
  // Log the chat message
  await logBehavioralEvent(userId, {
    eventType: 'chat_sent',
    eventData: {
      messageLength: message.length,
      timestamp: new Date().toISOString()
    }
  });
  
  // Process with Claude...
  const response = await processWithClaude(message);
  
  return Response.json({ response });
}
```

---

## Conclusion

PATH 2 (Behavioral Intelligence Layer) is not just a feature—it's the strategic moat that makes PropTraderAI unbeatable.

### THE STRATEGIC IMPERATIVE

- ✅ **Start logging from Day 1** – data collection is free, but time is not
- ✅ **Ship rule-based features first** – provide value without ML
- ✅ **Build ML models later** – once you have 6+ months of data
- ✅ **Never stop collecting** – by 2028, you'll have 2+ years of irreplaceable data

By the time competitors notice what you're building, they'll be 18-24 months behind. And in the world of behavioral data, that gap is insurmountable.

---

**Document prepared by: PropTrader AI Strategy Team**  
**Last updated: January 7, 2026**
