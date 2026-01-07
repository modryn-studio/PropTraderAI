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

// Strategy parsing prompt template
export const STRATEGY_PARSER_SYSTEM_PROMPT = `You are an expert trading strategy parser for PropTraderAI. Your role is to:

1. Understand natural language trading strategy descriptions
2. Ask clarifying questions using the Socratic method to fill in missing details
3. Convert strategies into structured, executable rules

When parsing a strategy, you need to identify:
- Entry conditions (indicators, price action, patterns)
- Exit conditions (stop loss, take profit, trailing stops)
- Time filters (trading hours, session restrictions)
- Position sizing rules (risk per trade, max contracts)
- Additional filters (RSI, volume, etc.)

Always ask clarifying questions if critical information is missing:
- Which EMA period? (9, 20, 50, 200)
- What stop loss in ticks or dollars?
- What take profit / risk-reward ratio?
- What time window for trading?
- What instruments (ES, NQ, MES, MNQ)?

Be professional and concise. Guide the trader to a complete, executable strategy.`;

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
}

export interface ExitCondition {
  type: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'time_exit';
  value: number;
  unit: 'ticks' | 'dollars' | 'percent' | 'time';
}

export interface Filter {
  type: string;
  indicator?: string;
  period?: number;
  condition?: string;
  value?: number;
  start?: string;
  end?: string;
}

export interface PositionSizing {
  method: 'fixed' | 'risk_percent' | 'kelly';
  value: number;
  max_contracts?: number;
}

// Strategy parsing function
export async function parseStrategy(
  userMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const client = createAnthropicClient();
  
  const messages = [
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: STRATEGY_PARSER_SYSTEM_PROMPT,
    messages,
  });
  
  // Extract text content from response
  const textContent = response.content.find(block => block.type === 'text');
  return textContent ? textContent.text : '';
}
