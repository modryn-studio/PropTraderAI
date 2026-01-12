# Strategy Builder Test Guide - Complete Database Tracking

**Date:** January 12, 2026  
**Purpose:** Test new user creation and Strategy Builder (/chat) flow with full database visibility

---

## 🎯 What You Should See in Supabase

### Phase 1: New User Signup

When you sign up at `/auth/login` with a new email, here's what happens:

#### **Table: `auth.users`**
```sql
SELECT * FROM auth.users WHERE email = 'hannerluke@gmail.com';
```
**Expected Result:**
- ✅ New user record created
- ✅ `id` (UUID) generated
- ✅ `email` populated
- ✅ `created_at` timestamp
- ✅ `confirmed_at` set after clicking magic link

#### **Table: `auth.identities`**
```sql
SELECT * FROM auth.identities WHERE email = 'hannerluke@gmail.com';
```
**Expected Result:**
- ✅ One identity record with `provider = 'email'`
- ✅ `user_id` matches `auth.users.id`
- ✅ `identity_data` contains email

#### **Table: `public.profiles`** (auto-created via trigger)
```sql
SELECT * FROM public.profiles WHERE email = 'hannerluke@gmail.com';
```
**Expected Result:**
- ✅ Profile auto-created by `handle_new_user()` trigger
- ✅ `id` matches `auth.users.id`
- ✅ `email` populated
- ✅ `preferences` = `{}`
- ✅ `created_at` timestamp

**🔴 Common Issue:** If profile doesn't auto-create, the `handle_new_user()` trigger might be missing. Run:
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

---

### Phase 2: First Chat Message

When you navigate to `/chat` and send your first message:

#### **Table: `strategy_conversations`**
```sql
SELECT * FROM strategy_conversations 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY last_activity DESC;
```
**Expected Result:**
- ✅ New conversation created with unique `id`
- ✅ `status = 'in_progress'`
- ✅ `messages` JSONB array with first user message:
  ```json
  [{
    "role": "user",
    "content": "I want to trade NQ breakouts",
    "timestamp": "2026-01-12T..."
  }]
  ```
- ✅ `last_activity` updated to current time

#### **How ChatInterface Creates This:**
```typescript
// In ChatInterface.tsx → sendMessage()
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: "I want to trade NQ breakouts",
    conversationId: null, // First message, no ID yet
  })
});
```

---

### Phase 3: AI Response Streaming

When Claude responds:

#### **Table: `strategy_conversations`** (updated)
```sql
SELECT messages FROM strategy_conversations WHERE id = 'YOUR_CONVERSATION_ID';
```
**Expected Result:**
- ✅ `messages` array now has 2 items (user + assistant):
  ```json
  [
    {
      "role": "user",
      "content": "I want to trade NQ breakouts",
      "timestamp": "2026-01-12T12:00:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Great! What's your entry trigger? Do you enter immediately on the break of the 15-minute high?",
      "timestamp": "2026-01-12T12:00:05.000Z"
    }
  ]
  ```
- ✅ `last_activity` updated

#### **How This Works:**
1. `/api/chat` calls Claude API
2. Streams response token-by-token
3. On stream complete, saves full message to conversation
4. Returns `conversationId` to frontend

---

### Phase 4: Summary Panel Extraction

As you chat, the Summary Panel extracts strategy rules:

#### **Frontend State (not in DB yet)**
```typescript
// In ChatInterface.tsx
const [accumulatedRules, setAccumulatedRules] = useState<StrategyRule[]>([]);

// After Claude confirms: "So you enter on break above 15-min high?"
// Rules extracted:
[
  {
    category: 'ENTRY',
    label: 'Entry Trigger',
    value: 'Break above 15-minute high',
    emoji: '🎯'
  }
]
```

**NOT YET IN DATABASE** - Rules only live in React state until strategy is saved.

---

### Phase 5: Animation Generation (Optional)

If Claude generates an animation config:

#### **Table: `behavioral_data`**
```sql
SELECT * FROM behavioral_data 
WHERE user_id = 'YOUR_USER_ID' 
AND event_type = 'animation_generated'
ORDER BY timestamp DESC;
```
**Expected Result:**
- ✅ Event logged when animation appears
- ✅ `event_data` contains:
  ```json
  {
    "type": "orb",
    "direction": "long",
    "trigger": "opening_range_breakout",
    "conversation_turn": 5,
    "time_to_generate_ms": 2300
  }
  ```

#### **How This Happens:**
```typescript
// In ChatInterface.tsx
if (tryExtractFromStream(chunk)) {
  const config = extractAnimationConfig(chunk);
  setAnimationConfig(config);
  
  // Log the event
  logAnimationGenerated(userId, config, sessionStartRef.current);
}
```

