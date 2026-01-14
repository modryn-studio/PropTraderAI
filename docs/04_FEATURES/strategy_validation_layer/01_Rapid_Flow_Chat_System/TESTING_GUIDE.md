# PropTraderAI Rapid Flow Testing Guide
**Comprehensive Test Scenarios for Strategy Builder Optimization**

**Last Updated:** January 14, 2026  
**Status:** Phase 1A Testing Protocol

---

## Overview

This guide provides test scenarios to validate that the rapid flow system achieves its core goal: **< 4 messages to strategy save for intermediate traders (60-70% of users)**.

### Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Message count** | ≤ 4 messages | Count user messages before save |
| **Time to save** | < 2 minutes | sessionStartRef to save timestamp |
| **Completion rate** | > 80% | Users who start vs. users who save |
| **Defaults accepted** | > 70% | Users who don't customize defaults |
| **Smart defaults used** | ≥ 1 per strategy | Check `defaultsUsed` array in save data |

---

## Test Scenario Categories

1. **Beginner Tests** (0-30% complete) - Should trigger 3-question flow
2. **Intermediate Tests** (30-70% complete) - Should complete in 2-3 messages
3. **Advanced Tests** (70%+ complete) - Should complete in 0-1 messages
4. **Edge Case Tests** - Contradiction detection, multi-instrument, etc.
5. **Data Verification Tests** - Confirm behavioral logging works

---

## Part 1: Beginner Tests (Vague Input)

### Test 1.1: Complete Beginner
**Goal:** Trigger BeginnerThreeQuestionFlow component

**Input:**
```
"I want to start day trading"
```

**Expected Behavior:**
1. System detects < 30% completeness
2. Returns metadata with `approach: 'structured_options'`
3. Frontend shows BeginnerThreeQuestionFlow UI
4. User answers 3 questions via button clicks
5. System builds strategy with answers + defaults

**Verification:**
- [ ] BeginnerThreeQuestionFlow component renders
- [ ] 3 questions presented: pattern, instrument, risk
- [ ] Auto-advance works after each selection
- [ ] Strategy saves after 3rd question
- [ ] `expertiseDetected: 'beginner'` in database
- [ ] `messageCount: 1` (only initial message)

**Data Check:**
```sql
SELECT 
  event_data->>'expertiseDetected',
  event_data->>'messageCount',
  event_data->>'wasRapidFlow'
FROM behavioral_data
WHERE event_type = 'strategy_created'
ORDER BY timestamp DESC LIMIT 1;
```

---

### Test 1.2: Vague Strategy Description
**Goal:** Detect low completeness, offer structured questions

**Input:**
```
"I want to trade futures"
```

**Expected Behavior:**
1. Completeness: ~10-20% (only "futures" detected)
2. System offers 3-question flow
3. Questions guide user to complete strategy

**Verification:**
- [ ] Expertise level: `beginner`
- [ ] Approach: `structured_options`
- [ ] Question count suggested: 3

---

## Part 2: Intermediate Tests (Partial Descriptions)

### Test 2.1: Classic Intermediate (The Target User)
**Goal:** Complete in 2-3 messages with smart defaults

**Conversation:**
```
User: "I trade NQ opening range breakout"

Claude: "NQ opening range breakout — solid choice. Quick confirmation:
         **Stop loss**: Ticks (like 10-20), structure (below swing low), or ATR-based?"

User: "20 ticks"

Claude: [Shows preview with defaults]
        ✓ Strategy Complete
        - Instrument: NQ
        - Entry: Break above 15-min opening range
        - Stop: 20 ticks ($100)
        - Target: 1:2 R:R (40 ticks) ⚙ default
        - Sizing: 1% risk per trade ⚙ default
        - Session: NY hours ⚙ default
```

**Expected Behavior:**
1. **Message 1:** Detects pattern (ORB) + instrument (NQ) = ~50% complete
2. **Expertise detected:** `intermediate`
3. **Question count:** 1 critical question (stop loss)
4. **Message 2:** User provides stop → 100% complete
5. **Defaults applied:** Target, sizing, session
6. **Preview card shows** with ⚙ indicators for defaults
7. **Total messages:** 2 (RAPID FLOW SUCCESS)

