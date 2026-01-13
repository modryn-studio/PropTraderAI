# PropTraderAI Skill File Research: Complete Knowledge Base for Natural Language Trading Automation

Futures prop trading combines strict risk parameters with real-time execution, creating a unique domain where an AI assistant must understand **drawdown mechanics, contract specifications, behavioral psychology, and conversational strategy extraction**. This research provides the foundational knowledge needed to build a skill file enabling Claude to extract trading strategies through Socratic dialogue and parse them into executable rules.

## Futures prop trading operates under three core constraint layers

Prop trading firms use layered risk controls that any AI system must understand to validate strategies. **Drawdown limits** come in three varieties: static (fixed floor that never moves), trailing (follows equity higher but never down), and EOD trailing (only updates at daily settlement). The industry has shifted toward EOD trailing drawdown as the preferred model—firms using this approach report approximately **83% higher pass rates** compared to intraday trailing.

Daily loss limits typically combine realized and unrealized P&L, meaning open position floating losses count toward the limit. A $50K account might have a $1,000-$2,000 daily loss limit that, when breached, flattens positions and pauses trading for the day—not account termination.

**Consistency rules** prevent evaluation passes based on single lucky trades. The most common threshold is the **50% rule**: no single day's profit can exceed 50% of total profits. If total profits are $3,000, the best single day must be under $1,500. Firms like FundedNext use 40%, while stricter programs apply 30%. These rules mean AI-validated strategies need distributed profit potential, not home-run-dependent approaches.

Position limits scale with account size and profit progression:
- $50K accounts: 5-6 e-mini contracts or 50-60 micros
- $100K accounts: 10-14 e-minis or 100-140 micros
- $150K accounts: 15-17 e-minis or 150-170 micros

## Contract specifications create the mathematical foundation

The E-mini S&P 500 (ES) dominates futures prop trading with approximately **1.8 million contracts traded daily**—representing 8x the value of all S&P 500 ETFs combined. Understanding tick values is essential for parsing natural language stop distances:

| Contract | Tick Size | Tick Value | Point Value |
|----------|-----------|------------|-------------|
| ES (E-mini S&P) | 0.25 | **$12.50** | $50.00 |
| NQ (E-mini Nasdaq) | 0.25 | **$5.00** | $20.00 |
| MES (Micro S&P) | 0.25 | **$1.25** | $5.00 |
| MNQ (Micro Nasdaq) | 0.25 | **$0.50** | $2.00 |
| YM (E-mini Dow) | 1.00 | **$5.00** | $5.00 |
| CL (Crude Oil) | 0.01 | **$10.00** | $1,000 |

When a trader says "10 tick stop on ES," that equals $125 risk per contract ($12.50 × 10). The micro contracts (MES, MNQ) are popular with prop traders specifically because they allow **precise position sizing** within tight drawdown constraints—10 MES equals 1 ES in exposure.

Trading sessions create critical time filters. **Regular Trading Hours (RTH)** run 9:30 AM–4:00 PM ET with the highest volume and tightest spreads. The daily volume pattern follows a "smile" shape: high volume at open, low during lunch (11:30 AM–1:30 PM), then ramping into close. Key times include:
- **9:30–10:00 AM**: Opening range, highest volatility, initial price discovery
- **10:00 AM**: Major economic releases
- **3:45–4:00 PM**: MOC (Market on Close) volume surge from institutional rebalancing

## Strategy components map to structured parsing rules

Extracting trading strategies requires recognizing how traders express each component. Entry conditions cluster into five categories:

**Price Action Patterns** use visual terminology:
- Pin bar: "rejection candle," "hammer," "shooting star," "wick rejection"
- Engulfing: "outside bar," "engulfing pattern," "price engulfed previous candle"
- Inside bar: "IB setup," "consolidation bar," "mother bar"

**Indicator Signals** reference specific tools and settings:
- EMA crossovers: "9 EMA crossed above 21 EMA," "golden cross," "price crossed above the 20 EMA"
- RSI: Standard 14-period with 70/30 levels; traders say "RSI above 70," "RSI oversold," "RSI divergence"
- MACD: Default 12/26/9 settings; "MACD crossed above signal line," "histogram turning positive"
- VWAP: "price above VWAP," "VWAP bounce," "fade back to VWAP"

**Exit conditions** require parsing both stop losses and profit targets:

Stop loss expressions include:
- Fixed: "10 tick stop," "20 point stop," "risking 25 ticks"
- Structure-based: "stop below swing low," "stop behind structure," "below the pin bar low"
- ATR-based: "1.5x ATR stop," "2 ATR stop," "volatility-based stop"

