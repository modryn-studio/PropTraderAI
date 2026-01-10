import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadFirmRules, getAccountRules } from '@/lib/firm-rules/loader';
import { ParsedRules } from '@/lib/claude/client';

interface ValidationWarning {
  type: 'position_limit' | 'risk_limit' | 'consistency' | 'info';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

interface ValidateRequest {
  firmName: string;
  accountSize: number;
  parsedRules: ParsedRules;
  instrument: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ValidateRequest = await request.json();
    const { firmName, accountSize, parsedRules, instrument } = body;

    // Validate input
    if (!firmName || !accountSize || !parsedRules || !instrument) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load firm rules
    const firmRules = await loadFirmRules(firmName);
    if (!firmRules) {
      return NextResponse.json(
        { error: `Firm rules not found for ${firmName}` },
        { status: 404 }
      );
    }

    // Get account-specific rules
    const accountRules = getAccountRules(firmRules, accountSize);
    if (!accountRules) {
      return NextResponse.json(
        { error: `No rules found for account size $${accountSize}` },
        { status: 404 }
      );
    }

    // Run validation checks
    const warnings: ValidationWarning[] = [];

    // 1. Position sizing validation
    const maxContracts = accountRules.max_contracts[instrument as keyof typeof accountRules.max_contracts];
    if (maxContracts) {
      const userMaxContracts = parsedRules.position_sizing.max_contracts || 1;
      
      if (userMaxContracts > maxContracts) {
        warnings.push({
          type: 'position_limit',
          severity: 'error',
          message: `Position size exceeds ${firmName} limit: ${userMaxContracts} contracts > ${maxContracts} max for ${instrument}`,
          suggestion: `Reduce max_contracts to ${maxContracts} or lower`,
        });
      } else if (userMaxContracts === maxContracts) {
        warnings.push({
          type: 'position_limit',
          severity: 'warning',
          message: `Trading at maximum contract limit (${maxContracts} contracts). Consider leaving room for scaling.`,
          suggestion: `Use ${Math.floor(maxContracts * 0.8)} contracts to allow for position scaling`,
        });
      }
    }

    // 2. Risk validation (daily loss limit)
    if (accountRules.daily_loss_limit) {
      const stopLoss = parsedRules.exit_conditions.find(
        (ec) => ec.type === 'stop_loss'
      );

      if (stopLoss) {
        // Calculate risk per contract
        const tickValues: Record<string, number> = {
          ES: 12.5,
          NQ: 5,
          MES: 1.25,
          MNQ: 0.5,
          YM: 5,
          RTY: 5,
          CL: 10,
          GC: 10,
        };

        const tickValue = tickValues[instrument] || 12.5;
        let riskPerContract = 0;

        if (stopLoss.unit === 'ticks') {
          riskPerContract = stopLoss.value * tickValue;
        } else if (stopLoss.unit === 'dollars') {
          riskPerContract = stopLoss.value;
        }

        const maxContracts = parsedRules.position_sizing.max_contracts || 1;
        const totalRisk = riskPerContract * maxContracts;

        // Check against daily loss limit
        if (totalRisk > accountRules.daily_loss_limit * 0.5) {
          warnings.push({
            type: 'risk_limit',
            severity: 'error',
            message: `Risk per trade ($${totalRisk.toFixed(2)}) exceeds recommended 50% of daily loss limit ($${accountRules.daily_loss_limit})`,
            suggestion: `Reduce position size or tighten stop loss to risk max $${(accountRules.daily_loss_limit * 0.5).toFixed(2)} per trade`,
          });
        } else if (totalRisk > accountRules.daily_loss_limit * 0.33) {
          warnings.push({
            type: 'risk_limit',
            severity: 'warning',
            message: `Risk per trade ($${totalRisk.toFixed(2)}) is ${((totalRisk / accountRules.daily_loss_limit) * 100).toFixed(0)}% of daily loss limit`,
            suggestion: `Consider reducing to 25-33% of daily limit for multiple trade attempts`,
          });
        }
      }
    }

    // 3. Consistency rule info
    if (accountRules.consistency_rule) {
      const consistencyPercent = accountRules.consistency_rule * 100;
      warnings.push({
        type: 'consistency',
        severity: 'info',
        message: `${firmName} requires no single day's profit to exceed ${consistencyPercent}% of total profit`,
        suggestion: `Ensure your strategy distributes profits across multiple trading days`,
      });
    }

    // 4. Drawdown type info
    warnings.push({
      type: 'info',
      severity: 'info',
      message: `${firmName} uses ${accountRules.drawdown_type.replace('_', ' ')} drawdown: ${accountRules.drawdown_notes}`,
    });

    // 5. Automation policy check
    if (firmRules.automation_policy !== 'allowed') {
      warnings.push({
        type: 'info',
        severity: 'warning',
        message: `${firmName} automation policy: ${firmRules.automation_policy}`,
        suggestion: firmRules.automation_notes,
      });
    }

    // Determine overall validation status
    const hasErrors = warnings.some((w) => w.severity === 'error');
    const hasWarnings = warnings.some((w) => w.severity === 'warning');

    return NextResponse.json({
      isValid: !hasErrors,
      status: hasErrors ? 'invalid' : hasWarnings ? 'warnings' : 'valid',
      warnings,
      firmRules: {
        firmName: firmRules.firm_name,
        accountSize,
        profitTarget: accountRules.profit_target,
        dailyLossLimit: accountRules.daily_loss_limit,
        maxDrawdown: accountRules.max_drawdown,
        drawdownType: accountRules.drawdown_type,
        maxContracts: accountRules.max_contracts,
        consistencyRule: accountRules.consistency_rule,
        automationPolicy: firmRules.automation_policy,
      },
    });
  } catch (error) {
    console.error('Firm rules validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate firm rules' },
      { status: 500 }
    );
  }
}
