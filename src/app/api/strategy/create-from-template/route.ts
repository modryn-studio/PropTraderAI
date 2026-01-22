import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logBehavioralEventServer } from '@/lib/behavioral/logger';
import { 
  generateEventsFromCanonical,
  type SupportedPattern,
} from '@/lib/strategy/eventStore';
import { 
  INSTRUMENT_DEFAULTS,
  validateCanonical,
  type CanonicalParsedRules,
} from '@/lib/execution/canonical-schema';

// ============================================================================
// REQUEST TYPES
// ============================================================================

interface ORBFormData {
  name: string;
  instrument: string;
  direction: 'long' | 'short' | 'both';
  rangePeriodMinutes: number;
  entryOn: 'break_high' | 'break_low' | 'both';
  stopLossType: 'fixed_ticks' | 'opposite_range';
  stopLossTicks: number;
  targetType: 'rr_ratio' | 'fixed_ticks' | 'opposite_range';
  targetValue: number;
  riskPercent: number;
  maxContracts: number;
  session: 'ny' | 'london' | 'asia' | 'all';
}

interface EMAPullbackFormData {
  name: string;
  instrument: string;
  direction: 'long' | 'short' | 'both';
  emaPeriod: number;
  pullbackConfirmation: 'touch' | 'close_above' | 'bounce';
  useRsiFilter: boolean;
  rsiPeriod: number;
  rsiThreshold: number;
  rsiDirection: 'above' | 'below';
  stopLossTicks: number;
  targetRatio: number;
  riskPercent: number;
  maxContracts: number;
  session: 'ny' | 'london' | 'asia' | 'all';
}

interface BreakoutFormData {
  name: string;
  instrument: string;
  direction: 'long' | 'short' | 'both';
  lookbackPeriod: number;
  levelType: 'resistance' | 'support' | 'both';
  confirmation: 'close' | 'volume' | 'none';
  stopLossTicks: number;
  targetRatio: number;
  riskPercent: number;
  maxContracts: number;
  session: 'ny' | 'london' | 'asia' | 'all';
}

type FormData = ORBFormData | EMAPullbackFormData | BreakoutFormData;

interface CreateFromTemplateRequest {
  pattern: SupportedPattern;
  formData: FormData;
}

// ============================================================================
// FORM TO CANONICAL CONVERTERS
// ============================================================================

function orbFormToCanonical(form: ORBFormData): CanonicalParsedRules {
  const instrument = INSTRUMENT_DEFAULTS[form.instrument.toUpperCase()] || INSTRUMENT_DEFAULTS.ES;
  
  return {
    pattern: 'opening_range_breakout',
    direction: form.direction,
    instrument,
    entry: {
      openingRange: {
        periodMinutes: form.rangePeriodMinutes,
        entryOn: form.entryOn,
      },
    },
    exit: {
      stopLoss: form.stopLossType === 'opposite_range' 
        ? { type: 'opposite_range', value: 0 }
        : { type: 'fixed_ticks', value: form.stopLossTicks },
      takeProfit: form.targetType === 'opposite_range'
        ? { type: 'opposite_range', value: 0 }
        : form.targetType === 'fixed_ticks'
          ? { type: 'fixed_ticks', value: form.targetValue }
          : { type: 'rr_ratio', value: form.targetValue },
    },
    risk: {
      positionSizing: 'risk_percent',
      riskPercent: form.riskPercent,
      maxContracts: form.maxContracts,
    },
    time: {
      session: form.session,
      timezone: 'America/New_York',
    },
  };
}

function emaPullbackFormToCanonical(form: EMAPullbackFormData): CanonicalParsedRules {
  const instrument = INSTRUMENT_DEFAULTS[form.instrument.toUpperCase()] || INSTRUMENT_DEFAULTS.ES;
  
  const canonical: CanonicalParsedRules = {
    pattern: 'ema_pullback',
    direction: form.direction,
    instrument,
    entry: {
      emaPullback: {
        emaPeriod: form.emaPeriod,
        pullbackConfirmation: form.pullbackConfirmation,
      },
      ...(form.useRsiFilter && {
        indicators: {
          rsi: {
            period: form.rsiPeriod,
            threshold: form.rsiThreshold,
            direction: form.rsiDirection,
          },
        },
      }),
    },
    exit: {
      stopLoss: { type: 'fixed_ticks', value: form.stopLossTicks },
      takeProfit: { type: 'rr_ratio', value: form.targetRatio },
    },
    risk: {
      positionSizing: 'risk_percent',
      riskPercent: form.riskPercent,
      maxContracts: form.maxContracts,
    },
    time: {
      session: form.session,
      timezone: 'America/New_York',
    },
  };
  
  return canonical;
}