Take profit expressions include:
- Fixed: "20 tick target," "target 50 points"
- Risk-reward: "2R target," "1:2 risk reward," "targeting 3:1"
- Structure: "target prior high," "TP at previous day high," "exit at next resistance"

**Position sizing** appears as:
- "always trade 2 contracts" (fixed)
- "risk 1% per trade" (percentage)
- "1 contract per $10k equity" (account-based)

## Socratic questioning extracts complete strategies without overwhelming users

The most critical insight for strategy extraction: **one question at a time**. Cognitive load research shows human working memory handles approximately 7 items, and multiple questions create overload leading to confusion and incomplete answers. The "multiple-choice trap"—asking "Was it X or Y or Z?"—forecloses possibilities and prevents detailed descriptions.

A complete strategy requires five elements:
1. **Entry trigger**: What pattern, indicator, or condition initiates the trade
2. **Exit rules**: Stop loss, take profit, and contingency exits
3. **Position sizing**: How many contracts and why
4. **Time/session filters**: When trading is active
5. **Risk parameters**: Maximum exposure limits

**Question flow for entry conditions:**
```
Q1: "What tells you it's time to enter a trade?"
Q2: "What timeframe are you watching when you see this signal?"
Q3: "Does anything need to confirm that signal before you enter?"
Q4: "How do you actually execute—market order at signal, or waiting for specific price?"
Q5: "Are there times you see the signal but don't take the trade?"
```

**Question flow for exits:**
```
Q1: "Once you're in a trade, what tells you to get out?"
Q2: "You mentioned a stop at [X]—is that always the same, or does it vary?"
Q3: "And your profit target—how do you determine where that goes?"
Q4: "What happens if neither your stop nor target is hit?"
Q5: "Do you ever exit part of the position at different levels?"
```

Common gaps traders miss when describing strategies:
- Stop loss specifics (where placed, how adjusted)
- Position sizing (often assumed but not stated)
- End-of-day handling (what if neither SL nor TP hit?)
- Re-entry rules (what if stopped out?)
- Multiple contract management (scale out levels)

## Ambiguous phrases require systematic clarification

Natural language strategy descriptions frequently contain ambiguity that must be resolved before parsing into rules:

| Ambiguous Phrase | Clarification Needed |
|------------------|---------------------|
| "I buy the dip" | What % decline? From what reference point? |
| "When it breaks out" | Break of what? How much above? Volume required? |
| "On confirmation" | What confirms? Which timeframe? |
| "At support" | How defined? Exact level or zone? |
| "When momentum picks up" | Which indicator? What threshold? |

Clarification technique: Offer examples without leading. Instead of "You probably use a trailing stop, right?" ask "How do you manage your stop once the trade is profitable?" Then offer options: "Some traders use a fixed dollar stop, like $100. Others use a percentage of the move, like 2%. Others use ATR. Which approach do you use?"

## Prop firm rule patterns enable strategy validation

One-step evaluations dominate the futures prop firm industry, requiring traders to hit a profit target (typically **6-10% of account**) while respecting drawdown limits. Common patterns across firms:

**Profit targets by account size:**
- $50K account: $3,000 target (6%)
- $100K account: $6,000 target (6%)
- $150K account: $9,000 target (6%)

**Drawdown patterns:**
- EOD trailing drawdown: $2,000-$2,500 for $50K accounts (4-5%)
- Trailing locks at starting balance (once floor reaches $50K on a $50K account, it stops trailing)
- Daily loss limits: $1,000-$2,000 for $50K accounts

**Payout structures:**
- Initial splits: 80/20 (industry standard)
- First $10K-$25K: Often 100% to trader
- Progression: 70% → 80% → 90% → 100% based on payouts achieved
- Frequency: Bi-weekly most common; daily/weekly emerging

**Account scaling:**
- Requirements: 10% profit + successful payouts
- Progression: $50K → $100K → $150K → $200K+
- Contract limits increase proportionally

## Tradovate API enables execution of parsed strategies

The Tradovate API supports full order management through REST and WebSocket endpoints:

**Order types available:**
- Market, Limit, Stop, Stop-Limit
- OSO (bracket orders with TP/SL)
- OCO (one-cancels-other)
- Order strategies with trailing stops

**Critical endpoint patterns:**
```
POST /order/placeOrder - Standard orders
POST /order/placeOSO - Bracket orders with stops and targets
POST /order/liquidatePosition - Close positions
GET /position/list - Query open positions
POST /cashBalance/getCashBalanceSnapshot - Account balance
```

**Bracket order structure for parsed strategies:**
```json
{
  "symbol": "ESZ4",
  "action": "Buy",
  "orderQty": 1,
  "bracket1": {
    "action": "Sell",
    "orderType": "Stop",
    "stopPrice": 5750.00  // Stop Loss
  },
  "bracket2": {
    "action": "Sell",
    "orderType": "Limit",
    "price": 5800.00  // Take Profit
  }
}
```

