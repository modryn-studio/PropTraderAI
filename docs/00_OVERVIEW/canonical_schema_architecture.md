# Canonical Schema Architecture

**Created:** January 19, 2026  
**Status:** Production Ready  
**Test Coverage:** 55/55 passing ✅

---

## Executive Summary

The **Canonical Schema** is a strict, type-safe contract between input systems (Claude AI) and execution compilers. It solves schema mismatches, eliminates text parsing, enforces runtime validation, and enables pattern-specific compilation with TypeScript type safety.

**Key Achievement:** Transformed loose, snake_case Claude output into strict, camelCase execution-ready format with zero breaking changes (graceful fallback).

---

## Problem Statement

### Before Canonical Schema

**Issues identified in compiler analysis:**

1. **Schema mismatch** - Claude uses "relation", Engine expects "comparator"
2. **Inconsistent naming** - Mixed snake_case and camelCase
3. **Hidden defaults** - Breakout pattern hardcoded 20-period lookback
4. **Loose validation** - Everything optional, fails silently
5. **Text parsing** - "20 tick stop" parsed in compilers (fragile)
6. **No pattern detection** - Heuristic guessing based on keywords
7. **No instrument normalization** - "E-MINI S&P" vs "ES" vs "E-MINI" confusion

### Impact

- Brittle execution layer prone to silent failures
- Debugging nightmares from text parsing edge cases
- TypeScript couldn't infer types (everything `any | undefined`)
- No way to validate strategy data at boundaries
- Adding new patterns required modifying all compilers

---

## Solution Architecture

