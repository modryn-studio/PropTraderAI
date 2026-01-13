# Claude Skills Integration - Usage Examples

**Implementation:** Option B+ (Selective Enhancement)  
**Status:** ✅ Complete  
**Date:** January 10, 2026  
**Last Updated:** January 10, 2026 - Integrated with onboarding flow

---

## 📋 What Was Implemented

### ✅ Integrated into Production Flow

1. **Firm Rules Loader** (`src/lib/firm-rules/loader.ts`) - ✅ Used by validation API
2. **Firm Rules Data** (`src/lib/firm-rules/data/*.json`) - ✅ 6 prop firms loaded
3. **Timezone Converter** (`src/lib/utils/timezone.ts`) - ✅ Integrated into ChatInterface
4. **Timezone Processor** (`src/lib/utils/timezoneProcessor.ts`) - ✅ Converts times automatically
5. **Validation API** (`src/app/api/strategy/validate-firm-rules/route.ts`) - ✅ Called from ChatInterface
6. **Validation Modal** (`src/components/chat/ValidationWarningsModal.tsx`) - ✅ Shows warnings to users
7. **Behavioral Logging** - ✅ Logs validation + timezone events

### ❌ What We Did NOT Do

- Replace existing `/chat` system
- Use Anthropic Skills API (reserved for PATH 3)
- Modify `parseStrategy()` function
- Change any existing Socratic dialogue flows

---

## 🎯 Current Integration (As Implemented)

### Onboarding Flow

**User Journey:**
1. User signs up → Lands on dashboard
2. Sees **"Connect Your Prop Firm"** hero card with firm logos
3. Selects firm (Topstep, Tradeify, MFF, Alpha, or Personal Account)
4. Redirects to Tradovate OAuth
5. **After OAuth:** Account size automatically captured from Tradovate API
6. Profile updated with `firm_name`, `account_type`, `account_size`, `broker_connected`

**Key Change from Original Guide:**
- ❌ No manual firm detection from conversation
- ✅ Explicit firm selection cards at onboarding
- ✅ Account size auto-captured from Tradovate (not user input)

### Strategy Validation Flow

**After user completes strategy conversation:**

```typescript
// In ChatInterface.tsx (ALREADY IMPLEMENTED)

1. User clicks "Save Strategy"
2. If userProfile has firm_name + account_size:
   - Call /api/strategy/validate-firm-rules
   - Log validation event (PATH 2 behavioral data)
   - Show ValidationWarningsModal with results
   - User chooses: Revise or Save Anyway
   - Log user's decision
3. Save strategy to database
```

**Behavioral Events Logged:**
- `strategy_validated` - Results of validation check
- `validation_warnings_ignored` - User saved despite warnings
- `strategy_revision_after_validation` - User chose to revise

---

## 🔄 Data Flow Architecture

### Profile Storage (Hybrid Approach)

### Profile Storage (Hybrid Approach)

| Table | Field | Source | Purpose |
|-------|-------|--------|---------|
| **profiles** | `firm_name` | User selection (onboarding) | Current firm context |
| **profiles** | `account_size` | **Tradovate API** | Actual account balance |
| **profiles** | `account_type` | User selection | 'prop_firm' or 'personal' |
| **profiles** | `broker_connected` | OAuth success | Connection status |
| **challenges** | `firm_name` | Copied from profile | Historical record |
| **challenges** | `account_size` | Snapshot at creation | Challenge-specific |
| **strategies** | `challenge_id` | Links to challenge | Strategy→Challenge link |

**Validation uses `profiles.firm_name` + `profiles.account_size`** from user's current setup.

---

## 📊 Validation Warnings Reference

### 🔴 Hard Violations (Block Save, Red Alert)

| Check | Condition | Example |
|-------|-----------|---------|
| **Position Limit Exceeded** | `user_contracts > firm_max_contracts` | Strategy: 10 ES → Topstep limit: 5 ES<br>**"Position size exceeds Topstep limit"** |
| **Risk Too High** | `single_trade_risk > 50% of daily_limit` | Risk: $1,250 → Daily limit: $2,000<br>**"Risk per trade exceeds 50% of daily loss limit"** |

### 🟡 Soft Warnings (Allow Save, Amber)

