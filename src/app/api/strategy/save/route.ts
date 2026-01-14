import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logBehavioralEvent } from '@/lib/behavioral/logger';
import { ParsedRules } from '@/lib/claude/client';

interface SaveRequest {
  conversationId: string;
  name: string;
  naturalLanguage: string;
  parsedRules: ParsedRules;
  instrument: string;
  summary?: string;
  // Completion tracking for analytics
  completionTimeSeconds?: number;
  messageCount?: number;
}

export async function POST(request: Request) {
  try {
    const body: SaveRequest = await request.json();
    const { 
      conversationId, 
      name, 
      naturalLanguage, 
      parsedRules, 
      instrument, 
      summary,
      completionTimeSeconds,
      messageCount,
    } = body;

    // Validate required fields
    if (!conversationId || !name || !parsedRules) {
      return NextResponse.json(
        { error: 'Missing required fields: conversationId, name, parsedRules' },
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

    // Verify conversation exists and belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('strategy_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Check if conversation is already completed
    if (conversation.status === 'completed') {
      return NextResponse.json(
        { error: 'Conversation already has a saved strategy' },
        { status: 400 }
      );
    }

    // Get user's current strategy count (for soft cap messaging)
    const { count: strategyCount } = await supabase
      .from('strategies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Create the strategy
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .insert({
        user_id: user.id,
        name: name.trim(),
        natural_language: naturalLanguage || summary || '',
        parsed_rules: parsedRules,
        status: 'draft', // Start as draft, user activates when ready
        autonomy_level: 'copilot', // Default to copilot mode
      })
      .select()
      .single();

    if (strategyError || !strategy) {
      console.error('Failed to create strategy:', strategyError);
      return NextResponse.json(
        { error: 'Failed to save strategy' },
        { status: 500 }
      );
    }

    // Update conversation to completed status with strategy reference
    // Also save completion time tracking for analytics (if columns exist)
    const updateData: Record<string, unknown> = {
      status: 'completed',
      strategy_id: strategy.id,
      updated_at: new Date().toISOString(),
    };
    
    // Add completion tracking if provided
    if (completionTimeSeconds !== undefined) {
      updateData.completion_time_seconds = completionTimeSeconds;
    }
    if (messageCount !== undefined) {
      updateData.message_count_to_save = messageCount;
    }
    
    const { error: updateError } = await supabase
      .from('strategy_conversations')
      .update(updateData)
      .eq('id', conversationId);

    if (updateError) {
      console.error('Failed to update conversation status:', updateError);
      // Don't fail - strategy is saved, conversation update is secondary
    }

    // Promote messages to chat_messages table for permanent storage
    // This is done via the database function, but we'll also do it here
    // in case the function doesn't exist yet
    try {
      const messages = conversation.messages || [];
      for (const msg of messages) {
        await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            session_id: conversationId,
            role: msg.role,
            content: msg.content,
            metadata: {
              strategy_id: strategy.id,
              original_timestamp: msg.timestamp,
            },
          });
      }
    } catch (promoteError) {
      console.error('Failed to promote messages:', promoteError);
      // Non-critical, don't fail the request
    }

    // Log behavioral event: strategy created
    await logBehavioralEvent(
      user.id,
      'strategy_created',
      {
        strategyId: strategy.id,
        conversationId,
        strategyName: name,
        instrument,
        entryConditionCount: parsedRules.entry_conditions?.length || 0,
        exitConditionCount: parsedRules.exit_conditions?.length || 0,
        filterCount: parsedRules.filters?.length || 0,
        positionSizingMethod: parsedRules.position_sizing?.method,
        userStrategyCount: (strategyCount || 0) + 1,
        conversationMessageCount: conversation.messages?.length || 0,
        // Completion tracking for rapid flow analytics
        completionTimeSeconds,
        messageCount,
      }
    );

    // Return success with strategy data and soft cap info
    return NextResponse.json({
      success: true,
      strategy: {
        id: strategy.id,
        name: strategy.name,
        status: strategy.status,
        autonomy_level: strategy.autonomy_level,
        created_at: strategy.created_at,
      },
      userStrategyCount: (strategyCount || 0) + 1,
      showAddAnother: (strategyCount || 0) + 1 < 3, // Soft cap at 3
    });

  } catch (error) {
    console.error('Strategy save error:', error);
    return NextResponse.json(
      { error: 'Failed to save strategy' },
      { status: 500 }
    );
  }
}
