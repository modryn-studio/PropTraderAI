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
src/components/strategy/
├── StrategySummaryPanel.tsx          # Main desktop component
├── MobileStrategySummary.tsx         # Mobile-optimized version
├── StrategySummaryPanel.css          # Responsive styles
└── StrategySummaryPanel_Integration_Example.tsx  # Usage examples
```

### Core Components

#### 1. **StrategySummaryPanel** (Desktop)

Fixed sidebar that appears on the right side of the chat interface.

```tsx
<StrategySummaryPanel
  strategyName="Opening Range Breakout"
  rules={[
    { label: 'Entry Trigger', value: 'Break above 15-min high', category: 'entry' },
    { label: 'Stop Loss', value: '50% of range', category: 'risk' },
  ]}
  isVisible={true}
/>
```

#### 2. **MobileStrategySummary** (Mobile)

Slide-up bottom sheet with floating action button.

```tsx
<MobileStrategySummary
  strategyName="Opening Range Breakout"
  rules={rules}
  onClose={() => console.log('Panel closed')}
/>
```

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install framer-motion lucide-react
```

### Step 2: Add Components to Your Project

```bash
cp StrategySummaryPanel.tsx src/components/strategy/
cp MobileStrategySummary.tsx src/components/strategy/
cp StrategySummaryPanel.css src/styles/
```

### Step 3: Import Styles

```tsx
// In your layout or page component
import '@/styles/StrategySummaryPanel.css';
```

### Step 4: Integrate into Chat Interface

```tsx
import { useState } from 'react';
import StrategySummaryPanel, { StrategyRule } from '@/components/strategy/StrategySummaryPanel';
import MobileStrategySummary from '@/components/strategy/MobileStrategySummary';

export default function ChatInterface() {
  const [rules, setRules] = useState<StrategyRule[]>([]);
  const [strategyName, setStrategyName] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // ... your chat logic ...

  return (
    <div className="relative flex h-screen">
      {/* Chat Area */}
      <div className="flex-1">
        {/* Your chat messages */}
      </div>

      {/* Strategy Summary */}
      {isMobile ? (
        <MobileStrategySummary
          strategyName={strategyName}
          rules={rules}
        />
      ) : (
        <StrategySummaryPanel
          strategyName={strategyName}
          rules={rules}
          isVisible={rules.length > 0}
        />
      )}
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

## 🔧 Rule Extraction

### Basic Pattern Matching

```typescript
import { StrategyRule } from '@/components/strategy/StrategySummaryPanel';

function extractRulesFromMessage(message: string): StrategyRule[] {
  const rules: StrategyRule[] = [];
  
  // Stop loss
  const stopMatch = message.match(/stop(?:\s+loss)?:\s*(.+?)(?:\n|$)/i);
  if (stopMatch) {
    rules.push({
      label: 'Stop Loss',
      value: stopMatch[1].trim(),
      category: 'risk',
    });
  }
  
  // Risk:Reward
  const rrMatch = message.match(/(\d+:\d+)(?:\s+rr)?/i);
  if (rrMatch) {
    rules.push({
      label: 'Risk:Reward',
      value: rrMatch[1],
      category: 'risk',
    });
  }
  
  return rules;
}
```

### Advanced: Context-Aware Parser

See `StrategySummaryPanel_Integration_Example.tsx` for a full parser implementation that:
- Tracks conversation context
- Deduplicates rules
- Updates existing rules
- Handles user corrections

---

## 📱 Responsive Behavior

### Desktop (≥768px)

- Fixed sidebar on right side
- Always visible (unless manually collapsed)
- Width: 320px (280px on tablets)
- Chat area adjusts with `margin-right`

### Mobile (<768px)

- Slide-up bottom sheet (max 75vh)
- Floating action button (FAB) when collapsed
- Swipe-down to dismiss gesture
- Keyboard-aware positioning
- Touch-optimized spacing

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

```css
/* In StrategySummaryPanel.css */

@media (min-width: 768px) {
  .strategy-summary-panel {
    width: 360px;  /* Default: 320px */
  }
}
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

1. **Memoize Rules**: Use `useMemo` to prevent re-renders
   ```typescript
   const memoizedRules = useMemo(() => rules, [rules]);
   ```

2. **Debounce Updates**: When parsing rules from streaming responses
   ```typescript
   const debouncedRules = useMemo(
     () => debounce(extractRules, 300),
     []
   );
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
**Solution**: Ensure you're creating new array instances

```typescript
// ❌ Wrong: Mutating existing array
setRules(prev => prev.push(newRule));

// ✅ Correct: Creating new array
setRules(prev => [...prev, newRule]);
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

Potential additions for v2:

- [ ] **Rule Editing**: Click to edit/remove rules
- [ ] **Export**: Save strategy as PDF/JSON
- [ ] **Templates**: Pre-fill common strategies
- [ ] **Validation**: Highlight incomplete/invalid rules
- [ ] **Persistence**: Save/load strategies from database
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
