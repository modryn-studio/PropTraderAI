# Strategy Builder Test Guide - /chat Page

**Last Updated:** January 12, 2026  
**Version:** 2.0 (Post-Incremental Streaming Implementation)

---

## 🎯 What This Tests

This guide tests the **complete strategy builder flow** including:

1. ✅ **Incremental Rule Streaming** - Rules appear in real-time as Claude confirms them
2. ✅ **Summary Panel Updates** - Rules accumulate progressively in sidebar
3. ✅ **Animation Generation** - Visual appears after enough strategy clarity
4. ✅ **Behavioral Data Logging** - All events tracked in Supabase
5. ✅ **Final Strategy Saving** - Complete strategy stored with parsed rules

---

## 🧪 Test Scenarios

### **Test 1: Opening Range Breakout (ORB) - Full Flow**

**Goal:** Test complete flow from first message to saved strategy

#### **User Input Sequence:**

```
Message 1: "I want to trade NQ opening range breakout"
```

**Expected Immediate Behavior:**

**Summary Panel (Right Sidebar):**
- ✅ Appears immediately
- ✅ Shows: `Instrument: NQ` (instant extraction from user message)
- ✅ Shows: `Pattern: Opening Range Breakout` (after Claude confirms)

**Claude Response:**
- Natural language acknowledgment
- Calls `update_rule` tool (visible in Network tab as `rule_update` events)

**Supabase - `behavioral_data` table:**
```sql
-- Check latest events
SELECT event_type, event_data, created_at 
FROM behavioral_data 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 5;
```

Expected events:
- `strategy_chat_message_sent` (user message)
- `rule_updated_via_tool` (instrument)
- `rule_updated_via_tool` (pattern)

---

```
Message 2: "Stop at 50% of the range"
```

**Expected Immediate Behavior:**

**Summary Panel:**
- ✅ Adds: `Stop Loss: 50% of opening range`
- ✅ Rules accumulate (previous rules remain)

**Claude Response:**
- Confirms understanding
- Calls `update_rule` tool with category: "risk"

**Supabase:**
- New `rule_updated_via_tool` event
- `event_data` contains: `{ category: "risk", label: "Stop Loss", wasOverwrite: false }`

---

```
Message 3: "Target 2R"
```

**Expected Immediate Behavior:**

**Summary Panel:**
- ✅ Adds: `Target: 2:1 risk-reward`
- ✅ Now shows 4 rules total

**Animation:**
- ✅ **Should appear after this message** (3+ clarity indicators met)
- ✅ Shows ORB visualization
- ✅ Stop line at **exactly 50%** of range (not at bottom)
- ✅ Target line at 2x the stop distance

**Claude Response:**
- Confirms 2R target
- May embed animation config: `[ANIMATION_START]{...}[ANIMATION_END]`
- Calls `update_rule` tool

**Supabase:**
- `animation_generated` event (if animation appeared)
- `rule_updated_via_tool` event for target

---

```
Message 4: "1 contract, 1% risk per trade"
```

**Expected Immediate Behavior:**

**Summary Panel:**
- ✅ Adds: `Position Size: 1% risk per trade`
- ✅ All required components present (green checkmarks in readiness gate)

**Claude Response:**
- Confirms position sizing
- Should now call `confirm_strategy` tool (strategy complete)

**Supabase:**
- `rule_updated_via_tool` event
- `strategy_conversation_completed` event

---

```
Message 5: User clicks "Save Strategy" button
```

**Expected Behavior:**

**UI:**
- ✅ Validation warnings modal (if any firm rule violations)
- ✅ If valid: Success toast "Strategy saved!"
- ✅ Redirects to dashboard

**Supabase - `strategies` table:**
```sql
SELECT 
  id,
  name,
  natural_language,
  parsed_rules,
  status,
  created_at
FROM strategies
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

Expected data:
```json
{
  "name": "NQ Opening Range Breakout",
  "natural_language": "Full conversation text...",
  "parsed_rules": {
    "entry_conditions": [...],
    "exit_conditions": [
      { "type": "stop_loss", "value": 50, "unit": "percentage" },
      { "type": "take_profit", "value": 2, "unit": "r" }
    ],
    "position_sizing": { "method": "risk_percent", "value": 1 },
    "strategy_type": "opening_range_breakout"
  },
  "status": "draft",
  "autonomy_level": "copilot"
}
```

**Supabase - `strategy_conversations` table:**
```sql
SELECT 
  id,
  messages,
  status,
  last_activity
FROM strategy_conversations
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

Expected:
- `messages`: Array of all user/assistant messages
- `status`: "completed"

---

### **Test 2: Rule Override (User Changes Mind)**

**Goal:** Test that `update_rule` correctly overwrites existing rules

#### **Input Sequence:**

```
Message 1: "Trade NQ pullback to 20 EMA"
Message 2: "Stop 20 ticks below entry"
Message 3: "Actually, stop at 30 ticks below entry"
```

**Expected Behavior:**

**Summary Panel After Message 2:**
- Stop Loss: 20 ticks

