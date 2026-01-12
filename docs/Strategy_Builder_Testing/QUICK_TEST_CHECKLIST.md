# Strategy Builder - Quick Test Checklist

**Purpose:** Fast reference during testing - what to check at each step  
**Date:** January 12, 2026

---

## 🎯 Quick Reference: Database Tables Flow

```
USER SIGNUP
   ↓
auth.users (created)
   ↓ (trigger fires)
auth.identities (created)
   ↓ (trigger fires)
profiles (auto-created)
   ↓
USER AUTHENTICATED
   ↓
NAVIGATE TO /chat
   ↓
SEND FIRST MESSAGE
   ↓
strategy_conversations (created, status='in_progress')
   ↓
CHAT WITH AI
   ↓
strategy_conversations.messages (accumulated)
behavioral_data (events logged)
   ↓ (if visual strategy)
Animation displayed (logged to behavioral_data)
   ↓ (rules extracted)
Frontend: Summary Panel shows rules
Frontend: Validation tracks completion %
   ↓ (100% complete)
CLICK "SAVE STRATEGY"
   ↓
strategies (new record)
strategy_conversations (status='completed', strategy_id set)
chat_messages (all messages promoted)
behavioral_data (strategy_saved event)
```

---

## ✅ Minute-by-Minute Testing Checklist

### **Minute 0: Signup**
- [ ] Go to `/auth/login`
- [ ] Enter test email
- [ ] Click magic link from email
- [ ] **Verify:** Redirected to dashboard

**Check Supabase:**
```sql
-- All 3 should have records:
SELECT * FROM auth.users WHERE email = 'test@example.com';
SELECT * FROM auth.identities WHERE email = 'test@example.com';
SELECT * FROM profiles WHERE email = 'test@example.com';
```

### **Minute 1: Start Chat**
- [ ] Navigate to `/chat`
- [ ] Send: "I want to trade NQ breakouts"
- [ ] **Verify:** AI responds with question

**Check Supabase:**
```sql
-- Should have conversation:
SELECT * FROM strategy_conversations WHERE user_id = 'YOUR_ID' ORDER BY last_activity DESC LIMIT 1;
-- status = 'in_progress'
-- messages array has 1 item
```

### **Minute 2-5: Build Strategy**
- [ ] Answer AI questions about:
  - Entry trigger
  - Stop loss
  - Profit target
  - Position sizing
- [ ] **Verify:** Summary Panel shows rules accumulating
- [ ] **Verify:** Progress bar increases

**Check Supabase:**
```sql
-- Messages accumulating:
SELECT jsonb_array_length(messages) FROM strategy_conversations WHERE id = 'YOUR_CONVERSATION_ID';

-- Behavioral events logged:
SELECT event_type FROM behavioral_data WHERE user_id = 'YOUR_ID' ORDER BY timestamp;
```

### **Minute 6: Animation (if applicable)**
- [ ] **Verify:** Animation appears mid-response
- [ ] On desktop: Toggle animation expand/collapse
- [ ] On mobile: Tap FAB, see slide-up panel

**Check Supabase:**
```sql
SELECT * FROM behavioral_data WHERE event_type = 'animation_generated' AND user_id = 'YOUR_ID';
```

### **Minute 7: Complete & Save**
- [ ] **Verify:** Summary Panel shows 100%
- [ ] **Verify:** Readiness Gate unlocks
- [ ] Click "Save Strategy"
- [ ] Confirm name
- [ ] **Verify:** Redirected or success message

**Check Supabase:**
```sql
-- Strategy saved:
SELECT * FROM strategies WHERE user_id = 'YOUR_ID' ORDER BY created_at DESC LIMIT 1;

-- Conversation completed:
SELECT status, strategy_id FROM strategy_conversations WHERE id = 'YOUR_CONVERSATION_ID';
-- status = 'completed'
-- strategy_id = <UUID>

-- Messages promoted:
SELECT COUNT(*) FROM chat_messages WHERE session_id = 'YOUR_CONVERSATION_ID';
```

---

## 🎨 Visual Checklist: What You Should See

### **Frontend (Browser)**

| Phase | What to See |
|-------|-------------|
| **Signup** | Magic link email arrives, click redirects to dashboard |
| **Chat Start** | Clean chat interface, "Strategy Builder" header |
| **First Message** | AI responds immediately, asks clarifying question |
| **2nd Message** | Summary Panel appears (desktop: left sidebar, mobile: hidden) |
| **3rd+ Messages** | Rules accumulate in Summary Panel, categories fill in |
| **Animation** | Visual preview appears (if strategy type supports it) |
| **Progress** | Progress bar moves from 0% → 100% |
| **Complete** | Readiness Gate shows "✓ Strategy Complete" |
| **Save** | Modal with strategy name, confirm, success toast |

