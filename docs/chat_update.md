After reviewing `client.ts`:
- ✅ I use `@anthropic-ai/sdk` correctly
- ✅ I already have `STRATEGY_TOOLS` array with `confirm_strategy`
- ✅ Streaming setup is perfect
- ✅ System prompt injection works via `getSystemPrompt`


---

## **📝 STEP 1: Add `update_rule` Tool**

**File**: `/lib/claude/client.ts`

**FIND** lines 86-167 (the `STRATEGY_TOOLS` array)

**REPLACE** the entire `STRATEGY_TOOLS` constant with:

```typescript
// Tool definitions for Claude
const STRATEGY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'confirm_strategy',
    description: 'Call this when you have gathered all required information and can build a complete trading strategy. This finalizes the strategy creation process.',
    input_schema: {
      type: 'object' as const,
      properties: {
        strategy_name: {
          type: 'string',
          description: 'A concise, descriptive name for the strategy (e.g., "20 EMA Pullback + RSI Filter")'
        },
        summary: {
          type: 'string',
          description: 'A 2-3 sentence human-readable summary of the strategy'
        },
        parsed_rules: {
          type: 'object',
          description: 'The structured strategy rules',
          properties: {
            entry_conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  indicator: { type: 'string' },
                  period: { type: 'number' },
                  relation: { type: 'string' },
                  value: { type: 'number' },
                  description: { type: 'string' }
                },
                required: ['indicator', 'relation']
              }
            },
            exit_conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['stop_loss', 'take_profit', 'trailing_stop', 'time_exit'] },
                  value: { type: 'number' },
                  unit: { type: 'string', enum: ['ticks', 'dollars', 'percent', 'time'] },
                  description: { type: 'string' }
                },
                required: ['type', 'value', 'unit']
              }
            },
            filters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  indicator: { type: 'string' },
                  period: { type: 'number' },
                  condition: { type: 'string' },
                  value: { type: 'number' },
                  start: { type: 'string' },
                  end: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['type']
              }
            },
            position_sizing: {
              type: 'object',
              properties: {
                method: { type: 'string', enum: ['fixed', 'risk_percent', 'kelly'] },
                value: { type: 'number' },
                max_contracts: { type: 'number' }
              },
              required: ['method', 'value']
            }
          },
          required: ['entry_conditions', 'exit_conditions', 'position_sizing']
        },
        instrument: {
          type: 'string',
          description: 'The trading instrument (e.g., "ES", "NQ", "MES", "MNQ")'
        }
      },
      required: ['strategy_name', 'summary', 'parsed_rules', 'instrument']
    }
  },
  // ============================================================================
  // NEW: Incremental Rule Recording Tool
  // ============================================================================
  {
    name: 'update_rule',
    description: `Record a confirmed strategy rule during the conversation. Call this IMMEDIATELY after you confirm ANY rule the user states.
    
Examples:
- User: "Stop at 50% of the range" → You confirm → CALL update_rule({ category: "risk", label: "Stop Loss", value: "50% of opening range" })
- User: "I trade NQ" → You acknowledge → CALL update_rule({ category: "setup", label: "Instrument", value: "NQ" })
- User: "Break above the high" → You confirm → CALL update_rule({ category: "entry", label: "Entry Trigger", value: "Break above high" })

CRITICAL: Call this tool DURING your response, not after. Multiple rules in one user message? Call update_rule multiple times.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['setup', 'entry', 'exit', 'risk', 'timeframe', 'filters'],
          description: 'Rule category: setup=pattern/instrument, entry=triggers, exit=targets, risk=stops/sizing, timeframe=sessions/hours, filters=additional conditions'
        },
        label: {
          type: 'string',
          description: 'Rule label (e.g., "Stop Loss", "Entry Trigger", "Instrument", "Pattern", "Target", "Position Size", "Session")'
        },
        value: {
          type: 'string',
          description: 'Rule value in plain English (e.g., "50% of opening range", "NQ", "Break above high", "20 ticks", "1% risk per trade")'
        }
      },
      required: ['category', 'label', 'value']
    }
  }
];
```

**Why This Works**: Added the second tool with clear examples in the description. Claude will see these examples and understand when to call it.

---

## **📝 STEP 2: Handle `update_rule` in Stream Parser**

**File**: `/api/strategy/parse-stream/route.ts`

**FIND** lines 114-167 (the streaming loop)

**REPLACE** with this complete implementation:

```typescript
let fullText = '';
let currentToolName: string | null = null;
let currentToolInput = '';
let isComplete = false;