---

### Phase 6: Validation Status

As conversation progresses, validation checks what's missing:

#### **Frontend Validation (not in DB)**
```typescript
// In StrategySummaryPanel.tsx
const validation = validateStrategy(rules, userProfile);

// Example result:
{
  isComplete: false,
  completionPercentage: 60,
  missingRequired: ['stop_loss', 'position_sizing'],
  missingRecommended: ['session_hours'],
  validationsByCategory: {
    SETUP: { isComplete: true, missing: [] },
    ENTRY: { isComplete: true, missing: [] },
    EXIT: { isComplete: false, missing: ['stop_loss'] }
  }
}
```

**NOT IN DATABASE** - Validation runs client-side for instant feedback.

---

### Phase 7: Strategy Completion & Save

When validation reaches 100% and you click "Save Strategy":

#### **Table: `strategies`**
```sql
SELECT * FROM strategies WHERE user_id = 'YOUR_USER_ID' ORDER BY created_at DESC;
```
**Expected Result:**
- ✅ New strategy record created
- ✅ `name` = "NQ Opening Range Breakout"
- ✅ `natural_language` = full summary text
- ✅ `parsed_rules` = complete structured rules:
  ```json
  {
    "instrument": "NQ",
    "timeframe": "15-minute",
    "entry": {
      "trigger": "breakout_above",
      "level": "range_high"
    },
    "exit": {
      "stop_loss": {
        "placement": "percentage",
        "value": 0.5,
        "relativeTo": "range_low"
      },
      "profit_target": {
        "method": "r_multiple",
        "value": 2
      }
    },
    "risk": {
      "position_sizing": {
        "method": "percent_of_capital",
        "value": 1
      }
    }
  }
  ```
- ✅ `status = 'draft'`
- ✅ `autonomy_level = 'copilot'`

#### **Table: `strategy_conversations`** (updated)
```sql
SELECT status, strategy_id FROM strategy_conversations WHERE id = 'YOUR_CONVERSATION_ID';
```
**Expected Result:**
- ✅ `status = 'completed'`
- ✅ `strategy_id` = ID of newly created strategy

#### **Table: `chat_messages`** (messages promoted)
```sql
SELECT * FROM chat_messages 
WHERE session_id = 'YOUR_CONVERSATION_ID'
ORDER BY created_at;
```
**Expected Result:**
- ✅ All messages from `strategy_conversations.messages` promoted to permanent storage
- ✅ Each message as separate row
- ✅ `role`, `content`, `metadata` populated

#### **API Call Flow:**
```typescript
// Frontend: ChatInterface.tsx
const response = await fetch('/api/strategy/save', {
  method: 'POST',
  body: JSON.stringify({
    conversationId,
    strategyName: "NQ Opening Range Breakout",
    parsedRules: finalRules,
    summary: conversationText
  })
});
```

---

### Phase 8: Behavioral Data Throughout

Throughout the entire session, behavioral events are logged:

#### **Table: `behavioral_data`**
```sql
SELECT event_type, event_data, timestamp 
FROM behavioral_data 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY timestamp;
```
**Expected Events:**
- ✅ `conversation_started`
- ✅ `message_sent` (each user message)
- ✅ `confirmation_detected` (when Claude confirms understanding)
- ✅ `animation_generated` (if animation shown)
- ✅ `animation_viewed` (when user opens animation)
- ✅ `validation_completed` (when 100% complete)
- ✅ `strategy_saved` (final save)
- ✅ `timezone_conversion_applied` (if timezone conversion happened)

---

## 🧪 Complete Test Script

### **Test Case 1: Happy Path - Complete Strategy**

**Objective:** Create a new user and build a complete strategy from scratch.

#### **Step 1: Create New User**
1. Navigate to `/auth/login`
2. Enter email: `test+strategybuilder1@example.com`
3. Check email for magic link
4. Click link

**✅ Verify in Supabase:**
```sql
-- User created
SELECT * FROM auth.users WHERE email = 'test+strategybuilder1@example.com';

-- Identity created
SELECT * FROM auth.identities WHERE email = 'test+strategybuilder1@example.com';

-- Profile auto-created
SELECT * FROM profiles WHERE email = 'test+strategybuilder1@example.com';
```

#### **Step 2: Start Strategy Conversation**
1. Navigate to `/chat`
2. Send message: **"I want to trade NQ opening range breakouts"**

**✅ Verify in Supabase:**
```sql
-- Conversation started
SELECT * FROM strategy_conversations 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test+strategybuilder1@example.com')
ORDER BY last_activity DESC LIMIT 1;

-- Should see:
-- status = 'in_progress'
-- messages has 1 user message

-- Behavioral event logged
SELECT * FROM behavioral_data 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test+strategybuilder1@example.com')
AND event_type = 'conversation_started';
```

