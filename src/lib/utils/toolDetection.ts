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
    /what(?:'s| is) your instrument/i,
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
 * Used to prefill tool inputs.
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
 * Detect if Claude's response should trigger a tool.
 * Only triggers on high-confidence pattern matches.
 * 
 * @param responseText - Claude's complete response text (after Pass 1)
 * @param toolsAlreadyShown - Tools already shown in this conversation (prevent duplicates)
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
 * Merge prefill data from multiple sources with fallback chain:
 * 1. Conversation context (highest priority - most recent)
 * 2. User profile (firm name, account size from settings)
 * 3. Firm defaults (if firm is known)
 * 4. null (user must fill)
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
 * This becomes the "user message" that continues the conversation.
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
        message: `${values.instrument} with ${values.contractQuantity} contracts (${values.stopLossTicks} tick stop)`,
        metadata: {
          source: 'tool',
          toolType,
          values,
        },
      };
      
    case 'stop_loss_calculator':
      return {
        message: `${values.stopLossTicks} tick stop loss ($${values.riskPerContract} per contract)`,
        metadata: {
          source: 'tool',
          toolType,
          values,
        },
      };
      
    case 'drawdown_visualizer':
      return {
        message: `Daily limit: $${values.dailyLimit}, Total drawdown: $${values.drawdownLimit}`,
        metadata: {
          source: 'tool',
          toolType,
          values,
        },
      };
      
    case 'timeframe_helper':
      return {
        message: `Trading ${values.startTime} - ${values.endTime} ${values.timezone || 'ET'}`,
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
