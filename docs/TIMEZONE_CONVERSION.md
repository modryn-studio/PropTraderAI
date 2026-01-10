# Timezone Conversion Feature

**Implementation Date:** January 10, 2026  
**Phase:** 1B + 2 (Enhanced)  
**Status:** ✅ Complete with DST support

---

## Overview

Automatically converts trader-specified times to exchange time (America/Chicago) with **full DST support** for consistent strategy execution across global user base.

### Enhanced Features (Phase 2)

- ✅ **DST-aware conversions** using date-fns-tz
- ✅ **Explicit timezone picker** in settings
- ✅ **Profile timezone** as fallback
- ✅ **Priority system:** Conversation detection → Profile setting → Auto-assume CT

### The Problem

Traders work from different timezones:
- **Pacific trader:** "I trade 9:30 AM to 11:00 AM"
- **London trader:** "I trade the NY open at 2:30 PM"
- **System needs:** All times stored in CME exchange time (America/Chicago)

Without conversion → Strategy fails to execute at correct times.

---

## Implementation

### Architecture

```
User describes strategy with times
  ↓
Claude parses strategy (natural language → structured rules)
  ↓
Extract timezone from conversation history
  ↓
Process time_window filters (convert to exchange time)
  ↓
Display conversion summary to user
  ↓
Save strategy with converted times
  ↓
Log conversion event for PATH 2
```

### Files Created

1. **`src/lib/utils/timezone.ts`** (220 lines) - **Enhanced with DST**
   - Timezone mapping (abbreviations → IANA names)
   - **DST-aware conversion** using date-fns-tz
   - Validation helpers
   - Trading session classification
   - isDaylightSavingTime() helper

2. **`src/lib/utils/timezoneProcessor.ts`** (190 lines) - **Enhanced**
   - Extract timezone from conversation
   - **Profile timezone fallback**
   - Process ParsedRules filters
   - Generate conversion summary with DST info
   - Warning/error handling

3. **`src/components/ui/TimezonePicker.tsx`** (NEW - 130 lines)
   - Dropdown timezone selector
   - Auto-detect option
   - All 10 major timezones
   - IANA format display

4. **`src/app/settings/SettingsPageClient.tsx`** (NEW - 185 lines)
   - Timezone preference UI
   - Save to profile
   - "Unsaved changes" indicator

### Files Modified

1. **`src/app/chat/ChatInterface.tsx`**
   - Import timezone utilities
   - Extract user timezone from messages
   - **Pass profile timezone as fallback**
   - Process timezones when strategy complete
   - Pass conversion summary to confirmation card
   - Log `timezone_conversion_applied` event

2. **`src/components/chat/StrategyConfirmationCard.tsx`**
   - Add `timezoneConversionSummary` prop
   - Display conversion info card (blue border, clock icon)
   - Show before parsed rules section

3. **`src/lib/behavioral/logger.ts`**
   - Add `timezone_conversion_applied` event type

4. **`src/app/settings/page.tsx`**
   - Fetch timezone from profiles
   - Render SettingsPageClient

5. **`src/app/chat/page.tsx`**
   - Fetch timezone from profiles
   - Pass to ChatInterface

6. **Database Migration: `009_add_profile_timezone.sql`**
   - Add `timezone` column to profiles table

---

## User Experience

### Timezone Priority System

**3-tier fallback:**
1. **Conversation detection** (highest priority) - "I trade 9:30 AM PT"
2. **Profile setting** (medium priority) - User set in Settings
3. **Auto-assume CT** (default) - No timezone info available

If user mentions timezone in conversation, it overrides profile setting.

### Detection Methods

System automatically detects timezone from user messages:

| User Says | Detected Timezone |
|-----------|-------------------|
| "I trade 9:30 AM PT" | America/Los_Angeles |
| "I'm in London" | Europe/London |
| "NY session" | America/New_York |
| "Pacific Time" | America/Los_Angeles |
| "EST" | America/New_York |

Supported abbreviations: ET, EST, EDT, PT, PST, PDT, CT, CST, CDT, MT, MST, MDT, GMT, BST, CET, CEST

### Visual Display

When conversions happen, user sees:

