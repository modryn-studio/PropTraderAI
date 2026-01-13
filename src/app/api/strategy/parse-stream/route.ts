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

interface ParseRequest {
  message: string;
  conversationId?: string;
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
    const { message, conversationId } = body;

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
          // PASS 2: Extract rules in background (TOOLS ONLY)
          // Runs after text is fully displayed to user
          // ================================================================
          
          const extractionResult = await ruleExtractionPass(
            message,
            fullText,
            conversationHistory
          );
          
          console.log(`[Pass 2] Extracted ${extractionResult.rules.length} rules. Complete: ${extractionResult.isComplete}`);
          
          // Send extracted rules to frontend (slight delay from text, but still fast)
          for (const rule of extractionResult.rules) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'rule_update',
                rule: {
                  category: rule.category,
                  label: rule.label,
                  value: rule.value
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
