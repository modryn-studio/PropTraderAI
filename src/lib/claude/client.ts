import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from './promptManager';

// Initialize Anthropic client
// Note: This will be used server-side only
export function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  
  return new Anthropic({
    apiKey,
  });
}

// Strategy parsing prompt template - Trader-focused Socratic questioning
export const STRATEGY_PARSER_SYSTEM_PROMPT = `You are a senior trader helping someone articulate their trading strategy for PropTraderAI.

Your personality:
- Direct but not harsh (like an experienced mentor)
- Use real trader terminology: "EMA cross", "pullback", "structure-based stop"
- Give realistic examples: "9 EMA for scalpers, 20 EMA for swing traders"
- Risk-first mindset: always ask about stop loss before profit targets

Your job:
1. Listen to their strategy description
2. Ask clarifying questions using the Socratic method (ONE question at a time)
3. When you have enough info, confirm the strategy using the confirm_strategy tool

What you need to know before confirming:
- Entry conditions (indicators, price action, patterns)
- Stop loss (in ticks, dollars, or structure-based)
- Take profit / risk-reward ratio
- Trading hours (session filters)
- Position sizing (risk per trade)
- Instrument (ES, NQ, MES, MNQ)

CRITICAL: Present clarifying questions as MULTIPLE CHOICE OPTIONS whenever possible:
- Format: "Quick clarification: What time period defines your "opening range"?"
- Then provide 3-4 lettered options: A) Option 1, B) Option 2, C) Option 3
- Example: "A) First 5 minutes (9:30-9:35 ET) - aggressive, more setups • B) First 15 minutes (9:30-9:45 ET) - common standard • C) First 30 minutes (9:30-10:00 ET) - cleaner, fewer false breaks • D) First 60 minutes (9:30-10:30 ET) - swing traders"
- End with: "Which fits your approach?"
- User can respond with just the letter (A, B, C, etc.) OR describe something custom

After user selects an option, ALWAYS confirm what they chose in your next response:
- Example: "Got it, you're using the 15-minute opening range (9:30-9:45 ET). Now, what's your entry trigger..."

Examples of good multiple choice questions:
- "What EMA period?" → "A) 9 EMA (aggressive, more signals) • B) 20 EMA (standard, cleaner) • C) 50 EMA (longer-term bias)"
- "What stop loss?" → "A) 10 ticks (tight, scalping) • B) 20 ticks (standard day trade) • C) Previous swing low (structure-based) • D) 0.5% of entry (percentage)"
- "Trading hours?" → "A) NY session only (9:30 AM - 4:00 PM ET) • B) London + NY (3:00 AM - 4:00 PM ET) • C) All day (no session filter)"

When you have ALL required information, call the confirm_strategy tool with:
- The parsed rules structure
- A suggested strategy name (e.g., "20 EMA Pullback + RSI Filter")
- A human-readable summary

Keep responses concise. One question at a time. Never overwhelm.`;

// Parsed rules structure
export interface ParsedRules {
  entry_conditions: EntryCondition[];
  exit_conditions: ExitCondition[];
  filters: Filter[];
  position_sizing: PositionSizing;
}

export interface EntryCondition {
  indicator: string;
  period?: number;
  relation: string;
  value?: number;
  description?: string; // Human-readable description
}

export interface ExitCondition {
  type: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'time_exit';
  value: number;
  unit: 'ticks' | 'dollars' | 'percent' | 'time';
  description?: string;
}

export interface Filter {
  type: string;
  indicator?: string;
  period?: number;
  condition?: string;
  value?: number;
  start?: string;
  end?: string;
  description?: string;
}

export interface PositionSizing {
  method: 'fixed' | 'risk_percent' | 'kelly';
  value: number;
  max_contracts?: number;
}

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
  // Incremental Rule Recording Tool
  // ============================================================================
  {
    name: 'update_rule',
    description: `Record a confirmed strategy rule during the conversation. Call this IMMEDIATELY after you confirm ANY rule the user states.
    
Examples:
- User: "Stop at 50% of the range" → You confirm → CALL update_rule({ category: "risk", label: "Stop Loss", value: "50% of opening range" })
- User: "I trade NQ" → You acknowledge → CALL update_rule({ category: "setup", label: "Instrument", value: "NQ" })
- User: "Break above the high" → You confirm → CALL update_rule({ category: "entry", label: "Entry Trigger", value: "Break above high" })
- User: "Target 2R" → You confirm → CALL update_rule({ category: "exit", label: "Target", value: "2:1 risk-reward" })

CRITICAL: Call this tool for EVERY rule you confirm. Multiple rules in one user message? Call update_rule multiple times.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['setup', 'entry', 'exit', 'risk', 'timeframe', 'filters'],
          description: 'Rule category: setup=pattern/instrument/direction, entry=triggers, exit=targets, risk=stops/sizing, timeframe=sessions/hours, filters=additional conditions'
        },
        label: {
          type: 'string',
          description: 'Rule label (e.g., "Stop Loss", "Entry Trigger", "Instrument", "Pattern", "Target", "Position Size", "Session", "Direction")'
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

// Response type from strategy parsing
export interface StrategyParseResult {
  // Is the strategy complete?
  complete: boolean;
  
  // Claude's conversational message (always present)
  message: string;
  
  // Only present when complete = true
  strategyName?: string;
  summary?: string;
  parsedRules?: ParsedRules;
  instrument?: string;
}

// Conversation message type
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// Strategy parsing function with tool use
export async function parseStrategy(
  userMessage: string,
  conversationHistory: ConversationMessage[]
): Promise<StrategyParseResult> {
  const client = createAnthropicClient();
  
  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: STRATEGY_PARSER_SYSTEM_PROMPT,
    tools: STRATEGY_TOOLS,
    messages,
  });
  
  // Check if Claude used the confirm_strategy tool
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );
  
  // Extract any text content
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );
  const textContent = textBlock?.text || '';
  
  // If tool was used, strategy is complete
  if (toolUse && toolUse.name === 'confirm_strategy') {
    const input = toolUse.input as {
      strategy_name: string;
      summary: string;
      parsed_rules: ParsedRules;
      instrument: string;
    };
    
    return {
      complete: true,
      message: textContent || input.summary,
      strategyName: input.strategy_name,
      summary: input.summary,
      parsedRules: input.parsed_rules,
      instrument: input.instrument,
    };
  }
  
  // Otherwise, Claude is asking a clarifying question
  return {
    complete: false,
    message: textContent,
  };
}

// Streaming version of parseStrategy for real-time responses
export async function parseStrategyStream(
  userMessage: string,
  conversationHistory: ConversationMessage[]
) {
  const client = createAnthropicClient();
  
  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];
  
  // Build conversation for prompt manager analysis
  const conversationForPrompt = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
  conversationForPrompt.push({ role: 'user', content: userMessage });
  
  // Get dynamic system prompt (conditionally includes animation instructions)
  const systemPrompt = getSystemPrompt(STRATEGY_PARSER_SYSTEM_PROMPT, conversationForPrompt);
  
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: systemPrompt,
    tools: STRATEGY_TOOLS,
    messages,
  });

  return stream;
}
