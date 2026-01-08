import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseStrategy, ConversationMessage } from '@/lib/claude/client';
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
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
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
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
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

    // Call Claude to parse strategy
    const result = await parseStrategy(message, conversationHistory);

    // Create new message objects with timestamps
    const now = new Date().toISOString();
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: now,
    };
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content: result.message,
      timestamp: now,
    };

    // Update conversation with new messages
    const updatedMessages = [...conversationHistory, userMessage, assistantMessage];
    
    const { error: updateError } = await supabase
      .from('strategy_conversations')
      .update({
        messages: updatedMessages,
        last_activity: now,
      })
      .eq('id', conversation.id);

    if (updateError) {
      console.error('Failed to update conversation:', updateError);
      // Don't fail the request, just log it
    }

    // Log behavioral event: clarification requested (if Claude asked a question)
    if (!result.complete && result.message.includes('?')) {
      // Detect what type of clarification Claude is asking for
      let questionType = 'general';
      if (/stop|loss/i.test(result.message)) questionType = 'stop_loss';
      else if (/profit|target|reward/i.test(result.message)) questionType = 'take_profit';
      else if (/ema|sma|period/i.test(result.message)) questionType = 'indicator_period';
      else if (/time|session|hour/i.test(result.message)) questionType = 'time_filter';
      else if (/size|contract|risk/i.test(result.message)) questionType = 'position_sizing';
      else if (/es|nq|mns|mes/i.test(result.message)) questionType = 'instrument';

      await logBehavioralEvent(
        user.id,
        'strategy_clarification_requested',
        {
          conversationId: conversation.id,
          questionType,
          conversationTurn: updatedMessages.length,
        }
      );
    }

    // Log behavioral event: strategy completed
    if (result.complete) {
      await logBehavioralEvent(
        user.id,
        'strategy_conversation_completed',
        {
          conversationId: conversation.id,
          totalMessages: updatedMessages.length,
          strategyName: result.strategyName,
          instrument: result.instrument,
          entryConditionCount: result.parsedRules?.entry_conditions?.length || 0,
          exitConditionCount: result.parsedRules?.exit_conditions?.length || 0,
          filterCount: result.parsedRules?.filters?.length || 0,
        }
      );
    }

    // Return response
    return NextResponse.json({
      conversationId: conversation.id,
      complete: result.complete,
      message: result.message,
      ...(result.complete && {
        strategyName: result.strategyName,
        summary: result.summary,
        parsedRules: result.parsedRules,
        instrument: result.instrument,
      }),
    });

  } catch (error) {
    console.error('Strategy parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse strategy' },
      { status: 500 }
    );
  }
}
