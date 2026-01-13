/**
 * Smart Tool Detection System
 * 
 * Detects when Claude's response should trigger an inline calculator/tool.
 * Tools appear AFTER Claude asks a question, not when user mentions a topic.
 * 
 * Part of: TOKEN SAVINGS INITIATIVE
 * Phase: 1 (Position Size Calculator MVP)
 * 
 * Created: January 13, 2026
 */

// ============================================================================
// TOOL TYPES
// ============================================================================

export type ToolType = 
  | 'position_size_calculator'
  | 'contract_selector'
  | 'drawdown_visualizer'
  | 'stop_loss_calculator'
  | 'timeframe_helper';

export interface ToolTriggerResult {
  shouldShowTool: boolean;
  toolType: ToolType | null;
  confidence: number; // 0-1, only trigger if > 0.9
  matchedPattern: string | null;
}

export interface PrefilledData {
  accountSize?: number;
  drawdownLimit?: number;
  dailyLimit?: number;
  riskPercent?: number;
  riskAmount?: number;
  stopLossTicks?: number;
  instrument?: string;
  timezone?: string;
}

export interface ToolSSEEvent {
  type: 'tool';
  toolType: ToolType;
  prefilledData: PrefilledData;
  messageId?: string;
}

// ============================================================================
// TRIGGER PATTERNS
// ============================================================================

/**
 * Patterns that trigger each tool type.
 * High-confidence patterns only - we want >90% accuracy.
 * 
 * CRITICAL: These match CLAUDE'S questions, not user input.
 */
