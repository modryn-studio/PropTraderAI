/**
 * UNIFIED STRATEGY BUILD API
 * 
 * Issue #47 Week 3: Consolidated endpoint replacing:
 * - /api/strategy/generate-rapid (critical questions, pattern detection)
 * - /api/strategy/parse-stream (streaming, rule extraction)
 * 
 * Single flow:
 * 1. User message → Pattern detection (instant regex)
 * 2. If pattern detected with high confidence → return pattern_detected
 * 3. If no pattern or after confirmation → check gaps, ask critical questions
 * 4. If complete → return strategy_complete
 * 
 * Response types:
 * - pattern_detected: Show PatternConfirmation.tsx
 * - critical_question: Show question with options
 * - strategy_complete: Show StrategyEditableCard
 * - error: Show error message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logBehavioralEventServer } from '@/lib/behavioral/logger';
import { createAnthropicClient } from '@/lib/claude/client';
import { 
  validateInputQuality,
  detectAllGaps,
  type GapDetectionResult,
} from '@/lib/strategy/gapDetection';
import { applyPhase1Defaults } from '@/lib/strategy/applyPhase1Defaults';
import { 
  detectInstrument, 
  detectPattern as detectPatternFromMessage,
  detectExpertiseLevel,
  type CanonicalPatternType,
} from '@/lib/strategy/completenessDetection';
import {
  extractWithToolChoice,
  componentsToRules,
  getNextCriticalQuestion,
  type ConversationMessage,
} from '@/lib/strategy/toolChoiceExtraction';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPES - Unified request/response schema
// ============================================================================

type QuestionType = 'stopLoss' | 'instrument' | 'entryTrigger' | 'direction' | 'profitTarget' | 'positionSizing';

interface StrategyBuildRequest {
  /** User's strategy description or follow-up message */
  message: string;
  /** Conversation ID for tracking (created on first message) */
  conversationId?: string;
  /** Answer to critical question (if responding to a question) */
  criticalAnswer?: {
    questionType: QuestionType;
    value: string;
  };
  /** Pattern confirmation (if responding to pattern_detected) */
  patternConfirmation?: {
    confirmed: boolean;
    pattern?: CanonicalPatternType;
  };
  /** Previous partial strategy (for stateless re-evaluation) */
  partialStrategy?: {
    rules: StrategyRule[];
    pattern?: string;
    instrument?: string;
  };
  /** Conversation history for context preservation (Issue #49 fix) */
  conversationHistory?: ConversationMessage[];
}

interface AnswerOption {
  value: string;
  label: string;
  default?: boolean;
}

// Unified response types
interface PatternDetectedResponse {
  type: 'pattern_detected';
  pattern: CanonicalPatternType;
  patternName: string;
  fieldCount: number;
  conversationId: string;
  originalMessage: string;
}

