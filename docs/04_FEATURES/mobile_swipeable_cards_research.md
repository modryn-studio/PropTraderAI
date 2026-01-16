# Mobile Swipeable Cards - Preliminary Research

**Created:** January 16, 2026  
**Purpose:** Research findings while waiting for Agent 1 review of Issue #7  
**Status:** Preliminary / Ready for Implementation

---

## ✅ Existing Infrastructure

### 1. Animation Library: Framer Motion Already Installed

```json
"framer-motion": "^12.24.10"
```

**Status:** ✅ No additional installation needed

**Existing Usage:**
- 20+ components already use Framer Motion
- `AnimationContainer.tsx` - Mobile FAB patterns
- `StrategyEditableCard.tsx` - Card animations
- `InlineCriticalQuestion.tsx` - Question animations
- All Smart Tools use `motion` and `AnimatePresence`

**Key Imports We'll Use:**
```typescript
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
```

**Decision:** ✅ Use Framer Motion (already integrated, team familiar)  
❌ Don't need react-spring (would add unnecessary dependency)

---

### 2. Responsive Breakpoints Hook: Already Built

**Location:** `src/lib/hooks/useResponsiveBreakpoints.ts`

**Breakpoints:**
```typescript
const BREAKPOINTS = {
  mobile: 768,    // < 768px (FAB-based UI)
  tablet: 1024,   // 768-1023px (Summary sidebar only)
  desktop: 1280,  // 1024-1279px (Summary + minimized animation)
  wide: 1440,     // 1280-1439px (Summary + animation auto-expandable)
  ultrawide: 1920 // >= 1440px (Summary + animation defaults expanded)
};
```

**Returns:**
```typescript
{
  screenSize: 'mobile' | 'tablet' | 'desktop' | 'wide' | 'ultrawide',
  width: number,
  isMobile: boolean,
  isTablet: boolean,
  isDesktop: boolean,
  isWide: boolean,
  isUltrawide: boolean,
  showSidebars: boolean,
  defaultAnimationExpanded: boolean,
  animationAutoExpandable: boolean
}
```

**Includes Mobile Keyboard Detection:**
```typescript
export function useMobileKeyboardDetection(): boolean {
  // Returns true when mobile keyboard is open
  // Useful for hiding FABs/sticky bars when keyboard visible
}
```

**Decision:** ✅ Reuse this hook for mobile detection  
✅ Use `isMobile` flag for responsive switching

---

### 3. Existing Mobile Patterns to Reference

#### A. `AnimationContainer.tsx` - Mobile FAB Pattern

**Learnings:**
- Uses Framer Motion for slide-up panel
- Handles mobile keyboard detection
- Sticky positioning with proper z-index
- Touch-optimized close button

**Code Reference:**
```typescript
// Mobile FAB (Floating Action Button)
<motion.button
  className="fixed bottom-4 right-4 z-40"
  onClick={handleMobileOpen}
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  exit={{ scale: 0 }}
>
  <Maximize2 />
</motion.button>

// Mobile slide-up panel
<AnimatePresence>
  {isMobileOpen && (
    <motion.div
      className="fixed inset-0 z-50 bg-background"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      {/* Panel content */}
    </motion.div>
  )}
</AnimatePresence>
```

**Can Reuse:**
- Slide-up animation pattern
- Fixed positioning approach
- Spring transition settings (damping: 30, stiffness: 300)

---

#### B. `StrategyEditableCard.tsx` - Desktop Card Pattern

**Current Implementation:**
- Shows all parameters at once
- Grid layout with categories
- Inline editing with modals
- Default badges with tooltips

**Location:** `src/components/strategy/StrategyEditableCard.tsx`

**Parameters Displayed:**
1. Pattern/Instrument (SETUP)
2. Entry conditions (ENTRY)
3. Stop loss (EXIT - RISK)
4. Target (EXIT - REWARD)
5. Position sizing (RISK)
6. Trading session (FILTERS)