### **Supabase Dashboard**

| Table | When to Check | What to See |
|-------|---------------|-------------|
| **auth.users** | After signup | 1 new user |
| **auth.identities** | After signup | 1 identity with provider='email' |
| **profiles** | After signup | 1 profile (auto-created) |
| **strategy_conversations** | During chat | messages array growing |
| **behavioral_data** | Throughout | Multiple events logged |
| **strategies** | After save | 1 new strategy with parsed_rules |
| **chat_messages** | After save | Multiple messages promoted |

---

## 🔍 Quick Debug Commands

### If Profile Not Created:
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### If Can't Sign Up Again:
```sql
-- Find and delete orphaned identity
DELETE FROM auth.identities WHERE user_id NOT IN (SELECT id FROM auth.users);
```

### If Summary Panel Empty:
```typescript
// Open DevTools Console, look for:
[RuleExtraction] processing: ...
[RuleExtraction] found rule: ...
```

### If Animation Not Showing:
```typescript
// Check in Console:
console.log('Animation config:', animationConfig);
console.log('Should expect animation:', shouldExpectAnimation());
```

---

## 📊 Success Metrics

After a complete test, you should see:

| Metric | Expected Value |
|--------|----------------|
| **Profiles created** | 1 |
| **Conversations started** | 1 |
| **Conversations completed** | 1 |
| **Strategies saved** | 1 |
| **Messages sent** | 5-10 |
| **Behavioral events** | 10-20 |
| **Completion time** | 3-7 minutes |

---

## 🚨 Red Flags (Stop & Debug)

| Red Flag | What It Means | Fix |
|----------|---------------|-----|
| "Database error finding user" | Profile not auto-created | Run `handle_new_user()` trigger |
| Can't sign up with same email | Orphaned identity | Delete from `auth.identities` |
| Summary Panel stays empty | Rule extraction failing | Check Console for errors |
| Progress stuck at 0% | Validation not running | Check `validateStrategy()` |
| Can't save at 100% | Readiness Gate bug | Check `StrategyReadinessGate` |
| Conversation not completed | Save API failed | Check `/api/strategy/save` logs |

---

## 💡 Pro Tips

1. **Keep SQL Editor Open:** Run monitoring queries in real-time
2. **Use DevTools Console:** Watch for extraction logs
3. **Test Mobile:** Use Chrome DevTools Device Mode
4. **Clean Between Tests:** Use cleanup queries from monitoring_queries.sql
5. **Screenshot Issues:** Take screenshots of any bugs for debugging

---

## 📝 Test Script Template

Copy this for quick testing:

```
TEST RUN #___ - Date: ___________

Email: test+_____@example.com
User ID: _______________________

✓ Signup completed
✓ Profile created (verified in Supabase)
✓ Navigated to /chat
✓ First message sent
✓ Conversation created (ID: _____________)
✓ AI responded appropriately
✓ Summary Panel appeared after 2nd message
✓ Rules extracted correctly:
  - Setup: ___________________
  - Entry: ___________________
  - Exit: ____________________
  - Risk: ____________________
✓ Animation generated (type: _________)
✓ Progress reached 100%
✓ Readiness Gate unlocked
✓ Strategy saved successfully (ID: _____________)
✓ Conversation marked completed
✓ Messages promoted to chat_messages

Issues found:
- 
- 

Notes:
- 
- 
```

---

## 🎯 Expected Test Results

### **Test 1: Happy Path**
- Time: ~5 minutes
- Messages: ~8
- Rules: 5+ (all required fields)
- Animation: Yes (if supported strategy type)
- Result: Strategy saved successfully

### **Test 2: Incomplete Strategy**
- Time: ~2 minutes
- Messages: ~4
- Rules: 2-3 (missing required)
- Animation: Maybe
- Result: Cannot save, warnings shown

### **Test 3: Resume Conversation**
- Time: ~3 minutes (2 sessions)
- Messages: 4 + 4
- Rules: Accumulated from both sessions
- Animation: Yes
- Result: Strategy completed and saved

---

**Last Updated:** January 12, 2026  
**For questions, review:** STRATEGY_BUILDER_TEST_GUIDE.md
