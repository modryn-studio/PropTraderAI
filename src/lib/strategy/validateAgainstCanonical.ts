/**
 * Validate Strategy Against Canonical Schema
 * 
 * This module bridges Claude's freeform output with the strict canonical schema.
 * It validates, categorizes missing fields, and applies intelligent defaults.
 * 
 * Key responsibilities:
 * - Validate Claude output against canonical schema
 * - Categorize fields as critical (must ask user) or defaultable (auto-fill)
 * - Apply pattern-specific defaults with ⚙ indicator metadata
 * - Generate user-friendly error messages
 * 
 * @module lib/strategy/validateAgainstCanonical
 * @see Issue #44 - Enhanced Strategy Builder UX
 */

import { 
  CanonicalParsedRules,
  validateCanonical,
  INSTRUMENT_DEFAULTS,
  SUPPORTED_PATTERNS,
  type SupportedPattern,
} from '../execution/canonical-schema';

import { 
  claudeToCanonical,
  detectPattern,
  type ClaudeStrategyOutput,
} from './claudeToCanonical';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Field categories for validation
 * - critical: Must have user input (instrument, pattern-specific params)
 * - defaultable: Can apply smart defaults with ⚙ indicator
 */
export type FieldCategory = 'critical' | 'defaultable';

export interface FieldInfo {
  field: string;
  label: string;
  category: FieldCategory;
  inputType: 'dropdown' | 'number' | 'radio';
  options?: string[];
  defaultValue?: string | number;
  defaultReason?: string;
}

export interface ValidationResult {
  valid: boolean;
  pattern: SupportedPattern | 'unknown';
  canonical?: CanonicalParsedRules;
  missingFields: FieldInfo[];
  invalidFields: { field: string; error: string }[];
  defaultedFields: FieldInfo[];
}

// ============================================================================
// FIELD DEFINITIONS BY PATTERN
// ============================================================================

/**
 * Critical fields that MUST be specified by user (can't default safely)
 */
const CRITICAL_FIELDS_BY_PATTERN: Record<SupportedPattern, string[]> = {
  opening_range_breakout: ['instrument', 'periodMinutes'],
  ema_pullback: ['instrument', 'emaPeriod'],
  breakout: ['instrument', 'lookbackPeriod'],
};

/**
 * Defaultable fields with their default values and reasons
 */
interface DefaultConfig {
  defaultValue: string | number;
  defaultReason: string;
}

const DEFAULTABLE_FIELDS: Record<string, DefaultConfig> = {
  direction: {
    defaultValue: 'both',
    defaultReason: 'Trade both directions for maximum opportunity',
  },
  'stopLoss.type': {
    defaultValue: 'structure',
    defaultReason: 'Structure-based stops respect market levels',
  },
  'stopLoss.value': {
    defaultValue: 20,
    defaultReason: '20 ticks provides buffer for volatility',
  },
  'takeProfit.type': {
    defaultValue: 'rr_ratio',
    defaultReason: 'Risk:Reward ratio is industry standard',
  },
  'takeProfit.value': {
    defaultValue: 2,
    defaultReason: '2:1 R:R is the minimum for profitable trading',
  },
  'risk.positionSizing': {
    defaultValue: 'risk_percent',
    defaultReason: 'Percentage-based sizing adapts to account size',
  },
  'risk.riskPercent': {
    defaultValue: 1,
    defaultReason: '1% risk per trade is the professional standard',
  },
  'risk.maxContracts': {
    defaultValue: 5,
    defaultReason: 'Conservative max prevents oversizing',
  },
  'time.session': {
    defaultValue: 'ny',
    defaultReason: 'NY session has best liquidity for futures',
  },
  // ORB-specific
  entryOn: {
    defaultValue: 'both',
    defaultReason: 'Trade both breakout directions for flexibility',
  },
  // EMA-specific
  pullbackConfirmation: {
    defaultValue: 'bounce',
    defaultReason: 'Bounce confirmation reduces false entries',
  },
  // Breakout-specific
  levelType: {
    defaultValue: 'both',
    defaultReason: 'Trade both support and resistance breaks',
  },
  confirmation: {
    defaultValue: 'close',
    defaultReason: 'Close confirmation filters out false breakouts',
  },
};

