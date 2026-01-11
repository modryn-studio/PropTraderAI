# Strategy Validation Layer - Integration Guide

## Overview

The validation layer ensures every trading strategy meets professional prop firm standards before backtesting. It enforces the 5 required components identified in our research:

1. Entry Criteria
2. Stop-Loss
3. Profit Target
4. Position Sizing
5. Instrument

## Files Created

```
src/
├── lib/
│   └── strategy/
│       ├── strategyValidator.ts       # Core validation logic
│       └── strategyBuilderPrompt.ts   # Enhanced Claude prompt
└── components/
    └── strategy/
        ├── ValidationStatus.tsx       # Visual validation display
        └── StrategyReadinessGate.tsx  # Readiness gate modal
```

## Quick Start (5 Steps)

### Step 1: Install Validation System

```bash
# Copy files to your project
cp strategyValidator.ts src/lib/strategy/
cp strategyBuilderPrompt.ts src/lib/strategy/
cp ValidationStatus.tsx src/components/strategy/
cp StrategyReadinessGate.tsx src/components/strategy/
```

### Step 2: Integrate Validation into Summary Sidebar

Update `src/components/strategy/StrategySummaryPanel.tsx`:

```typescript
import { validateStrategy, ValidationResult } from '@/lib/strategy/strategyValidator';
import ValidationStatus from '@/components/strategy/ValidationStatus';

interface StrategySummaryPanelProps {
  // ... existing props
  onValidationChange?: (validation: ValidationResult) => void;
}

export default function StrategySummaryPanel({ 
  rules, 
  onValidationChange,
  // ... other props
}: StrategySummaryPanelProps) {
  
  // Validate rules whenever they change
  const validation = useMemo(() => {
    const result = validateStrategy(rules);
    onValidationChange?.(result);
    return result;
  }, [rules, onValidationChange]);

  return (
    <motion.aside className="...">
      {/* Existing header */}
      
      {/* ADD: Validation Status */}
      <div className="px-4 py-4 border-b border-[rgba(255,255,255,0.1)]">
        <ValidationStatus validation={validation} />
      </div>

      {/* Existing rules list */}
      <div className="flex-1 overflow-y-auto">
        <RulesCategoryList rules={rules} />
      </div>

      {/* Existing footer */}
    </motion.aside>
  );
}
```

### Step 3: Add Readiness Gate to Chat Interface

Update `src/app/chat/ChatInterface.tsx`:

```typescript
import { validateStrategy, ValidationResult } from '@/lib/strategy/strategyValidator';
import StrategyReadinessGate, { ReadinessIndicator } from '@/components/strategy/StrategyReadinessGate';

export default function ChatInterface({ ... }: ChatInterfaceProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showReadinessGate, setShowReadinessGate] = useState(false);

  // Track validation state
  const handleValidationChange = useCallback((newValidation: ValidationResult) => {
    setValidation(newValidation);
  }, []);

  // Handle "Backtest" button click
  const handleBacktestClick = () => {
    if (!validation) return;
    
    // If not complete, show gate
    if (!validation.isComplete || validation.errors.length > 0) {
      setShowReadinessGate(true);
      return;
    }
    
    // If complete, proceed to backtest
    proceedToBacktest();
  };

  return (
    <div className="flex h-screen">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatMessageList messages={messages} />
        
        {/* Show readiness indicator in chat */}
        {validation && validation.completionScore >= 80 && (
          <div className="px-6 py-3 border-t border-[rgba(255,255,255,0.1)]">
            <ReadinessIndicator 
              validation={validation}
              onClick={() => setShowReadinessGate(true)}
            />
          </div>
        )}
        
        <ChatInput onSendMessage={handleSendMessage} />
      </div>

      {/* Strategy Summary with Validation */}
      <StrategySummaryPanel
        rules={accumulatedRules}
        onValidationChange={handleValidationChange}
      />

      {/* Readiness Gate Modal */}
      <StrategyReadinessGate
        validation={validation || { 
          isComplete: false, 
          isValid: false,
          completionScore: 0,
          requiredMissing: [],
          recommendedMissing: [],
          errors: [],
          warnings: []
        }}
        isOpen={showReadinessGate}
        onClose={() => setShowReadinessGate(false)}
      />
    </div>
  );
}
```

### Step 4: Update Claude System Prompt

Update `src/lib/claude/client.ts`:

```typescript
import { STRATEGY_BUILDER_SYSTEM_PROMPT } from '@/lib/strategy/strategyBuilderPrompt';

const systemPrompt = `
${STRATEGY_BUILDER_SYSTEM_PROMPT}

[... your existing prompt sections ...]
`;
```

### Step 5: Add Validation to Strategy Confirmation

When Claude proposes a strategy, validate it:

