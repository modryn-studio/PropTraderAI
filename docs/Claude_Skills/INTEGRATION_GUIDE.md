# Claude Skills Integration - Usage Examples

**Implementation:** Option B+ (Selective Enhancement)  
**Status:** ✅ Complete  
**Date:** January 10, 2026

---

## 📋 What Was Implemented

### ✅ Static Utilities Extracted (No Skills API)

1. **Firm Rules Loader** (`src/lib/firm-rules/loader.ts`)
2. **Firm Rules Data** (`src/lib/firm-rules/data/*.json`) - 6 prop firms
3. **Timezone Converter** (`src/lib/utils/timezone.ts`)
4. **Validation API** (`src/app/api/strategy/validate-firm-rules/route.ts`)

### ❌ What We Did NOT Do

- Replace existing `/chat` system
- Use Anthropic Skills API
- Modify `parseStrategy()` function
- Change any existing flows

---

## 🎯 How To Use

### 1. Post-Strategy Validation (Recommended Usage)

**After Claude completes strategy parsing**, validate against prop firm rules:

```typescript
// In your strategy confirmation handler
// (e.g., after user clicks "Confirm Strategy" in ChatInterface)

const validateStrategy = async (strategyData) => {
  const response = await fetch('/api/strategy/validate-firm-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firmName: 'topstep',  // From user profile or conversation
      accountSize: 50000,    // From user profile or conversation
      parsedRules: strategyData.parsedRules,
      instrument: strategyData.instrument,
    }),
  });

  const validation = await response.json();
  
  if (!validation.isValid) {
    // Show errors to user
    console.error('Validation errors:', validation.warnings);
  } else if (validation.status === 'warnings') {
    // Show warnings but allow proceed
    console.warn('Validation warnings:', validation.warnings);
  } else {
    // All good!
    console.log('Strategy validated successfully');
  }
  
  return validation;
};
```

---

### 2. Detecting Firm from Conversation

**During chat, detect if user mentions their prop firm:**

```typescript
import { detectFirmFromMessage } from '@/lib/firm-rules/loader';

// In your chat handler
const firmDetected = detectFirmFromMessage(userMessage);

if (firmDetected) {
  console.log(`User is with ${firmDetected}`);
  // Store in user profile or session
  // Use for validation later
}

// Example detections:
detectFirmFromMessage("I'm trading with Topstep") // 'topstep'
detectFirmFromMessage("My funded futures account") // 'myfundedfutures'
detectFirmFromMessage("FTMO challenge") // 'ftmo'
```

---

### 3. Timezone Conversion

**Convert user's local time to exchange time:**

```typescript
import { parseTimezone, convertToExchangeTime } from '@/lib/utils/timezone';

// User says: "I trade 9:30 AM to 11:30 AM Pacific Time"
const userTimezone = parseTimezone('PT'); // 'America/Los_Angeles'

const startTime = convertToExchangeTime('09:30', userTimezone);
// { exchangeTime: '11:30', timezone: 'America/Chicago' }

const endTime = convertToExchangeTime('11:30', userTimezone);
// { exchangeTime: '13:30', timezone: 'America/Chicago' }

// Store exchangeTime in parsedRules
parsedRules.filters.push({
  type: 'time_window',
  start: startTime.exchangeTime,
  end: endTime.exchangeTime,
  timezone: startTime.timezone,
});
```

---

### 4. Loading Firm Rules Directly

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

---

## 🚀 Recommended Integration Points

### Option A: Add Validation Step to ChatInterface

After user confirms strategy, before saving:

```typescript
// src/app/chat/ChatInterface.tsx

const handleConfirmStrategy = async () => {
  // Detect firm from conversation history
  const firmName = detectFirmFromConversation(messages);
  
  if (firmName) {
    // Validate strategy
    const validation = await validateStrategy({
      firmName,
      accountSize: userAccountSize,
      parsedRules: strategyData.parsedRules,
      instrument: strategyData.instrument,
    });
    
    if (!validation.isValid) {
      // Show validation errors
      setValidationErrors(validation.warnings);
      return;
    }
  }
  
  // Proceed with save
  await saveStrategy();
};
```

---

### Option B: Add Firm Selection Step

Add a step before strategy parsing:

```typescript
// Before starting chat
<FirmSelectionModal
  onSelect={(firm, accountSize) => {
    setUserFirm(firm);
    setAccountSize(accountSize);
    startChat();
  }}
/>

// Then use in validation
const validation = await validateStrategy({
  firmName: userFirm,
  accountSize: accountSize,
  // ...
});
```

---

### Option C: Background Validation (Non-Blocking)

Validate in background, show info later:

```typescript
// After strategy is saved
const validation = await validateStrategy(strategyData);

if (validation.warnings.length > 0) {
  // Show non-blocking notification
  toast.warning(`${validation.warnings.length} validation notes`, {
    onClick: () => showValidationDetails(validation.warnings),
  });
}
```

---

## 📊 Validation Response Structure

```typescript
interface ValidationResponse {
  isValid: boolean;
  status: 'valid' | 'warnings' | 'invalid';
  warnings: ValidationWarning[];
  firmRules: {
    firmName: string;
    accountSize: number;
    profitTarget: number;
    dailyLossLimit: number | null;
    maxDrawdown: number;
    drawdownType: string;
    maxContracts: Record<string, number>;
    consistencyRule: number;
    automationPolicy: string;
  };
}

interface ValidationWarning {
  type: 'position_limit' | 'risk_limit' | 'consistency' | 'info';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}
```

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

**Current State:**
- ✅ Firm rules available as static JSON
- ✅ Validation API ready to use
- ✅ Timezone conversion utilities available
- ✅ `/chat` system unchanged and working perfectly

**Next Steps:**
1. Add firm detection to chat flow
2. Add validation step after strategy confirmation
3. Display validation warnings to user
4. Track validation results in behavioral_data

**PATH 3 (Future):**
- Upload Skills bundle to Anthropic
- Add SKILL_ID to .env
- Use for external API / MCP server only
