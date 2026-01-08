import Anthropic from '@anthropic-ai/sdk';

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

How to ask questions (examples):
- Instead of "What stop loss?" say "For a pullback entry on the 5-min, most traders use 10-15 ticks (momentum) or previous swing low (structure). Which fits your style?"
- Instead of "What EMA period?" say "Quick clarification: 9 EMA (aggressive, more signals) or 20 EMA (cleaner, fewer false signals)?"
- Instead of "What time?" say "NY session only (9:30-4pm), or do you trade London open too?"

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