/**
 * Get field info for display in UI
 */
const FIELD_INFO: Record<string, Omit<FieldInfo, 'defaultValue' | 'defaultReason'>> = {
  instrument: {
    field: 'instrument',
    label: 'Instrument',
    category: 'critical',
    inputType: 'dropdown',
    options: Object.keys(INSTRUMENT_DEFAULTS),
  },
  periodMinutes: {
    field: 'periodMinutes',
    label: 'Opening Range Period',
    category: 'critical',
    inputType: 'radio',
    options: ['5', '15', '30', '60', '90'],
  },
  emaPeriod: {
    field: 'emaPeriod',
    label: 'EMA Period',
    category: 'critical',
    inputType: 'dropdown',
    options: ['9', '20', '50', '100', '200'],
  },
  lookbackPeriod: {
    field: 'lookbackPeriod',
    label: 'Lookback Period',
    category: 'critical',
    inputType: 'dropdown',
    options: ['10', '20', '50', '100'],
  },
  direction: {
    field: 'direction',
    label: 'Trading Direction',
    category: 'defaultable',
    inputType: 'radio',
    options: ['long', 'short', 'both'],
  },
  'stopLoss.type': {
    field: 'stopLoss.type',
    label: 'Stop Loss Type',
    category: 'defaultable',
    inputType: 'dropdown',
    options: ['structure', 'fixed_ticks', 'atr_multiple', 'opposite_range'],
  },
  'takeProfit.type': {
    field: 'takeProfit.type',
    label: 'Take Profit Type',
    category: 'defaultable',
    inputType: 'dropdown',
    options: ['rr_ratio', 'fixed_ticks', 'structure'],
  },
  'risk.riskPercent': {
    field: 'risk.riskPercent',
    label: 'Risk Per Trade',
    category: 'defaultable',
    inputType: 'dropdown',
    options: ['0.5', '1', '1.5', '2', '3'],
  },
  'time.session': {
    field: 'time.session',
    label: 'Trading Session',
    category: 'defaultable',
    inputType: 'dropdown',
    options: ['ny', 'london', 'asia', 'all', 'custom'],
  },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate Claude output against canonical schema
 * 
 * @param claudeOutput - Raw output from Claude strategy parsing
 * @returns ValidationResult with categorized missing/invalid fields
 */
export function validatePattern(
  claudeOutput: ClaudeStrategyOutput
): ValidationResult {
  // Step 1: Detect pattern
  const pattern = claudeOutput.parsed_rules?.entry_conditions 
    ? detectPattern(claudeOutput.parsed_rules.entry_conditions)
    : 'unknown';

  if (pattern === 'unknown') {
    return {
      valid: false,
      pattern: 'unknown',
      missingFields: [],
      invalidFields: [{ field: 'pattern', error: 'Could not detect a supported pattern' }],
      defaultedFields: [],
    };
  }

  // Step 2: Try to normalize to canonical format
  const normResult = claudeToCanonical(claudeOutput);

  if (normResult.success) {
    // Fully valid! Mark any auto-applied defaults
    const defaultedFields = detectDefaultedFields(normResult.canonical);
    return {
      valid: true,
      pattern,
      canonical: normResult.canonical,
      missingFields: [],
      invalidFields: [],
      defaultedFields,
    };
  }

  // Step 3: Analyze what's missing and categorize
  const { criticalMissing, defaultableMissing } = categorizeErrors(
    normResult.errors || [],
    pattern
  );

  return {
    valid: false,
    pattern,
    missingFields: criticalMissing,
    invalidFields: normResult.errors?.map(e => ({ field: e, error: e })) || [],
    defaultedFields: defaultableMissing,
  };
}

/**
 * Categorize errors into critical (must ask user) vs defaultable (can auto-fill)
 */
function categorizeErrors(
  errors: string[],
  pattern: SupportedPattern
): {
  criticalMissing: FieldInfo[];
  defaultableMissing: FieldInfo[];
} {
  const criticalFields = CRITICAL_FIELDS_BY_PATTERN[pattern];
  const criticalMissing: FieldInfo[] = [];
  const defaultableMissing: FieldInfo[] = [];

  for (const error of errors) {
    // Extract field name from error (format: "field.path: message")
    const fieldMatch = error.match(/^([\w.]+):/);
    const field = fieldMatch?.[1] || error;

    const fieldInfo = FIELD_INFO[field];
    const defaultConfig = DEFAULTABLE_FIELDS[field];

    if (!fieldInfo) continue;

    const enrichedFieldInfo: FieldInfo = {
      ...fieldInfo,
      defaultValue: defaultConfig?.defaultValue,
      defaultReason: defaultConfig?.defaultReason,
    };

    if (criticalFields.includes(field)) {
      criticalMissing.push(enrichedFieldInfo);
    } else if (defaultConfig) {
      defaultableMissing.push(enrichedFieldInfo);
    }
  }

  return { criticalMissing, defaultableMissing };
}

/**
 * Detect which fields were auto-defaulted in a canonical strategy
 */
function detectDefaultedFields(canonical: CanonicalParsedRules): FieldInfo[] {
  const defaulted: FieldInfo[] = [];
  
  // Check common defaultable fields
  if (canonical.direction === 'both') {
    const config = DEFAULTABLE_FIELDS['direction'];
    defaulted.push({
      ...FIELD_INFO['direction'],
      defaultValue: config.defaultValue as string,
      defaultReason: config.defaultReason,
    });
  }

  if (canonical.risk.riskPercent === 1) {
    const config = DEFAULTABLE_FIELDS['risk.riskPercent'];
    defaulted.push({
      ...FIELD_INFO['risk.riskPercent'],
      defaultValue: config.defaultValue as number,
      defaultReason: config.defaultReason,
    });
  }

  if (canonical.exit.takeProfit.type === 'rr_ratio' && canonical.exit.takeProfit.value === 2) {
    const config = DEFAULTABLE_FIELDS['takeProfit.value'];
    defaulted.push({
      field: 'takeProfit.value',
      label: 'Take Profit',
      category: 'defaultable',
      inputType: 'dropdown',
      defaultValue: 2,
      defaultReason: config.defaultReason,
    });
  }

  if (canonical.time.session === 'ny') {
    const config = DEFAULTABLE_FIELDS['time.session'];
    defaulted.push({
      ...FIELD_INFO['time.session'],
      defaultValue: config.defaultValue as string,
      defaultReason: config.defaultReason,
    });
  }

  return defaulted;
}

// ============================================================================
// APPLY DEFAULTS
// ============================================================================

/**
 * Apply defaults to partial canonical output, filling missing fields
 * Returns a complete canonical strategy with metadata about what was defaulted
 */
export function applyCanonicalDefaults(
  partial: Partial<CanonicalParsedRules>,
  pattern: SupportedPattern
): {
  canonical: CanonicalParsedRules;
  defaultedFields: FieldInfo[];
} {
  const defaultedFields: FieldInfo[] = [];

  // Start with pattern-specific defaults
  const defaults = getPatternDefaults(pattern);
  
  // Merge partial with defaults, tracking what was defaulted
  const merged = deepMergeWithTracking(defaults, partial, defaultedFields);

  // Validate the merged result
  const result = validateCanonical(merged);
  
  if (!result.success) {
    throw new Error(`Failed to apply defaults: ${result.errors.join(', ')}`);
  }

  return {
    canonical: result.data,
    defaultedFields,
  };
}

/**
 * Get complete defaults for a pattern
 */
function getPatternDefaults(pattern: SupportedPattern): Partial<CanonicalParsedRules> {
  const commonDefaults = {
    direction: 'both' as const,
    instrument: INSTRUMENT_DEFAULTS['ES'],
    exit: {
      stopLoss: { type: 'structure' as const, value: 2 },
      takeProfit: { type: 'rr_ratio' as const, value: 2 },
    },
    risk: {
      positionSizing: 'risk_percent' as const,
      riskPercent: 1,
      maxContracts: 5,
    },
    time: {
      session: 'ny' as const,
      timezone: 'America/New_York',
    },
  };

  switch (pattern) {
    case 'opening_range_breakout':
      return {
        pattern: 'opening_range_breakout',
        ...commonDefaults,
        entry: {
          openingRange: {
            periodMinutes: 15,
            entryOn: 'both',
          },
        },
      };
    
    case 'ema_pullback':
      return {
        pattern: 'ema_pullback',
        ...commonDefaults,
        entry: {
          emaPullback: {
            emaPeriod: 20,
            pullbackConfirmation: 'bounce',
          },
        },
      };
    
    case 'breakout':
      return {
        pattern: 'breakout',
        ...commonDefaults,
        entry: {
          breakout: {
            lookbackPeriod: 20,
            levelType: 'both',
            confirmation: 'close',
          },
        },
      };
  }
}

/**
 * Deep merge with tracking of which fields were defaulted
 */
function deepMergeWithTracking(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>,
  defaultedFields: FieldInfo[],
  path: string = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...defaults };

  for (const [key, value] of Object.entries(defaults)) {
    const fullPath = path ? `${path}.${key}` : key;
    const override = overrides[key];

    if (override === undefined) {
      // Field was defaulted
      const fieldInfo = FIELD_INFO[fullPath];
      const defaultConfig = DEFAULTABLE_FIELDS[fullPath];
      
      if (fieldInfo && defaultConfig) {
        defaultedFields.push({
          ...fieldInfo,
          defaultValue: defaultConfig.defaultValue,
          defaultReason: defaultConfig.defaultReason,
        });
      }
      result[key] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse into nested objects
      result[key] = deepMergeWithTracking(
        value as Record<string, unknown>,
        (override || {}) as Record<string, unknown>,
        defaultedFields,
        fullPath
      );
    } else {
      // Use override value
      result[key] = override;
    }
  }

  return result;
}