const TOOL_TRIGGERS: Record<ToolType, RegExp[]> = {
  position_size_calculator: [
    /what['']?s your risk per trade/i,
    /how much (?:do you want to|are you willing to|will you) risk/i,
    /what percentage (?:of|do you) risk/i,
    /risk amount per trade/i,
    /how much risk per trade/i,
    /let['']?s (?:nail down|dial in|set) your risk/i,
    /what['']?s your risk tolerance/i,
  ],
  
  contract_selector: [
    /(?:trading|trade) (?:full[- ]size )?(?:NQ|ES|CL|GC) or (?:M(?:NQ|ES|CL|GC)|micro)/i,
    /which contract (?:size|are you trading)/i,
    /full[- ]?size or micro/i,
    /NQ or MNQ/i,
    /ES or MES/i,
    /CL or MCL/i,
    /GC or MGC/i,
    /what(?:'s| is) your instrument/i,
    // Tool chaining patterns - reference previous tool data
    /based on (?:that|your) \$\d+.*(?:which contract|NQ or MNQ)/i,
    /with that risk.*(?:full.?size or micro)/i,
    // Common instrument phrases
    /trade (?:the )?(?:E-?mini )?Nasdaq/i,
    /trade (?:the )?(?:E-?mini )?S&P/i,
    /trade (?:crude|oil)/i,
    /trade gold/i,
  ],
  
  drawdown_visualizer: [
    /daily (?:loss )?limit/i,
    /max(?:imum)? (?:daily )?drawdown/i,
    /how much can you lose (?:per day|daily)/i,
    /what(?:'s| is) your drawdown limit/i,
    /challenge (?:drawdown|limit)/i,
  ],
  
  stop_loss_calculator: [
    /what['']?s your stop (?:loss)?/i,
    /where (?:do you|will you) (?:place|put|set) your stop/i,
    /how (?:big|wide) (?:is )?(?:your |the )?stop/i,
    /stop loss (?:size|in ticks)/i,
    // Tool chaining - reference contract choice
    /now that you.*(?:contracts?|instrument).*(?:where|what).*stop/i,
  ],
  
  timeframe_helper: [
    /what time(?:s|frame)? do you trade/i,
    /when (?:do you|will you) trade/i,
    /trading hours/i,
    /what(?:'s| is) your (?:trading )?session/i,
    /which session/i,
  ],
};

// ============================================================================
// CONTEXT EXTRACTION
// ============================================================================

/**
 * Extract numerical values and context from conversation history.
 * Used to prefill tool inputs with values the user has already mentioned.
 * 
 * @description Parses all messages to find:
 * - Account size (e.g., "$50k account", "150k funded")
 * - Drawdown limits (e.g., "$2000 max drawdown")
 * - Daily loss limits (e.g., "$1000 daily limit")
 * - Risk percentage (e.g., "risking 1%")
 * - Stop loss in ticks (e.g., "10 tick stop")
 * - Instrument (e.g., "NQ", "MES", "CL")
 * 
 * @param messages - Array of conversation messages with role and content
 * @returns PrefilledData object with any extracted values (undefined if not found)
 * 
 * @example
 * const messages = [
 *   { role: 'user', content: 'I have a $50k Topstep account' },
 *   { role: 'assistant', content: 'Great! What\'s your risk per trade?' }
 * ];
 * const context = extractContextFromConversation(messages);
 * // Returns: { accountSize: 50000 }
 */
export function extractContextFromConversation(
  messages: Array<{ role: string; content: string }>
): PrefilledData {
  const context: PrefilledData = {};
  
  // Combine all messages for pattern matching
  const allText = messages.map(m => m.content).join('\n');
  
  // Account size patterns
  const accountPatterns = [
    /\$?([\d,]+)(?:k|K)?\s*(?:account|funded|challenge)/i,
    /account\s*(?:size|balance)?[:\s]+\$?([\d,]+)/i,
    /(\d{2,3})k\s*(?:account|funded)/i,
  ];
  
  for (const pattern of accountPatterns) {
    const match = allText.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      // Handle "150k" format
      if (/k$/i.test(match[0]) || parseInt(value) < 1000) {
        context.accountSize = parseInt(value) * 1000;
      } else {
        context.accountSize = parseInt(value);
      }
      break;
    }
  }
  
  // Drawdown limit patterns
  const drawdownPatterns = [
    /(?:max(?:imum)?|total) drawdown[:\s]+\$?([\d,]+)/i,
    /\$?([\d,]+)\s*(?:max )?drawdown/i,
    /drawdown limit[:\s]+\$?([\d,]+)/i,
    /trailing drawdown[:\s]+\$?([\d,]+)/i,
  ];
  
  for (const pattern of drawdownPatterns) {
    const match = allText.match(pattern);
    if (match) {
      context.drawdownLimit = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Daily loss limit patterns
  const dailyPatterns = [
    /daily (?:loss )?limit[:\s]+\$?([\d,]+)/i,
    /\$?([\d,]+)\s*daily (?:loss )?limit/i,
    /lose \$?([\d,]+) per day/i,
  ];
  
  for (const pattern of dailyPatterns) {
    const match = allText.match(pattern);
    if (match) {
      context.dailyLimit = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Risk percentage patterns
  const riskPatterns = [
    /risk(?:ing)?\s+([\d.]+)%/i,
    /([\d.]+)%\s*(?:of\s+)?risk/i,
    /([\d.]+)\s*percent\s*risk/i,
  ];
  
  for (const pattern of riskPatterns) {
    const match = allText.match(pattern);
    if (match) {
      context.riskPercent = parseFloat(match[1]);
      break;
    }
  }
  
  // Stop loss patterns
  const stopPatterns = [
    /stop(?:\s+loss)?\s*(?:of|at|is)?\s*(\d+)\s*ticks?/i,
    /(\d+)\s*tick\s*stop/i,
    /stop\s*[:=]\s*(\d+)/i,
  ];
  
  for (const pattern of stopPatterns) {
    const match = allText.match(pattern);
    if (match) {
      context.stopLossTicks = parseInt(match[1]);
      break;
    }
  }
  
  // Instrument patterns
  const instrumentPatterns = [
    /\b(ES|NQ|MES|MNQ|CL|MCL|GC|MGC|YM|MYM|RTY|M2K)\b/i,
    /trading\s+(E-?mini|Micro)?\s*(Nasdaq|S&P|Crude|Gold)/i,
  ];
  
  for (const pattern of instrumentPatterns) {
    const match = allText.match(pattern);
    if (match) {
      // Normalize to standard symbol
      const raw = match[1].toUpperCase();
      context.instrument = raw;
      break;
    }
  }
  
  // Calculate risk amount if we have account size and risk percent
  if (context.accountSize && context.riskPercent) {
    context.riskAmount = context.accountSize * (context.riskPercent / 100);
  }
  
  return context;
}

// ============================================================================
// TOOL DETECTION
// ============================================================================

/**
 * Detect if Claude's response should trigger an inline Smart Tool.
 * 
 * @description Analyzes Claude's response for specific question patterns that indicate
 * the user should use an interactive calculator instead of typing. Only triggers on
 * high-confidence pattern matches (>90% accuracy) to avoid false positives.
 * 
 * Tools are checked in priority order:
 * 1. position_size_calculator - "What's your risk per trade?"
 * 2. contract_selector - "Which contract are you trading?"
 * 3. drawdown_visualizer - "What's your drawdown limit?"
 * 4. stop_loss_calculator - "Where do you place your stop?"
 * 5. timeframe_helper - "What times do you trade?"
 * 
 * @param responseText - Claude's complete response text (after Pass 1 streaming)
 * @param toolsAlreadyShown - Tools already shown in this conversation (prevents duplicates)
 * @returns ToolTriggerResult with shouldShowTool, toolType, confidence, and matched pattern
 * 
 * @example
 * const result = detectToolTrigger("Great! What's your risk per trade?", []);
 * // Returns: { shouldShowTool: true, toolType: 'position_size_calculator', confidence: 0.95 }
 */
export function detectToolTrigger(
  responseText: string,
  toolsAlreadyShown: ToolType[] = []
): ToolTriggerResult {
  // Default: no tool
  const noTool: ToolTriggerResult = {
    shouldShowTool: false,
    toolType: null,
    confidence: 0,
    matchedPattern: null,
  };
  
  // Check each tool type in priority order
  const toolPriority: ToolType[] = [
    'position_size_calculator', // Most common, highest token savings
    'contract_selector',
    'drawdown_visualizer',
    'stop_loss_calculator',
    'timeframe_helper',
  ];
  
  for (const toolType of toolPriority) {
    // Skip if already shown
    if (toolsAlreadyShown.includes(toolType)) {
      continue;
    }
    
    const patterns = TOOL_TRIGGERS[toolType];
    
    for (const pattern of patterns) {
      if (pattern.test(responseText)) {
        return {
          shouldShowTool: true,
          toolType,
          confidence: 0.95, // High confidence for exact pattern matches
          matchedPattern: pattern.source,
        };
      }
    }
  }
  
  return noTool;
}

// ============================================================================
// PREFILL MERGING
// ============================================================================

/**
 * Merge prefill data from multiple sources with intelligent fallback chain.
 * 
 * @description Combines values from conversation, user profile, and firm defaults
 * to prefill tool inputs. Priority order (highest to lowest):
 * 1. Conversation context - Values user explicitly mentioned
 * 2. User profile - Settings from their PropTraderAI profile
 * 3. Firm defaults - Standard values for their prop firm
 * 4. undefined - User must fill in manually
 * 
 * @param conversationContext - Values extracted from current conversation
 * @param userProfile - User's profile data (firm_name, account_size, account_type)
 * @param firmDefaults - Optional record of firm-specific default values
 * @returns Merged PrefilledData object with best available values
 * 
 * @example
 * const merged = mergePrefillData(
 *   { riskPercent: 1.5 },                    // User said 1.5%
 *   { firm_name: 'topstep', account_size: 50000 },
 *   FIRM_DEFAULTS
 * );
 * // Returns: { accountSize: 50000, riskPercent: 1.5, drawdownLimit: 2000 }
 */
export function mergePrefillData(
  conversationContext: PrefilledData,
  userProfile: {
    firm_name?: string | null;
    account_size?: number | null;
    account_type?: string | null;
  } | null,
  firmDefaults?: Record<string, Partial<PrefilledData>>
): PrefilledData {
  const merged: PrefilledData = {};
  
  // Get firm-specific defaults if available
  const firmData = userProfile?.firm_name && firmDefaults?.[userProfile.firm_name.toLowerCase()]
    ? firmDefaults[userProfile.firm_name.toLowerCase()]
    : {};
  
  // Merge with priority: conversation > profile > firm > null
  merged.accountSize = 
    conversationContext.accountSize ?? 
    userProfile?.account_size ?? 
    firmData.accountSize;
    
  merged.drawdownLimit = 
    conversationContext.drawdownLimit ?? 
    firmData.drawdownLimit;
    
  merged.dailyLimit = 
    conversationContext.dailyLimit ?? 
    firmData.dailyLimit;
    
  merged.riskPercent = 
    conversationContext.riskPercent ?? 
    firmData.riskPercent;
    
  merged.instrument = 
    conversationContext.instrument ?? 
    firmData.instrument;
    
  merged.stopLossTicks = 
    conversationContext.stopLossTicks;
    
  // Recalculate risk amount with merged values
  if (merged.accountSize && merged.riskPercent) {
    merged.riskAmount = merged.accountSize * (merged.riskPercent / 100);
  }
  
  return merged;
}

// ============================================================================
// FIRM DEFAULTS (Common prop firm presets)
// ============================================================================

export const FIRM_DEFAULTS: Record<string, Partial<PrefilledData>> = {
  topstep: {
    drawdownLimit: 2000, // $50k account default
    dailyLimit: 1000,
    riskPercent: 1.0,
  },
  myfundedfutures: {
    drawdownLimit: 2500,
    dailyLimit: 1250,
    riskPercent: 1.0,
  },
  apex: {
    drawdownLimit: 2500,
    dailyLimit: 1100,
    riskPercent: 1.0,
  },
  tradeify: {
    drawdownLimit: 2500,
    dailyLimit: 1250,
    riskPercent: 1.0,
  },
};

// ============================================================================
// TOOL RESPONSE FORMATTING
// ============================================================================

/**
 * Format tool response values as natural language for Claude.
 * 
 * @description Converts structured tool values into a human-readable message
 * that continues the conversation naturally. The message is sent as a "user"
 * message so Claude can process the information and continue.
 * 
 * Also returns metadata that can be stored for:
 * - PATH 2 behavioral analytics
 * - Prefilling future tools in the same conversation
 * - Debugging and audit trails
 * 
 * @param toolType - The type of tool that was completed
 * @param values - The values selected/calculated by the user in the tool
 * @returns Object with message (for Claude) and metadata (for analytics)
 * 
 * @example
 * const { message, metadata } = formatToolResponse('position_size_calculator', {
 *   accountSize: 50000,
 *   riskPercent: 1.0,
 *   riskAmount: 500
 * });
 * // message: "1% risk per trade ($500)"
 * // metadata: { source: 'tool', toolType: 'position_size_calculator', values: {...} }
 */
export function formatToolResponse(
  toolType: ToolType,
  values: Record<string, unknown>
): { message: string; metadata: Record<string, unknown> } {
  switch (toolType) {
    case 'position_size_calculator':
      return {
        message: `${values.riskPercent}% risk per trade ($${values.riskAmount?.toLocaleString() || 'N/A'})`,
        metadata: {
          source: 'tool',
          toolType,
          values: {
            accountSize: values.accountSize,
            drawdownLimit: values.drawdownLimit,
            riskPercent: values.riskPercent,
            riskAmount: values.riskAmount,
            tradesUntilDrawdown: values.tradesUntilDrawdown,
          },
        },
      };
      
    case 'contract_selector':
      return {
        message: `I'll trade ${values.contractQuantity} ${values.instrument} contract${(values.contractQuantity as number) !== 1 ? 's' : ''} with a ${values.stopLossTicks}-tick stop, risking $${(values.riskPerContract as number)?.toFixed(2) || 'N/A'} per contract ($${(values.totalRisk as number)?.toFixed(2) || 'N/A'} total).`,
        metadata: {
          source: 'tool',
          toolType,
          values,
        },
      };
      
    case 'stop_loss_calculator':
      return {
        message: `I'll use a ${values.stopLossTicks}-tick stop${values.stopType === 'atr' ? ' (ATR-based)' : values.stopType === 'dollar' ? ' (dollar-based)' : ''}, risking $${(values.riskPerContract as number)?.toFixed(2) || 'N/A'} per contract.`,
        metadata: {
          source: 'tool',
          toolType,
          values,
        },
      };
      
    case 'drawdown_visualizer':
      const pnl = values.currentPnL as number || 0;
      const pnlDirection = pnl >= 0 ? 'up' : 'down';
      return {
        message: `My daily loss limit is $${values.dailyLimit} and max drawdown is $${values.drawdownLimit}. Currently ${pnlDirection} $${Math.abs(pnl).toFixed(0)} today${values.tradesRemainingDaily ? `, with ${values.tradesRemainingDaily} trades left before hitting my daily limit` : ''}.`,
        metadata: {
          source: 'tool',
          toolType,
          values,
        },
      };
      
    case 'timeframe_helper':
      const days = values.days as string[] || [];
      const daysStr = days.length === 5 && !days.includes('Sat') && !days.includes('Sun') 
        ? 'weekdays' 
        : days.length === 7 ? 'every day' : days.join(', ');
      return {
        message: `I trade from ${values.startTime} to ${values.endTime} ${values.timezone || 'ET'} on ${daysStr}.`,
        metadata: {
          source: 'tool',
          toolType,
          values,
        },
      };
      
    default:
      return {
        message: JSON.stringify(values),
        metadata: { source: 'tool', toolType, values },
      };
  }
}
