# Two-Pass Conversation Architecture

**Separating conversational flow from rule extraction for reliable UX**

---

## The Problem

Claude's single-pass behavior was inconsistent:

| Scenario | Result | UX Impact |
|----------|--------|-----------|
| Text + Question + Tools | ✅ Good | Natural flow |
| Text + Tools (no question) | ❌ Bad | "Let me lock that in:" then silence |
| Tools only (no text) | ❌ Bad | No response visible to user |

The fallback system patched this but created awkward joins:

```
Claude: "Great setup choice. Let me lock that in:"
[Fallback injects]: "A) Break above high B) Wait for retest..."
```

**Root cause**: Asking Claude to do two things simultaneously (converse + extract rules) creates unpredictable output ordering.

---

## The Solution: Two-Pass System

Separate concerns into distinct Claude calls:

```
┌─────────────────────────────────────────────────────────────────┐
│ PASS 1: CONVERSATION                                            │
│ ─────────────────────────────────────────────────────────────── │
│ • No tools available                                            │
│ • Pure Socratic dialogue                                        │
│ • Always ends with A/B/C options                                │
│ • Streams to user in real-time                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASS 2: RULE EXTRACTION                                         │
│ ─────────────────────────────────────────────────────────────── │
│ • Tools only (update_rule, confirm_strategy)                    │
│ • Analyzes the exchange that just happened                      │
│ • Extracts confirmed rules silently                             │
│ • Emits rule_update events to frontend                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why This Works

| Aspect | Single-Pass | Two-Pass |
|--------|-------------|----------|
| Conversation quality | Unpredictable | Always complete |
| Rule extraction | Sometimes missing | Always runs |
| Fallback needed | Yes (hacky) | No |
| Response structure | Variable | Guaranteed |
| Debugging | Hard (mixed concerns) | Easy (isolated) |

---

## Implementation

### Pass 1: Conversation Only

```typescript
const conversationResponse = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  system: CONVERSATION_PROMPT, // Socratic questioning, no tool mentions
  messages: [...history, { role: 'user', content: message }],
  // NO tools - forces pure text response
});

const responseText = extractText(conversationResponse);

// Stream to user
controller.enqueue(encoder.encode(
  `data: ${JSON.stringify({ type: 'text', content: responseText })}\n\n`
));
```

### Pass 2: Rule Extraction

```typescript
const extractionResponse = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 512,
  system: EXTRACTION_PROMPT,
  tools: [UPDATE_RULE_TOOL, CONFIRM_STRATEGY_TOOL],
  tool_choice: { type: 'any' }, // Force tool use
  messages: [
    ...history,
    { role: 'user', content: message },
    { role: 'assistant', content: responseText },
    { role: 'user', content: 'Extract confirmed rules from this exchange.' }
  ],
});

// Emit rule updates
for (const block of extractionResponse.content) {
  if (block.type === 'tool_use') {
    if (block.name === 'update_rule') {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'rule_update', rule: block.input })}\n\n`
      ));
    }
    if (block.name === 'confirm_strategy') {
      isComplete = true;
      parsedStrategy = block.input;
    }
  }
}
```

---

## Trade-offs

### Costs

| Metric | Single-Pass | Two-Pass | Delta |
|--------|-------------|----------|-------|
| API calls | 1 | 2 | +100% |
| Input tokens | ~800 | ~1,400 | +75% |
| Output tokens | ~300 | ~400 | +33% |
| Latency | ~600ms | ~900ms | +300ms |
| Monthly cost* | $X | ~$1.5X | +50% |

*Actual cost depends on conversation length and usage volume.

### Benefits

- ✅ 99%+ reliability (vs ~70% with fallback)
- ✅ No awkward text joins
- ✅ Cleaner codebase (remove fallback logic)
- ✅ Easier debugging
- ✅ Consistent UX

---

## Alternative: Option C (JSON Mode)

If Two-Pass is too expensive, use structured JSON output:

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 2048,
  system: `You are a trading strategy mentor. Respond ONLY with valid JSON:

{
  "message": "Your conversational response with A/B/C options. Always end with a question.",
  "confirmed_rules": [
    { "category": "risk", "label": "Stop Loss", "value": "20 ticks" }
  ],
  "is_complete": false,
  "strategy": null
}

When strategy is complete, set is_complete: true and populate strategy object.`,
  messages: [...history, { role: 'user', content: message }],
});

const result = JSON.parse(response.content[0].text);

// Display message
controller.enqueue(encoder.encode(
  `data: ${JSON.stringify({ type: 'text', content: result.message })}\n\n`
));

// Emit rules
for (const rule of result.confirmed_rules) {
  controller.enqueue(encoder.encode(
    `data: ${JSON.stringify({ type: 'rule_update', rule })}\n\n`
  ));
}

// Handle completion
if (result.is_complete) {
  // ... process strategy
}
```

### JSON Mode Trade-offs

| Aspect | Two-Pass | JSON Mode |
|--------|----------|-----------|
| API calls | 2 | 1 |
| Cost | Higher | Lower |
| Streaming | ✅ Pass 1 streams | ❌ Wait for full response |
| Latency to first byte | ~200ms | ~800ms |
| Parse errors | None | Possible |
| Response quality | Best | Good |

**Recommendation**: Start with Two-Pass. Switch to JSON Mode only if costs are prohibitive and you can accept no streaming.

---

## Migration Path

### Phase 1: Implement Two-Pass
1. Create separate prompts for conversation vs extraction
2. Modify route.ts to make two calls
3. Remove fallback logic
4. Test thoroughly

### Phase 2: Monitor Costs
- Track API usage for 2 weeks
- Compare to single-pass baseline
- Calculate ROI (cost vs support tickets, user complaints)

### Phase 3: Optimize or Switch
- If costs acceptable → Keep Two-Pass
- If costs too high → Implement JSON Mode fallback
- Hybrid option: Use JSON Mode for simple exchanges, Two-Pass for complex

---

## Files to Modify

| File | Changes |
|------|---------|
| `route.ts` | Implement two-pass logic, remove fallback |
| `client.ts` | Add CONVERSATION_PROMPT, EXTRACTION_PROMPT |
| `promptManager.ts` | Simplify (remove tool usage instructions from conversation prompt) |

---

## Success Metrics

After implementation, track:

1. **Fallback rate** → Should be 0% (no fallbacks needed)
2. **Question rate** → % of responses containing `?` → Should be ~100%
3. **Rule extraction rate** → Rules captured vs rules mentioned → Should be ~99%
4. **User complaints** → "Claude didn't respond" tickets → Should drop to 0

---

## Summary

Two-Pass architecture trades ~50% more API cost for:
- Guaranteed conversational responses
- Guaranteed rule extraction  
- No fallback hacks
- Better UX
- Cleaner code

If cost becomes an issue, JSON Mode is a viable single-call alternative that sacrifices streaming for reliability.