Rate limits: approximately 5,000 requests/hour (80/minute). WebSocket preferred for real-time data to avoid polling limits.

## Behavioral detection enables PATH 2 pattern learning

Automated systems should detect destructive trading patterns through quantifiable signals:

**Revenge trading detection:**
- Trade within 5 minutes after significant loss (>1% account): HIGH RISK
- Position size >1.5x previous size after loss: WARNING
- >3 trades within 10 minutes after a loss: ALERT

**Overtrading signals:**
- Trade count >2 standard deviations above 20-day average
- Trade frequency >150% of typical hourly rate
- Daily fees >1% of account value
- Holding time <50% of typical duration

**Tilt indicators:**
- Trades not matching any defined setup (strategy abandonment)
- Time between consecutive trades <2 minutes
- Progressive position size increase
- Stop-loss removal or widening

**Intervention thresholds:**
| Behavior | Warning | Hard Stop |
|----------|---------|-----------|
| Daily loss | 1.5% account | 2-3% account |
| Consecutive losses | 3 in row | 5 in row |
| Trade frequency | 1.5x normal | 3x normal |
| Position size | 1.2x limit | 1.5x limit |

**Composite behavioral risk score:**
```
Score = (TradeFrequencyDeviation × 0.20) + 
        (PositionSizeDeviation × 0.25) + 
        (WinRateChange × 0.20) + 
        (HoldTimeDeviation × 0.15) + 
        (RuleAdherence × 0.20)

0-30: Normal | 31-60: Elevated | 61-80: High | 81-100: Critical
```

## Natural language parsing requires comprehensive vocabulary mapping

Traders express concepts with significant variation. Key synonym mappings:

**Stop Loss:** SL, stop, stoploss, "my out," protective stop, hard stop, invalidation level, "where I bail," "line in the sand"

**Take Profit:** TP, target, profit target, exit target, "where I get out," "my number," "where I cash out"

**Entry:** trigger, signal, "when I get in," setup completion, alert, "where I pull the trigger," "sniper entry"

**Position Size:** size, lots, contracts, units, "how much I trade," "going full size," "sizing up/down"

**Risk:** R, risk %, "what I'm risking," exposure, "how much I can stomach"

**Skill level indicators in descriptions:**
- **Beginner:** "I buy when RSI is oversold" (vague, no exit criteria, no sizing)
- **Intermediate:** "I trade the 4h with MACD and S/R, keeping stops tight" (some structure, missing specifics)
- **Advanced:** "Entry above breakout level, stop below last swing low at 1.5x ATR, targeting 2R with half off at 1R" (complete, rule-based)

## Completeness checklist for strategy extraction

Before a strategy can be considered complete for parsing:

- [ ] Entry signal clearly defined (what triggers, what timeframe)
- [ ] Stop loss specified (fixed, structure-based, or ATR-based with exact parameters)
- [ ] Take profit or exit method specified
- [ ] Position sizing defined (contracts or risk percentage)
- [ ] Time/session context understood (when trading is active)
- [ ] EOD handling defined (what happens at market close)
- [ ] Re-entry rules addressed (what if stopped out)

**Minimum viable vs. comprehensive:**

| Minimum Viable | Comprehensive |
|----------------|---------------|
| Entry condition | Entry + confirmation |
| Stop loss | Stop loss + trailing rules |
| Take profit | Take profit + partial exits |
| Basic position size | Risk-adjusted sizing |
| — | Time filters |
| — | EOD handling |
| — | Multiple contract rules |

## Implementation recommendations for SKILL.md

1. **Strategy extraction should follow conversation phases**: Setup identification → Entry rules → Exit rules → Position sizing → Time filters → Risk parameters → Confirmation summary

2. **Use progressive disclosure in questions**: Start broad ("What tells you it's time to enter?"), narrow based on response ("You mentioned EMA—which period?"), confirm understanding before proceeding

3. **Map all terminology variations during parsing**: Build comprehensive synonym dictionaries for each strategy component

4. **Validate extracted strategies against prop firm constraints**: Check position sizing against contract limits, ensure stop loss + position size respects daily loss limits, verify time filters align with holding rules

5. **Store behavioral baselines**: Track trade frequency, position sizes, holding times to establish normal patterns before detection

6. **Implement escalating interventions**: Soft notifications → acknowledgment required → cooldown suggestions → trading pauses → session lockouts

This research provides the knowledge foundation for building a PropTraderAI skill file that understands futures trading context, extracts strategies through intelligent conversation, parses natural language into executable rules, and monitors for destructive behavioral patterns—all while respecting the strict risk parameters that define prop trading success.