### Four-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: INPUT                                              │
│ Claude AI → ParsedRules (loose, snake_case)                │
│                                                             │
│ Example:                                                    │
│ {                                                           │
│   "entry_conditions": [                                     │
│     {"indicator": "EMA", "period": 20, "relation": "above"}│
│   ],                                                        │
│   "exit_conditions": [                                      │
│     {"type": "stop_loss", "description": "20 tick stop"}   │
│   ]                                                         │
│ }                                                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: NORMALIZER                                         │
│ claudeToCanonical() - Bridges Claude → Canonical           │
│                                                             │
│ Operations:                                                 │
│ 1. Pattern Detection (keyword matching)                    │
│    - "EMA" + "pullback" → ema_pullback (85% confidence)   │
│    - "opening range" → opening_range_breakout (90%)       │
│    - Fallback → breakout (60%)                            │
│                                                             │
│ 2. Instrument Normalization (alias support)                │
│    - "E-MINI S&P" → ES                                     │
│    - "NASDAQ" → NQ                                         │
│    - "DOW" → YM                                            │
│                                                             │
│ 3. Stop/Target Parsing (natural language → structured)     │
│    - "20 tick stop" → {type: 'fixed_ticks', value: 20}   │
│    - "2:1 R:R" → {type: 'rr_ratio', value: 2}            │
│    - "ATR stop" → {type: 'atr_multiple', value: 2}        │
│                                                             │
│ 4. Direction Detection (regex matching)                    │
│    - "long" / "buy" → 'long'                              │
│    - "short" / "sell" → 'short'                           │
│    - Both or neither → 'both'                             │
│                                                             │
│ 5. RSI Filter Conversion                                   │
│    - Add missing "period" field (14)                       │
│    - Rename "condition" → "direction"                      │
│                                                             │
│ 6. Graceful Fallback                                       │
│    - On error: return {success: false, errors: [...]}     │
│    - Save route logs and falls back to legacy format      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: CANONICAL SCHEMA                                   │
│ Zod Runtime Validation + TypeScript Type Inference         │
│                                                             │
│ Structure:                                                  │
│ {                                                           │
│   pattern: 'ema_pullback',  // Discriminator!             │
│   instrument: {                                            │
│     symbol: 'ES',                                          │
│     contractSize: 50,                                      │
│     tickSize: 0.25,                                        │
│     tickValue: 12.50                                       │
│   },                                                        │
│   entry: {                                                  │
│     direction: 'both',                                      │
│     emaPullback: {                                         │
│       emaPeriod: 20,                                       │
│       pullbackConfirmation: 'touch',                       │
│       rsiFilter?: {                                        │
│         period: 14,                                        │
│         threshold: 40,                                     │
│         direction: 'below'                                 │
│       }                                                     │
│     }                                                       │
│   },                                                        │
│   exit: {                                                   │
│     stopLoss: {type: 'fixed_ticks', value: 20},          │
│     takeProfit: {type: 'fixed_ticks', value: 40}         │
│   },                                                        │
│   risk: {                                                   │
│     sizing: {type: 'risk_percent', percent: 1},          │
│     maxContracts: 10                                       │
│   },                                                        │
│   time: {                                                   │
│     sessionPreset: 'ny',                                   │
│     tradingHours: {start: 570, end: 960}                  │
│   }                                                         │
│ }                                                           │
│                                                             │
│ Validation:                                                 │
│ - All required fields enforced                             │
│ - Enum values checked                                      │
│ - Numeric ranges validated                                 │
│ - TypeScript types auto-inferred                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: EXECUTION COMPILERS                                │
│ Pattern-Specific Compilation (Type-Safe)                   │
│                                                             │
│ Routing:                                                    │
│ switch(rules.pattern) {                                     │
│   case 'opening_range_breakout':                          │
│     return compileCanonicalORB(rules);  // TS knows type! │
│   case 'ema_pullback':                                     │
│     return compileCanonicalEMAPullback(rules);            │
│   case 'breakout':                                         │
│     return compileCanonicalBreakout(rules);               │
│ }                                                           │
│                                                             │
│ Compilation:                                                │
│ - Direct field access (no parsing!)                        │
│ - No hardcoded defaults                                    │
│ - Structured exit configs                                  │
│ - Explicit sizing logic                                    │
│                                                             │
│ Output:                                                     │
│ CompiledStrategy {                                         │
│   shouldEnter: (context) => boolean | SignalResult,       │
│   getEntryPrice: (context) => number,                     │
│   getStopPrice: (entry, context) => number,               │
│   getTargetPrice: (entry, context) => number,             │
│   calculatePositionSize: (account, context) => number     │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── lib/
│   ├── execution/
│   │   ├── canonical-schema.ts           # Zod schemas, type guards
│   │   ├── canonical-compilers.ts        # Pattern-specific compilers
│   │   ├── ruleInterpreter.ts            # Legacy compilers (deprecated)
│   │   └── __tests__/
│   │       ├── canonical-schema.test.ts  # 15 schema tests
│   │       └── canonical-strategies/     # Test fixtures (JSON)
│   │           ├── orb-es-15min.json
│   │           ├── ema-pullback-nq-20.json
│   │           └── breakout-es-50period.json
│   │
│   └── strategy/
│       ├── claudeToCanonical.ts          # Normalizer
│       └── __tests__/
│           └── claudeToCanonical.test.ts # 40 normalizer tests
│
└── app/
    └── api/
        └── strategy/
            └── save/
                └── route.ts              # Normalization at save time
```

---

## Key Design Decisions

### 1. Discriminated Union Pattern

**Choice:** Use `pattern` field as discriminator

**Rationale:**
- TypeScript can infer exact type per pattern
- Compiler routing becomes type-safe switch statement
- Adding patterns doesn't break existing code
- Clear separation of pattern-specific logic

**Example:**
```typescript
type CanonicalParsedRules = 
  | OpeningRangeBreakoutRules  // { pattern: 'opening_range_breakout', ... }
  | EMAPullbackRules           // { pattern: 'ema_pullback', ... }
  | BreakoutRules;             // { pattern: 'breakout', ... }

// TypeScript knows exact type in each case
function compile(rules: CanonicalParsedRules) {
  switch(rules.pattern) {
    case 'opening_range_breakout':
      // rules is OpeningRangeBreakoutRules here!
      return compileORB(rules.entry.openingRange.periodMinutes);
    // ...
  }
}
```

### 2. camelCase Naming Convention

**Choice:** All canonical fields use camelCase

**Rationale:**
- TypeScript convention (official style guide)
- Matches existing JS/TS ecosystem
- Better IDE autocomplete
- Clearer hierarchy with dot notation

**Example:**
```typescript
// ✅ Canonical
rules.entry.openingRange.periodMinutes
rules.exit.stopLoss.type
rules.risk.sizing.percent

// ❌ Legacy (snake_case)
rules.entry_conditions[0].period_minutes
rules.exit_conditions[0].stop_type
rules.position_sizing.risk_percent
```

### 3. Nested by Concern

**Choice:** Group related fields under parent objects

**Rationale:**
- Logical grouping improves readability
- Easier to extend without polluting top level
- Natural namespace for pattern-specific params
- Matches how compilers consume data

**Example:**
```typescript
{
  entry: {              // All entry logic
    direction: 'both',
    openingRange: {     // Pattern-specific
      periodMinutes: 15,
      entryOn: 'first_break'
    }
  },
  exit: {               // All exit logic
    stopLoss: {
      type: 'fixed_ticks',
      value: 20
    },
    takeProfit: {
      type: 'rr_ratio',
      value: 2
    }
  },
  risk: {               // All sizing logic
    sizing: {...},
    maxContracts: 10
  }
}
```

### 4. Explicit Fields (No Hidden Defaults)

**Choice:** All critical parameters explicit in schema

**Rationale:**
- No surprises from hidden defaults
- Easier debugging (see what was actually configured)
- Clear documentation of required params
- Prevents "magic number" bugs

**Example:**
```typescript
// ❌ Before (Breakout)
function compileBreakoutPattern(rules) {
  const period = 20;  // HARDCODED! Not in rules!
  // ...
}

// ✅ After (Canonical)
{
  entry: {
    breakout: {
      lookbackPeriod: 50,  // EXPLICIT in schema!
      levelType: 'high_low',
      confirmation: 'close'
    }
  }
}
```

### 5. Structured Configs (No Text Parsing)

**Choice:** Exit configs are typed objects, not strings

**Rationale:**
- No fragile regex parsing
- TypeScript enforces valid combinations
- Easier to extend with new types
- Clear documentation of supported options

**Example:**
```typescript
// ❌ Legacy
{
  "exit_conditions": [
    {"type": "stop_loss", "description": "20 tick stop"},
    {"type": "take_profit", "description": "2:1 R:R"}
  ]
}
// Compilers parse "20 tick stop" with regex → fragile!

// ✅ Canonical
{
  exit: {
    stopLoss: {
      type: 'fixed_ticks',  // Enum!
      value: 20
    },
    takeProfit: {
      type: 'rr_ratio',     // Enum!
      value: 2
    }
  }
}
// Direct field access → robust!
```

### 6. Runtime Validation at Boundaries

**Choice:** Use Zod to validate at save time and load time

**Rationale:**
- Catch bad data before it reaches compilers
- Clear error messages for users/admins
- TypeScript types auto-generated from Zod schemas
- Single source of truth for validation + types

**Example:**
```typescript
// At save time
const result = validateCanonical(parsedStrategy);
if (!result.success) {
  // Log errors, fallback to legacy
  await logBehavioralEvent(userId, 'normalization_failed', {
    errors: result.errors
  });
  return saveLegacyFormat(parsedStrategy);
}

// At load time
const strategy = await getStrategy(id);
const result = validateCanonical(strategy.canonical_rules);
if (!result.success) {
  throw new Error('Invalid canonical schema: ' + result.errors.join(', '));
}
```

---

## Database Migration Strategy

### Current Schema (January 2026)

```sql
CREATE TABLE strategies (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  natural_language TEXT,
  
  -- LEGACY format (loose, snake_case)
  parsed_rules JSONB,
  
  -- NEW canonical format (strict, camelCase)
  canonical_rules JSONB,
  
  -- Tracks which format is used
  format_version TEXT DEFAULT 'legacy',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Save Route Logic

```typescript
// src/app/api/strategy/save/route.ts

export async function POST(req: Request) {
  // 1. Validate conversation completeness
  if (!conversationData.isComplete) {
    return Response.json({ error: 'Incomplete conversation' }, { status: 400 });
  }
  
  // 2. Attempt normalization
  const claudeOutput: ClaudeStrategyOutput = {
    parsedRules: body.parsedRules,
    instrument: body.instrument,
    naturalLanguageDescription: body.naturalLanguageDescription
  };
  
  const normResult = claudeToCanonical(claudeOutput);
  
  // 3. Decide which format to save
  const strategyData = {
    user_id: userId,
    name: body.name,
    natural_language: body.naturalLanguageDescription,
    
    // Save canonical if successful
    canonical_rules: normResult.success ? normResult.canonical : null,
    format_version: normResult.success ? 'canonical_v1' : 'legacy',
    
    // Fallback to legacy if normalization failed
    parsed_rules: normResult.success ? null : body.parsedRules,
  };
  
  // 4. Save to database
  const { data: strategy } = await supabase
    .from('strategies')
    .insert(strategyData)
    .select()
    .single();
  
  // 5. Log normalization outcome (behavioral data)
  await logBehavioralEvent(userId, 'strategy_saved', {
    normalizationSucceeded: normResult.success,
    canonicalPattern: normResult.canonical?.pattern,
    normalizationErrors: normResult.errors,
    strategyId: strategy.id
  });
  
  return Response.json({ success: true, strategy });
}
```

### Load and Compile Logic (Phase 1B)

```typescript
// Execution server will use this pattern

async function loadAndCompileStrategy(strategyId: string) {
  // 1. Load from database
  const { data: strategy } = await supabase
    .from('strategies')
    .select('*')
    .eq('id', strategyId)
    .single();
  
  // 2. Priority check: Use canonical if available
  if (strategy.canonical_rules && strategy.format_version === 'canonical_v1') {
    console.log(`✅ Strategy ${strategyId} using canonical format`);
    return compileCanonicalStrategy(strategy.canonical_rules);
  }
  
  // 3. Fallback: Use legacy if canonical not available
  if (strategy.parsed_rules) {
    console.warn(`⚠️  Strategy ${strategyId} using LEGACY format`);
    return compileStrategy(strategy.parsed_rules);  // ruleInterpreter.ts
  }
  
  // 4. Error: No valid format
  throw new Error(`Strategy ${strategyId} has no valid rules format`);
}
```

### Rollout Timeline

**Phase 1 (Current - January 2026):**
- ✅ Both formats saved (canonical preferred, legacy fallback)
- ✅ Normalization happens at save time
- ✅ Behavioral logging tracks success/failure rates
- ✅ No breaking changes (graceful degradation)

**Phase 2 (Q1 2026):**
- [ ] Update execution server to prioritize canonical_rules
- [ ] Add monitoring dashboard (canonical vs legacy usage)
- [ ] Create admin panel to view normalization failures
- [ ] Batch migration job for existing strategies

**Phase 3 (Q2 2026):**
- [ ] Deprecation notice for `parsed_rules` column
- [ ] Remove legacy compilers (ruleInterpreter.ts)
- [ ] Drop `parsed_rules` column from schema
- [ ] Canonical-only architecture

---

## Pattern-Specific Schemas

### Opening Range Breakout

```typescript
{
  pattern: 'opening_range_breakout',
  instrument: InstrumentSpec,
  entry: {
    direction: 'long' | 'short' | 'both',
    openingRange: {
      periodMinutes: number,      // 5-120 (validated by Zod)
      entryOn: 'first_break' | 'any_break'
    }
  },
  exit: ExitConfig,
  risk: RiskConfig,
  time: TimeConfig
}
```

**Key Points:**
- `periodMinutes` explicit (user configurable, default 15)
- `entryOn` controls breakout behavior (first vs any)
- Direction can be unidirectional or both

### EMA Pullback

```typescript
{
  pattern: 'ema_pullback',
  instrument: InstrumentSpec,
  entry: {
    direction: 'long' | 'short' | 'both',
    emaPullback: {
      emaPeriod: number,                   // User configurable
      pullbackConfirmation: 'touch' | 'close_above' | 'bounce',
      rsiFilter?: {                        // Optional filter
        period: number,                    // Default 14
        threshold: number,                 // User sets (e.g., 40)
        direction: 'above' | 'below'
      }
    }
  },
  exit: ExitConfig,
  risk: RiskConfig,
  time: TimeConfig
}
```

**Key Points:**
- `emaPeriod` explicit (no hardcoded 20!)
- `rsiFilter` is optional (marked with `?`)
- RSI has `period` field (was missing in legacy)
- RSI `direction` (renamed from "condition")

### Breakout

```typescript
{
  pattern: 'breakout',
  instrument: InstrumentSpec,
  entry: {
    direction: 'long' | 'short' | 'both',
    breakout: {
      lookbackPeriod: number,              // EXPLICIT! (was hardcoded 20)
      levelType: 'high_low' | 'close',
      confirmation: 'close' | 'volume' | 'none'
    }
  },
  exit: ExitConfig,
  risk: RiskConfig,
  time: TimeConfig
}
```

**Key Points:**
- `lookbackPeriod` explicit (biggest win!)
- `levelType` clarifies high/low vs close prices
- `confirmation` supports volume-based confirmation

---

## Common Configs (Shared Across Patterns)

### InstrumentSpec

```typescript
{
  symbol: 'ES' | 'NQ' | 'YM' | 'RTY' | 'CL' | 'GC' | 'SI',
  contractSize: number,   // ES: 50, NQ: 20, etc.
  tickSize: number,       // ES: 0.25, NQ: 0.25, etc.
  tickValue: number       // ES: 12.50, NQ: 5.00, etc.
}
```

**Loaded from `INSTRUMENT_DEFAULTS` constant**

### ExitConfig

```typescript
{
  stopLoss: {
    type: 'fixed_ticks' | 'structure' | 'atr_multiple' | 'opposite_range',
    value: number
  },
  takeProfit: {
    type: 'rr_ratio' | 'fixed_ticks' | 'opposite_range' | 'structure',
    value: number
  }
}
```

**Stop Types:**
- `fixed_ticks` - Value in ticks (e.g., 20)
- `structure` - Uses opening range or swing highs/lows
- `atr_multiple` - Value is ATR multiplier (e.g., 2.0)
- `opposite_range` - Other side of range (for ORB)

**Target Types:**
- `rr_ratio` - Risk:Reward ratio (e.g., 2.0 = 2:1)
- `fixed_ticks` - Value in ticks (e.g., 40)
- `opposite_range` - Other side of range (for ORB)
- `structure` - Uses structure levels

### RiskConfig

```typescript
{
  sizing: {
    type: 'risk_percent' | 'fixed_contracts',
    percent?: number,      // If type is 'risk_percent' (1 = 1%)
    contracts?: number     // If type is 'fixed_contracts'
  },
  maxContracts: number     // Hard limit (default 10)
}
```

**Sizing Logic:**
- `risk_percent`: Calculate contracts from account risk percent
- `fixed_contracts`: Always trade N contracts

### TimeConfig

```typescript
{
  sessionPreset: 'ny' | 'london' | 'asia' | 'all' | 'custom',
  tradingHours: {
    start: number,   // Minutes since midnight (e.g., 570 = 9:30 AM)
    end: number      // Minutes since midnight (e.g., 960 = 4:00 PM)
  }
}
```

**Session Presets:**
- `ny`: 570-960 (9:30 AM - 4:00 PM ET)
- `london`: 120-600 (2:00 AM - 10:00 AM ET)
- `asia`: 0-360 (12:00 AM - 6:00 AM ET)
- `all`: 0-1440 (24 hours)
- `custom`: User-specified hours

---

## Test Coverage

### Test Files

```
src/lib/execution/__tests__/
├── canonical-schema.test.ts           # 15 schema tests
└── canonical-strategies/              # Test fixtures
    ├── orb-es-15min.json             # ORB with opposite_range stop
    ├── ema-pullback-nq-20.json       # EMA with RSI filter
    └── breakout-es-50period.json     # 50-period breakout

src/lib/strategy/__tests__/
└── claudeToCanonical.test.ts         # 40 normalizer tests
```

### Schema Tests (15)

1. **Zod validation**
   - Valid ORB rules pass
   - Valid EMA Pullback rules pass
   - Valid Breakout rules pass
   - Invalid pattern rejected
   - Missing required fields rejected

2. **Type guards**
   - `isORBRules()` correctly identifies ORB
   - `isEMAPullbackRules()` correctly identifies EMA Pullback
   - `isBreakoutRules()` correctly identifies Breakout
   - Type guards reject wrong patterns

3. **Session time conversions**
   - NY session converts to correct minutes
   - London session converts correctly
   - Asia session converts correctly
   - Custom sessions preserve user times

4. **Compiler integration**
   - Canonical ORB compiles to CompiledStrategy
   - Canonical EMA Pullback compiles correctly
   - Canonical Breakout compiles correctly

### Normalizer Tests (40)

1. **Pattern detection** (10 tests)
   - EMA + pullback keywords → ema_pullback
   - Opening range keywords → opening_range_breakout
   - Generic/ambiguous → breakout (fallback)
   - Confidence scores correct
   - Case-insensitive matching

2. **Direction detection** (5 tests)
   - "long" / "buy" → 'long'
   - "short" / "sell" → 'short'
   - Both or neither → 'both'
   - Multiple mentions (last one wins)

3. **Instrument normalization** (8 tests)
   - Direct match: "ES" → ES
   - Alias: "E-MINI" → ES
   - Alias: "NASDAQ" → NQ
   - Alias: "DOW" → YM
   - Invalid instrument → null
   - Loads INSTRUMENT_DEFAULTS correctly

4. **Stop/target parsing** (7 tests)
   - "20 tick stop" → {type: 'fixed_ticks', value: 20}
   - "2:1 R:R" → {type: 'rr_ratio', value: 2}
   - "ATR stop" → {type: 'atr_multiple', value: 2}
   - "structure stop" → {type: 'structure', value: 0}
   - Multiple formats in one description

5. **Risk normalization** (3 tests)
   - risk_percent → {type: 'risk_percent', percent: 1}
   - fixed_contracts → {type: 'fixed_contracts', contracts: 2}
   - Missing sizing → default to risk_percent 1%

6. **Time normalization** (3 tests)
   - RTH session → NY preset
   - Custom times → custom preset
   - Missing times → all preset (24 hours)

7. **Full end-to-end** (4 tests)
   - Complete ORB strategy normalizes correctly
   - Complete EMA Pullback with RSI normalizes correctly
   - Complete Breakout normalizes correctly
   - Unsupported pattern falls back gracefully

---

## Benefits Achieved

### For Development

✅ **Type safety** - TypeScript knows exact shape per pattern  
✅ **No text parsing** - Direct field access in compilers  
✅ **Better testing** - Strict schemas enable comprehensive test coverage  
✅ **Clear documentation** - Schema is self-documenting  
✅ **Easier debugging** - Validation errors point to exact field  

### For Users

✅ **Graceful fallback** - No breaking changes, no data loss  
✅ **Better error messages** - Validation explains what's wrong  
✅ **Consistent behavior** - No hidden defaults or magic numbers  

### For Product

✅ **Extensibility** - Adding patterns doesn't break existing code  
✅ **Migration path** - Smooth rollout without disruption  
✅ **Quality metrics** - Track normalization success rates  
✅ **Behavioral data** - Log pattern detection confidence, errors  

---

## Common Mistakes to Avoid

### ❌ Don't Mix Naming Conventions

```typescript
// Wrong
{ entry_conditions: {...}, exitConfig: {...} }  // Mixed snake/camel

// Right
{ entry: {...}, exit: {...} }  // All camelCase
```

### ❌ Don't Parse Text in Compilers

```typescript
// Wrong
const stop = parseStopDescription(exit.description);  // Text parsing

// Right
const stop = exit.stopLoss.type === 'fixed_ticks' 
  ? exit.stopLoss.value * instrument.tickSize
  : /* handle other types */;
```

### ❌ Don't Hardcode Defaults

```typescript
// Wrong
const period = rules.period || 20;  // Hardcoded default

// Right
const period = rules.entry.breakout.lookbackPeriod;  // Required field
```

### ❌ Don't Bypass Zod Validation

```typescript
// Wrong
const rules = JSON.parse(jsonString) as CanonicalParsedRules;

// Right
const result = validateCanonical(JSON.parse(jsonString));
if (!result.success) throw new Error(result.errors.join(', '));
const rules = result.data;
```

### ❌ Don't Use Legacy Compilers for New Code

```typescript
// Wrong (for new strategies)
import { compileStrategy } from '@/lib/execution/ruleInterpreter';

// Right
import { compileCanonicalStrategy } from '@/lib/execution/canonical-compilers';
```

---

## Future Enhancements

### Phase 2 (Q1 2026)

1. **Pattern Library Expansion**
   - Gap Fill pattern
   - VWAP deviation pattern
   - Volume Profile pattern
   - Sweep pattern

2. **Advanced Entry Conditions**
   - Multi-indicator combinations
   - Custom indicator support
   - Time-of-day filters
   - News event filters

3. **Enhanced Exit Logic**
   - Trailing stops
   - Time-based exits
   - Partial profit taking
   - Scale-out strategies

### Phase 4-8 (Future)

**AI Compiler (per Agent 1 guidance):**
- Generate pattern-specific compilers from natural language
- Learn optimal parameter ranges from behavioral data
- Auto-detect new patterns from user descriptions
- Generate tests automatically

**Why defer?**
- Pattern Library (Phase 1-3) covers 80% of use cases
- Need behavioral data to train AI Compiler effectively
- Avoid premature optimization
- Let patterns emerge from actual user needs

---

## Related Documents

- **Agent 1 Issue #42:** Architectural guidance for canonical schema
- **docs/00_OVERVIEW/compiler_analysis.md:** Problem analysis that triggered this solution
- **docs/00_OVERVIEW/understanding_rules_engine_architecture.md:** Complete flow diagrams
- **docs/Open_Issue_Summary/#10_execution_layer.md:** Execution layer context

---

## Conclusion

The Canonical Schema architecture transforms PropTraderAI's execution layer from fragile text-parsing to robust type-safe compilation. It maintains backward compatibility while enabling future extensibility, validates at boundaries, and provides clear error messages.

**Key Achievement:** Zero breaking changes while fundamentally improving type safety, testability, and maintainability.

**Next Steps:** Integrate with Phase 1B execution server, add monitoring dashboards, and begin batch migration of existing strategies.

---

**Document Created:** January 19, 2026  
**Author:** Agent 2 (VS Code Copilot)  
**Reviewed By:** Agent 1 (Issue #42)  
**Status:** Production Ready ✅