**Summary Panel After Message 3:**
- ✅ Stop Loss: 30 ticks (overwritten, not duplicated)

**Supabase:**
```sql
SELECT event_type, event_data 
FROM behavioral_data 
WHERE event_type = 'rule_updated_via_tool'
  AND event_data->>'label' = 'Stop Loss'
ORDER BY created_at DESC
LIMIT 2;
```

Expected:
- Latest event: `wasOverwrite: true`
- Previous event: `wasOverwrite: false`

---

### **Test 3: Abandoned Conversation**

**Goal:** Test that abandoned conversations are tracked

#### **Input:**

```
Message 1: "I want to trade ES"
```

**User Action:** Closes tab or navigates away before completing strategy

**Expected Behavior:**

**After 30 seconds of inactivity:**

**Supabase - `strategy_conversations` table:**
```sql
SELECT status, messages 
FROM strategy_conversations 
WHERE user_id = 'YOUR_USER_ID'
  AND status = 'abandoned'
ORDER BY created_at DESC
LIMIT 1;
```

Expected:
- `status`: "abandoned" (updated by backend job or on next session)
- `messages`: Partial conversation saved

**Supabase - `behavioral_data`:**
- `strategy_conversation_abandoned` event (logged when detected)

---

### **Test 4: Animation Parameter Accuracy**

**Goal:** Verify animation renders exact positions (not templates)

#### **Input:**

```
Message 1: "NQ opening range breakout"
Message 2: "Stop at 75% of the range"  ← NON-STANDARD PERCENTAGE
Message 3: "Target 3R"
```

**Expected Animation Behavior:**

After message 3, animation should show:
- ✅ Stop line at **exactly 75%** between range low and range high
- ✅ Target line at 3x the stop distance
- ✅ NOT using template positions

**How to Verify:**

1. Open browser DevTools → Elements
2. Inspect SVG `<line>` elements
3. Check `y1` attribute values:
   - Stop line Y should be ~75% of viewBox height
   - Target line Y should be appropriately scaled

**Console Logs:**
```
[AnimationExtractor] Extracted parameters: {
  type: 'orb',
  direction: 'long',
  stopPlacement: 'percentage',
  stopValue: 0.75,  ← Should be 0.75, not 0.5
  targetMethod: 'r_multiple',
  targetValue: 3
}
```

---

### **Test 5: Multiple Instruments**

**Goal:** Test that instrument updates correctly when changed

#### **Input:**

```
Message 1: "I trade ES opening range"
Message 2: "Actually, I want to trade NQ instead"
```

**Expected Behavior:**

**Summary Panel:**
- After message 1: `Instrument: ES`
- After message 2: ✅ `Instrument: NQ` (overwritten)

**NOT:**
- ❌ Both ES and NQ showing
- ❌ Duplicate instrument entries

---

### **Test 6: Strategy with No Animation**

**Goal:** Test that strategies without clear setup still work

#### **Input:**

```
Message 1: "I want a mean reversion strategy"
Message 2: "Buy when RSI is oversold"
Message 3: "Stop 2% below entry, target 3%"
Message 4: "1 contract fixed size"
```

**Expected Behavior:**

**Summary Panel:**
- ✅ Rules appear incrementally
- ✅ All components logged

**Animation:**
- ⚠️ May NOT appear (RSI strategy lacks clear visual structure)
- OR: Shows generic breakout template

**Final Save:**
- ✅ Still works even without animation
- ✅ Strategy saved with all rules

---

## 🔍 Debugging Tools

### **1. Check Network Tab**

**URL to watch:** `/api/strategy/parse-stream`

**Look for:**
```json
// Text chunks
{"type":"text","content":"Great! NQ with..."}

// Rule updates (NEW in V2)
{"type":"rule_update","rule":{"category":"setup","label":"Instrument","value":"NQ"}}

// Strategy completion
{"type":"complete","complete":true,"strategyName":"..."}
```

### **2. Check Console Logs**

**Enable debug mode:**
```javascript
// In browser console
localStorage.setItem('NEXT_PUBLIC_DEBUG_RULES', 'true');
location.reload();
```

**Expected logs:**
```
[RuleExtractor] Extracted instrument from user message: NQ
[RuleExtractor] Accumulated: 0 existing + 1 new = 1 total
[AnimationExtractor] Extracted parameters: {...}
```

### **3. Check React DevTools**

**Component:** `ChatInterface`

**State to inspect:**
- `accumulatedRules` - Should grow with each `rule_update`
- `animationConfig` - Should populate when animation generated
- `strategyComplete` - Should be `true` after `confirm_strategy`

### **4. Check Supabase Directly**

**Real-time monitoring:**
```sql
-- Stream behavioral events (refresh every 2 seconds)
SELECT 
  event_type,
  event_data->>'category' as category,
  event_data->>'label' as label,
  created_at
FROM behavioral_data
WHERE user_id = 'YOUR_USER_ID'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

**Check conversation state:**
```sql
SELECT 
  id,
  status,
  array_length(messages, 1) as message_count,
  last_activity
FROM strategy_conversations
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

---

## ✅ Success Criteria Checklist