```typescript
import { validateStrategy, getValidationSummary } from '@/lib/strategy/strategyValidator';

// In your strategy confirmation handler
const handleStrategyConfirmed = async (strategy: StrategyData) => {
  // Extract rules from strategy
  const rules = mapParsedRulesToStrategyRules(strategy.parsedRules);
  
  // Validate
  const validation = validateStrategy(rules);
  
  // Block if incomplete
  if (!validation.isComplete) {
    toast.error(getValidationSummary(validation));
    setShowReadinessGate(true);
    return;
  }
  
  // Proceed if complete
  await saveStrategy(strategy);
};
```

## Visual Examples

### Validation Status in Sidebar (Desktop)

```
┌─ Strategy Builder ──────────────┐
│                                  │
│  ⬤⬤⬤⬤◯ 80% Complete            │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░           │
│  Define required components      │
│                                  │
│  REQUIRED COMPONENTS             │
│  ✓ Entry Criteria                │
│  ✓ Stop-Loss                     │
│  ✓ Profit Target                 │
│  ○ Position Sizing  ←MISSING     │
│  ✓ Instrument                    │
│                                  │
│  SETUP ▼                         │
│  • Pattern: ORB                  │
│  • Direction: Long               │
│                                  │
│  ENTRY ▼                         │
│  • Trigger: Break above high     │
│                                  │
└──────────────────────────────────┘
```

### Readiness Gate (Modal)

```
┌──────────────────────────────────────┐
│  🔒 Strategy Incomplete              │
│  1 required component missing (80%)  │
├──────────────────────────────────────┤
│                                      │
│     80%                              │
│     Complete                         │
│                                      │
│  NEXT STEP                           │
│  Define: positionSizing              │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│  REQUIRED (1)                        │
│                                      │
│  Position Sizing                     │
│  Position sizing not defined         │
│  💡 Specify your position size       │
│     (e.g., "1% risk per trade")     │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│  Professional Standard: Every        │
│  strategy requires entry, stop,      │
│  target, position sizing, and        │
│  instrument specification.           │
│                                      │
├──────────────────────────────────────┤
│  Continue Editing    [🔒 Locked]     │
└──────────────────────────────────────┘
```

## Validation Rules Reference

### Entry Criteria Validation

```typescript
// ❌ INVALID (too vague)
{ label: 'Entry', value: 'When it looks good', category: 'entry' }

// ✅ VALID (specific)
{ label: 'Entry Trigger', value: 'Break above 15-min high', category: 'entry' }
```

### Stop-Loss Validation

```typescript
// ❌ INVALID (no placement)
{ label: 'Stop', value: 'I\'ll decide', category: 'risk' }

// ✅ VALID (clear placement)
{ label: 'Stop Loss', value: '50% of range', category: 'risk' }
```

### Position Sizing Validation

```typescript
// ❌ WARNING (fixed without risk context)
{ label: 'Size', value: '2 contracts', category: 'risk' }

// ✅ VALID (formula-based)
{ label: 'Position Size', value: '1% risk per trade = 2 contracts', category: 'risk' }

// ❌ ERROR (risk too high)
{ label: 'Risk', value: '5% per trade', category: 'risk' }
// Triggers: "Risk per trade (5%) exceeds professional maximum (2%)"
```

### Risk:Reward Validation

```typescript
// ❌ WARNING (R:R too low)
{ label: 'Target', value: '1:1 R:R', category: 'exit' }
// Triggers: "Risk:reward ratio (1:1) below professional minimum (1.5:1)"

// ✅ VALID (meets standards)
{ label: 'Risk:Reward', value: '1:2', category: 'exit' }
```

## Testing the Integration

### Test Case 1: Incomplete Strategy

```typescript
const rules: StrategyRule[] = [
  { label: 'Pattern Type', value: 'ORB', category: 'setup' },
  { label: 'Entry', value: 'Break above high', category: 'entry' },
];

const validation = validateStrategy(rules);

expect(validation.isComplete).toBe(false);
expect(validation.completionScore).toBe(40); // 2/5 required
expect(validation.requiredMissing).toHaveLength(3);
expect(validation.requiredMissing.map(m => m.field)).toEqual([
  'stopLoss',
  'profitTarget',
  'positionSizing'
]);
```

### Test Case 2: Complete but Invalid

```typescript
const rules: StrategyRule[] = [
  { label: 'Entry', value: 'When I feel like it', category: 'entry' },
  { label: 'Stop', value: '2 ticks below', category: 'risk' },
  { label: 'Target', value: '1:2', category: 'exit' },
  { label: 'Size', value: '10 contracts', category: 'risk' },
  { label: 'Instrument', value: 'ES', category: 'setup' },
];

const validation = validateStrategy(rules);

expect(validation.isComplete).toBe(true);
expect(validation.isValid).toBe(false); // Has errors
expect(validation.errors).toHaveLength(1);
expect(validation.errors[0].field).toBe('entry');
expect(validation.errors[0].message).toContain('not specific enough');
```