**Verification:**
- [ ] Completeness starts at ~50%
- [ ] Only 1 question asked (stop loss)
- [ ] Validation templates used: "NQ opening range breakout — solid choice"
- [ ] Smart defaults applied: 3 components
- [ ] `wasRapidFlow: true` (messageCount = 2)
- [ ] Preview card shows at 70%+ completeness
- [ ] Strategy saves successfully

**Data Check:**
```sql
SELECT 
  event_data->>'expertiseDetected' as expertise,
  event_data->>'initialCompleteness' as initial_complete,
  event_data->>'finalCompleteness' as final_complete,
  event_data->>'messageCount' as messages,
  event_data->>'defaultsUsed' as defaults,
  event_data->>'wasRapidFlow' as is_rapid
FROM behavioral_data
WHERE event_type = 'strategy_created'
ORDER BY timestamp DESC LIMIT 1;

-- Expected:
-- expertise: "intermediate"
-- initial_complete: 0.5
-- final_complete: 1.0
-- messages: 2
-- defaults: ["Target", "Position Size", "Session"]
-- is_rapid: true
```

---

### Test 2.2: Intermediate with Direction Ambiguity
**Goal:** Ask 2 questions (stop + direction)

**Conversation:**
```
User: "I trade pullbacks to the 20 EMA on ES"

Claude: "ES pullback strategy — reliable pattern. Two quick things:
         1. **Stop loss**: Ticks or structure-based?
         2. **Direction**: Long only, short only, or both?"

User: "Structure-based, both directions"

Claude: [Shows preview with defaults]
```

**Expected Behavior:**
1. Completeness: ~40% (pattern + instrument, missing stop + direction)
2. System asks 2 critical questions
3. Defaults applied for target, sizing, session
4. **Total messages:** 2 (RAPID FLOW SUCCESS)

**Verification:**
- [ ] Initial completeness: ~40%
- [ ] 2 questions asked (grouped in one message)
- [ ] Validation acknowledgment present
- [ ] `messageCount: 2`
- [ ] `wasRapidFlow: true`

---

### Test 2.3: Intermediate with Specificity
**Goal:** More details = fewer questions

**Conversation:**
```
User: "I trade NQ ORB with 20-tick stop during NY session"

Claude: "NQ opening range breakout — solid choice. 20-tick stop ($100).
         Got it, building now...
         
         [Shows preview]
         - Applied defaults: 1:2 R:R target, 1% position sizing"

User: [Saves immediately]
```

**Expected Behavior:**
1. Completeness: ~70% (pattern, instrument, stop, session detected)
2. **Zero questions asked** — just confirmation + preview
3. Only 2 defaults needed (target, sizing)
4. **Total messages:** 1 (BEST CASE RAPID FLOW)

**Verification:**
- [ ] Initial completeness: ~70%
- [ ] Question count: 0
- [ ] Preview shown immediately
- [ ] `messageCount: 1`
- [ ] `wasRapidFlow: true`
- [ ] `expertiseDetected: 'intermediate'` or `'advanced'`

---

## Part 3: Advanced Tests (Complete Descriptions)

### Test 3.1: Advanced Trader (Verbose Input)
**Goal:** Detect 90%+ completeness, minimal questions

**Input:**
```
"I trade NQ opening range breakout using the first 15 minutes after 9:30 AM ET. 
Enter on break above high with volume > 150% average. Stop at 20 ticks or 50% 
retracement, whichever is smaller. Target 1.5x initial range. Risk 1% per trade, 
max 3 contracts. Only trade 9:30-11:00 AM, avoid FOMC days."
```

**Expected Behavior:**
1. Completeness: 90-100% (nearly everything detected)
2. Expertise: `advanced`
3. Question count: 0 (confirmation only)
4. Preview shown immediately
5. **Total messages:** 1

**Verification:**
- [ ] Completeness: > 90%
- [ ] Expertise: `advanced`
- [ ] Zero questions asked
- [ ] Preview card shows all components
- [ ] Minimal or no defaults used
- [ ] `messageCount: 1`
- [ ] `wasRapidFlow: true`