function breakoutFormToCanonical(form: BreakoutFormData): CanonicalParsedRules {
  const instrument = INSTRUMENT_DEFAULTS[form.instrument.toUpperCase()] || INSTRUMENT_DEFAULTS.ES;
  
  return {
    pattern: 'breakout',
    direction: form.direction,
    instrument,
    entry: {
      breakout: {
        lookbackPeriod: form.lookbackPeriod,
        levelType: form.levelType,
        confirmation: form.confirmation,
      },
    },
    exit: {
      stopLoss: { type: 'fixed_ticks', value: form.stopLossTicks },
      takeProfit: { type: 'rr_ratio', value: form.targetRatio },
    },
    risk: {
      positionSizing: 'risk_percent',
      riskPercent: form.riskPercent,
      maxContracts: form.maxContracts,
    },
    time: {
      session: form.session,
      timezone: 'America/New_York',
    },
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body: CreateFromTemplateRequest = await request.json();
    const { pattern, formData } = body;

    // Validate pattern
    if (!['opening_range_breakout', 'ema_pullback', 'breakout'].includes(pattern)) {
      return NextResponse.json(
        { error: `Unsupported pattern: ${pattern}` },
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

    // Convert form data to canonical format
    let canonical: CanonicalParsedRules;
    let strategyName: string;
    
    switch (pattern) {
      case 'opening_range_breakout':
        canonical = orbFormToCanonical(formData as ORBFormData);
        strategyName = (formData as ORBFormData).name;
        break;
      case 'ema_pullback':
        canonical = emaPullbackFormToCanonical(formData as EMAPullbackFormData);
        strategyName = (formData as EMAPullbackFormData).name;
        break;
      case 'breakout':
        canonical = breakoutFormToCanonical(formData as BreakoutFormData);
        strategyName = (formData as BreakoutFormData).name;
        break;
      default:
        return NextResponse.json(
          { error: `Unknown pattern: ${pattern}` },
          { status: 400 }
        );
    }

    // Validate the canonical rules
    const validation = validateCanonical(canonical);
    if (!validation.success) {
      console.error('[Template] Validation failed:', validation.errors);
      return NextResponse.json(
        { error: 'Invalid strategy configuration', details: validation.errors },
        { status: 400 }
      );
    }

    // Generate events from canonical
    const events = generateEventsFromCanonical(
      canonical,
      new Date().toISOString(),
      `Created from ${pattern} template`
    );

    // Create the strategy in database
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .insert({
        user_id: user.id,
        name: strategyName.trim(),
        natural_language: `Created from ${pattern} template`,
        parsed_rules: canonical, // Store canonical in parsed_rules for now
        status: 'draft',
        autonomy_level: 'copilot',
      })
      .select()
      .single();

    if (strategyError || !strategy) {
      console.error('[Template] Failed to create strategy:', strategyError);
      return NextResponse.json(
        { error: 'Failed to save strategy' },
        { status: 500 }
      );
    }

    // Log behavioral event
    await logBehavioralEventServer(
      supabase,
      user.id,
      'strategy_created',
      {
        strategyId: strategy.id,
        pattern,
        instrument: canonical.instrument.symbol,
        direction: canonical.direction,
        source: 'template_gallery',
        templateUsed: true,
      }
    );

    console.log(`[Template] Strategy created: ${strategy.id} (${pattern})`);

    return NextResponse.json({
      success: true,
      strategy: {
        id: strategy.id,
        name: strategy.name,
        pattern: canonical.pattern,
        instrument: canonical.instrument.symbol,
      },
    });

  } catch (error) {
    console.error('[Template] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
