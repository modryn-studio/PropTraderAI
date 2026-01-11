import { createClient } from '@/lib/supabase/server';
import { parseStrategyStream, ConversationMessage, ParsedRules } from '@/lib/claude/client';
import { logBehavioralEvent } from '@/lib/behavioral/logger';

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
    await logBehavioralEvent(
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

    // Get the streaming response from Claude
    const stream = await parseStrategyStream(message, conversationHistory);

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        let toolInput: any = null;
        let isComplete = false;

        try {
          for await (const chunk of stream) {
            // Handle text deltas
            if (chunk.type === 'content_block_delta') {
              if (chunk.delta.type === 'text_delta') {
                const text = chunk.delta.text;
                fullText += text;
                
                // Send text chunk to client
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`)
                );
              }
            }
            
            // Handle tool use (strategy completion)
            if (chunk.type === 'content_block_start') {
              if (chunk.content_block.type === 'tool_use' && chunk.content_block.name === 'confirm_strategy') {
                isComplete = true;
              }
            }
            
            if (chunk.type === 'content_block_delta') {
              if (chunk.delta.type === 'input_json_delta') {
                if (!toolInput) toolInput = '';
                toolInput += chunk.delta.partial_json;
              }
            }
          }

          // Wait for final message
          const finalMessage = await stream.finalMessage();
          
          // Parse tool input if present
          let parsedToolInput = null;
          if (toolInput) {
            try {
              parsedToolInput = JSON.parse(toolInput);
            } catch (e) {
              console.error('Failed to parse tool input:', e);
            }
          }

          // Check if strategy is complete
          const toolUse = finalMessage.content.find(
            (block: any) => block.type === 'tool_use' && block.name === 'confirm_strategy'
          );

          if (toolUse && toolUse.input) {
            isComplete = true;
            parsedToolInput = toolUse.input;
          }

          // Get final text content
          const textBlock = finalMessage.content.find(
            (block: any) => block.type === 'text'
          );
          const finalText = textBlock?.text || fullText;

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
          if (!isComplete && finalText.includes('?')) {
            let questionType = 'general';
            if (/stop|loss/i.test(finalText)) questionType = 'stop_loss';
            else if (/profit|target|reward/i.test(finalText)) questionType = 'take_profit';
            else if (/ema|sma|period/i.test(finalText)) questionType = 'indicator_period';
            else if (/time|session|hour/i.test(finalText)) questionType = 'time_filter';
            else if (/size|contract|risk/i.test(finalText)) questionType = 'position_sizing';
            else if (/es|nq|mns|mes/i.test(finalText)) questionType = 'instrument';

            await logBehavioralEvent(
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
            await logBehavioralEvent(
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