#### **Step 3: Complete Full Conversation**

Send these messages in order:

**User:** "I want to trade NQ opening range breakouts"  
**Claude:** *Asks clarifying questions*  
✅ Check Summary Panel: Should show "NQ" under SETUP

**User:** "15-minute opening range"  
**Claude:** *Confirms and asks about entry*  
✅ Check Summary Panel: Should show "15-minute opening range" under SETUP

**User:** "Enter on break above the high"  
**Claude:** *Confirms and asks about stop*  
✅ Check Summary Panel: Should show entry under ENTRY category

**User:** "Stop at 50% of the range"  
**Claude:** *Confirms and asks about target*  
✅ Check Summary Panel: Should show stop loss under EXIT category  
✅ Check if animation appears (might show visual of the setup)

**User:** "2 to 1 risk-reward"  
**Claude:** *Confirms and asks about position sizing*  
✅ Check Summary Panel: Profit target appears under EXIT

**User:** "Risk 1% per trade"  
**Claude:** *Confirms strategy is complete*  
✅ Check Summary Panel: Should show 100% complete  
✅ Check Readiness Gate: Should unlock "Save Strategy" button

#### **Step 4: Save Strategy**
1. Click "Save Strategy" button
2. Confirm strategy name (or edit)
3. Click "Confirm"

**✅ Verify in Supabase:**
```sql
-- Strategy saved
SELECT * FROM strategies 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test+strategybuilder1@example.com')
ORDER BY created_at DESC LIMIT 1;

-- Should see:
-- name = strategy name
-- parsed_rules = complete JSON structure
-- status = 'draft'
-- autonomy_level = 'copilot'

-- Conversation completed
SELECT status, strategy_id FROM strategy_conversations 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test+strategybuilder1@example.com')
ORDER BY last_activity DESC LIMIT 1;

-- Should see:
-- status = 'completed'
-- strategy_id = <matches strategy.id>

-- Messages promoted to chat_messages
SELECT COUNT(*) FROM chat_messages 
WHERE session_id = (
  SELECT id FROM strategy_conversations 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test+strategybuilder1@example.com')
  ORDER BY last_activity DESC LIMIT 1
);

-- Should see: Multiple messages (all from conversation)

-- Behavioral data logged
SELECT event_type FROM behavioral_data 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test+strategybuilder1@example.com')
ORDER BY timestamp;

-- Should see: conversation_started, message_sent (multiple), strategy_saved
```

---

### **Test Case 2: Incomplete Strategy - Warnings**

**Objective:** Test validation warnings when required fields are missing.

#### **Step 1: Start New Conversation**
1. Navigate to `/chat`
2. Send message: **"I want to trade ES reversals"**