**Can Reuse:**
- Parameter categorization logic
- Default badge component
- Confirmation state management
- Edit modal trigger pattern

---

#### C. Existing Card Components

**Files Found:**
- `PropFirmCard.tsx` - Dashboard card (not relevant)
- `StrategyPreviewCard.tsx` - List view card (minimal)
- `StrategyConfirmationCard.tsx` - Final save card (not relevant)
- `StrategyEditableCard.tsx` - Desktop editing card ✅ (main reference)

**Design Patterns:**
- All use Tailwind for styling
- All use `motion.div` for animations
- All use lucide-react for icons
- Consistent spacing (p-4, p-6)
- Consistent borders (border-border)
- Consistent shadows (shadow-sm, shadow-md)

---

## 🎨 Design Tokens Already Defined

### Colors (from existing cards)
```css
bg-background       /* Main card background */
bg-secondary        /* Hover/secondary background */
border-border       /* Card borders */
text-primary        /* Main text */
text-secondary      /* Label text */
text-tertiary       /* Muted text */
```

### Spacing
```css
p-4                 /* Standard card padding */
p-6                 /* Large card padding */
gap-2               /* Small gap between elements */
gap-4               /* Standard gap */
space-y-4           /* Vertical spacing */
```

### Animations (already used)
```typescript
// Fade in/out
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}

// Slide up/down
initial={{ y: 20 }}
animate={{ y: 0 }}

// Scale
initial={{ scale: 0.95 }}
animate={{ scale: 1 }}

// Spring settings (from AnimationContainer)
transition={{ type: 'spring', damping: 30, stiffness: 300 }}
```

---

## 📱 Mobile UX Patterns to Implement

### 1. Swipe Gesture Detection

**Framer Motion Drag Hook:**
```typescript
import { motion } from 'framer-motion';

const bind = useDrag(({ down, movement: [mx], direction: [xDir] }) => {
  // Swipe threshold: 50px
  if (!down && Math.abs(mx) > 50) {
    const direction = xDir > 0 ? 'right' : 'left';
    onSwipe(direction);
  }
});

<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.2}
  onDragEnd={(event, info) => {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      handleSwipeRight();
    } else if (info.offset.x < -swipeThreshold) {
      handleSwipeLeft();
    }
  }}
>
  {/* Card content */}
</motion.div>
```

**Alternative: Touch Events (if more control needed):**
```typescript
const handleTouchStart = (e: TouchEvent) => {
  touchStartX = e.touches[0].clientX;
};

const handleTouchEnd = (e: TouchEvent) => {
  const touchEndX = e.changedTouches[0].clientX;
  const diff = touchStartX - touchEndX;
  
  if (Math.abs(diff) > 50) {
    if (diff > 0) handleSwipeLeft();
    else handleSwipeRight();
  }
};
```

**Decision Pending:** Wait for Agent 1's preference

---

### 2. Card Carousel Pattern

**Option A: Absolute Positioning (like Tinder)**
```typescript
<div className="relative h-[500px]">
  {cards.map((card, index) => (
    <motion.div
      key={index}
      className="absolute inset-0"
      initial={{ x: index * 300 }}
      animate={{ x: (index - currentIndex) * 300 }}
      style={{ zIndex: cards.length - index }}
    >
      {card}
    </motion.div>
  ))}
</div>
```

**Option B: Transform (smoother performance)**
```typescript
<motion.div
  style={{ 
    x,  // Animated value from useMotionValue()
    display: 'flex'
  }}
>
  {cards.map(card => (
    <div className="min-w-full">{card}</div>
  ))}
</motion.div>
```

**Decision Pending:** Wait for Agent 1's preference

---

### 3. Progress Indicators

**Existing Pattern from AnimationContainer:**
```typescript
<div className="flex gap-1">
  {Array.from({ length: total }).map((_, i) => (
    <div 
      key={i}
      className={cn(
        "h-1 rounded-full transition-colors",
        i <= current ? "bg-primary" : "bg-muted"
      )}
      style={{ width: `${100 / total}%` }}
    />
  ))}
</div>
```

