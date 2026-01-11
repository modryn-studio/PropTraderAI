# Strategy Summary Panel System

**A real-time, terminal-luxe strategy tracking sidebar for PropTraderAI**

---

## 📋 Overview

The Strategy Summary Panel displays trading strategy rules as users define them through conversation with Claude. It automatically extracts and organizes rules into categories, providing a clean, scannable overview without requiring users to scroll through the chat history.

### Key Features

- ✅ **Real-time Updates**: Rules appear as Claude confirms them
- ✅ **Smart Categorization**: Automatically groups rules (Setup, Entry, Exit, Risk, etc.)
- ✅ **Responsive Design**: Desktop sidebar + mobile bottom sheet
- ✅ **Terminal Aesthetic**: Matches PropTraderAI brand (pure black, cyan accents, monospace)
- ✅ **Touch Optimized**: Swipe gestures, FAB, keyboard-aware positioning
- ✅ **Collapsible Categories**: Expand/collapse to focus on specific aspects

---

## 🎨 Design Philosophy

### Terminal Luxe Aesthetic

The panel embodies PropTraderAI's "Terminal Luxe" design language:

| Element | Style |
|---------|-------|
| **Background** | Pure black (#000000) |
| **Borders** | Subtle white (rgba(255,255,255,0.1)) |
| **Accent** | Cyan (#00FFD1) |
| **Typography** | JetBrains Mono (monospace) |
| **Animation** | Subtle, purposeful, never bouncy |

### Information Hierarchy

```
1. Strategy Name (Header)
   ├── Category Groups (SETUP, ENTRY, EXIT, etc.)
   │   ├── Rule Label (muted, uppercase)
   │   └── Rule Value (white, emphasized)
   └── Rule Count (Footer)
```

---

## 🏗️ Component Architecture

### File Structure

```
src/
├── components/strategy/
│   └── StrategySummaryPanel.tsx      # Responsive panel (desktop + mobile)
└── lib/utils/
    └── ruleExtractor.ts              # V2 conversation-aware extraction
```

### Core Components

#### **StrategySummaryPanel** (Responsive)

Single component that adapts to desktop (left sidebar) and mobile (FAB + slide-up).

```tsx
<StrategySummaryPanel
  strategyName="Opening Range Breakout"
  rules={[
    { label: 'Entry Trigger', value: 'Break above 15-min high', category: 'entry' },
    { label: 'Stop Loss', value: '50% of range', category: 'risk' },
  ]}
  isVisible={true}
  animationConfig={animationConfig}        // Optional: strategy animation
  isAnimationExpanded={isExpanded}         // Optional: animation state
  onToggleAnimation={() => setExpanded(!isExpanded)}  // Optional: toggle handler
/>
```

**Key Props:**
- `strategyName` - Display name (derived from rules or API)
- `rules` - Array of StrategyRule objects
- `isVisible` - Show/hide panel
- `animationConfig` - Optional animation visualization
- `isAnimationExpanded` - Optional animation sidebar state
- `onToggleAnimation` - Optional handler for animation toggle

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install framer-motion lucide-react
```

### Step 2: Component is Already Integrated

The StrategySummaryPanel is already part of PropTraderAI at:
- `src/components/strategy/StrategySummaryPanel.tsx`
- `src/lib/utils/ruleExtractor.ts`

### Step 3: Integrate into Chat Interface

```tsx
import { useState, useCallback } from 'react';
import StrategySummaryPanel, { StrategyRule } from '@/components/strategy/StrategySummaryPanel';
import { extractFromMessage, accumulateRules } from '@/lib/utils/ruleExtractor';

export default function ChatInterface() {
  const [accumulatedRules, setAccumulatedRules] = useState<StrategyRule[]>([]);

  // Extract from user messages IMMEDIATELY
  const handleUserMessage = useCallback((message: string) => {
    setAccumulatedRules(prev => extractFromMessage(message, 'user', prev));
    // ... send to API ...
  }, []);

  // Extract from Claude responses ONLY on confirmations
  const handleClaudeResponse = useCallback((response: string) => {
    setAccumulatedRules(prev => extractFromMessage(response, 'assistant', prev));
    // extractFromMessage internally checks isConfirmation()
  }, []);

  // Derive strategy name from rules
  const strategyName = accumulatedRules.find(r => r.label === 'Strategy')?.value;

  return (
    <div className="relative flex h-screen">
      {/* Chat Area */}
      <div className="flex-1">
        {/* Your chat messages */}
      </div>

      {/* Strategy Summary (responsive: desktop sidebar + mobile bottom sheet) */}
      <StrategySummaryPanel
        strategyName={strategyName}
        rules={accumulatedRules}
        isVisible={accumulatedRules.length > 0}
      />
    </div>
  );
}
```

---

## 📊 Rule Categories

Rules are automatically organized into six categories:

| Category | Purpose | Example Rules |
|----------|---------|---------------|
| **setup** | Strategy type, direction, context | "Pattern: Opening Range Breakout", "Direction: Long only" |
| **entry** | Entry triggers and confirmations | "Entry: Break above 15-min high", "Confirmation: Price above VWAP" |
| **exit** | Profit targets and exit rules | "Target: 1:2 R:R", "Exit: End of session" |
| **risk** | Stop loss, position size, R:R | "Stop: 50% of range", "Risk: 1% per trade" |
| **timeframe** | Session timing, chart timeframes | "Session: RTH", "Range: 15 minutes" |
| **filters** | Additional conditions | "Filter: 20 EMA", "Filter: Volume > 1000" |

---

## 🔧 Rule Extraction (V2)

### Conversation-Aware Extraction

The V2 extraction system intelligently extracts rules based on conversational context:

```typescript
import { 
  extractFromMessage,      // Main extraction function
  isConfirmation,          // Detect Claude confirmations vs questions
  accumulateRules,         // Progressive merge (update existing, no duplicates)
  extractRulesEnhanced     // Low-level extraction with confidence scoring
} from '@/lib/utils/ruleExtractor';

// Extract from ANY message (user or assistant)
const rules = extractFromMessage(
  message,       // The text content
  'user',        // or 'assistant'
  existingRules  // Current accumulated rules
);
```

### How It Works

**User Messages** → Extract IMMEDIATELY
```typescript
// User: "I trade NQ with 2 contracts"
// Confidence threshold: 0.7 (lower because users state facts)
setRules(prev => extractFromMessage(userMsg, 'user', prev));
// ✅ Extracted: Instrument: NQ, Position Size: 2 contracts
```

**Claude Questions** → SKIP
```typescript
// Claude: "What's your stop loss approach?"
// isConfirmation() returns false
setRules(prev => extractFromMessage(claudeMsg, 'assistant', prev));
// ❌ No extraction (it's a question)
```

**Claude Confirmations** → Extract
```typescript
// Claude: "Good — that gives you a tight risk of 20 ticks"
// isConfirmation() returns true
// Confidence threshold: 0.85 (higher for Claude)
setRules(prev => extractFromMessage(claudeMsg, 'assistant', prev));
// ✅ Extracted: Stop Loss: 20 ticks
```

### Key Features

1. **Progressive Accumulation** - Rules merge intelligently:
   ```typescript
   // First message: "I trade NQ"
   // Rules: [{ Instrument: "NQ" }]
   
   // Second message: "with 2 contracts"
   // Rules: [{ Instrument: "NQ" }, { Position Size: "2 contracts" }]
   
   // Update: "actually make it 3 contracts"
   // Rules: [{ Instrument: "NQ" }, { Position Size: "3 contracts" }]
   ```

2. **Confidence Scoring** - Different thresholds for user vs Claude
3. **Deduplication** - Same category:label = update, not duplicate
4. **Conversational Patterns** - Understands "I trade NQ", "im trading NQ", "on NQ"
5. **Debug Logging** - Set `NEXT_PUBLIC_DEBUG_RULES=true` to see extraction details

---

## 📱 Responsive Behavior

### Desktop (≥768px)

- Fixed sidebar on **left** side
- Always visible when rules exist
- Width: 320px (w-80)
- Chat area adjusts with `ml-80` margin
- Smooth slide-in animation

### Mobile (<768px)

- Slide-up bottom sheet (max 75vh)
- Floating action button (FAB) when collapsed
- Swipe-down to dismiss gesture
- Keyboard-aware positioning
- Touch-optimized spacing
- Embedded strategy animation visualization

### Breakpoints

```css
/* Mobile */
@media (max-width: 767px) { ... }

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) { ... }

/* Desktop */
@media (min-width: 768px) { ... }
```

---

## 🎯 Example Scenarios

### Scenario 1: Opening Range Breakout

**User**: "I trade the opening range breakout on NQ during RTH"

**Extracted Rules**:
```typescript
[
  { label: 'Pattern Type', value: 'Opening Range Breakout', category: 'setup' },
  { label: 'Instrument', value: 'NQ', category: 'setup' },
  { label: 'Session', value: 'RTH (9:30 AM - 4:00 PM ET)', category: 'timeframe' },
]
```

**User**: "I use a 15-minute range and stop is 50% of the range"

**Additional Rules**:
```typescript
[
  { label: 'Range Period', value: '15 minutes', category: 'timeframe' },
  { label: 'Stop Loss', value: '50% of range size', category: 'risk' },
]
```

### Scenario 2: EMA Pullback

**User**: "I buy pullbacks to the 20 EMA when price is above it"

**Extracted Rules**:
```typescript
[
  { label: 'Pattern Type', value: 'EMA Pullback', category: 'setup' },
  { label: 'Direction', value: 'Long only', category: 'setup' },
  { label: 'Entry Trigger', value: 'Pullback to 20 EMA', category: 'entry' },
  { label: 'Condition', value: 'Price above 20 EMA', category: 'filters' },
]
```

---

## 🎨 Customization

### Changing Colors

```tsx
// In StrategySummaryPanel.tsx

// Accent color
className="text-[#00FFD1]"  // Change to your brand color

// Border color
className="border-[rgba(255,255,255,0.1)]"  // Adjust opacity

// Background
className="bg-[#000000]"  // Change base color
```

### Adjusting Width

```tsx
// In StrategySummaryPanel.tsx

// Desktop width (default: w-80 = 320px)
<div className="w-80 lg:w-96"> {/* Changes to 384px on large screens */}
```

### Adding New Categories

```typescript
// In StrategySummaryPanel.tsx

const categoryLabels: Record<string, string> = {
  setup: 'SETUP',
  entry: 'ENTRY',
  exit: 'EXIT',
  risk: 'RISK MGMT',
  timeframe: 'TIMEFRAME',
  filters: 'FILTERS',
  // Add your custom category:
  custom: 'CUSTOM RULES',
};

const categoryOrder = [
  'setup', 'entry', 'exit', 'risk', 'timeframe', 'filters', 'custom'
];
```

---

## ⚡ Performance Considerations

### Optimization Tips

1. **V2 Already Optimized**: Processes only complete sentences during streaming
   ```typescript
   // In ChatInterface.tsx
   const sentences = displayText.split(/[.!?]\s+/);
   const lastCompleteSentence = sentences[sentences.length - 2];
   // Only extract from last complete sentence
   ```

2. **Deduplication Built-In**: `accumulateRules()` prevents duplicates automatically
   ```

3. **Lazy Loading**: Load panel only when rules exist
   ```typescript
   {rules.length > 0 && <StrategySummaryPanel ... />}
   ```

4. **Virtual Scrolling**: For 50+ rules, consider `react-window`

---

## 🐛 Troubleshooting

### Panel Not Showing

**Issue**: Panel doesn't appear on desktop  
**Solution**: Check `isVisible` prop and ensure `rules.length > 0`

```typescript
<StrategySummaryPanel
  rules={rules}
  isVisible={rules.length > 0}  // ← Ensure this is true
/>
```

### Rules Not Updating

**Issue**: Rules don't update when conversation progresses  
**Solution**: Use `extractFromMessage()` correctly

```typescript
// ❌ Wrong: Not passing previous rules
const newRules = extractFromMessage(message, 'user', []);
setRules(newRules);

// ✅ Correct: Accumulate with previous
setRules(prev => extractFromMessage(message, 'user', prev));
```

### Rules Not Extracting from Claude

**Issue**: Claude's confirmations not detected  
**Solution**: Check if message is a question

```typescript
import { isConfirmation } from '@/lib/utils/ruleExtractor';

// Debug why extraction isn't happening
console.log('Is confirmation?', isConfirmation(claudeMessage));
// If false, Claude is asking a question (extraction skipped)
```

### Mobile Panel Stutters

**Issue**: Laggy animations on mobile  
**Solution**: Reduce `dragElastic` and simplify animations

```typescript
<motion.div
  dragElastic={0.1}  // Lower = less elastic
  transition={{ duration: 0.2 }}  // Shorter duration
>
```

### Keyboard Covering Panel

**Issue**: Mobile keyboard overlaps panel  
**Solution**: `MobileStrategySummary` already handles this via `visualViewport` API

---

## 🔮 Future Enhancements

V2 extraction is complete! Potential additions for v3:

- [x] **Conversation-aware extraction** (V2 complete)
- [x] **Confirmation detection** (V2 complete)
- [x] **Progressive accumulation** (V2 complete)
- [x] **Confidence thresholds** (V2 complete)
- [ ] **Rule Editing**: Click to edit/remove rules inline
- [ ] **Export**: Save strategy as PDF/JSON
- [ ] **Templates**: Pre-fill common strategies
- [ ] **Validation**: Highlight incomplete/invalid rules (uses firm rules API)
- [ ] **Persistence**: Already implemented in ChatInterface
- [ ] **Sharing**: Generate shareable strategy cards
- [ ] **AI Suggestions**: Claude recommends missing rules

---

## 📚 Additional Resources

- [PropTraderAI Brand Guide](../docs/BRAND_GUIDE.md)
- [UX Philosophy](../docs/PropTraderAI_UX_Philosophy_Roadmap.md)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com)

---

## 🤝 Contributing

When adding new features:

1. Match the terminal aesthetic (black, cyan, monospace)
2. Test on mobile Safari and Chrome
3. Ensure keyboard accessibility
4. Add examples to integration guide
5. Update this README

---

## 📄 License

Part of the PropTraderAI codebase. Internal use only.

---

**Questions?** Contact the PropTraderAI engineering team.
