# PropTraderAI Email Copy Examples

**Last Updated:** January 8, 2026  
**Status:** Templates ready for implementation

---

## 📧 Principles

All PropTraderAI emails follow these rules:

1. **Direct, not gentle** — Clear statements, not soft suggestions
2. **Data as mirror** — Show patterns without judgment
3. **Respect the struggle** — Validate that this is hard, don't shame
4. **Short and scannable** — Traders don't read long emails
5. **One CTA per email** — Don't overwhelm

---

## 🚀 Transactional Emails

### Welcome Email (Auto-sent after signup)

**Subject:** You're in. Here's what happens next.

```
[Name],

Your PropTraderAI account is ready.

Next steps:
1. Connect Tradovate (2 clicks)
2. Describe your strategy (plain English)
3. Let us handle execution

Most traders fail their first challenge. You won't.

[Start here →]

—PropTraderAI


Unsubscribe: [link]
```

---

### Broker Connected Email

**Subject:** Tradovate connected. One step left.

```
[Name],

Your Tradovate account is linked. ✓

Now describe your strategy in plain English:
"Trade pullbacks to 20 EMA when RSI < 40 during NY session"

That's it. We handle the rest.

[Describe your strategy →]

—PropTraderAI


Unsubscribe: [link]
```

---

### Strategy Created Email

**Subject:** Strategy active. We're watching.

```
[Name],

Your strategy is live:
"[First 80 chars of strategy...]"

We're now monitoring for:
• Your entry conditions
• Position sizing rules
• Challenge compliance

You'll get an alert when we spot a setup.

[View dashboard →]

—PropTraderAI


Unsubscribe: [link]
```

---

## 🛡️ Protection Emails

### Near Violation Alert

**Subject:** ⚠️ 87% of daily limit used

```
[Name],

You're at 87% of your daily loss limit.

One more loss and you're done for the day.

Current status:
• Daily limit: $500
• Used: $435
• Remaining: $65

Consider stepping away. Tomorrow is another day.

[View dashboard →]

—PropTraderAI


Unsubscribe: [link]
```

---

### Violation Prevented Alert

**Subject:** 🛡️ We stopped a trade that would have failed your challenge

```
[Name],

We just prevented a trade that would have exceeded your daily loss limit.

What happened:
• You tried to enter a position
• It would have risked $120
• Your remaining limit was $65

The trade was blocked. Your challenge is still alive.

This is why you signed up.

[View details →]

—PropTraderAI


Unsubscribe: [link]
```

---

### Revenge Trade Detected Alert

**Subject:** ⚠️ Revenge trade pattern detected

```
[Name],

We noticed a pattern:
• 4 minutes since your last loss
• Position size 2x your average
• Same direction as failed trade

This matches revenge trading. Your historical win rate on these setups: 23%.

We logged this. Your call whether to proceed.

[View your patterns →]

—PropTraderAI


Unsubscribe: [link]
```

---

## 📊 Digest Emails

### Weekly Digest (Active Traders)

**Subject:** Your week: $1,840 protected

```
[Name],

Your week at a glance:

TRADES
• Executed: 12
• Win rate: 58%
• Net P&L: +$680

PROTECTION
• Bad setups caught: 4
• Estimated losses prevented: $1,840
• Challenge violations stopped: 1

PATTERN SPOTTED
Your afternoon trades (after 2pm) have a 31% win rate.
Morning trades: 64% win rate.

Worth considering.

[View full report →]

—PropTraderAI


Unsubscribe: [link]
```

---

### Weekly Digest (Inactive Traders)

**Subject:** Haven't seen you trade this week

```
[Name],

No trades this week.

If something's blocking you, hit reply and tell us.
If you're waiting for the right setup, good. Patience pays.

We're here when you're ready.

[Open dashboard →]

—PropTraderAI


Unsubscribe: [link]
```

---

## 🎯 Milestone Emails

### Challenge Passed

**Subject:** Challenge passed. You did the work.

```
[Name],

Challenge passed.

The numbers:
• Days: 23
• Trades: 47
• Win rate: 54%
• Near-violations prevented: 3

Most traders fail their first challenge. You didn't.

Now the real work begins. Funded account rules are different.
We'll keep watching.

[View your journey →]

—PropTraderAI


Unsubscribe: [link]
```

---

### Account Deleted Confirmation

**Subject:** Your PropTraderAI account has been deleted

```
[Name],

Your account has been deleted.

What we removed:
• Your email and profile
• Broker connection credentials
• Conversation history
• All uploaded screenshots

What remains (anonymized):
• Trading patterns with no link to you
• Behavioral data for AI improvement
• No personally identifiable information

You can create a new account anytime with this email address.

Thanks for being part of PropTraderAI.

—PropTraderAI
```

---

### Challenge Failed

**Subject:** Challenge ended. Here's what happened.

```
[Name],

Your challenge ended.

What happened:
• [Specific violation: e.g., "Daily loss limit exceeded"]
• Day 12 of 30
• Final drawdown: 5.2%

The data shows:
• 67% of your losses came after 2pm
• Average losing trade was 1.8x your average winner
• 3 trades were flagged as revenge patterns

This is information, not judgment. Most traders go through this.

When you're ready to try again, we'll be here.

[Review your data →]

—PropTraderAI


Unsubscribe: [link]
```

---

## 📢 Feature Launch Emails

### Autopilot Mode Launch

**Subject:** Autopilot is live.

```
[Name],

We added Autopilot mode.

Now the AI executes trades while you sleep. No approval needed.

Your rules. Perfect execution. 24/7.

How it works:
1. Enable in Settings
2. Set your risk parameters
3. Walk away

The AI follows your strategy exactly. No emotions. No revenge trades.

[Enable Autopilot →]

—PropTraderAI


Unsubscribe: [link]
```

---

### Tilt Detection Launch

**Subject:** New: We now detect when you're tilting

```
[Name],

New feature: Tilt Detection.

We now track patterns that predict blown accounts:
• Quick re-entries after losses
• Oversized positions
• Trading outside your hours
• Rapid-fire order changes

When we spot tilt, you'll get a warning.
In Autopilot mode, we'll pause trading automatically.

This is what separates funded traders from failed ones.

[Learn more →]

—PropTraderAI


Unsubscribe: [link]
```

---

## 📝 Email Footer (Standard)

```
—PropTraderAI

You're receiving this because you signed up for PropTraderAI.
Unsubscribe: [link] | Privacy: [link]
```

---

## 🚫 What We DON'T Send

- Generic newsletters ("5 Tips for Better Trading!")
- Marketing fluff with no value
- Daily emails (unless critical alerts)
- Upsell emails disguised as content
- Gamification ("You earned a badge!")

---

## 📋 Implementation Notes

### Email Service Options
1. **Resend** — Simple, developer-friendly, good deliverability
2. **Postmark** — Excellent for transactional emails
3. **SendGrid** — More features, more complex

### Triggers (Database Events)
```typescript
// Example triggers for Supabase Edge Functions

// Welcome email
ON INSERT INTO auth.users → send_welcome_email()

// Broker connected
ON UPDATE strategies SET broker_connected = true → send_broker_connected_email()

// Near violation
ON INSERT INTO behavioral_data WHERE event_type = 'near_violation' → send_near_violation_email()

// Weekly digest
CRON: Every Sunday 6pm → generate_weekly_digest()
```

### Personalization Fields
- `[Name]` — user.user_metadata.full_name or email prefix
- `[Strategy]` — First 80 chars of strategies.natural_language
- `[Stats]` — Calculated from trades table
- `[Patterns]` — Analyzed from behavioral_data

---

**Last Updated:** January 8, 2026
