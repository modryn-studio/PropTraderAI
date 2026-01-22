/**
 * Strategy Activation API
 * 
 * Activates a strategy for execution by sending it to the execution server.
 * Per Issue #10 Activation API Implementation Plan.
 * 
 * Flow:
 * 1. Validate user authentication
 * 2. Load strategy from database
 * 3. Validate canonical_rules format
 * 4. Send to execution server (Railway)
 * 5. Update database with activation status
 * 
 * @module app/api/strategy/activate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FEATURES } from '@/config/features';

// Execution server URL (Railway deployment)
const EXECUTION_SERVER_URL = process.env.EXECUTION_SERVER_URL || 'http://localhost:3001';

// ============================================================================
// POST /api/strategy/activate
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const { strategyId } = await req.json();

    if (!strategyId) {
      return NextResponse.json(
        { error: 'Strategy ID is required' },
        { status: 400 }
      );
    }

    // 1. Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check feature flag
    if (!FEATURES.strategy_activation_enabled) {
      return NextResponse.json(
        { error: 'Strategy activation is not yet available' },
        { status: 403 }
      );
    }

    // 3. Load strategy from database
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .eq('user_id', user.id)
      .single();

    if (strategyError || !strategy) {
      console.error('[Activate] Strategy not found:', strategyError);
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    // 4. Validate canonical rules exist
    const canonicalRules = strategy.canonical_rules || strategy.parsed_rules;
    
    if (!canonicalRules) {
      return NextResponse.json(
        { error: 'Strategy must have canonical rules. Please recreate using template gallery.' },
        { status: 400 }
      );
    }

    // 5. Check if already active
    if (strategy.is_active) {
      return NextResponse.json({
        success: true,
        message: 'Strategy is already active',
        strategyId: strategy.id,
        activatedAt: strategy.activated_at,
      });
    }

    // 6. Send to execution server (if available)
    let engineStatus = null;
    let executionServerId = null;

    try {
      const execResponse = await fetch(`${EXECUTION_SERVER_URL}/engine/strategies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Include auth token for secure communication
          'X-Internal-Token': process.env.EXECUTION_SERVER_TOKEN || '',
        },
        body: JSON.stringify({
          userId: user.id,
          strategy: {
            id: strategy.id,
            name: strategy.name,
            user_id: strategy.user_id,
            canonical_rules: canonicalRules,
          },
        }),
        // Short timeout - don't block if server is slow
        signal: AbortSignal.timeout(10000),
      });

      if (execResponse.ok) {
        const execResult = await execResponse.json();
        engineStatus = execResult.engineStatus;
        executionServerId = execResult.serverId;
      } else {
        console.warn('[Activate] Execution server returned error:', await execResponse.text());
        // Continue anyway - we'll mark as active and retry later
      }
    } catch (execError) {
      console.warn('[Activate] Execution server unavailable:', execError);
      // Continue anyway - execution server might be starting up
      // The strategy will be loaded when server restarts and queries active strategies
    }

    // 7. Update database with activation status
    const { error: updateError } = await supabase
      .from('strategies')
      .update({
        is_active: true,
        activated_at: new Date().toISOString(),
        deactivated_at: null,
        execution_server_id: executionServerId,
      })
      .eq('id', strategyId);

    if (updateError) {
      console.error('[Activate] Failed to update strategy:', updateError);
      return NextResponse.json(
        { error: 'Failed to activate strategy' },
        { status: 500 }
      );
    }

    // 8. Log behavioral event
    try {
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'strategy_activated',
        event_data: {
          strategy_id: strategyId,
          pattern: strategy.canonical_rules?.pattern,
          instrument: strategy.canonical_rules?.instrument?.symbol,
          execution_server_status: engineStatus ? 'connected' : 'pending',
        },
      });
    } catch (logError) {
      // Don't fail activation if logging fails
      console.warn('[Activate] Failed to log behavioral event:', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Strategy activated successfully',
      strategyId: strategy.id,
      activatedAt: new Date().toISOString(),
      engineStatus: engineStatus || 'pending',
    });

  } catch (error) {
    console.error('[Activate] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Activation failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/strategy/activate (Deactivate)
// ============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const { strategyId } = await req.json();

    if (!strategyId) {
      return NextResponse.json(
        { error: 'Strategy ID is required' },
        { status: 400 }
      );
    }

    // 1. Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Load strategy to verify ownership
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .select('id, is_active, execution_server_id')
      .eq('id', strategyId)
      .eq('user_id', user.id)
      .single();

    if (strategyError || !strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    // 3. Notify execution server to stop monitoring
    if (strategy.execution_server_id) {
      try {
        await fetch(`${EXECUTION_SERVER_URL}/engine/strategies/${strategyId}`, {
          method: 'DELETE',
          headers: {
            'X-Internal-Token': process.env.EXECUTION_SERVER_TOKEN || '',
          },
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Continue even if server is unavailable
        console.warn('[Deactivate] Execution server unavailable');
      }
    }

    // 4. Update database
    const { error: updateError } = await supabase
      .from('strategies')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        execution_server_id: null,
      })
      .eq('id', strategyId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to deactivate strategy' },
        { status: 500 }
      );
    }

    // 5. Log behavioral event
    try {
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'strategy_deactivated',
        event_data: { strategy_id: strategyId },
      });
    } catch {
      // Don't fail if logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Strategy deactivated',
      strategyId,
    });

  } catch (error) {
    console.error('[Deactivate] Error:', error);
    return NextResponse.json(
      { error: 'Deactivation failed' },
      { status: 500 }
    );
  }
}
