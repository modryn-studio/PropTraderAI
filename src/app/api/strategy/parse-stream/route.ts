import { createClient } from '@/lib/supabase/server';
import { conversationPassStream, ruleExtractionPass, ConversationMessage } from '@/lib/claude/client';
import { logBehavioralEventServer } from '@/lib/behavioral/logger';
import { getIntelligenceMetadata } from '@/lib/claude/promptManager';
import { 
  TradingIntelligenceSkill, 
  detectCriticalErrors 
} from '@/lib/trading';
import { extractFromMessage } from '@/lib/utils/ruleExtractor';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';
import { 
  detectToolTrigger, 
  extractContextFromConversation, 
  mergePrefillData,
  FIRM_DEFAULTS,
  type ToolType 
} from '@/lib/utils/toolDetection';
import { detectExpertiseLevel } from '@/lib/strategy/completenessDetection';
import { applySmartDefaults } from '@/lib/strategy/applyDefaults';
import { detectTextContradictions } from '@/lib/strategy/contradictionDetection';
import { 
  handleBeginnerResponse, 
  templateToRules, 
  getTemplate,
  type BeginnerResponseResult 
} from '@/lib/strategy/templates';
import { detectMultiInstrument } from '@/lib/strategy/multiInstrumentDetection';
import { 
  trackComponentChange, 
  checkForIndecision 
} from '@/lib/strategy/componentHistoryTracker';

interface ParseRequest {
  message: string;
  conversationId?: string;
  toolsShown?: ToolType[]; // Track which tools have already been shown
  toolResponse?: {
    toolType: ToolType;
    values: Record<string, unknown>;
  };
}

interface ConversationRecord {
  id: string;
  user_id: string;
  messages: ConversationMessage[];
  status: string;
  last_activity: string;
}