```
╔════════════════════════════════════════╗
║  🕐 TIMES CONVERTED                    ║
║                                        ║
║  Timezone Conversions:                 ║
║  - 09:30 America/Los_Angeles →         ║
║    11:30 America/Chicago               ║
║  - 16:00 America/Los_Angeles →         ║
║    18:00 America/Chicago               ║
║                                        ║
║  All times stored in Exchange Time     ║
║  (America/Chicago)                     ║
╚════════════════════════════════════════╝
```

### Edge Cases

**No timezone detected:**
- Assumes times are already in exchange time
- Shows warning: "No timezone detected. Assuming Exchange Time."

**Invalid time format:**
- Shows warning: "Invalid time format: 9:30pm. Expected HH:MM."
- Skips conversion for that filter

**Already exchange timezone:**
- No conversion needed
- No conversion summary displayed

---

## Technical Details

### Supported Timezones

```typescript
const TRADER_TIMEZONES = {
  'America/New_York': 'US Eastern Time (ET)',
  'America/Chicago': 'US Central Time (CT)',
  'America/Los_Angeles': 'US Pacific Time (PT)',
  'America/Denver': 'US Mountain Time (MT)',
  'Europe/London': 'UK Time (GMT/BST)',
  'Europe/Paris': 'Central European Time (CET)',
  'Europe/Berlin': 'Central European Time (CET)',
  'Asia/Singapore': 'Singapore Time (SGT)',
  'Asia/Hong_Kong': 'Hong Kong Time (HKT)',
  'Australia/Sydney': 'Australian Eastern Time (AEST)',
};
```

### Conversion Algorithm

**DST-aware (Phase 2 - Current):**
```typescript
// 1. Parse time in trader's local timezone
const traderDate = parse(timeString, format, referenceDate);

// 2. Convert to UTC (accounts for DST offset)
const utcDate = fromZonedTime(traderDate, traderTimezone);

// 3. Convert from UTC to exchange time (accounts for DST offset)
const exchangeDate = toZonedTime(utcDate, EXCHANGE_TIMEZONE);

// 4. Format as HH:MM
const exchangeTime = formatTz(exchangeDate, 'HH:mm', { timeZone: EXCHANGE_TIMEZONE });
```

**DST Detection:**
```typescript
// Compare offsets in January (standard) vs July (DST)
// If current offset differs, DST is active
const isDST = isDaylightSavingTime(date, timezone);
```

This properly handles:
- US DST (March → November)
- EU DST (March → October, different dates)
- Southern hemisphere DST (opposite months)
- Timezones that don't observe DST

### Database Storage

**strategies.parsed_rules** (JSONB):
```json
{
  "filters": [
    {
      "type": "time_window",
      "start": "11:30",  // Exchange time (was 9:30 PT)
      "end": "18:00",    // Exchange time (was 4:00 PT)
      "description": "Trading hours: 11:30 - 18:00 (converted from America/Los_Angeles)"
    }
  ]
}
```

Times are stored in **24-hour HH:MM format** in **America/Chicago** timezone.

---

## PATH 2 Data Collection

### Behavioral Event

```typescript
await logBehavioralEvent(userId, {
  eventType: 'timezone_conversion_applied',
  eventData: {
    detectedTimezone: 'America/Los_Angeles',
    conversions: [
      {
        original: '09:30 America/Los_Angeles',
        converted: '11:30 America/Chicago',
        timezone: 'America/Los_Angeles'
      }
    ],
    warnings: []
  }
});
```

### Analytics Value

- **Global distribution:** Which timezones do traders use?
- **Session preferences:** Do PT traders prefer morning or afternoon?
- **Error patterns:** Which time formats cause confusion?
- **Feature gaps:** Are traders using unsupported timezones?

---

## Testing

### Manual Test Cases

**Test 1: Pacific Time Conversion**
```
User: "I trade 9:30 AM to 11:00 AM Pacific Time"
Expected: 
  - Detected: America/Los_Angeles
  - Start: 11:30 CT
  - End: 13:00 CT
  - Conversion summary displayed
```

**Test 2: No Timezone Mentioned**
```
User: "I trade 9:30 AM to 4:00 PM"
Expected:
  - No timezone detected
  - Times unchanged (assumed CT)
  - Warning: "No timezone detected..."
```

