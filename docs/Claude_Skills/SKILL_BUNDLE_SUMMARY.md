# PropTraderAI Strategy Builder Skill - Complete Bundle

**Created:** January 10, 2026  
**Version:** 1.0  
**Bundle Size:** 7 files + 2 directories

---

## 📦 What's Included

Your complete Agent Skill bundle for PropTraderAI's strategy extraction chat interface:

```
proptraderai-strategy-builder/
├── SKILL.md (23KB) - Main instructions with YAML frontmatter ✅
├── schemas/ - JSON validation schemas
│   └── parsedRules.schema.json (12KB) - Complete output validation ✅
└── firm_rules/ - Prop firm rules database
    ├── README.md (10KB) - Update process & maintenance guide ✅
    ├── topstep.json (6KB) ✅
    ├── myfundedfutures.json (6KB) ✅
    ├── tradeify.json (6KB) ✅
    ├── alpha-futures.json (6KB) ✅
    ├── ftmo.json (7KB) ✅
    └── fundednext.json (7KB) ✅
```

**Total:** ~85KB of domain knowledge, progressively loaded as needed

---

## ✅ What You Asked For

### 1. JSON Schemas ✅
**File:** `schemas/parsedRules.schema.json`

**What it does:**
- Defines exact structure for Claude's JSON output
- Validates all fields (instrument, entry_conditions, exit_conditions, etc.)
- Provides enums for valid values (ES, NQ, MES, etc.)
- Documents every field with descriptions

**How Claude uses it:**
```
User strategy conversation → Claude ready to generate JSON
→ Claude: [Reads schemas/parsedRules.schema.json]
→ Claude generates JSON that perfectly matches your TypeScript types
→ Your backend receives valid, type-safe data
```

**Key benefits:**
- Eliminates parsing errors
- Self-documenting API contract
- Easy to update as you add Phase 1B/2 features

---

### 2. Firm Rules Database ✅
**Files:** 6 JSON files in `firm_rules/` directory

**What's included:**

#### Automation-Friendly Firms (Your Focus):
1. **Topstep** - Most established (2012), TopstepX API available
2. **MyFundedFutures** - Updated July 2025 to allow automation
3. **Tradeify** - One-time fee, ownership verification required
4. **Alpha Futures** - Newer firm, allows bots/EAs
5. **FTMO** - Largest international (200K+ traders)
6. **FundedNext** - Multiple challenge types, 40% consistency rule

**What each file contains:**
```json
{
  "automation_policy": "allowed",
  "automation_notes": "Detailed policy explanation",
  "rules": {
    "50000": {
      "profit_target": 3000,
      "daily_loss_limit": 2000,
      "max_contracts": { "ES": 10, "NQ": 10 },
      "consistency_rule": 0.50,
      "allows_overnight": true,
      ...
    }
  },
  "payout_structure": { ... },
  "last_verified": "2026-01-10"
}
```

**How Claude uses it:**
```
User: "I'm with Topstep, $50K account"
→ Claude: [Reads firm_rules/topstep.json]
→ Claude validates strategy:
  - Position size: 5 contracts (max 10) ✅
  - Risk per trade: $1,250 (50% of $2K daily limit) ⚠️ Warning
  - Automation: Allowed ✅
```

---

### 3. README.md ✅
**File:** `firm_rules/README.md`

**What it covers:**
- Complete directory structure
- Automation policy legend (✅ ⚠️ ❌ ❓)
- Detailed firm profiles with pros/cons
- Update process (quarterly review, on-demand changes)
- Maintenance schedule
- How Claude uses the files
- What's covered vs. what's not
- When to add new firms

**Critical sections:**
- **Update Process:** When/how to update firm rules
- **Adding New Firms:** Step-by-step instructions
- **Limitations:** What this database covers vs. API real-time data
- **Maintenance Schedule:** Next review April 10, 2026

---

## 🎯 Why These 6 Firms?

Based on your research and PropTraderAI's automation focus:

### ✅ Included (Automation Allowed):
- Topstep (your top 12) ✅
- MyFundedFutures (your top 12) ✅
- Tradeify (your top 12) ✅
- Alpha Futures (your top 12) ✅
- FTMO (NOT in your top 12, but massive internationally) ✅
- FundedNext (NOT in your top 12, but explicit automation policy) ✅

### ❌ Not Included (Automation Prohibited):
- Apex Trader Funding - Strict prohibition
- Take Profit Trader - "No automated or bot trading of any kind"

### ❓ Not Included (Unclear Policy - Needs Research):
From your top 12, these need automation policy verification:
- TradeDay
- Bulenox
- Earn2Trade
- BluSky Trading
- Elite Trader Funding
- Lucid Trading

**Recommendation:** Research these 6 firms' automation policies and add the automation-friendly ones in your next quarterly review.

---

## 📊 Token Efficiency

### Progressive Loading Example

