import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logBehavioralEvent } from '@/lib/behavioral/logger';
import { ParsedRules } from '@/lib/claude/client';
import { validateStrategyQuality } from '@/lib/strategy/strategyQualityMetrics';
import { clearConversationState, getChangesSummary } from '@/lib/strategy/componentHistoryTracker';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

interface SaveRequest {
  conversationId: string;
  name: string;
  naturalLanguage: string;
  parsedRules: ParsedRules;
  instrument: string;
  summary?: string;
  // Rapid flow tracking for analytics
  completionTimeSeconds?: number;
  messageCount?: number;
  defaultsUsed?: string[]; // Array of component labels that used defaults
  // Expertise detection data from first message
  expertiseDetected?: 'beginner' | 'intermediate' | 'advanced';
  initialCompleteness?: number; // 0-1 percentage from first message
  finalCompleteness?: number;   // 0-1 percentage at save time
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
      defaultsUsed,
      expertiseDetected,
      initialCompleteness,
      finalCompleteness,
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
    // Also save rapid flow tracking for analytics (if columns exist)
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
    // Track which components used smart defaults
    if (Array.isArray(defaultsUsed) && defaultsUsed.length > 0) {
      updateData.defaults_used = defaultsUsed;
    }
    // Track expertise detection from first message
    if (expertiseDetected) {
      updateData.expertise_detected = expertiseDetected;
    }
    // Track completeness percentages (0-1)
    if (initialCompleteness !== undefined) {
      updateData.initial_completeness = initialCompleteness;
    }
    if (finalCompleteness !== undefined) {
      updateData.final_completeness = finalCompleteness;
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

    // ========================================================================
    // STRATEGY QUALITY VALIDATION
    // Validate that the strategy is executable and backtestable
    // ========================================================================
    
    // Convert parsedRules to StrategyRule[] for quality validation
    const rulesForValidation: StrategyRule[] = [];
    
    // Add entry conditions
    if (parsedRules.entry_conditions) {
      for (const condition of parsedRules.entry_conditions) {
        rulesForValidation.push({
          category: 'entry',
          label: condition.indicator || 'Entry Condition',
          value: condition.description || `${condition.indicator} ${condition.relation} ${condition.value || ''}`.trim(),
          isDefaulted: false,
        });
      }
    }
    
    // Add exit conditions
    if (parsedRules.exit_conditions) {
      for (const exit of parsedRules.exit_conditions) {
        rulesForValidation.push({
          category: 'exit',
          label: exit.type || 'Exit',
          value: String(exit.value || ''),
          isDefaulted: false,
        });
      }
    }
    
    // Add position sizing
    if (parsedRules.position_sizing) {
      rulesForValidation.push({
        category: 'risk',
        label: 'Position Size',
        value: `${parsedRules.position_sizing.value}${parsedRules.position_sizing.method === 'risk_percent' ? '%' : ''}`,
        isDefaulted: defaultsUsed?.includes('Position Size') || false,
      });
    }
    
    // Add instrument if provided
    if (instrument) {
      rulesForValidation.push({
        category: 'setup',
        label: 'Instrument',
        value: instrument,
        isDefaulted: false,
      });
    }
    
    // Validate quality
    const qualityMetrics = validateStrategyQuality(strategy.id, rulesForValidation);
    
    console.log(`[Quality] Strategy ${strategy.id}: Score=${qualityMetrics.qualityScore}, Backtestable=${qualityMetrics.isBacktestable}, Errors=${qualityMetrics.errors.length}`);
    
    // Get component change history for behavioral analytics
    const changesSummary = getChangesSummary(conversationId);
    
    // Clear component tracking state for this conversation
    clearConversationState(conversationId);

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
        // Track which defaults were applied
        defaultsUsed: defaultsUsed || [],
        defaultsCount: defaultsUsed?.length || 0,
        // Quality metrics for data moat
        qualityScore: qualityMetrics.qualityScore,
        isBacktestable: qualityMetrics.isBacktestable,
        isExecutable: qualityMetrics.isExecutable,
        qualityErrors: qualityMetrics.errors.length,
        qualityWarnings: qualityMetrics.warnings.length,
        // Component change history (indecision tracking)
        componentChanges: changesSummary.totalChanges,
        indecisiveComponents: changesSummary.indecisiveComponents,
        // Rapid flow tracking for success metrics
        expertiseDetected,
        initialCompleteness,
        finalCompleteness,
        wasRapidFlow: (messageCount || 0) <= 4,
        wasSlowFlow: (messageCount || 0) > 8,
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
