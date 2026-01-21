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
import { 
  validateInputQuality,
} from '@/lib/strategy/gapDetection';
import { applyPhase1Defaults } from '@/lib/strategy/applyPhase1Defaults';
import { 
  detectExpertiseLevel,
  type CanonicalPatternType,
} from '@/lib/strategy/completenessDetection';
import {
  extractWithToolChoice,
  componentsToRules,
  getNextCriticalQuestion,
  type ConversationMessage,
} from '@/lib/strategy/toolChoiceExtraction';
import { claudeToCanonical, type ClaudeStrategyOutput } from '@/lib/strategy/claudeToCanonical';
import { generateEventsFromCanonical, type StrategyEvent } from '@/lib/strategy/eventStore';
import type { CanonicalParsedRules } from '@/lib/execution/canonical-schema';
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
  // allGaps removed - Issue #49 v2: Using tool-choice extraction instead of regex gap detection
}

interface StrategyCompleteResponse {
  type: 'strategy_complete';
  strategy: {
    id?: string; // Optional - only present if saved to database
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

// parseUserStrategy function REMOVED - Issue #49 v2
// Now using extractWithToolChoice() from toolChoiceExtraction.ts for all messages
// Tool-choice extraction is more accurate for compound statements and preserves context

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

// mapComponentToQuestionType function REMOVED - Issue #49 v2
// Was used for regex gap detection, now replaced by getNextCriticalQuestion()

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
    // STEP 3: PARSE MESSAGE WITH TOOL-CHOICE EXTRACTION
    // Issue #49 v2: Use tool-choice for ALL messages, not just follow-ups
    // This handles compound first messages like "ES ORB with 20 tick stop"
    // ========================================================================
    
    let pattern: string | undefined;
    let instrument: string | undefined;
    
    // Get conversation history for tool-choice extraction
    const conversationHistory = body.conversationHistory || [];
    
    // Build full conversation history including current message
    const fullHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];
    
    // Use tool-choice extraction for ALL messages (unified approach)
    // This is more accurate than regex for compound statements and preserves context
    const extractionResult = await extractWithToolChoice(fullHistory);
    
    // Convert extracted components to rules
    const parsedRules = componentsToRules(extractionResult.components);
    pattern = extractionResult.components.pattern || partialStrategy?.pattern;
    instrument = extractionResult.components.instrument || partialStrategy?.instrument;
    
    // Log tool-choice extraction
    await logBehavioralEventServer(supabase, user.id, 'tool_choice_extraction', {
      conversationId: currentConversationId,
      isFirstMessage: !isFollowUp,
      missingCritical: extractionResult.missingCritical,
      isComplete: extractionResult.isComplete,
      extractedComponents: extractionResult.components,
    });
    
    // ========================================================================
    // STEP 4: PATTERN DETECTION (First message only, before critical questions)
    // Show PatternConfirmation UI if we detected a known pattern
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
        // Only replace rules with the SAME LABEL, not all rules in the same category
        // This preserves other defaults (e.g., keep Profit Target when adding Stop Loss)
        rulesWithDefaults = rulesWithDefaults.filter(r => 
          r.label.toLowerCase() !== answerRule.label.toLowerCase()
        );
        rulesWithDefaults = [...rulesWithDefaults, answerRule];
        
        if (criticalAnswer.questionType === 'instrument') {
          instrument = criticalAnswer.value.toUpperCase();
        }
      }
    }
    
    // ========================================================================
    // STEP 8: CHECK FOR MISSING CRITICAL COMPONENTS (Tool-Choice Based)
    // Issue #49 v2: Use tool-choice extraction results instead of regex
    // This runs AFTER pattern confirmation, so we can apply defaults first
    // ========================================================================
    
    // Only ask questions if:
    // 1. Extraction is incomplete
    // 2. This is NOT a first message with pattern detection (let PatternConfirmation handle it)
    // 3. User has confirmed pattern OR no pattern was detected (isFollowUp handles both cases)
    const hasPatternConfirmation = !!patternConfirmation;
    const shouldAskQuestion = 
      !extractionResult.isComplete && 
      (isFollowUp || hasPatternConfirmation);
    
    if (shouldAskQuestion) {
      const nextQuestion = getNextCriticalQuestion(
        extractionResult.missingCritical,
        pattern
      );
      
      if (nextQuestion) {
        await logBehavioralEventServer(supabase, user.id, 'critical_question_shown', {
          conversationId: currentConversationId,
          questionType: nextQuestion.questionType,
          pattern,
          instrument,
          source: 'tool_choice',
        });
        
        return NextResponse.json({
          type: 'critical_question',
          question: nextQuestion.question,
          questionType: nextQuestion.questionType,
          options: nextQuestion.options,
          partialStrategy: {
            rules: rulesWithDefaults,
            pattern,
            instrument,
          },
          conversationId: currentConversationId,
        });
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
    
    // ========================================================================
    // NORMALIZE TO CANONICAL + GENERATE EVENTS
    // ========================================================================
    
    // Build Claude output format for normalizer
    // Note: We create partial objects - claudeToCanonical handles incomplete data gracefully
    const claudeOutput = {
      strategy_name: strategyName,
      summary: message,
      parsed_rules: {
        entry_conditions: rulesWithDefaults
          .filter(r => r.category === 'entry')
          .map(r => ({ indicator: r.label, relation: 'triggers', description: r.value })),
        exit_conditions: rulesWithDefaults
          .filter(r => r.category === 'exit')
          .map(r => ({ 
            type: r.label.includes('Stop') ? 'stop_loss' as const : 'take_profit' as const, 
            value: 20, // Default, will be parsed from description
            unit: 'ticks' as const,
            description: r.value 
          })),
        filters: rulesWithDefaults
          .filter(r => r.category === 'setup' || r.category === 'filters')
          .map(r => ({ type: r.label.toLowerCase(), description: r.value })),
        position_sizing: {
          method: 'risk_percent' as const,
          value: 1,
          max_contracts: 10,
        },
      },
      instrument: instrument || 'ES', // Default to ES if not specified
    } satisfies ClaudeStrategyOutput;
    
    const normResult = claudeToCanonical(claudeOutput);
    
    let events: StrategyEvent[] = [];
    let canonicalRules: CanonicalParsedRules | null = null;
    
    if (normResult.success) {
      canonicalRules = normResult.canonical;
      events = generateEventsFromCanonical(
        canonicalRules,
        new Date().toISOString(),
        message
      );
      console.log(`[StrategyBuild] Event-sourced: ${events.length} events, pattern: ${canonicalRules.pattern}`);
    } else {
      console.log(`[StrategyBuild] Fallback to legacy format. Errors: ${normResult.errors.join(', ')}`);
    }
    
    // NOTE: Do NOT save to database here - that's the job of /api/strategy/save
    // This endpoint just BUILDS the strategy and returns it for user review
    // Issue #52: Keep generation (build) and persistence (save) separate
    
    await logBehavioralEventServer(supabase, user.id, 'strategy_build_completed', {
      conversationId: currentConversationId,
      messageCount: isFollowUp ? 2 : 1,
      defaultsApplied: defaultsResult.defaultsApplied,
      pattern,
      instrument,
      timeToCompletion: Date.now() - startTime,
    });
    
    return NextResponse.json({
      type: 'strategy_complete',
      strategy: {
        name: strategyName,
        natural_language: message,
        parsed_rules: componentsToRules(extractionResult.components),
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