try {
  for await (const chunk of stream) {
    // Handle text deltas
    if (chunk.type === 'content_block_delta') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((chunk.delta as any).type === 'text_delta') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = (chunk.delta as any).text;
        fullText += text;
        
        // Send text chunk to client
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`)
        );
      }
      
      // Handle tool input JSON streaming
      if (chunk.delta.type === 'input_json_delta') {
        currentToolInput += chunk.delta.partial_json;
      }
    }
    
    // Handle tool use start
    if (chunk.type === 'content_block_start') {
      if (chunk.content_block.type === 'tool_use') {
        currentToolName = chunk.content_block.name;
        currentToolInput = ''; // Reset for new tool
        
        if (currentToolName === 'confirm_strategy') {
          isComplete = true;
        }
      }
    }
    
    // Handle tool use end - send to frontend
    if (chunk.type === 'content_block_stop') {
      if (currentToolName && currentToolInput) {
        try {
          const parsedInput = JSON.parse(currentToolInput);
          
          // Send update_rule to frontend immediately
          if (currentToolName === 'update_rule') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'rule_update',
                rule: {
                  category: parsedInput.category,
                  label: parsedInput.label,
                  value: parsedInput.value
                }
              })}\n\n`)
            );
          }
        } catch (e) {
          console.error('Failed to parse tool input:', e);
        }
        
        // Reset for next tool
        currentToolName = null;
        currentToolInput = '';
      }
    }
  }

  // Wait for final message
  const finalMessage = await stream.finalMessage();
```

---

## **📝 STEP 3: Update Frontend to Handle `rule_update`**

**File**: `ChatInterface.tsx`

**FIND** lines 286-298 (the sentence extraction code)

**DELETE** these lines:
```typescript
// V2: Extract from Claude's complete sentences only (more efficient)
const sentences = displayText.split(/[.!?]\s+/);
const lastCompleteSentence = sentences.length > 1 ? sentences[sentences.length - 2] : '';

// Only extract if we have a new complete sentence
if (lastCompleteSentence && 
    lastCompleteSentence.length > 20 && 
    isConfirmation(lastCompleteSentence)) {
  setAccumulatedRules(prev => 
    extractFromMessage(lastCompleteSentence, 'assistant', prev)
  );
}
```

**REPLACE** with:

```typescript
// No longer extract from sentences - Claude uses update_rule tool instead
```

**THEN FIND** line 305 (where `else if (data.type === 'complete')` starts)

**ADD THIS** right before that line:

```typescript
              } else if (data.type === 'rule_update') {
                // Claude called update_rule tool - add to summary panel
                const newRule: StrategyRule = {
                  category: data.rule.category,
                  label: data.rule.label,
                  value: data.rule.value
                };
                
                // Use existing accumulation logic
                setAccumulatedRules(prev => accumulateRules(prev, [newRule]));
```

---

## **📝 STEP 4: Update System Prompt**

**File**: `/lib/claude/promptManager.ts`

**FIND** line 290 (end of the `getSystemPrompt` function, before the `return prompt;`)

**ADD** this instruction:

```typescript
  // PHASE 4: Add tool usage reminder
  prompt = `${prompt}

CRITICAL TOOL USAGE:
- When you confirm ANY rule the user states, IMMEDIATELY call update_rule tool
- Call it DURING your response (before sending text), not after
- Format: update_rule({ category: "risk", label: "Stop Loss", value: "50% of opening range" })
- Multiple rules in one message? Call update_rule multiple times
- This keeps the UI synchronized in real-time as you confirm each rule`;
  
  return prompt;
```