---

### Test 3.2: Advanced with Conditional Logic
**Goal:** Handle complex stop logic without confusion

**Input:**
```
"NQ breakout with adaptive stop: 20 ticks OR structure (swing low), whichever hits first"
```

**Expected Behavior:**
1. System recognizes conditional logic (not a contradiction)
2. Extracts as `stop_loss_method: "adaptive"`
3. Shows understanding in response
4. No clarification questions needed

**Verification:**
- [ ] Parsed rules contain both stop values
- [ ] No contradiction warning shown
- [ ] Strategy saves successfully with complex stop
- [ ] User not asked to "choose one"

---

## Part 4: Edge Case Tests

### Test 4.1: Contradiction Detection
**Goal:** Catch conflicting values

**Conversation:**
```
User: "I use a 20-tick stop. Actually, 30 ticks is better."

Claude: "I see you mentioned both 20-tick and 30-tick stops. 
         Which should I use for this strategy?"

User: "30 ticks"

Claude: "Got it, 30-tick stop."
```

**Expected Behavior:**
1. System detects contradiction in single message
2. Asks for clarification (doesn't pick randomly)
3. Uses clarified value

**Verification:**
- [ ] Contradiction detected
- [ ] Clarification requested
- [ ] Correct value used in final strategy
- [ ] No error thrown

---

### Test 4.2: Multi-Instrument Mention
**Goal:** Handle "ES and NQ" gracefully

**Input:**
```
"I trade this setup on both ES and NQ"
```

**Expected Behavior:**
1. System detects multiple instruments
2. Sends `multi_instrument_detected` SSE event (backend)
3. **Phase 1:** Claude asks "Which instrument for this strategy?" in text
4. **Phase 2:** Modal offers to create multiple strategies

**Verification:**
- [ ] Backend logs multi-instrument detection
- [ ] SSE event sent (check server logs)
- [ ] Claude asks for clarification in text
- [ ] User picks one, strategy continues normally
- [ ] **Note:** Frontend modal not implemented (Phase 2)

---

### Test 4.3: Changed Mind (Indecision)
**Goal:** Track component value changes

**Conversation:**
```
Message 1: "I trade NQ ORB"
Message 2: "Actually, maybe ES is better"
Message 3: "Yeah, ES"
```

**Expected Behavior:**
1. Backend tracks component changes via `componentHistoryTracker`
2. Logs to behavioral_data
3. **Phase 1:** No UI indication (just logs data)
4. **Phase 2:** Shows "help decide" tooltip after 2+ changes

**Verification:**
- [ ] Component changes logged to database
- [ ] Final value is ES (last stated value)
- [ ] `indecision_detected` event logged (check behavioral_data)
- [ ] **Note:** Frontend banner not implemented (Phase 2)

---

### Test 4.4: Rapid Defaults Acceptance
**Goal:** User doesn't customize defaults

**Conversation:**
```
User: "Trade NQ ORB, 20-tick stop"

Claude: [Shows preview with 3 defaults]

User: [Clicks "Save Strategy"]
```

**Expected Behavior:**
1. Strategy saves with defaults intact
2. `defaultsUsed` array contains 3 items
3. No customization flow triggered

**Verification:**
- [ ] Strategy saved with defaults
- [ ] `defaultsUsed.length >= 1` in database
- [ ] User didn't click "Customize" button
- [ ] Behavioral event shows acceptance of defaults

---

## Part 5: Data Verification Tests

### Test 5.1: Behavioral Event Logging
**Goal:** Confirm all tracking data is captured

**After completing ANY test above, verify:**

```sql
-- 1. Check strategy_created event exists
SELECT 
  event_type,
  event_data,
  timestamp
FROM behavioral_data
WHERE user_id = '[TEST_USER_ID]'
  AND event_type = 'strategy_created'
ORDER BY timestamp DESC LIMIT 1;

-- 2. Verify required fields are present
SELECT 
  event_data ? 'expertiseDetected' as has_expertise,
  event_data ? 'initialCompleteness' as has_initial,
  event_data ? 'finalCompleteness' as has_final,
  event_data ? 'messageCount' as has_count,
  event_data ? 'wasRapidFlow' as has_rapid
FROM behavioral_data
WHERE event_type = 'strategy_created'
ORDER BY timestamp DESC LIMIT 1;

-- Expected: All should be TRUE

-- 3. Check conversation was updated
SELECT 
  status,
  expertise_detected,
  initial_completeness,
  final_completeness,
  message_count_to_save,
  defaults_used
FROM strategy_conversations
WHERE status = 'completed'
ORDER BY updated_at DESC LIMIT 1;

-- Expected:
-- status: "completed"
-- expertise_detected: "beginner" | "intermediate" | "advanced"
-- initial_completeness: 0.0 to 1.0
-- final_completeness: 0.8 to 1.0
-- message_count_to_save: 1 to 4
-- defaults_used: Array with ≥1 items
```

**Verification Checklist:**
- [ ] `strategy_created` event logged
- [ ] All tracking fields present in event_data
- [ ] `strategy_conversations` row updated with tracking
- [ ] `wasRapidFlow` calculated correctly (≤4 = true)
- [ ] `wasSlowFlow` calculated correctly (>8 = true)

---

### Test 5.2: Expertise Detection Metadata
**Goal:** Verify SSE metadata event sends expertise data

**Debug in ChatInterface.tsx:**
```typescript
// Add console.log in metadata handler (line ~330)
} else if (data.type === 'metadata') {
  console.log('[TEST] Expertise metadata received:', {
    level: data.expertiseLevel,
    questionCount: data.questionCount,
    completeness: data.completeness,
    approach: data.approach,
  });
  // ... rest of handler
```

**Expected Console Output:**
```
[TEST] Expertise metadata received: {
  level: "intermediate",
  questionCount: 1,
  completeness: 50,
  approach: "gap_filling"
}
```

**Verification:**
- [ ] Metadata SSE event received
- [ ] `expertiseLevel` is set
- [ ] `completeness` percentage is reasonable
- [ ] `questionCount` matches expected (0-3 range)
- [ ] `expertiseData` state is updated in React

---

### Test 5.3: Smart Defaults Application
**Goal:** Verify defaults are marked with `isDefaulted: true`

**Check in StrategySummaryPanel:**
```typescript
// Look at accumulatedRules state
console.log('[TEST] Accumulated rules:', accumulatedRules);

// Expected output includes:
[
  { category: 'entry', label: 'Entry', value: 'Break above range', isDefaulted: false },
  { category: 'exit', label: 'Stop Loss', value: '20 ticks', isDefaulted: false },
  { category: 'exit', label: 'Target', value: '1:2 R:R', isDefaulted: true }, // ← DEFAULT
  { category: 'risk', label: 'Position Size', value: '1%', isDefaulted: true }, // ← DEFAULT
  // ...
]
```

**Verification:**
- [ ] Rules with `isDefaulted: true` are present
- [ ] Summary panel shows ⚙ indicator for defaults
- [ ] `defaultsUsed` array in save request matches defaulted rules
- [ ] User didn't explicitly state these values

---

## Part 6: Manual Testing Checklist

Use this checklist for each test session:

### Pre-Test Setup
- [ ] Clear browser cache and localStorage
- [ ] Use incognito/private window for clean session
- [ ] Start fresh database conversation (new user or reset)
- [ ] Open browser DevTools console for debugging
- [ ] Open Network tab to monitor SSE events

### During Test
- [ ] Count user messages (goal: ≤ 4 for intermediate)
- [ ] Note time from first message to save (goal: < 2 min)
- [ ] Watch for validation acknowledgments ("NQ ORB — solid choice")
- [ ] Check if preview card appears at 70%+ completeness
- [ ] Note which defaults are applied (⚙ indicators)

### Post-Test Verification
- [ ] Strategy saved successfully to database
- [ ] All tracking data present in `strategy_conversations`
- [ ] `strategy_created` behavioral event logged
- [ ] `wasRapidFlow` correctly calculated
- [ ] Check console for any errors or warnings

---

## Part 7: Performance Benchmarks

### Target Metrics by User Type

| User Type | Initial Completeness | Messages | Time | Defaults Used |
|-----------|---------------------|----------|------|---------------|
| **Beginner** | 0-30% | 1 (+ 3 button clicks) | 90 sec | 4-5 |
| **Intermediate** | 30-70% | 2-3 | 45-90 sec | 2-3 |
| **Advanced** | 70%+ | 1 | 15-30 sec | 0-1 |

### Rapid Flow Success Rate

**Formula:**
```sql
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE (event_data->>'messageCount')::int <= 4) * 100.0 / COUNT(*),
    2
  ) as rapid_flow_success_rate
FROM behavioral_data
WHERE event_type = 'strategy_created';

-- Target: > 60% for intermediate users
```

### Average Metrics

```sql
-- Average message count by expertise level
SELECT 
  event_data->>'expertiseDetected' as expertise,
  ROUND(AVG((event_data->>'messageCount')::int), 2) as avg_messages,
  ROUND(AVG((event_data->>'completionTimeSeconds')::int), 2) as avg_seconds,
  COUNT(*) as sample_size
FROM behavioral_data
WHERE event_type = 'strategy_created'
GROUP BY event_data->>'expertiseDetected';

-- Expected averages:
-- beginner: 1-2 messages (3 button clicks)
-- intermediate: 2-3 messages
-- advanced: 1-2 messages
```

---

## Part 8: Integration Test (Full User Journey)

### End-to-End Rapid Flow Test

**Goal:** Test complete user journey from signup to saved strategy in < 2 minutes

**Steps:**
1. **Setup:**
   - Create new test user account
   - Skip onboarding (or complete quickly)
   - Navigate to strategy builder

2. **Strategy Building:**
   ```
   User: "I trade NQ opening range breakout with 20-tick stop"
   
   [System processes, shows preview with defaults]
   
   User: [Names strategy "NQ ORB Morning"]
   
   User: [Clicks "Save Strategy"]
   ```

3. **Post-Save:**
   - Check if PostSaveEducation component appears
   - Verify "Learn Why This Works" is optional
   - Confirm strategy appears in dashboard

**Timing Checkpoints:**
- [ ] First message to preview: < 15 seconds
- [ ] Preview to save: < 30 seconds
- [ ] Total time: < 2 minutes
- [ ] Zero errors or loading states stuck

**Data Verification:**
```sql
-- Verify complete journey tracking
SELECT 
  sc.id as conversation_id,
  sc.status,
  sc.message_count_to_save,
  s.name as strategy_name,
  bd.event_data->>'wasRapidFlow' as is_rapid
FROM strategy_conversations sc
JOIN strategies s ON sc.strategy_id = s.id
JOIN behavioral_data bd ON bd.event_data->>'conversationId' = sc.id::text
WHERE bd.event_type = 'strategy_created'
  AND sc.user_id = '[TEST_USER_ID]'
ORDER BY sc.created_at DESC LIMIT 1;

-- Expected:
-- status: "completed"
-- message_count_to_save: 1-3
-- strategy_name: "NQ ORB Morning"
-- is_rapid: true
```

---

## Part 9: Regression Testing (After Changes)

### Critical Paths to Re-Test

After any code changes to the strategy builder, re-run these tests:

1. **Test 2.1** (Classic Intermediate) - Most common user path
2. **Test 3.1** (Advanced Verbose) - Ensure completeness detection still works
3. **Test 1.1** (Complete Beginner) - Verify 3-question flow still triggers
4. **Test 5.1** (Data Verification) - Confirm behavioral logging intact

### Quick Smoke Test

**5-minute validation:**
```
1. Input: "I trade NQ ORB with 20-tick stop"
2. Verify: Preview shows in < 15 seconds
3. Verify: 3 defaults applied (target, sizing, session)
4. Save strategy
5. Check database: wasRapidFlow = true
```

If all 5 steps pass, core rapid flow is working.

---

## Part 10: Mobile Testing

### Mobile-Specific Test Scenarios

These tests validate the mobile-first design implementation of the rapid flow system.

#### Test 10.1: Fixed Input Position (Critical)
**Goal:** Verify textarea stays fixed at bottom during scroll

**Steps:**
1. Open `/chat` on mobile device (or Chrome DevTools mobile emulation)
2. Start conversation: "I trade NQ ORB"
3. Scroll up through conversation history
4. Observe textarea position while scrolling

**Expected Behavior:**
- [ ] Textarea remains fixed at bottom of viewport
- [ ] Does NOT scroll up with page content
- [ ] z-index keeps it above scrolling content
- [ ] Border visible at top of input area

**Common Issues:**
- Textarea scrolls with page (FAIL - missing `position: fixed`)
- Content scrolls over textarea (FAIL - missing `z-index`)
- Input disappears when keyboard opens (FAIL - iOS viewport issue)

---

#### Test 10.2: iOS Keyboard Behavior
**Goal:** Verify keyboard doesn't cover input on iOS

**Steps:**
1. Open `/chat` on iPhone (Safari or Chrome)
2. Tap textarea to open keyboard
3. Observe layout adjustment

**Expected Behavior:**
- [ ] Keyboard pushes textarea up (not covering it)
- [ ] `visualViewport` handler adjusts position
- [ ] Can see full textarea while typing
- [ ] Safe area insets respected (home indicator visible)

**Debug:**
```typescript
// Add to ChatInput.tsx for testing
useEffect(() => {
  const handleResize = () => {
    console.log('[MOBILE TEST] Viewport:', {
      visualHeight: window.visualViewport?.height,
      innerHeight: window.innerHeight,
      keyboardHeight: window.innerHeight - (window.visualViewport?.height || 0)
    });
  };
  // ... rest of handler
```

---

#### Test 10.3: BeginnerThreeQuestionFlow on Mobile
**Goal:** Verify structured flow UI works on small screens

**Steps:**
1. Open `/chat` on mobile (< 375px width)
2. Send vague prompt: "I want to start trading"
3. BeginnerThreeQuestionFlow should appear

**Expected Behavior:**
- [ ] Modal centers on screen (not off-viewport)
- [ ] Touch-friendly button sizes (p-3 = 48px minimum)
- [ ] `max-w-md` container prevents overflow
- [ ] Progress indicator visible
- [ ] Can scroll if content exceeds viewport
- [ ] Close button reachable with thumb

**Measurements:**
- Container width: 448px max (`max-w-md`)
- Button height: 48px minimum (`p-3`)
- Header padding: 16px (`px-4 py-3`)

---

#### Test 10.4: PostSaveEducation Expansion on Mobile
**Goal:** Verify education cards expand smoothly on touch

**Steps:**
1. Complete strategy on mobile
2. PostSaveEducation component appears
3. Tap to expand education card

**Expected Behavior:**
- [ ] Tap target size: 48px minimum (`px-4 py-3`)
- [ ] Smooth Framer Motion animation
- [ ] Content doesn't overflow horizontally
- [ ] Can scroll if expanded content is tall
- [ ] `max-w-xl` prevents wide overflow
- [ ] Dismiss button easy to tap

**Performance Check:**
- Animation should run at 60fps
- No jank or stuttering on mid-range devices
- If animation lags, consider `will-change: transform`

---

#### Test 10.5: Touch Feedback (Framer Motion)
**Goal:** Verify `whileTap` provides tactile feedback

**Steps:**
1. On mobile, tap any button in rapid flow system
2. Observe visual feedback

**Expected Behavior:**
- [ ] Buttons scale down slightly on tap (`whileTap={{ scale: 0.98 }}`)
- [ ] Feedback is instant (< 50ms)
- [ ] No delay that feels laggy
- [ ] Works on both iOS and Android

**Components to Test:**
- BeginnerThreeQuestionFlow option buttons
- PostSaveEducation expand/collapse
- Quick prompt chips (ChatInput)
- Save strategy button (StrategyPreviewCard)

---

#### Test 10.6: Responsive Breakpoints
**Goal:** Verify `useResponsiveBreakpoints` hook works correctly

**Steps:**
1. Open `/chat` in Chrome DevTools
2. Use responsive mode, test these widths:
   - 320px (iPhone SE)
   - 375px (iPhone 13)
   - 768px (tablet - should show sidebar)
   - 1024px (desktop)

**Expected Behavior:**
| Width | isMobile | Sidebar Visible | Padding |
|-------|----------|----------------|---------|
| < 768px | true | ❌ No | px-4 |
| ≥ 768px | false | ✅ Yes | max-w-3xl px-6 |

**Verification:**
```typescript
// Add to ChatInterface for debugging
useEffect(() => {
  console.log('[BREAKPOINT TEST]', {
    isMobile,
    width: window.innerWidth,
    showSidebars,
  });
}, [isMobile, showSidebars]);
```

---

#### Test 10.7: Horizontal Scroll Prevention
**Goal:** Ensure no elements cause horizontal scroll on mobile

**Steps:**
1. Open `/chat` on 320px width (smallest common screen)
2. Interact with all rapid flow components
3. Scroll vertically through conversation

**Expected Behavior:**
- [ ] No horizontal scrollbar appears
- [ ] All containers use `max-w-` constraints
- [ ] Long text wraps (no `whitespace-nowrap` on critical text)
- [ ] Quick prompt chips scroll horizontally only (`overflow-x-auto`)

**Common Culprits:**
- `min-w-` values too large
- Fixed pixel widths (use max-width instead)
- Long unbreakable text (ticker symbols usually OK, sentences should wrap)

---

#### Test 10.8: Font Scaling (iOS Accessibility)
**Goal:** Verify layout doesn't break with large font sizes

**Steps:**
1. iOS Settings → Display & Brightness → Text Size
2. Set to largest size
3. Open PropTraderAI `/chat`

**Expected Behavior:**
- [ ] Text scales up correctly
- [ ] Buttons remain tap-friendly (don't shrink)
- [ ] Layout doesn't overflow horizontally
- [ ] Critical info still readable

**Note:** This is a nice-to-have for Phase 1. Document issues, fix in Phase 2.

---

#### Test 10.9: Network Throttling on Mobile
**Goal:** Verify rapid flow works on slow mobile connections

**Steps:**
1. Chrome DevTools → Network tab → Throttle to "Slow 3G"
2. Start strategy conversation
3. Monitor SSE events and response times

**Expected Behavior:**
- [ ] Streaming still works (SSE may be slower)
- [ ] Loading states show while waiting
- [ ] No timeout errors before response arrives
- [ ] User can still interact (not completely blocked)

**Performance Targets:**
- First byte: < 3 seconds on 3G
- Streaming starts: < 5 seconds
- Full response: < 15 seconds (long strategies)

---

#### Test 10.10: Battery Saver Mode
**Goal:** Verify animations degrade gracefully

**Steps:**
1. Enable battery saver on device
2. Open `/chat` and complete strategy
3. Observe animations

**Expected Behavior:**
- [ ] Framer Motion may disable animations (OS setting)
- [ ] Layout still works without animations
- [ ] No broken states from missing transitions
- [ ] Core functionality unaffected

**Note:** Framer Motion respects `prefers-reduced-motion` automatically.

---

### Mobile Testing Checklist Summary

**Before each mobile test session:**
- [ ] Clear browser cache
- [ ] Test on real device (not just emulator)
- [ ] Test on both iOS Safari and Android Chrome
- [ ] Use multiple screen sizes (small, medium, large)

**Critical mobile paths to test:**
1. ✅ **Fixed input position** (Test 10.1) - Must pass
2. ✅ **iOS keyboard** (Test 10.2) - Must pass
3. ✅ **Touch targets** (Test 10.3, 10.4) - Must pass
4. 🟡 **Font scaling** (Test 10.8) - Phase 2 OK
5. 🟡 **Battery saver** (Test 10.10) - Phase 2 OK

**Mobile test result template:**
```markdown
### Mobile Test Session: [Date]
**Device:** iPhone 14 Pro, iOS 17.2, Safari
**Screen:** 390x844px

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| 10.1 Fixed Input | ✅ PASS | Stays at bottom during scroll |
| 10.2 iOS Keyboard | ✅ PASS | Adjusted correctly, no overlap |
| 10.3 Beginner Flow | ✅ PASS | All buttons reachable |
| 10.4 Education Expand | ⚠️ PARTIAL | Minor lag on animation |
| 10.5 Touch Feedback | ✅ PASS | Instant tactile response |

**Overall:** ✅ PASSING (4.5/5 tests)
**Issues:** Animation slightly laggy on older devices (iPhone 11)
**Action:** Monitor performance, may optimize in Phase 2
```

---

## Part 11: Test Result Template

Use this template to document test results:

```markdown
## Test Session: [Date]
**Tester:** [Name]
**Build:** [Commit SHA or version]

### Test Results

| Test ID | Scenario | Messages | Time | Defaults | Rapid Flow? | Pass/Fail |
|---------|----------|----------|------|----------|-------------|-----------|
| 2.1 | Intermediate (NQ ORB) | 2 | 35s | 3 | ✅ Yes | ✅ PASS |
| 2.2 | Intermediate (ES Pullback) | 2 | 48s | 3 | ✅ Yes | ✅ PASS |
| 3.1 | Advanced (Verbose) | 1 | 12s | 0 | ✅ Yes | ✅ PASS |
| 4.1 | Contradiction | 3 | 68s | 2 | ✅ Yes | ⚠️ PARTIAL |

### Issues Found

**Issue #1:** Contradiction detection missed "maybe" keyword
- Severity: Low
- Expected: Ask for clarification
- Actual: Used first value mentioned
- Action: Add "maybe" to uncertainty patterns

### Data Verification

- [x] All tests logged to behavioral_data
- [x] wasRapidFlow calculated correctly (80% success rate)
- [ ] One test missing expertise detection (investigate)

### Summary

- **Rapid flow success rate:** 80% (4/5 tests ≤ 4 messages)
- **Average message count:** 2.2 messages
- **Average time to save:** 41 seconds
- **Overall:** ✅ PASSING with minor issues
```

---

## Part 12: Troubleshooting Guide

### Common Issues

| Problem | Check | Solution |
|---------|-------|----------|
| Preview card not showing | Current completeness state | Verify `setCurrentCompleteness()` called in metadata handler |
| Expertise data missing | SSE metadata event | Check backend sends `type: 'metadata'` |
| Defaults not applied | `applySmartDefaults()` call | Verify called in chat API route |
| wasRapidFlow always false | Message count calculation | Check filter for user messages only |
| BeginnerThreeQuestionFlow not appearing | `approach` value | Verify backend returns `approach: 'structured_options'` |

### Debug Commands

```typescript
// 1. Check expertise data state (in browser console)
window.__expertiseData = expertiseData; // Add to ChatInterface
console.log(window.__expertiseData);

// 2. Check accumulated rules
console.log('[DEBUG] Rules:', accumulatedRules);

// 3. Check SSE events
// Open Network tab → Filter by "chat" → Check SSE stream

// 4. Check behavioral data
// Open Supabase dashboard → behavioral_data table → Filter by user_id
```

---

## Part 13: Success Criteria Summary

### Phase 1A Goals (Current)

- [ ] **60%+ of intermediate users complete in ≤ 4 messages**
- [ ] **Average time to save: < 2 minutes**
- [ ] **80%+ completion rate** (users who start a strategy save it)
- [ ] **70%+ accept defaults without customization**
- [ ] **All tracking data captured** (behavioral_data + strategy_conversations)

### When to Ship

✅ **Ship when:**
- 3/5 intermediate tests complete in ≤ 4 messages
- No critical bugs (strategy save fails, data loss)
- Behavioral logging working 100%

⚠️ **Hold if:**
- < 50% rapid flow success rate
- Critical edge cases cause errors (multi-instrument crashes)
- Data not being logged to database

---

## Part 14: Next Steps After Testing

1. **Collect Results:** Run all Part 2 tests (intermediate scenarios)
2. **Measure Success Rate:** Calculate rapid flow percentage
3. **Review Logs:** Check behavioral_data for patterns
4. **Iterate:** If < 60% rapid flow, identify bottlenecks
5. **User Testing:** Get 5-10 real traders through the flow
6. **Phase 2 Planning:** Use data to prioritize edge case work

---

**Last Updated:** January 14, 2026  
**Next Review:** After 50+ strategies created in production