### Test Case 3: Professional Quality

```typescript
const rules: StrategyRule[] = [
  { label: 'Entry Trigger', value: 'Break above 15-min high', category: 'entry' },
  { label: 'Stop Loss', value: '50% of range', category: 'risk' },
  { label: 'Risk:Reward', value: '1:2', category: 'exit' },
  { label: 'Position Size', value: '1% risk per trade', category: 'risk' },
  { label: 'Instrument', value: 'NQ', category: 'setup' },
  { label: 'Session', value: 'RTH', category: 'timeframe' },
];

const validation = validateStrategy(rules);

expect(validation.isComplete).toBe(true);
expect(validation.isValid).toBe(true);
expect(validation.completionScore).toBe(100);
expect(validation.errors).toHaveLength(0);
```

## Behavioral Logging Integration

Track validation state for analytics:

```typescript
import { logBehavioralEvent } from '@/lib/behavioral/logger';

// Log when validation changes
useEffect(() => {
  if (!validation) return;
  
  logBehavioralEvent(userId, 'strategy_validation_update', {
    completionScore: validation.completionScore,
    isComplete: validation.isComplete,
    isValid: validation.isValid,
    missingComponents: validation.requiredMissing.map(m => m.field),
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length,
  });
}, [validation, userId]);

// Log when user tries to proceed while incomplete
const handleBlockedBacktest = () => {
  logBehavioralEvent(userId, 'backtest_blocked', {
    reason: 'incomplete_strategy',
    completionScore: validation.completionScore,
    missingComponents: validation.requiredMissing.map(m => m.field),
  });
  
  setShowReadinessGate(true);
};
```

## Customization

### Adjust Professional Standards

Edit `src/lib/strategy/strategyValidator.ts`:

```typescript
const PROFESSIONAL_STANDARDS = {
  maxRiskPerTrade: 0.02,        // 2% max → Change to 0.015 for stricter
  minRiskRewardRatio: 1.5,      // 1.5:1 min → Change to 2.0 for stricter
  recommendedRR: 2.0,           // Keep at 2.0
  dailyLossLimitMin: 0.02,      // Adjust based on prop firm
  dailyLossLimitMax: 0.05,      // Adjust based on prop firm
};
```

### Add Custom Validation Rules

```typescript
// In validateStrategy function
if (components.entry && components.entry.type === 'breakout') {
  // Custom rule: breakouts require volume confirmation
  const hasVolumeFilter = allRules.some(r => 
    r.value.toLowerCase().includes('volume')
  );
  
  if (!hasVolumeFilter) {
    warnings.push({
      field: 'entry',
      message: 'Breakout entries typically require volume confirmation',
      severity: 'warning',
      category: 'entry',
      suggestion: 'Consider adding a volume filter (e.g., "Volume > average")',
    });
  }
}
```

## Troubleshooting

### Issue: Validation not updating

**Cause:** Rules not triggering re-validation  
**Solution:** Ensure `useEffect` dependency array includes `rules`

```typescript
const validation = useMemo(() => validateStrategy(rules), [rules]); // ✅
// Not: const validation = validateStrategy(rules); // ❌
```

### Issue: False positives (strategy marked complete when it's not)

**Cause:** Rule extraction missing components  
**Solution:** Check rule labels in `parseRulesToComponents`

```typescript
// Debug: Log what's being parsed
console.log('Parsed components:', parseRulesToComponents(rules));
```

### Issue: Gate showing when it shouldn't

**Cause:** Validation state not synced  
**Solution:** Centralize validation state

```typescript
// In ChatInterface.tsx
const [validation, setValidation] = useState<ValidationResult | null>(null);

// Pass both down to child components
<StrategySummaryPanel onValidationChange={setValidation} />
<StrategyReadinessGate validation={validation} />
```

## Next Steps

1. **Test with real users** - Deploy to staging and collect feedback
2. **Monitor completion rates** - Track how many strategies reach 100%
3. **Analyze blockers** - Which components do users struggle with most?
4. **Refine prompts** - Adjust Claude's guidance based on data
5. **Add advanced mode** - For experienced traders who want to bypass (Phase 2)

## Success Metrics

- ✅ 90%+ of strategies reach "Complete" status before backtest
- ✅ 0 strategies proceed to backtest missing required components
- ✅ Average completion time: <10 minutes (guided by Claude)
- ✅ User satisfaction: Strategy clarity improved

---

**Questions?** Check the code comments or review the research document:  
`docs/Deep_Research/Architecture of Professional Trading Strategies.md`