**Can adapt for parameter cards:**
```typescript
<div className="progress-dots">
  {parameters.map((param, i) => (
    <div
      key={i}
      className={cn(
        "w-2 h-2 rounded-full transition-colors",
        i < currentIndex && "bg-success",      // Completed
        i === currentIndex && "bg-primary",    // Active
        i > currentIndex && "bg-muted"         // Not started
      )}
    />
  ))}
</div>
```

---

### 4. Sticky Action Bar

**Existing Pattern from AnimationContainer:**
```typescript
<div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
  <div className="flex items-center justify-between">
    <span className="text-sm">Progress info</span>
    <Button>Action</Button>
  </div>
</div>
```

**Need to Add:**
- Safe area insets for iOS notch
- Keyboard detection to hide when typing
- Shadow/elevation for prominence

```css
/* Safe area insets (iOS) */
padding-bottom: max(1rem, env(safe-area-inset-bottom));

/* Backdrop blur for modern feel */
backdrop-blur-sm bg-background/95
```

---

## 🔧 Implementation Utilities to Create

### 1. Parameter Grouping Function

```typescript
// Group parameters by importance (critical first)
function groupParametersByImportance(rules: StrategyRule[]): StrategyRule[] {
  const critical = rules.filter(needsConfirmation);
  const userSpecified = rules.filter(r => !r.isDefaulted && !needsConfirmation(r));
  const defaulted = rules.filter(r => r.isDefaulted);
  
  return [...critical, ...userSpecified, ...defaulted];
}

// Determine if parameter needs explicit confirmation
function needsConfirmation(rule: StrategyRule): boolean {
  const criticalLabels = ['Stop Loss', 'Stop Placement', 'Max Drawdown'];
  return criticalLabels.includes(rule.label);
}
```

---

### 2. Swipe Animation Variants

```typescript
export const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export const springTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};
```

---

### 3. Confirmation State Manager

```typescript
function useParameterConfirmation(totalParams: number) {
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  
  const confirmParam = (index: number) => {
    setConfirmed(prev => new Set(prev).add(index));
  };
  
  const unconfirmParam = (index: number) => {
    setConfirmed(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };
  
  const isConfirmed = (index: number) => confirmed.has(index);
  const completionRate = confirmed.size / totalParams;
  const allConfirmed = confirmed.size === totalParams;
  
  return { confirmParam, unconfirmParam, isConfirmed, completionRate, allConfirmed };
}
```

---

## 🚀 Ready to Implement

### What We Have:
✅ Framer Motion installed and widely used  
✅ Responsive breakpoints hook  
✅ Mobile UI patterns to reference  
✅ Design tokens established  
✅ Existing card components  
✅ Animation patterns proven

### What We Need from Agent 1:
1. **Swipe library choice** - Framer Motion drag or custom touch events?
2. **Parameter ordering** - By category or by importance?
3. **Confirmation requirements** - Which params need explicit confirmation?
4. **Navigation** - Swipe-only or also include arrow buttons?
5. **Card transition style** - Stack like Tinder or slide side-by-side?
6. **Review All behavior** - Switch to desktop view or show list?
7. **State persistence** - Remember progress when switching views?
8. **Animation timing** - Spring physics or easing functions?

### Estimated Build Time After Decisions:
- Day 1: Base components (4-6 hours)
- Day 2: Swipe gestures (4-6 hours)
- Day 3: Polish & animations (4-6 hours)
- Day 4: Testing & accessibility (4-6 hours)

**Total:** 16-24 hours (2-3 days)

---

## 📚 References Created

**Issue #7:** https://github.com/modryn-studio/PropTraderAI/issues/7  
**Spec Doc:** Full component architecture with 8 questions for Agent 1  
**This Research:** Preliminary findings while awaiting Agent 1 review

---

**Status:** Ready to implement once Agent 1 provides answers  
**Next:** Monitor Issue #7 for Agent 1's response