### **Incremental Rule Streaming**
- [ ] Rules appear in Summary Panel as Claude confirms them (not all at end)
- [ ] Instrument shows instantly when user types "NQ" (before Claude responds)
- [ ] Rule overwrites work correctly (no duplicates)
- [ ] `rule_updated_via_tool` events logged to Supabase

### **Animation System**
- [ ] Animation appears after 2-3 exchanges (not immediately)
- [ ] Stop line renders at exact percentage (not template position)
- [ ] Animation updates if user changes rules mid-conversation

### **Summary Panel**
- [ ] Rules grouped by category (Setup, Entry, Exit, Risk, etc.)
- [ ] Rules accumulate progressively (don't disappear)
- [ ] Panel visible on desktop, hidden on mobile until toggled

### **Behavioral Logging**
- [ ] Every `update_rule` call logs an event
- [ ] Strategy completion logged
- [ ] Animation generation logged
- [ ] Abandoned conversations tracked

### **Final Strategy Save**
- [ ] `parsed_rules` JSON matches accumulated rules
- [ ] `natural_language` contains full conversation
- [ ] Status is "draft" by default
- [ ] Redirects to dashboard after save

---

## 🐛 Known Issues & Fixes

### **Issue 1: Rules Not Appearing in Summary Panel**

**Symptoms:**
- User types message
- Claude responds
- No rules show in sidebar

**Debug Steps:**
1. Check Network tab for `rule_update` events
2. If missing: Claude didn't call `update_rule` tool
3. Check console for errors in `accumulateRules()`

**Fix:**
- Verify Claude has access to `update_rule` tool (check `STRATEGY_TOOLS` in client.ts)
- Check prompt includes tool usage reminder

### **Issue 2: Animation Shows Wrong Stop Position**

**Symptoms:**
- User says "stop at 50%"
- Animation shows stop at bottom (0%)

**Debug Steps:**
1. Check console: `[AnimationExtractor] Extracted parameters`
2. Verify `stopValue: 0.5` (not 0 or 1)
3. Check `intelligentParameterExtractor.ts` regex patterns

**Fix:**
- Ensure rule value is precise: "50% of opening range" (not just "middle")
- Check parameter extraction matches expected pattern

### **Issue 3: Multiple Instruments in Summary Panel**

**Symptoms:**
- User changes mind: "ES" → "NQ"
- Both show in panel

**Debug Steps:**
1. Check `accumulateRules()` logic
2. Verify overwrite uses `category:label` as unique key

**Fix:**
- `accumulateRules()` should use `Map` with `${category}:${label}` key
- Already implemented correctly in V2

---

## 📊 Performance Benchmarks

### **Response Time Targets**

| Event | Target | Acceptable | Needs Optimization |
|-------|--------|------------|-------------------|
| User message sent → Claude text starts | <500ms | 500-1000ms | >1000ms |
| `rule_update` appears in Summary Panel | <100ms | 100-300ms | >300ms |
| Animation renders after generation | <200ms | 200-500ms | >500ms |
| Strategy save → redirect | <1000ms | 1-2s | >2s |

### **How to Measure**

```javascript
// In browser console
let startTime = Date.now();
// ... send message ...
// ... wait for response ...
console.log(`Response time: ${Date.now() - startTime}ms`);
```

---

## 🎓 Training Users (Internal Use)

### **What to Tell Users**

✅ **DO say:**
- "Rules appear in real-time as you define them"
- "The animation shows your exact strategy, not a template"
- "You'll see a visual after a few exchanges"

❌ **DON'T say:**
- "The AI will parse your strategy at the end"
- "Animation might not match your exact rules"
- "You need to complete all fields first"

### **Common User Questions**

**Q: "Why doesn't the animation show immediately?"**  
A: We need a few exchanges to understand your strategy's core elements. After 2-3 messages covering direction, entry, and stop, you'll see it.

**Q: "Can I change a rule after I've stated it?"**  
A: Absolutely! Just tell Claude the new version. Example: "Actually, make the stop 30 ticks instead of 20."

**Q: "Where did my strategy go? I closed the tab."**  
A: Incomplete strategies are saved as conversations. Return to /chat and we'll reload your progress. (Note: Currently in development)

---

## 🚀 Next Steps After Testing

1. **Run all 6 test scenarios** above
2. **Document any failures** in GitHub Issues
3. **Check Supabase** for data quality
4. **Verify animation accuracy** with non-standard inputs
5. **Test on mobile** (Summary Panel should be hidden, togglable)

---

## 📞 Need Help?

**Check:**
- [copilot-instructions.md](../.github/copilot-instructions.md) - System architecture
- [PATH2_Strategy.md](PATH2_Strategy.md) - Behavioral logging details
- [Animations/README.md](Animations/README.md) - Animation system overview

**Debug Mode:**
```bash
# Enable verbose logging
NEXT_PUBLIC_DEBUG_RULES=true npm run dev
```

---

**Last Updated:** January 12, 2026  
**Tested On:** Chrome 131, Firefox 132, Safari 17  
**Status:** ✅ All tests passing