// ============================================================================
// VWAP DETECTION
// ============================================================================

/**
 * Check if Claude output mentions VWAP (unsupported in Phase 1)
 */
export function detectsVWAP(claudeOutput: ClaudeStrategyOutput): boolean {
  const allText = JSON.stringify(claudeOutput).toLowerCase();
  return /\bvwap\b/.test(allText);
}

/**
 * Get alternative patterns for unsupported strategies
 */
export function getAlternativePatterns(unsupportedPattern: string): Array<{
  pattern: SupportedPattern;
  reason: string;
}> {
  const alternatives: Record<string, Array<{ pattern: SupportedPattern; reason: string }>> = {
    vwap: [
      { pattern: 'ema_pullback', reason: 'Similar trend-following logic to VWAP' },
      { pattern: 'breakout', reason: 'Momentum-based like VWAP crosses' },
    ],
    momentum: [
      { pattern: 'breakout', reason: 'Breakout captures momentum moves' },
    ],
    reversal: [
      { pattern: 'ema_pullback', reason: 'EMA pullback works for mean reversion' },
    ],
    range: [
      { pattern: 'opening_range_breakout', reason: 'ORB is a specialized range strategy' },
    ],
  };

  return alternatives[unsupportedPattern.toLowerCase()] || [];
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SUPPORTED_PATTERNS,
  CRITICAL_FIELDS_BY_PATTERN,
  DEFAULTABLE_FIELDS,
  FIELD_INFO,
};