#### **Step 2: Provide Minimal Info**
**User:** "I want to trade ES reversals"  
**User:** "Enter when RSI crosses 30"  
**User:** (Stop here - don't provide stop loss or sizing)

**✅ Verify:**
- Summary Panel shows < 100% complete
- Missing: stop_loss, position_sizing
- Readiness Gate shows warnings
- Cannot save strategy yet

---

### **Test Case 3: Animation Trigger**

**Objective:** Test animation generation for supported strategy types.

#### **Step 1: Describe Visual Strategy**
**User:** "I want to trade NQ opening range breakouts"  
**User:** "15-minute opening range"  
**User:** "Enter on break above the high"  
**User:** "Stop at the low of the range"

**✅ Verify:**
- Animation appears mid-stream (not after response completes)
- Shows visual preview of the setup
- Can toggle animation on desktop (click to expand/collapse)
- On mobile: FAB appears, tapping opens slide-up panel

**✅ Verify in Supabase:**
```sql
-- Animation event logged
SELECT * FROM behavioral_data 
WHERE event_type = 'animation_generated'
AND user_id = 'YOUR_USER_ID'
ORDER BY timestamp DESC LIMIT 1;

-- event_data should contain:
-- { type, direction, trigger, conversation_turn, time_to_generate_ms }
```

---

### **Test Case 4: Resume In-Progress Conversation**

**Objective:** Test conversation resumption.

#### **Step 1: Start Conversation But Don't Finish**
1. Navigate to `/chat`
2. Send 2-3 messages
3. Close browser tab

#### **Step 2: Return Later**
1. Navigate to `/chat` again

**✅ Verify:**
- Previous conversation loads automatically
- All previous messages appear in chat
- Summary Panel shows accumulated rules from before
- Can continue conversation seamlessly

**✅ Verify in Supabase:**
```sql
-- Active conversation loaded
SELECT * FROM strategy_conversations 
WHERE user_id = 'YOUR_USER_ID'
AND status = 'in_progress'
ORDER BY last_activity DESC LIMIT 1;
```

---

### **Test Case 5: Multiple Strategies (Soft Cap)**

**Objective:** Test behavior when user has 5+ strategies.

#### **Step 1: Check Strategy Count**
```sql
SELECT COUNT(*) FROM strategies WHERE user_id = 'YOUR_USER_ID';
```

#### **Step 2: Create 6th Strategy**
1. Navigate to `/chat`
2. Complete full strategy flow

**✅ Verify:**
- If count >= 5: Soft cap warning appears before save
- User can still save (not blocked)
- Warning suggests upgrading or archiving old strategies

---

## 🐛 Common Issues & Fixes

### Issue 1: Profile Not Auto-Created

**Symptoms:**
- Error: "Database error finding user"
- No profile in `public.profiles`

**Debug:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
```

**Fix:**
Run the trigger creation from `supabase/schema.sql`:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### Issue 2: Orphaned Identity Records

**Symptoms:**
- Can't sign up again with same email
- Error mentions "user not found"

**Debug:**
```sql
-- Find orphaned identities
SELECT * FROM auth.identities 
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

**Fix:**
```sql
-- Delete orphaned identities
DELETE FROM auth.identities 
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

---

### Issue 3: Summary Panel Not Updating

**Symptoms:**
- Rules don't appear in Summary Panel
- Panel shows 0 rules

**Debug:**
1. Open browser DevTools Console
2. Look for logs: `[RuleExtraction]`

**Fix:**
- Ensure Claude is confirming understanding (not asking questions)
- Check if `isConfirmation()` is detecting confirmations
- Verify `extractFromMessage()` is being called

---

### Issue 4: Animation Not Appearing

**Symptoms:**
- No animation shown for strategy
- FAB doesn't appear on mobile

**Debug:**
```typescript
// In ChatInterface.tsx
console.log('Animation trigger detected?', detectAnimationTrigger(rules));
console.log('Animation config:', animationConfig);
```

**Fix:**
- Ensure strategy type is supported (ORB, pullback, reversal, etc.)
- Check if 3+ rules accumulated
- Verify `shouldExpectAnimation()` returns true

---

## 📊 Database Queries for Monitoring

### Query 1: User's Complete Journey
```sql
-- Get everything for a user
WITH user_info AS (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
)
SELECT 
  'profile' as table_name, created_at FROM profiles WHERE id = (SELECT id FROM user_info)
UNION ALL
SELECT 
  'conversation', last_activity FROM strategy_conversations WHERE user_id = (SELECT id FROM user_info)
UNION ALL
SELECT 
  'strategy', created_at FROM strategies WHERE user_id = (SELECT id FROM user_info)
UNION ALL
SELECT 
  'behavioral_event', timestamp FROM behavioral_data WHERE user_id = (SELECT id FROM user_info)
ORDER BY created_at DESC;
```

### Query 2: Conversation Progression
```sql
-- See full conversation flow
SELECT 
  jsonb_array_length(messages) as message_count,
  status,
  strategy_id,
  last_activity
FROM strategy_conversations 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY last_activity DESC;
```

### Query 3: Behavioral Event Timeline
```sql
-- See user's interaction timeline
SELECT 
  event_type,
  event_data->>'device' as device,
  timestamp
FROM behavioral_data 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY timestamp;
```

---

## ✅ Success Criteria

A successful test passes when:

1. ✅ **User Creation:** Profile auto-created after signup
2. ✅ **Conversation Flow:** Messages accumulate in `strategy_conversations`
3. ✅ **Summary Panel:** Rules extracted correctly and shown in real-time
4. ✅ **Validation:** Validation status updates as rules are added
5. ✅ **Animation (if applicable):** Animation appears for visual strategies
6. ✅ **Completion:** Readiness Gate unlocks at 100%
7. ✅ **Save:** Strategy saved to `strategies` table
8. ✅ **Promotion:** Messages promoted to `chat_messages`
9. ✅ **Status Update:** Conversation marked as `completed`
10. ✅ **Behavioral Data:** All key events logged

---

## 🚀 Next Steps After Testing

Once testing is complete:

1. **Review Behavioral Data:** Check what patterns emerge
2. **Optimize Extraction:** Improve rule extraction accuracy
3. **Add More Validations:** Enhance validation rules
4. **Improve Animations:** Add more animation types
5. **Dashboard Integration:** Show saved strategies in dashboard

---

**Last Updated:** January 12, 2026  
**Version:** 2.0 (V2 with accumulated rules)
