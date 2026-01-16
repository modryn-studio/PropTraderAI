/**
 * RAPID STRATEGY GENERATION API
 * 
 * Phase 1 "Generate-First" flow:
 * 1. User describes strategy in natural language
 * 2. Parse immediately and apply safe defaults
 * 3. If stop loss missing → return critical question
 * 4. If complete → return strategy card
 * 
 * Target: 1-2 messages to complete strategy (vs 10+ in Socratic flow)
 * 
 * This runs PARALLEL to /api/strategy/parse-stream (not replacing it).
 * Feature flag controls which flow users see.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logBehavioralEventServer } from '@/lib/behavioral/logger';
import { createAnthropicClient } from '@/lib/claude/client';
import { detectCriticalGaps } from '@/lib/strategy/criticalGapsDetection';
import { applyPhase1Defaults } from '@/lib/strategy/applyPhase1Defaults';
import { detectInstrument, detectPattern as detectPatternFromMessage } from '@/lib/strategy/completenessDetection';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPES
// ============================================================================

interface RapidGenerateRequest {
  /** User's strategy description */
  message: string;
  /** Optional conversation ID for tracking */
  conversationId?: string;
  /** Answer to critical question (if this is message 2) */
  criticalAnswer?: {
    questionType: 'stopLoss' | 'instrument' | 'entryTrigger' | 'direction';
    value: string;
  };
}

interface StopLossOption {
  value: string;
  label: string;
  default?: boolean;
}

interface CriticalQuestionResponse {
  type: 'critical_question';
  question: string;
  questionType: 'stopLoss' | 'instrument' | 'entryTrigger' | 'direction';
  options: StopLossOption[];
  partialStrategy: {
    rules: StrategyRule[];
    pattern?: string;
    instrument?: string;
  };
  conversationId: string;
}

interface StrategyCompleteResponse {
  type: 'strategy_complete';
  strategy: {
    id: string;
    name: string;
    natural_language: string;
    parsed_rules: StrategyRule[];
    pattern?: string;
    instrument?: string;
  };
  conversationId: string;
  defaultsApplied: string[];
}

interface ErrorResponse {
  type: 'error';
  error: string;
}

type RapidGenerateResponse = CriticalQuestionResponse | StrategyCompleteResponse | ErrorResponse;

// ============================================================================
// STOP LOSS OPTIONS BY PATTERN
// ============================================================================

function getStopLossOptions(pattern?: string): StopLossOption[] {
  // Pattern-specific options
  if (pattern === 'opening_range_breakout' || pattern === 'orb') {
    return [
      { value: 'below_range', label: 'Below opening range low', default: true },
      { value: 'range_50', label: 'Middle of range (50%)', default: false },
      { value: 'fixed_10', label: 'Fixed: 10 ticks', default: false },
      { value: 'fixed_20', label: 'Fixed: 20 ticks', default: false },
      { value: 'custom', label: 'Other (specify)', default: false },
    ];
  }
  
  if (pattern === 'pullback' || pattern === 'ema_pullback') {
    return [
      { value: 'structure', label: 'Below recent swing low', default: true },
      { value: 'fixed_15', label: 'Fixed: 15 ticks', default: false },
      { value: 'atr_1', label: '1 ATR from entry', default: false },
      { value: 'custom', label: 'Other (specify)', default: false },
    ];
  }
  
  if (pattern === 'breakout') {
    return [
      { value: 'structure', label: 'Below breakout level', default: true },
      { value: 'fixed_10', label: 'Fixed: 10 ticks', default: false },
      { value: 'fixed_20', label: 'Fixed: 20 ticks', default: false },
      { value: 'custom', label: 'Other (specify)', default: false },
    ];
  }
  
  if (pattern === 'scalp') {
    return [
      { value: 'fixed_5', label: 'Fixed: 5 ticks (tight)', default: true },
      { value: 'fixed_10', label: 'Fixed: 10 ticks', default: false },
      { value: 'structure', label: 'Below recent low', default: false },
      { value: 'custom', label: 'Other (specify)', default: false },
    ];
  }
  
  // Generic options for unknown patterns
  return [
    { value: 'structure', label: 'Below recent structure', default: true },
    { value: 'fixed_10', label: 'Fixed: 10 ticks', default: false },
    { value: 'fixed_20', label: 'Fixed: 20 ticks', default: false },
    { value: 'atr_1', label: '1 ATR from entry', default: false },
    { value: 'custom', label: 'Other (specify)', default: false },
  ];
}

// ============================================================================
// STRATEGY PARSING (Simplified - no Socratic dialogue)
// ============================================================================

/**
 * Parse user message into strategy rules using Claude
 * Simpler than the full Socratic flow - just extract what's there
 */