| Check | Condition | Example |
|-------|-----------|---------|
| **Trading at Max** | `user_contracts == firm_max_contracts` | Using exact firm limit, no scaling room |
| **Risk 33-50%** | `single_trade_risk > 33% of daily_limit` | Only 2-3 trades allowed per day |
| **Automation Policy** | Firm has restrictions | "Contact support required" |

### ℹ️ Info Messages

- Consistency rule requirements
- Drawdown type explanation
- Automation policy details

---

## 🔧 Manual Usage (If Needed)

## 🔧 Manual Usage (If Needed)

### Direct API Call (For Custom Integrations)

```typescript
const response = await fetch('/api/strategy/validate-firm-rules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firmName: 'topstep',
    accountSize: 50000,
    parsedRules: strategyData.parsedRules,
    instrument: strategyData.instrument,
  }),
});

const validation = await response.json();
// { isValid, status, warnings[], firmRules }
```

### Loading Firm Rules Directly

**If you need to access firm rules in your code:**

```typescript
import { loadFirmRules, getAccountRules } from '@/lib/firm-rules/loader';

// Load firm rules
const firmRules = await loadFirmRules('topstep');

if (firmRules) {
  console.log(`${firmRules.firm_name} allows automation:`, firmRules.automation_policy);
  
  // Get rules for specific account size
  const rules = getAccountRules(firmRules, 50000);
  
  if (rules) {
    console.log('Profit target:', rules.profit_target);
    console.log('Max contracts for ES:', rules.max_contracts.ES);
    console.log('Drawdown type:', rules.drawdown_type);
  }
}
```

}
```

---

## 🚀 What's Working Now

✅ **Firm selection cards** with logos on dashboard  
✅ **OAuth callback** stores firm + account size in profile  
✅ **Validation API** checks strategy against firm rules  
✅ **Validation modal** shows warnings with severity levels  
✅ **Behavioral logging** captures validation events and user decisions  
✅ **Hybrid storage** - profile (current) + challenges (historical)

---

## ⏳ Not Yet Integrated (Phase 1B+)

### 🚧 Remaining Phase 1B Tasks

✅ **Timezone conversion** - Complete! Integrated into ChatInterface  
⚠️ **Actual Tradovate OAuth** - Currently simulated, needs real OAuth flow  
⚠️ **Account size from Tradovate API** - Placeholder default (50K), needs API call

**See:** `docs/TIMEZONE_CONVERSION.md` for timezone feature documentation

---

## 🔮 Future: Skills API (PATH 3)

**When building MCP Server or Public API**, activate Skills API:

```typescript
// src/lib/claude/skills.ts (FUTURE)
import Anthropic from '@anthropic-ai/sdk';

export async function parseStrategyWithSkill(message: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  const response = await client.beta.messages.create({
    model: 'claude-sonnet-4-20250514',
    container: {
      skills: [{
        type: 'custom',
        skill_id: process.env.PROPTRADERAI_SKILL_ID!,
        version: process.env.PROPTRADERAI_SKILL_VERSION || 'latest',
      }],
    },
    messages: [{ role: 'user', content: message }],
    betas: ['skills-2025-10-02'],
  });
  
  return response;
}
```

**Use cases for Skills API:**
1. External API endpoints (charge premium for domain knowledge)
2. MCP server fallback when database unavailable
3. White-label partners who don't have your system prompt

---

## ✅ Summary

**Phase 1A Complete:**
- ✅ Firm selection cards with visual design
- ✅ Profile storage (firm_name, account_type, account_size, broker_connected)
- ✅ Validation API integrated into chat flow
- ✅ Validation modal shows warnings with proper severity
- ✅ Behavioral logging for validation events
- ✅ User can save despite warnings (advisory, not blocking)

**Next Steps (Phase 1B):**
1. ✅ Integrate timezone conversion into strategy parsing - Complete!
2. ⏳ Implement real Tradovate OAuth flow
3. ⏳ Fetch actual account size from Tradovate API
4. ⏳ Add account size selector for prop firms with multiple tiers

**PATH 3 (Future):**
- Upload Skills bundle to Anthropic for external API use
- Add SKILL_ID to .env for MCP server / white-label partners