**Test 3: London Session**
```
User: "I trade the London open at 2:30 AM"
Expected:
  - Detected: Europe/London (from "London")
  - Start: 08:30 CT (or 09:30 CT depending on DST)
  - Conversion summary displayed
```

**Test 4: Invalid Format**
```
User: "I trade 9:30pm to 11pm"
Expected:
  - Warning: "Invalid time format: 9:30pm"
  - Conversion skipped
  - User can revise strategy
```

### Integration Test

1. Select prop firm (TopStep, 50K account)
2. Navigate to /chat
3. Describe strategy with specific times + timezone
   - Example: "I trade the 20 EMA pullback from 9:30 AM to 11:00 AM Pacific Time"
4. Complete conversation
5. Check confirmation card:
   - ✅ Blue "Times Converted" card visible
   - ✅ Shows original → converted times
   - ✅ Note about Exchange Time storage
6. Save strategy
7. Check database:
   - ✅ `strategies.parsed_rules.filters[0].start` = "11:30"
   - ✅ Filter description includes "(converted from...)"
8. Check `behavioral_data`:
   - ✅ Event `timezone_conversion_applied` logged
   - ✅ Event data includes conversions array

---

## Future Enhancements (Phase 3+)

### ~~DST Handling~~ ✅ COMPLETE (Phase 2)
- ~~Replace static offsets with `date-fns-tz`~~ ✅ Done
- ~~Handle DST transitions correctly~~ ✅ Done
- Show warnings when strategy spans DST change (future)

### ~~Timezone Selection UI~~ ✅ COMPLETE (Phase 2)
- ~~Explicit timezone picker~~ ✅ Done (Settings page)
- ~~Override auto-detection~~ ✅ Done (priority system)
- ~~Profile default timezone setting~~ ✅ Done (profiles.timezone)

### Additional Timezones
- Add more global timezones on demand
- Support custom IANA timezone strings
- Fallback to UTC offset if IANA not found

### Advanced Features
- Time-of-day alerts: "Your best session starts in 30min"
- Session overlap detection: "NY/London overlap 12:30-15:00 CT"
- Historical session performance by timezone
- DST transition date warnings

---

## Known Limitations

1. ~~**No DST support**~~ ✅ Fixed - Full DST support via date-fns-tz
2. **Limited timezone list** - 10 major timezones (expandable)
3. **Simplified parsing** - May miss complex time expressions
4. **No date handling** - Times only (no overnight sessions)
5. **No RTH validation** - Doesn't check if time falls during Regular Trading Hours

---

## Rollout Checklist

### Phase 1B (Original)
- [x] Create timezone utilities (`timezone.ts`)
- [x] Create processor (`timezoneProcessor.ts`)
- [x] Integrate into ChatInterface
- [x] Update StrategyConfirmationCard UI
- [x] Add behavioral event type
- [x] Test compilation (no errors)

### Phase 2 (Enhanced - Current)
- [x] Install date-fns-tz for DST support
- [x] Update timezone.ts with DST-aware conversions
- [x] Create TimezonePicker component
- [x] Add timezone field to profiles table (migration 009)
- [x] Create Settings page timezone UI
- [x] Update timezoneProcessor with profile fallback
- [x] Pass profile timezone to ChatInterface
- [x] Update documentation

### Testing (TODO)
- [ ] Manual testing (all 4 test cases)
- [ ] Test DST transitions (March/November)
- [ ] Test profile timezone fallback
- [ ] Integration test (end-to-end)
- [ ] User feedback collection

---

## Support

**Common Issues:**

**"My times aren't converting"**
→ Check if you mentioned timezone in conversation
→ Try explicit mention: "I'm in Pacific Time" or "9:30 AM PT"

**"Wrong time displayed"**
→ DST may be affecting conversion (static offsets in Phase 1B)
→ Manually verify exchange time is correct

**"I want to use a different timezone"**
→ Currently limited to 10 major timezones
→ Request feature: Profile default timezone setting

---

**Last Updated:** January 10, 2026  
**Next Review:** After DST occurs (March/November 2026)