**Before skill trigger:**
- System prompt includes: "proptraderai-strategy-builder skill available" (~100 tokens)

**After user says "I want to automate my ES strategy with Topstep":**
1. Claude reads SKILL.md (~5,000 tokens)
2. User mentions Topstep → Claude reads `firm_rules/topstep.json` (~500 tokens)
3. Claude generates JSON → Claude reads `schemas/parsedRules.schema.json` (~700 tokens)

**Total tokens used:** ~6,200 tokens for a complete strategy extraction with validation

**Efficiency:**
- Only loads what's needed
- Firm rules: 1 file, not all 6
- Schema: Only when generating output
- No upfront cost for 85KB of bundled knowledge

---

## 🚀 How to Deploy

### Option 1: Claude API (Production)

1. **Zip the bundle:**
   ```bash
   zip -r proptraderai-strategy-builder.zip proptraderai-strategy-builder/
   ```

2. **Upload via Skills API:**
   ```bash
   curl -X POST https://api.anthropic.com/v1/skills \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "anthropic-beta: skills-2025-10-02" \
     -F "file=@proptraderai-strategy-builder.zip"
   ```

3. **Use in API calls:**
   ```javascript
   const response = await anthropic.messages.create({
     model: "claude-sonnet-4-20250514",
     tools: [{ type: "code_execution", container: { skill_id: "proptraderai-strategy-builder" } }],
     messages: [{ role: "user", content: "I want to automate my trading strategy" }]
   });
   ```

### Option 2: Claude.ai (Testing)

1. Zip the bundle (as above)
2. Go to Settings → Features → Skills
3. Upload `proptraderai-strategy-builder.zip`
4. Test in a new conversation

### Option 3: Claude Code (Development)

1. Copy directory to `~/.claude/skills/`
2. Claude Code will auto-discover the skill
3. Test locally during development

---

## 🔄 Maintenance Workflow

### Quarterly Review (Every 3 Months)

**Checklist for each firm:**
1. Visit official website
2. Check rules page for changes
3. Verify automation policy unchanged
4. Update Trustpilot rating if changed
5. Update JSON file if needed
6. Update `last_verified` date
7. Test with Claude to ensure proper loading

**Next scheduled review:** April 10, 2026

### On-Demand Updates

When firms announce policy changes:
1. Update relevant JSON file immediately
2. Note changes in version control commit
3. Update `last_verified` date
4. Re-deploy skill bundle
5. Notify users if breaking changes

---

## 📈 Future Enhancements

### Phase 1B (Add Later):
- Partial exits / scaling rules
- Trailing stop schemas
- Multi-timeframe confirmation schemas

### Phase 2 (Add Later):
- Behavioral risk score schemas
- Tilt detection thresholds
- Pattern recognition schemas

### Phase 3 (Add Later):
- MCP server integration
- API endpoint schemas
- White-label firm configurations

### Additional Firms (Research & Add):
From your top 12, verify and add:
- TradeDay (if allows automation)
- Bulenox (if allows automation)
- Earn2Trade (if allows automation)
- BluSky Trading (if allows automation)
- Elite Trader Funding (if allows automation)
- Lucid Trading (if allows automation)

---

## ⚠️ Important Notes

### What This Bundle Does:
✅ Provides Claude with domain expertise  
✅ Enables offline firm rule validation  
✅ Ensures type-safe JSON output  
✅ Documents update process  
✅ Focuses on automation-friendly firms  

### What This Bundle Doesn't Do:
❌ Replace your API (these are fallback rules)  
❌ Provide real-time account data  
❌ Include firms that prohibit automation  
❌ Auto-update (requires manual quarterly review)  

### Critical Reminders:
- **API is primary** - These files are backup/offline reference
- **Users must verify** - Traders should always check firm's official rules
- **Rules change** - Firms can update policies at any time
- **Not legal advice** - This is educational/informational only

---

## 📝 Next Steps

1. **Review the bundle** - Check that everything looks correct
2. **Test locally** - Upload to Claude.ai and test a strategy extraction
3. **Deploy to API** - Upload via Skills API for production use
4. **Monitor conversations** - Watch for any firm rule discrepancies
5. **Schedule Q2 review** - Calendar reminder for April 10, 2026
6. **Research remaining firms** - Verify automation policies for your other top 12 firms

---

## 🎉 What You've Built

You now have a **complete, production-ready Agent Skill** that:

- ✅ Extracts strategies through Socratic dialogue
- ✅ Validates against 6 automation-friendly prop firms
- ✅ Generates type-safe JSON output
- ✅ Provides 85KB of domain knowledge
- ✅ Loads progressively (only what's needed)
- ✅ Documents maintenance process
- ✅ Focuses on your target market (automation traders)

This is your **competitive advantage** - competitors will need months to build equivalent domain knowledge into their systems.

---

**Questions? Issues? Updates needed?**

Refer to `firm_rules/README.md` for detailed maintenance instructions.