interface CriticalQuestionResponse {
  type: 'critical_question';
  question: string;
  questionType: QuestionType;
  options: AnswerOption[];
  partialStrategy: {
    rules: StrategyRule[];
    pattern?: string;
    instrument?: string;
  };
  conversationId: string;
  allGaps?: GapDetectionResult;
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

type StrategyBuildResponse = 
  | PatternDetectedResponse 
  | CriticalQuestionResponse 
  | StrategyCompleteResponse 
  | ErrorResponse;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const PATTERN_DISPLAY_NAMES: Record<CanonicalPatternType, string> = {
  opening_range_breakout: 'Opening Range Breakout',
  ema_pullback: 'EMA Pullback',
  breakout: 'Breakout',
  vwap: 'VWAP',
};

const PATTERN_FIELD_COUNTS: Record<CanonicalPatternType, number> = {
  opening_range_breakout: 7,
  ema_pullback: 8,
  breakout: 8,
  vwap: 6,
};

/**
 * Parse user message into strategy rules using Claude
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
    
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }
    
    const parsed = JSON.parse(textContent.text);
    
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
    console.error('[StrategyBuild] Parse error:', error);
    return [];
  }
}

/**
 * Generate strategy name from pattern and instrument
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
  
  let entryDetail = '';
  if (rules) {
    const entryRule = rules.find(r => 
      r.label.toLowerCase().includes('entry') || 
      r.label.toLowerCase().includes('pattern') ||
      r.label.toLowerCase().includes('trigger')
    );
    if (entryRule && entryRule.value) {
      const value = entryRule.value;
      if (value.match(/\d+\s*(ema|sma|vwap)/i)) {
        const match = value.match(/(\d+\s*(?:ema|sma|vwap))/i);
        if (match) entryDetail = match[1].toUpperCase() + ' ';
      }
    }
  }
  
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
 * Convert critical answer to rule
 */
function answerToRule(questionType: QuestionType, value: string): StrategyRule | null {
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
  
  const entryDescriptions: Record<string, string> = {
    'orb': 'Opening range breakout',
    'pullback': 'Pullback to support/MA',
    'vwap': 'VWAP cross',
    'breakout': 'Breakout of structure',
    'momentum': 'Momentum / New highs',
  };

  switch (questionType) {
    case 'stopLoss':
      return {
        category: 'exit',
        label: 'Stop Loss',
        value: valueMap[value] || value,
        isDefaulted: false,
        source: 'user',
      };
    case 'instrument':
      return {
        category: 'setup',
        label: 'Instrument',
        value: value.toUpperCase(),
        isDefaulted: false,
        source: 'user',
      };
    case 'entryTrigger':
      return {
        category: 'entry',
        label: 'Entry Trigger',
        value: entryDescriptions[value] || value,
        isDefaulted: false,
        source: 'user',
      };
    case 'direction':
      return {
        category: 'entry',
        label: 'Direction',
        value: value.toLowerCase().includes('long') ? 'Long' : 
               value.toLowerCase().includes('short') ? 'Short' : 'Both',
        isDefaulted: false,
        source: 'user',
      };
    case 'profitTarget':
      return {
        category: 'exit',
        label: 'Profit Target',
        value,
        isDefaulted: false,
        source: 'user',
      };
    case 'positionSizing':
      return {
        category: 'risk',
        label: 'Position Sizing',
        value,
        isDefaulted: false,
        source: 'user',
      };
    default:
      return null;
  }
}

/**
 * Map gap component to question type
 */
function mapComponentToQuestionType(component?: string): QuestionType {
  const mapping: Record<string, QuestionType> = {
    'stop_loss': 'stopLoss',
    'instrument': 'instrument',
    'entry_criteria': 'entryTrigger',
    'direction': 'direction',
    'profit_target': 'profitTarget',
    'position_sizing': 'positionSizing',
    'input_quality': 'entryTrigger',
  };
  return mapping[component || ''] || 'stopLoss';
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<StrategyBuildResponse>> {
  const startTime = Date.now();
  
  try {
    const body: StrategyBuildRequest = await request.json();
    const { message, conversationId, criticalAnswer, patternConfirmation, partialStrategy } = body;
    
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
    // STEP 1: INPUT QUALITY VALIDATION
    // ========================================================================
    
    const isFollowUp = !!(criticalAnswer || patternConfirmation);
    const inputQuality = validateInputQuality(message, { isAnsweringQuestion: isFollowUp });
    
    if (!inputQuality.canProceed) {
      await logBehavioralEventServer(supabase, user.id, 'input_quality_rejected', {
        message: message.substring(0, 100),
        issues: inputQuality.issues,
      });
      
      if (inputQuality.suggestedQuestions && inputQuality.suggestedQuestions.length > 0) {
        const q = inputQuality.suggestedQuestions[0];
        return NextResponse.json({
          type: 'critical_question',
          question: q.question,
          questionType: 'entryTrigger',
          options: q.options.map(o => ({ value: o.value, label: o.label, default: o.default })),
          partialStrategy: { rules: [], pattern: undefined, instrument: undefined },
          conversationId: conversationId || '',
        });
      }
      
      return NextResponse.json({ 
        type: 'error', 
        error: inputQuality.issues[0] || 'Please describe your trading strategy',
      }, { status: 400 });
    }
    
    // ========================================================================
    // STEP 2: GET OR CREATE CONVERSATION
    // ========================================================================
    
    let currentConversationId = conversationId || '';
    
    if (!currentConversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from('strategy_conversations')
        .insert({
          user_id: user.id,
          messages: [{ role: 'user', content: message, timestamp: new Date().toISOString() }],
          status: 'in_progress',
        })
        .select('id')
        .single();
      
      if (createError || !newConversation) {
        console.error('[StrategyBuild] Failed to create conversation:', createError, 'Details:', JSON.stringify(createError, null, 2));
        return NextResponse.json({ 
          type: 'error', 
          error: `Failed to create conversation: ${createError?.message || 'Unknown error'}` 
        }, { status: 500 });
      }
      
      currentConversationId = newConversation.id as string;
    }
    
    // ========================================================================
    // STEP 3: PARSE MESSAGE & DETECT CONTEXT
    // Issue #49 fix: Use tool-choice extraction for follow-up messages
    // This preserves context from earlier messages (e.g., "ES" from msg 1)
    // ========================================================================
    
    let parsedRules: StrategyRule[];
    let pattern: string | undefined;
    let instrument: string | undefined;
    
    // Get conversation history for tool-choice extraction
    const conversationHistory = body.conversationHistory || [];
    
    if (isFollowUp && conversationHistory.length > 0) {
      // ===================================================================
      // FOLLOW-UP MESSAGE: Use tool-choice extraction (Issue #49 fix)
      // Claude preserves context from earlier messages natively
      // ===================================================================
      
      // Add current message to history for extraction
      const fullHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: 'user', content: message },
      ];
      
      // Extract components using Claude tool-choice (stateful!)
      const extractionResult = await extractWithToolChoice(fullHistory);
      
      // Convert extracted components to rules
      parsedRules = componentsToRules(extractionResult.components);
      pattern = extractionResult.components.pattern || partialStrategy?.pattern;
      instrument = extractionResult.components.instrument || partialStrategy?.instrument;
      
      // Log tool-choice extraction
      await logBehavioralEventServer(supabase, user.id, 'tool_choice_extraction', {
        conversationId: currentConversationId,
        missingCritical: extractionResult.missingCritical,
        isComplete: extractionResult.isComplete,
        extractedComponents: extractionResult.components,
      });
      
      // If still missing critical components, ask follow-up question
      if (!extractionResult.isComplete) {
        const nextQuestion = getNextCriticalQuestion(
          extractionResult.missingCritical,
          pattern
        );
        
        if (nextQuestion) {
          return NextResponse.json({
            type: 'critical_question',
            question: nextQuestion.question,
            questionType: nextQuestion.questionType,
            options: nextQuestion.options,
            partialStrategy: {
              rules: parsedRules,
              pattern,
              instrument,
            },
            conversationId: currentConversationId,
          });
        }
      }
      
    } else if (isFollowUp && partialStrategy) {
      // Fallback for follow-up without conversation history
      parsedRules = partialStrategy.rules || [];
      pattern = partialStrategy.pattern;
      instrument = partialStrategy.instrument;
    } else {
      // First message: Use existing Claude parsing + regex detection
      parsedRules = await parseUserStrategy(message);
      const instrumentResult = detectInstrument(message);
      const patternResult = detectPatternFromMessage(message);
      pattern = patternResult.value;
      instrument = instrumentResult.value;
    }
    
    // ========================================================================
    // STEP 4: PATTERN DETECTION (First message only, before critical questions)
    // ========================================================================
    
    if (!isFollowUp) {
      const expertiseResult = detectExpertiseLevel(message);
      
      if (
        expertiseResult.detectedPattern && 
        expertiseResult.patternConfidence && 
        expertiseResult.patternConfidence !== 'low'
      ) {
        const detectedPattern = expertiseResult.detectedPattern;
        
        await logBehavioralEventServer(supabase, user.id, 'pattern_detected', {
          conversationId: currentConversationId,
          pattern: detectedPattern,
          confidence: expertiseResult.patternConfidence,
          timeToDetection: Date.now() - startTime,
        });
        
        return NextResponse.json({
          type: 'pattern_detected',
          pattern: detectedPattern,
          patternName: PATTERN_DISPLAY_NAMES[detectedPattern] || detectedPattern,
          fieldCount: PATTERN_FIELD_COUNTS[detectedPattern] || 8,
          conversationId: currentConversationId,
          originalMessage: message,
        });
      }
    }
    
    // ========================================================================
    // STEP 5: HANDLE PATTERN CONFIRMATION
    // ========================================================================
    
    if (patternConfirmation?.confirmed && patternConfirmation.pattern) {
      pattern = patternConfirmation.pattern;
      await logBehavioralEventServer(supabase, user.id, 'pattern_confirmed', {
        conversationId: currentConversationId,
        pattern,
      });
    }
    
    // ========================================================================
    // STEP 6: APPLY DEFAULTS
    // ========================================================================
    
    const defaultsResult = applyPhase1Defaults(parsedRules, message);
    let rulesWithDefaults = defaultsResult.rules;
    
    // ========================================================================
    // STEP 7: HANDLE CRITICAL ANSWER
    // ========================================================================
    
    if (criticalAnswer) {
      const answerRule = answerToRule(criticalAnswer.questionType, criticalAnswer.value);
      if (answerRule) {
        const answerCategory = answerRule.category;
        rulesWithDefaults = rulesWithDefaults.filter(r => r.category !== answerCategory);
        rulesWithDefaults = [...rulesWithDefaults, answerRule];
        
        if (criticalAnswer.questionType === 'instrument') {
          instrument = criticalAnswer.value.toUpperCase();
        }
      }
    }
    
    // ========================================================================
    // STEP 8: CHECK GAPS (First message only)
    // Issue #49 fix: Skip regex gap detection for follow-ups - 
    // tool-choice extraction in STEP 3 already handled context preservation
    // ========================================================================
    
    // Only run regex gap detection for first messages
    // Follow-up messages use tool-choice extraction which is stateful
    if (!isFollowUp) {
      const gapsResult = detectAllGaps(message, rulesWithDefaults, {
        pattern,
        instrument,
        isFollowUp,
      });
      
      if (gapsResult.action.type === 'ask_question') {
        const questions = gapsResult.action.questions || [];
        
        if (questions.length > 0) {
          const topQuestion = questions[0];
          const gapComponent = gapsResult.action.gapComponent;
          const questionType = mapComponentToQuestionType(gapComponent);
          
          await logBehavioralEventServer(supabase, user.id, 'critical_question_shown', {
            conversationId: currentConversationId,
            questionType,
            pattern,
            instrument,
          });
          
          return NextResponse.json({
            type: 'critical_question',
            question: topQuestion.question,
            questionType,
            options: topQuestion.options.map(o => ({ value: o.value, label: o.label, default: o.default })),
            partialStrategy: {
              rules: rulesWithDefaults,
              pattern: gapsResult.pattern || pattern,
              instrument: gapsResult.instrument || instrument,
            },
            conversationId: currentConversationId,
            allGaps: gapsResult,
          });
        }
      }
    }
    
    // ========================================================================
    // STEP 9: GENERATE COMPLETE STRATEGY
    // ========================================================================
    
    // Ensure entry rule exists
    const hasEntryRules = rulesWithDefaults.some(r => r.category === 'entry');
    if (pattern && !hasEntryRules) {
      const patternDescriptions: Record<string, string> = {
        'orb': 'Opening Range Breakout',
        'opening_range_breakout': 'Opening Range Breakout',
        'vwap': 'VWAP Cross',
        'ema_pullback': 'EMA Pullback',
        'pullback': 'Pullback to Support',
        'breakout': 'Breakout',
      };
      
      rulesWithDefaults.push({
        category: 'entry',
        label: 'Entry Trigger',
        value: patternDescriptions[pattern] || pattern.replace(/_/g, ' '),
        isDefaulted: true,
        source: 'default',
      });
    }
    
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
      console.error('[StrategyBuild] Failed to save strategy:', saveError);
      await supabase.from('strategy_conversations').update({ status: 'failed' }).eq('id', currentConversationId);
      return NextResponse.json({ type: 'error', error: 'Failed to save strategy' }, { status: 500 });
    }
    
    // Update conversation
    await supabase
      .from('strategy_conversations')
      .update({ status: 'completed', final_strategy_id: savedStrategy.id })
      .eq('id', currentConversationId);
    
    await logBehavioralEventServer(supabase, user.id, 'strategy_build_completed', {
      conversationId: currentConversationId,
      strategyId: savedStrategy.id,
      messageCount: isFollowUp ? 2 : 1,
      defaultsApplied: defaultsResult.defaultsApplied,
      pattern,
      instrument,
      timeToCompletion: Date.now() - startTime,
    });
    
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
    console.error('[StrategyBuild] Error:', error);
    return NextResponse.json({
      type: 'error',
      error: error instanceof Error ? error.message : 'Strategy build failed',
    }, { status: 500 });
  }
}