export async function POST(request: Request) {
  try {
    const body: ParseRequest = await request.json();
    const { message, conversationId, toolsShown = [] } = body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for prefill data (firm, account size)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('firm_name, account_size, account_type')
      .eq('id', user.id)
      .single();

    let conversation: ConversationRecord | null = null;
    let isNewConversation = false;

    // Load existing conversation or create new one
    if (conversationId) {
      const { data, error } = await supabase
        .from('strategy_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      conversation = data as ConversationRecord;
    } else {
      // Create new conversation
      const { data, error } = await supabase
        .from('strategy_conversations')
        .insert({
          user_id: user.id,
          messages: [],
          status: 'in_progress',
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Failed to create conversation:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create conversation' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      conversation = data as ConversationRecord;
      isNewConversation = true;
    }

    // Get conversation history
    const conversationHistory: ConversationMessage[] = conversation.messages || [];

    // ========================================================================
    // EXPERTISE DETECTION (First message only)
    // Detect user expertise level to adapt conversation flow
    // ========================================================================
    
    let expertiseData = null;
    let contradictionData = null;
    
    if (isNewConversation || conversationHistory.length === 0) {
      expertiseData = detectExpertiseLevel(message);
      
      // Also check for contradictions in first message
      contradictionData = detectTextContradictions(message);
      
      console.log(`[Expertise] Detected: ${expertiseData.level}, Questions: ${expertiseData.questionCount}, Completeness: ${(expertiseData.completeness.percentage * 100).toFixed(0)}%`);
      
      if (contradictionData.hasContradictions) {
        console.log(`[Contradictions] Found ${contradictionData.contradictions.length} potential conflicts: ${contradictionData.contradictions.map(c => c.component).join(', ')}`);
      }
      
      // Log expertise detection event
      await logBehavioralEventServer(
        supabase,
        user.id,
        'expertise_detected',
        {
          conversationId: conversation.id,
          level: expertiseData.level,
          questionCount: expertiseData.questionCount,
          approach: expertiseData.approach,
          completeness: expertiseData.completeness.percentage,
          detectedComponents: expertiseData.completeness.detected,
          missingComponents: expertiseData.completeness.missing,
          hasContradictions: contradictionData.hasContradictions,
          contradictionCount: contradictionData.contradictions.length,
        }
      );
    }

    // Log behavioral event: message sent
    await logBehavioralEventServer(
      supabase,
      user.id,
      'strategy_chat_message_sent',
      {
        conversationId: conversation.id,
        messageLength: message.length,
        conversationTurn: conversationHistory.length + 1,
        containsNumbers: /\d/.test(message),
        containsIndicators: /ema|rsi|macd|sma|vwap|atr/i.test(message),
        containsRiskTerms: /stop|risk|loss|target|profit/i.test(message),
        timeOfDay: new Date().getHours(),
        isNewConversation,
      }
    );

    // ========================================================================
    // BEGINNER FRUSTRATION HANDLING
    // Check if user is frustrated and offer templates as escape hatch
    // Only applies on 2nd+ message (after they've had one Claude interaction)
    // ========================================================================
    
    let templateResponse: BeginnerResponseResult | null = null;
    
    if (!isNewConversation && conversationHistory.length >= 2) {
      // Check if user response indicates frustration or confusion
      templateResponse = handleBeginnerResponse(message, []);
      
      if (templateResponse.type === 'offer_template' && templateResponse.templateId) {
        console.log(`[Templates] Frustrated user detected, offering template: ${templateResponse.templateId}`);
        
        // Log template offer
        await logBehavioralEventServer(
          supabase,
          user.id,
          'template_offered',
          {
            conversationId: conversation.id,
            templateId: templateResponse.templateId,
            reason: 'frustration_detected',
            messageContent: message.substring(0, 100),
          }
        );
      }
    }

    // ========================================================================
    // MULTI-INSTRUMENT DETECTION
    // Check if user mentions multiple instruments and handle appropriately
    // ========================================================================
    
    let multiInstrumentResult = null;
    
    if (isNewConversation || conversationHistory.length <= 2) {
      multiInstrumentResult = detectMultiInstrument(message);
      
      if (multiInstrumentResult.hasMultipleInstruments) {
        console.log(`[Multi-Instrument] Detected: ${multiInstrumentResult.instruments.join(', ')}`);
        
        // Log multi-instrument detection
        await logBehavioralEventServer(
          supabase,
          user.id,
          'multi_instrument_detected',
          {
            conversationId: conversation.id,
            instruments: multiInstrumentResult.instruments,
            action: multiInstrumentResult.suggestedAction,
          }
        );
      }
    }

    // ========================================================================
    // CROSS-MESSAGE COMPONENT TRACKING
    // Track component changes for indecision detection
    // ========================================================================
    
    // Extract components from this message for tracking
    const messageRules = extractFromMessage(message, 'user', []);
    for (const rule of messageRules) {
      const indecisionResult = trackComponentChange(
        conversation.id,
        rule.label,
        rule.value,
        conversationHistory.length + 1,
        rule.category
      );
      
      if (indecisionResult?.hasIndecision) {
        console.log(`[Indecision] Detected for ${indecisionResult.component}: ${indecisionResult.changeCount} changes`);
        
        await logBehavioralEventServer(
          supabase,
          user.id,
          'indecision_detected',
          {
            conversationId: conversation.id,
            component: indecisionResult.component,
            changeCount: indecisionResult.changeCount,
            values: indecisionResult.values,
          }
        );
      }
    }

    // ========================================================================
    // TWO-PASS SYSTEM
    // Pass 1: Stream conversational response (no tools)
    // Pass 2: Extract rules in background (tools only, after Pass 1 completes)
    // ========================================================================

    // Get the streaming response from Claude (Pass 1: Conversation only)
    let stream;
    try {
      stream = await conversationPassStream(message, conversationHistory);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[API] Failed to start Claude stream:', error);
      
      // Log failure event
      await logBehavioralEventServer(
        supabase,
        user.id,
        'claude_api_error',
        {
          conversationId: conversation!.id,
          error: errorMessage,
          messageLength: message.length,
          historyLength: conversationHistory.length,
        }
      );
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process message. Please try again.',
          details: errorMessage 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        let isComplete = false;

        try {
          // ================================================================
          // SEND EXPERTISE METADATA (if detected on first message)
          // Allows frontend to log/display user expertise level
          // ================================================================
          
          if (expertiseData) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'metadata',
                expertiseLevel: expertiseData.level,
                questionCount: expertiseData.questionCount,
                approach: expertiseData.approach,
                completeness: expertiseData.completeness.percentage,
                detectedComponents: expertiseData.completeness.detected,
                // Include contradiction info for frontend handling
                hasContradictions: contradictionData?.hasContradictions || false,
                contradictions: contradictionData?.contradictions || [],
                suggestedClarification: contradictionData?.suggestedResponse,
                // Include multi-instrument info
                hasMultipleInstruments: multiInstrumentResult?.hasMultipleInstruments || false,
                instruments: multiInstrumentResult?.instruments || [],
                multiInstrumentMessage: multiInstrumentResult?.clarificationMessage,
              })}\n\n`)
            );
          }
          
          // ================================================================
          // SEND MULTI-INSTRUMENT CLARIFICATION (if detected)
          // Prompts user to choose single instrument or create multiple
          // ================================================================
          
          if (multiInstrumentResult?.hasMultipleInstruments) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'multi_instrument_detected',
                instruments: multiInstrumentResult.instruments,
                suggestedAction: multiInstrumentResult.suggestedAction,
                clarificationMessage: multiInstrumentResult.clarificationMessage,
              })}\n\n`)
            );
          }
          
          // ================================================================
          // SEND INDECISION HELP (if cross-message changes detected)
          // Helps users who keep changing their mind
          // ================================================================
          
          const indecisionCheck = checkForIndecision(conversation.id);
          if (indecisionCheck?.hasIndecision) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'indecision_detected',
                component: indecisionCheck.component,
                changeCount: indecisionCheck.changeCount,
                values: indecisionCheck.values,
                helpMessage: indecisionCheck.decisionHelpMessage,
                suggestedValue: indecisionCheck.suggestedValue,
              })}\n\n`)
            );
          }
          
          // ================================================================
          // SEND TEMPLATE OFFER (if user is frustrated)
          // Provides escape hatch for struggling users
          // ================================================================
          
          if (templateResponse?.type === 'offer_template' && templateResponse.templateId) {
            const template = getTemplate(templateResponse.templateId);
            if (template) {
              // Send template rules as pre-filled defaults
              const templateRules = templateToRules(template);
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'template_offered',
                  templateId: templateResponse.templateId,
                  templateName: template.name,
                  message: templateResponse.message,
                  rules: templateRules.map(r => ({
                    category: r.category,
                    label: r.label,
                    value: r.value,
                    isDefaulted: true,
                    explanation: r.explanation,
                    source: 'template',
                  })),
                })}\n\n`)
              );
            }
          }
          
          // ================================================================
          // PASS 1: Stream conversational response (NO TOOLS)
          // This guarantees text output with Socratic questions
          // ================================================================
          
          for await (const chunk of stream) {
            // Handle text deltas only (no tools in Pass 1)
            if (chunk.type === 'content_block_delta') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if ((chunk.delta as any).type === 'text_delta') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const text = (chunk.delta as any).text;
                fullText += text;
                
                // Send text chunk to client immediately
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`)
                );
              }
            }
          }
          
          // Wait for Pass 1 to fully complete
          await stream.finalMessage();
          
          console.log(`[Pass 1] Conversation complete. Length: ${fullText.length} chars`);
          
          // ================================================================
          // SMART TOOL DETECTION (After Pass 1, Before Pass 2)
          // Detect if Claude's response should trigger an inline calculator
          // ================================================================
          
          const toolTrigger = detectToolTrigger(fullText, toolsShown);
          
          if (toolTrigger.shouldShowTool && toolTrigger.toolType) {
            // Extract context from conversation for prefilling
            const allMessages = [
              ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
              { role: 'user' as const, content: message },
              { role: 'assistant' as const, content: fullText },
            ];
            const conversationContext = extractContextFromConversation(allMessages);
            
            // Merge prefill data with fallback chain
            const prefilledData = mergePrefillData(
              conversationContext,
              userProfile,
              FIRM_DEFAULTS
            );
            
            console.log(`[Smart Tool] Detected trigger for: ${toolTrigger.toolType}`, {
              confidence: toolTrigger.confidence,
              pattern: toolTrigger.matchedPattern,
              prefilled: prefilledData,
            });
            
            // Send tool SSE event to frontend
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'tool',
                toolType: toolTrigger.toolType,
                prefilledData,
              })}\n\n`)
            );
            
            // Log behavioral event for PATH 2 analytics
            await logBehavioralEventServer(
              supabase,
              user.id,
              'smart_tool_shown',
              {
                conversationId: conversation!.id,
                toolType: toolTrigger.toolType,
                triggerPattern: toolTrigger.matchedPattern,
                confidence: toolTrigger.confidence,
                prefilledFields: Object.keys(prefilledData).filter(k => prefilledData[k as keyof typeof prefilledData] !== undefined),
              }
            );
          }
          
          // ================================================================
          // PASS 2: Extract rules in background (TOOLS ONLY)
          // Runs after text is fully displayed to user
          // ================================================================
          
          const extractionResult = await ruleExtractionPass(
            message,
            fullText,
            conversationHistory
          );
          
          console.log(`[Pass 2] Extracted ${extractionResult.rules.length} rules. Complete: ${extractionResult.isComplete}`);
          
          // ================================================================
          // SMART DEFAULTS APPLICATION
          // Apply defaults for missing components (target, sizing, session)
          // Always run through applySmartDefaults for proper typing
          // ================================================================
          
          // Get the first user message for pattern detection
          const firstUserMessage = conversationHistory.length === 0 
            ? message 
            : conversationHistory.find(m => m.role === 'user')?.content || message;
          
          // Always apply smart defaults (handles empty rules case too)
          const defaultsResult = applySmartDefaults(extractionResult.rules, firstUserMessage);
          let rulesToSend = defaultsResult.rules;
          const defaultsApplied = defaultsResult.defaultsApplied;
          
          // No normalization needed - Pass 2 already extracts in final, clean form
          const detectedPattern = defaultsResult.completeness.components.pattern.value;
          
          if (defaultsApplied.length > 0) {
            console.log(`[Smart Defaults] Applied defaults for: ${defaultsApplied.join(', ')}`);
            
            // Log defaults application
            await logBehavioralEventServer(
              supabase,
              user.id,
              'smart_defaults_applied',
              {
                conversationId: conversation!.id,
                defaultsApplied,
                patternDetected: defaultsResult.completeness.components.pattern.value,
                completenessPercentage: defaultsResult.completeness.percentage,
              }
            );
          }
          
          // Send extracted rules to frontend (including defaults with isDefaulted flag)
          for (const rule of rulesToSend) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'rule_update',
                rule: {
                  category: rule.category,
                  label: rule.label,
                  value: rule.value,
                  isDefaulted: rule.isDefaulted || false,
                  explanation: rule.explanation,
                  source: rule.source || 'user',
                }
              })}\n\n`)
            );
            
            // Log each rule extraction
            await logBehavioralEventServer(
              supabase,
              user.id,
              'rule_updated_via_tool',
              {
                conversationId: conversation!.id,
                category: rule.category,
                label: rule.label,
                value: rule.value,
                wasOverwrite: false, // Could track this by comparing to history
              }
            );
          }
          
          // Check if strategy is complete
          let parsedToolInput = null;
          if (extractionResult.isComplete && extractionResult.strategyData) {
            isComplete = true;
            parsedToolInput = extractionResult.strategyData;
          }

          // Use fullText as the final text
          const finalText = fullText;

          // Save conversation to database
          const now = new Date().toISOString();
          const userMessage: ConversationMessage = {
            role: 'user',
            content: message,
            timestamp: now,
          };
          const assistantMessage: ConversationMessage = {
            role: 'assistant',
            content: finalText,
            timestamp: now,
          };

          const updatedMessages = [...conversationHistory, userMessage, assistantMessage];
          
          await supabase
            .from('strategy_conversations')
            .update({
              messages: updatedMessages,
              last_activity: now,
            })
            .eq('id', conversation!.id);

          // Log behavioral events
          
          // Extract rules from conversation for intelligence analysis
          const extractedRules: StrategyRule[] = updatedMessages.reduce((acc: StrategyRule[], msg) => {
            const newRules = extractFromMessage(msg.content, msg.role, acc);
            return newRules;
          }, []);
          
          // Get intelligence metadata for logging
          const intelligenceMetadata = getIntelligenceMetadata(
            updatedMessages.map(m => ({ role: m.role, content: m.content })),
            extractedRules
          );
          
          // Log Trading Intelligence usage
          await logBehavioralEventServer(
            supabase,
            user.id,
            'trading_intelligence_used',
            {
              conversationId: conversation!.id,
              phase: intelligenceMetadata.phase,
              focus: intelligenceMetadata.focus,
              rulesCount: intelligenceMetadata.rulesCount,
              errorsDetected: intelligenceMetadata.errorsDetected,
              missingComponents: intelligenceMetadata.missingComponents,
              completionPercentage: intelligenceMetadata.completionPercentage,
            }
          );
          
          // Check for and log critical errors
          const criticalErrors = detectCriticalErrors(extractedRules);
          if (criticalErrors.length > 0) {
            await logBehavioralEventServer(
              supabase,
              user.id,
              'critical_error_detected',
              {
                conversationId: conversation!.id,
                errors: criticalErrors.map(e => ({
                  severity: e.severity,
                  message: e.message,
                })),
                phase: intelligenceMetadata.phase,
              }
            );
          }
          
          // Validate Claude's response quality
          const responseValidation = TradingIntelligenceSkill.validateResponse(
            finalText,
            {
              phase: intelligenceMetadata.phase,
              rules: extractedRules,
              lastUserMessage: message,
              missingComponents: intelligenceMetadata.missingComponents,
              detectedIssues: criticalErrors.map(e => e.message),
            }
          );
          
          if (!responseValidation.valid) {
            await logBehavioralEventServer(
              supabase,
              user.id,
              'response_validation_failed',
              {
                conversationId: conversation!.id,
                issues: responseValidation.issues,
                severity: responseValidation.severity,
                phase: intelligenceMetadata.phase,
              }
            );
          }
          
          if (!isComplete && finalText.includes('?')) {
            let questionType = 'general';
            if (/stop|loss/i.test(finalText)) questionType = 'stop_loss';
            else if (/profit|target|reward/i.test(finalText)) questionType = 'take_profit';
            else if (/ema|sma|period/i.test(finalText)) questionType = 'indicator_period';
            else if (/time|session|hour/i.test(finalText)) questionType = 'time_filter';
            else if (/size|contract|risk/i.test(finalText)) questionType = 'position_sizing';
            else if (/es|nq|mns|mes/i.test(finalText)) questionType = 'instrument';

            await logBehavioralEventServer(
              supabase,
              user.id,
              'strategy_clarification_requested',
              {
                conversationId: conversation!.id,
                questionType,
                conversationTurn: updatedMessages.length,
              }
            );
          }

          if (isComplete && parsedToolInput) {
            await logBehavioralEventServer(
              supabase,
              user.id,
              'strategy_conversation_completed',
              {
                conversationId: conversation!.id,
                totalMessages: updatedMessages.length,
                strategyName: parsedToolInput.strategy_name,
                instrument: parsedToolInput.instrument,
                entryConditionCount: parsedToolInput.parsed_rules?.entry_conditions?.length || 0,
                exitConditionCount: parsedToolInput.parsed_rules?.exit_conditions?.length || 0,
                filterCount: parsedToolInput.parsed_rules?.filters?.length || 0,
              }
            );
          }

          // Send completion message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              conversationId: conversation!.id,
              complete: isComplete,
              ...(isComplete && parsedToolInput && {
                strategyName: parsedToolInput.strategy_name,
                summary: parsedToolInput.summary,
                parsedRules: parsedToolInput.parsed_rules,
                instrument: parsedToolInput.instrument,
              })
            })}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Streaming failed' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Strategy parse stream error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to parse strategy' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
