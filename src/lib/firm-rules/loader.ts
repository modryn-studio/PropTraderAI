/**
 * Firm Rules Loader
 * 
 * Loads prop firm rules from static JSON files extracted from Claude Skills bundle.
 * These are used for validation AFTER strategy is parsed, not during conversation.
 * 
 * Source: docs/Claude_Skills/proptraderai-strategy-builder/firm_rules/
 * Updated: January 10, 2026
 */

export interface FirmRules {
  firm_name: string;
  slug: string;
  website: string;
  automation_policy: 'allowed' | 'restricted' | 'prohibited';
  automation_notes: string;
  account_sizes: number[];
  rules: {
    [accountSize: string]: AccountRules;
  };
}

export interface AccountRules {
  profit_target: number;
  profit_target_percent: number;
  daily_loss_limit: number | null;
  daily_loss_limit_percent: number | null;
  max_drawdown: number;
  max_drawdown_percent: number;
  drawdown_type: 'static' | 'trailing' | 'eod_trailing';
  drawdown_notes: string;
  max_contracts: {
    ES: number;
    NQ: number;
    MES: number;
    MNQ: number;
    YM: number;
    RTY: number;
    CL: number;
    GC: number;
  };
  contract_limit_progression?: string;
  consistency_rule: number;
  consistency_notes: string;
  minimum_trading_days: number;
  max_single_day_profit_percent?: number;
}

const SUPPORTED_FIRMS = [
  'topstep',
  'myfundedfutures',
  'tradeify',
  'alpha-futures',
  'ftmo',
  'fundednext',
] as const;

export type SupportedFirm = typeof SUPPORTED_FIRMS[number];

/**
 * Check if a firm is supported
 */
export function isSupportedFirm(firmName: string): firmName is SupportedFirm {
  return SUPPORTED_FIRMS.includes(firmName.toLowerCase() as SupportedFirm);
}

/**
 * Load firm rules from static JSON file
 */
export async function loadFirmRules(firmName: string): Promise<FirmRules | null> {
  const slug = firmName.toLowerCase().replace(/\s+/g, '-');
  
  if (!isSupportedFirm(slug)) {
    return null;
  }

  try {
    // Dynamic import of JSON file
    const firmData = await import(`./data/${slug}.json`);
    return firmData.default || firmData;
  } catch (error) {
    console.error(`Failed to load firm rules for ${firmName}:`, error);
    return null;
  }
}

/**
 * Get rules for a specific account size
 */
export function getAccountRules(
  firmRules: FirmRules,
  accountSize: number
): AccountRules | null {
  const rulesKey = accountSize.toString();
  return firmRules.rules[rulesKey] || null;
}

/**
 * Detect firm name from user message
 * Returns normalized slug if found
 */
export function detectFirmFromMessage(message: string): SupportedFirm | null {
  const lowerMessage = message.toLowerCase();
  
  const firmPatterns: Record<SupportedFirm, RegExp[]> = {
    topstep: [/topstep/i, /top step/i],
    myfundedfutures: [/my funded futures/i, /myfundedfutures/i, /mff/i],
    tradeify: [/tradeify/i],
    'alpha-futures': [/alpha futures/i, /alpha-futures/i],
    ftmo: [/ftmo/i],
    fundednext: [/funded next/i, /fundednext/i],
  };

  for (const [firm, patterns] of Object.entries(firmPatterns)) {
    if (patterns.some((pattern) => pattern.test(lowerMessage))) {
      return firm as SupportedFirm;
    }
  }

  return null;
}

/**
 * Get list of all supported firms
 */
export function getSupportedFirms(): readonly SupportedFirm[] {
  return SUPPORTED_FIRMS;
}