async function parseUserStrategy(message: string): Promise<StrategyRule[]> {
  const anthropic = createAnthropicClient();
  
  const systemPrompt = `You are a trading strategy parser. Extract trading rules from the user's description.

Return a JSON array of rules. Each rule has:
- category: "setup" | "entry" | "exit" | "risk" | "timeframe" | "filters"
- label: Short name (e.g., "Instrument", "Entry Trigger", "Stop Loss")
- value: The value as stated by user

ONLY extract what the user explicitly mentions. Do NOT infer or add missing components.

Examples:
Input: "ES opening range breakout"
Output: [
  {"category":"setup","label":"Instrument","value":"ES"},
  {"category":"entry","label":"Pattern","value":"Opening Range Breakout"},
  {"category":"entry","label":"Entry Trigger","value":"Break above opening range high"}
]

Input: "NQ pullback to 20 EMA with 10 tick stop"
Output: [
  {"category":"setup","label":"Instrument","value":"NQ"},
  {"category":"entry","label":"Pattern","value":"EMA Pullback"},
  {"category":"entry","label":"Entry Trigger","value":"Pullback to 20 EMA"},
  {"category":"exit","label":"Stop Loss","value":"10 ticks"}
]

Respond with ONLY the JSON array, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });
    
    // Extract text from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }
    
    // Parse JSON response
    const parsed = JSON.parse(textContent.text);
    
    // Validate and return
    if (Array.isArray(parsed)) {
      return parsed.map(rule => ({
        category: rule.category || 'setup',
        label: rule.label || 'Unknown',
        value: rule.value || '',
        isDefaulted: false,
        source: 'user' as const,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('[RapidGenerate] Parse error:', error);
    return [];
  }
}

/**
 * Generate a strategy name from pattern and instrument
 */
function generateStrategyName(pattern?: string, instrument?: string, rules?: StrategyRule[]): string {
  const patternNames: Record<string, string> = {
    'opening_range_breakout': 'Opening Range Breakout',
    'orb': 'Opening Range Breakout',
    'pullback': 'Pullback',
    'ema_pullback': 'EMA Pullback',
    'breakout': 'Breakout',
    'momentum': 'Momentum',
    'vwap_trade': 'VWAP',
    'scalp': 'Scalping',
  };
  
  // Try to find entry pattern from rules for more specific name
  let entryDetail = '';
  if (rules) {
    const entryRule = rules.find(r => 
      r.label.toLowerCase().includes('entry') || 
      r.label.toLowerCase().includes('pattern') ||
      r.label.toLowerCase().includes('trigger')
    );
    if (entryRule && entryRule.value) {
      // Extract key parts (e.g., "Pullback to 20 EMA" → "20 EMA Pullback")
      const value = entryRule.value;
      if (value.match(/\d+\s*(ema|sma|vwap)/i)) {
        const match = value.match(/(\d+\s*(?:ema|sma|vwap))/i);
        if (match) entryDetail = match[1].toUpperCase() + ' ';
      }
    }
  }
  
  // Use pattern name or fall back to entry detail or "Strategy"
  let baseName = '';
  if (pattern && patternNames[pattern]) {
    baseName = patternNames[pattern];
  } else if (entryDetail) {
    baseName = entryDetail.trim();
  } else {
    baseName = 'Strategy';
  }
  
  const instrumentPrefix = instrument ? `${instrument} ` : '';
  
  return `${instrumentPrefix}${baseName}`;
}

/**
 * Convert stop loss answer to rule
 */
function stopLossAnswerToRule(answer: string): StrategyRule {
  const valueMap: Record<string, string> = {
    'below_range': 'Below opening range low',
    'range_50': '50% of opening range',
    'structure': 'Below recent structure',
    'fixed_5': '5 ticks',
    'fixed_10': '10 ticks',
    'fixed_15': '15 ticks',
    'fixed_20': '20 ticks',
    'atr_1': '1 ATR from entry',
  };
  
  return {
    category: 'exit',
    label: 'Stop Loss',
    value: valueMap[answer] || answer,
    isDefaulted: false,
    source: 'user',
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<RapidGenerateResponse>> {
  const startTime = Date.now();
  
  try {
    const body: RapidGenerateRequest = await request.json();
    const { message, conversationId, criticalAnswer } = body;
    
    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ type: 'error', error: 'Message is required' }, { status: 400 });
    }
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ type: 'error', error: 'Unauthorized' }, { status: 401 });
    }
    
    // ========================================================================
    // STEP 1: Get or create conversation
    // ========================================================================
    
    let currentConversationId: string = conversationId || '';
    
    if (!currentConversationId) {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('strategy_conversations')
        .insert({
          user_id: user.id,
          messages: [{ role: 'user', content: message, timestamp: new Date().toISOString() }],
          status: 'in_progress',
          conversation_type: 'rapid_flow',
        })
        .select('id')
        .single();
      
      if (createError || !newConversation) {
        console.error('[RapidGenerate] Failed to create conversation:', createError);
        return NextResponse.json({ type: 'error', error: 'Failed to create conversation' }, { status: 500 });
      }
      
      currentConversationId = newConversation.id as string;
    }
    
    // Log rapid flow start
    await logBehavioralEventServer(
      supabase,
      user.id,
      'rapid_flow_started',
      {
        conversationId: currentConversationId,
        messageLength: message.length,
        hasCriticalAnswer: !!criticalAnswer,
      }
    );
    
    // ========================================================================
    // STEP 2: Parse user message
    // ========================================================================
    
    const parsedRules = await parseUserStrategy(message);
    
    // Quick extraction for pattern and instrument (faster than Claude for common cases)
    const instrumentResult = detectInstrument(message);
    const patternResult = detectPatternFromMessage(message);
    
    const pattern = patternResult.value;
    const instrument = instrumentResult.value;
    
    // ========================================================================
    // STEP 3: Apply Phase 1 defaults
    // ========================================================================
    
    const defaultsResult = applyPhase1Defaults(parsedRules, message);
    let rulesWithDefaults = defaultsResult.rules;
    
    // ========================================================================
    // STEP 4: Handle critical answer (if this is message 2)
    // ========================================================================
    
    if (criticalAnswer && criticalAnswer.questionType === 'stopLoss') {
      // Add stop loss rule from user's answer
      const stopLossRule = stopLossAnswerToRule(criticalAnswer.value);
      rulesWithDefaults = [...rulesWithDefaults, stopLossRule];
    }
    
    // ========================================================================
    // STEP 5: Check critical gaps
    // ========================================================================
    
    const gapsResult = detectCriticalGaps(message, rulesWithDefaults);
    
    // ========================================================================
    // STEP 6: If stop loss missing, ask critical question
    // ========================================================================
    
    if (!gapsResult.gaps.stopLoss && !criticalAnswer) {
      // Log critical question shown
      await logBehavioralEventServer(
        supabase,
        user.id,
        'critical_question_shown',
        {
          conversationId: currentConversationId,
          questionType: 'stopLoss',
          pattern,
          instrument,
          timeToQuestion: Date.now() - startTime,
        }
      );
      
      // Build question based on pattern
      const patternLabel = pattern?.replace(/_/g, ' ') || 'strategy';
      const question = `Where's your stop loss for this ${patternLabel}?`;
      
      return NextResponse.json({
        type: 'critical_question',
        question,
        questionType: 'stopLoss',
        options: getStopLossOptions(pattern),
        partialStrategy: {
          rules: rulesWithDefaults,
          pattern,
          instrument,
        },
        conversationId: currentConversationId,
      });
    }
    
    // ========================================================================
    // STEP 7: Generate complete strategy
    // ========================================================================
    
    const strategyName = generateStrategyName(pattern, instrument, rulesWithDefaults);
    
    // Save to database
    const { data: savedStrategy, error: saveError } = await supabase
      .from('strategies')
      .insert({
        user_id: user.id,
        name: strategyName,
        natural_language: message,
        parsed_rules: {
          rules: rulesWithDefaults,
          pattern,
          instrument,
        },
        status: 'active',
        autonomy_level: 'copilot',
      })
      .select('id, name')
      .single();
    
    if (saveError) {
      console.error('[RapidGenerate] Failed to save strategy:', saveError);
      return NextResponse.json({ type: 'error', error: 'Failed to save strategy' }, { status: 500 });
    }
    
    // Update conversation status
    await supabase
      .from('strategy_conversations')
      .update({
        status: 'completed',
        final_strategy_id: savedStrategy.id,
      })
      .eq('id', currentConversationId);
    
    // Log completion
    await logBehavioralEventServer(
      supabase,
      user.id,
      'rapid_flow_completed',
      {
        conversationId: currentConversationId,
        strategyId: savedStrategy.id,
        messageCount: criticalAnswer ? 2 : 1,
        defaultsApplied: defaultsResult.defaultsApplied,
        pattern,
        instrument,
        timeToCompletion: Date.now() - startTime,
      }
    );
    
    return NextResponse.json({
      type: 'strategy_complete',
      strategy: {
        id: savedStrategy.id,
        name: savedStrategy.name,
        natural_language: message,
        parsed_rules: rulesWithDefaults,
        pattern,
        instrument,
      },
      conversationId: currentConversationId,
      defaultsApplied: defaultsResult.defaultsApplied,
    });
    
  } catch (error) {
    console.error('[RapidGenerate] Error:', error);
    return NextResponse.json({
      type: 'error',
      error: error instanceof Error ? error.message : 'Generation failed',
    }, { status: 500 });
  }
}
