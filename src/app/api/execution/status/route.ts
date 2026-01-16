/**
 * Execution Layer Status API Route
 * 
 * Returns the current status of the execution layer including:
 * - Engine state (running, stopped, error)
 * - Active strategies count
 * - Pending setups
 * - WebSocket connection status
 * - Feature flags
 * 
 * @route GET /api/execution/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled, EXECUTION_MODE_REQUIREMENTS, EXECUTION_SAFETY_LIMITS } from '@/config/features';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check feature flags
    const featureStatus = {
      execution_engine: isFeatureEnabled('execution_engine'),
      execution_copilot_alerts: isFeatureEnabled('execution_copilot_alerts'),
      execution_copilot_orders: isFeatureEnabled('execution_copilot_orders'),
      execution_autopilot: isFeatureEnabled('execution_autopilot'),
      execution_paper_trading: isFeatureEnabled('execution_paper_trading'),
      execution_demo_trading: isFeatureEnabled('execution_demo_trading'),
      execution_live_micro: isFeatureEnabled('execution_live_micro'),
      execution_live_full: isFeatureEnabled('execution_live_full'),
    };

    // Get user's execution mode progression
    const { data: trades, error: tradesError } = await supabase
      .from('orders')
      .select('id, execution_mode')
      .eq('user_id', user.id)
      .in('status', ['filled', 'partially_filled']);

    const tradeCounts = {
      paper: 0,
      demo: 0,
      live_micro: 0,
      live: 0,
    };

    if (trades && !tradesError) {
      for (const trade of trades) {
        const mode = trade.execution_mode as keyof typeof tradeCounts;
        if (mode in tradeCounts) {
          tradeCounts[mode]++;
        }
      }
    }

    // Calculate available execution modes
    const availableModes = {
      paper: true, // Always available
      demo: tradeCounts.paper >= EXECUTION_MODE_REQUIREMENTS.demo.required_trades,
      live_micro: tradeCounts.demo >= EXECUTION_MODE_REQUIREMENTS.live_micro.required_trades,
      live: tradeCounts.live_micro >= EXECUTION_MODE_REQUIREMENTS.live.required_trades,
    };

    // Get connected Tradovate accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('tradovate_accounts')
      .select('id, account_id, name, is_live, is_active')
      .eq('user_id', user.id);

    // Get active strategies count
    const { count: activeStrategies, error: strategiesError } = await supabase
      .from('strategies')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Get today's execution metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: metrics, error: metricsError } = await supabase
      .from('execution_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', today.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        // Feature availability
        features: featureStatus,
        
        // Execution mode progression
        progression: {
          tradeCounts,
          availableModes,
          requirements: EXECUTION_MODE_REQUIREMENTS,
        },
        
        // Connected accounts
        accounts: accounts || [],
        accountCount: accounts?.length || 0,
        
        // Active strategies
        activeStrategies: activeStrategies || 0,
        
        // Safety limits
        safetyLimits: EXECUTION_SAFETY_LIMITS,
        
        // Today's metrics
        todayMetrics: metrics?.[0] || null,
        
        // Engine status
        // Note: Actual engine runs on Railway server, not in Vercel
        // This returns configuration state, not runtime state
        engineConfigured: Boolean(accounts?.some(a => a.is_active)),
      },
    });

  } catch (error) {
    console.error('[API] Execution status error:', error);
    return NextResponse.json(
      { error: 'Failed to get execution status' },
      { status: 500 }
    );
  }
}
