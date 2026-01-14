/**
 * BEGINNER TEMPLATE STRATEGY SYSTEM
 * 
 * Provides pre-built strategy templates for beginners who:
 * - Give vague/non-specific responses
 * - Express frustration ("I just want to make money")
 * - Don't understand options (don't choose a/b/c/d)
 * 
 * Templates have:
 * - All required components pre-filled
 * - Smart defaults based on pattern
 * - Clear explanations for each component
 * - Customizable fields for personalization
 * 
 * Part of: Rapid Strategy Builder - Beginner Path
 */

import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string; // "30 seconds", "2 minutes"
  popularity: number;    // 1-100, for sorting
  defaultRules: {
    instrument: string;
    pattern: string;
    entry: string;
    stop: string;
    target: string;
    sizing: string;
    session?: string;
  };
  customizableComponents: string[];
  whyItWorks: string;
}

export interface TemplateOfferResult {
  message: string;
  template: StrategyTemplate;
  action: 'template_offered';
}

export interface BeginnerResponseResult {
  type: 'offer_template' | 'simplify_options' | 'proceed_normal';
  message?: string;
  templateId?: string;
}

// ============================================================================
// BEGINNER TEMPLATES
// ============================================================================

export const BEGINNER_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'basic_orb',
    name: 'Opening Range Breakout',
    description: 'Trade breakouts from the first 15 minutes of market open. Simple, clear rules with high win rate during volatile open.',
    shortDescription: 'Breakout from opening range',
    difficulty: 'beginner',
    estimatedTime: '30 seconds',
    popularity: 95,
    defaultRules: {
      instrument: 'NQ',
      pattern: 'ORB (Opening Range Breakout)',
      entry: 'Break above 15-min range high (long) or below range low (short)',
      stop: '20 ticks ($100)',
      target: '1:2 R:R (40 ticks)',
      sizing: '1% risk per trade',
      session: '9:30 AM - 12:00 PM ET',
    },
    customizableComponents: ['instrument', 'stop', 'target'],
    whyItWorks: 'ORB captures morning volatility with clear entry/exit levels. 15-min range is industry standard.',
  },
  {
    id: 'ema_pullback',
    name: '20 EMA Pullback',
    description: 'Buy dips to the 20 EMA in an uptrend, or sell rallies to it in a downtrend. Classic trend-following approach.',
    shortDescription: 'Bounce off 20 EMA',
    difficulty: 'beginner',
    estimatedTime: '30 seconds',
    popularity: 85,
    defaultRules: {
      instrument: 'ES',
      pattern: 'EMA Pullback',
      entry: 'Price touches 20 EMA in uptrend (long) or downtrend (short)',
      stop: 'Below swing low (long) or above swing high (short)',
      target: '1:1.5 R:R',
      sizing: '1% risk per trade',
      session: 'NY session (9:30 AM - 4:00 PM ET)',
    },
    customizableComponents: ['instrument', 'target'],
    whyItWorks: '20 EMA is widely watched by institutions. Pullbacks offer lower-risk entries in trending markets.',
  },
  {
    id: 'vwap_bounce',
    name: 'VWAP Bounce',
    description: 'Trade bounces off VWAP (Volume Weighted Average Price). Works best after initial morning volatility settles.',
    shortDescription: 'Bounce off VWAP',
    difficulty: 'beginner',
    estimatedTime: '30 seconds',
    popularity: 75,
    defaultRules: {
      instrument: 'NQ',
      pattern: 'VWAP Bounce',
      entry: 'Price touches VWAP and shows rejection (wick)',
      stop: 'Other side of VWAP + 5 ticks buffer',
      target: '1:2 R:R',
      sizing: '1% risk per trade',
      session: 'After 10:00 AM ET',
    },
    customizableComponents: ['instrument', 'target'],
    whyItWorks: 'VWAP is the institutional fair value. Price tends to revert to VWAP throughout the day.',
  },
  {
    id: 'simple_breakout',
    name: 'Range Breakout',
    description: 'Trade breakouts above resistance or below support. Simple price action approach with clear levels.',
    shortDescription: 'Break key levels',
    difficulty: 'beginner',
    estimatedTime: '30 seconds',
    popularity: 70,
    defaultRules: {
      instrument: 'ES',
      pattern: 'Range Breakout',
      entry: 'Break above range high with volume confirmation',
      stop: '15 ticks below entry',
      target: '1:2 R:R (30 ticks)',
      sizing: '1% risk per trade',
      session: 'NY session (9:30 AM - 4:00 PM ET)',
    },
    customizableComponents: ['instrument', 'stop', 'target'],
    whyItWorks: 'Breakouts often lead to momentum moves. Volume confirmation reduces false breakouts.',
  },
];

// ============================================================================
// BEGINNER RESPONSE HANDLING
// ============================================================================

/**
 * Detect if user response indicates frustration/impatience
 */
function isFrustratedResponse(response: string): boolean {
  const frustrationPatterns = [
    /\bjust\b/i,
    /\bmoney\b/i,
    /\bprofit\b/i,
    /\bquick\b/i,
    /\beasy\b/i,
    /\bsimple\b/i,
    /\bwhatever\b/i,
    /\bdon['']?t\s+care\b/i,
    /\byou\s+decide\b/i,
    /\bi\s+don['']?t\s+know\b/i,
    /\bidk\b/i,
    /\bpick\s+for\s+me\b/i,
    /\byou\s+choose\b/i,
  ];
  
  return frustrationPatterns.some(pattern => pattern.test(response));
}

/**
 * Check if response matches expected option format
 */
function matchesOptionFormat(response: string, expectedOptions: string[]): boolean {
  const trimmed = response.trim().toLowerCase();
  
  // Check single letter (a, b, c, d)
  if (/^[a-e]$/i.test(trimmed)) {
    return true;
  }
  
  // Check if any option keyword is in response
  return expectedOptions.some(opt => 
    trimmed.includes(opt.toLowerCase())
  );
}

/**
 * Handle beginner response that doesn't match expected options
 * 
 * @param userResponse - User's response text
 * @param expectedOptions - Options user was presented with (e.g., ["breakout", "pullback", "orb"])
 * @returns BeginnerResponseResult with action to take
 */
export function handleBeginnerResponse(
  userResponse: string, 
  expectedOptions: string[] = []
): BeginnerResponseResult {
  // Check if response matches expected options
  if (matchesOptionFormat(userResponse, expectedOptions)) {
    return { type: 'proceed_normal' };
  }
  
  // Detect frustration - offer template
  if (isFrustratedResponse(userResponse)) {
    return {
      type: 'offer_template',
      templateId: 'basic_orb',
      message: `I hear you - let's get straight to it.

Most successful new traders start with **Opening Range Breakout (ORB)**:
• Simple rules: price breaks above/below opening range
• Clear entry and exit
• Works well on NQ
• You can start trading today

Want to build this first? Takes 30 seconds.
You can always create custom strategies later.`,
    };
  }
  
  // User just didn't understand - simplify options
  return {
    type: 'simplify_options',
    message: `No problem! Let me simplify:

Choose the pattern that sounds most interesting:
a) **Breakouts** - when price breaks above key levels
b) **Pullbacks** - when price bounces off support
c) **Show me the fastest path** (I'll pick for you)

Just type the letter (a, b, or c).`,
  };
}

// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================

/**
 * Get a template by ID
 */
export function getTemplate(templateId: string): StrategyTemplate | undefined {
  return BEGINNER_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get the most popular template (default recommendation)
 */
export function getDefaultTemplate(): StrategyTemplate {
  return BEGINNER_TEMPLATES.reduce((best, current) => 
    current.popularity > best.popularity ? current : best
  );
}

/**
 * Convert template to strategy rules
 */
export function templateToRules(template: StrategyTemplate): StrategyRule[] {
  const rules: StrategyRule[] = [
    {
      category: 'setup',
      label: 'Strategy',
      value: template.name,
      isDefaulted: true,
      explanation: template.description,
      source: 'default',
    },
    {
      category: 'setup',
      label: 'Instrument',
      value: template.defaultRules.instrument,
      isDefaulted: true,
      explanation: 'Popular futures contract',
      source: 'default',
    },
    {
      category: 'entry',
      label: 'Pattern',
      value: template.defaultRules.pattern,
      isDefaulted: true,
      explanation: template.whyItWorks,
      source: 'default',
    },
    {
      category: 'entry',
      label: 'Entry',
      value: template.defaultRules.entry,
      isDefaulted: true,
      source: 'default',
    },
    {
      category: 'exit',
      label: 'Stop Loss',
      value: template.defaultRules.stop,
      isDefaulted: true,
      explanation: 'Industry standard for day trading',
      source: 'default',
    },
    {
      category: 'exit',
      label: 'Profit Target',
      value: template.defaultRules.target,
      isDefaulted: true,
      explanation: 'Standard risk/reward ratio',
      source: 'default',
    },
    {
      category: 'risk',
      label: 'Position Size',
      value: template.defaultRules.sizing,
      isDefaulted: true,
      explanation: 'Professional risk management',
      source: 'default',
    },
  ];
  
  if (template.defaultRules.session) {
    rules.push({
      category: 'filters',
      label: 'Trading Session',
      value: template.defaultRules.session,
      isDefaulted: true,
      explanation: 'Optimal trading hours for this pattern',
      source: 'default',
    });
  }
  
  return rules;
}

/**
 * Generate template offer message
 */
export function generateTemplateOffer(templateId: string): TemplateOfferResult | null {
  const template = getTemplate(templateId);
  if (!template) return null;
  
  const message = `✓ **${template.name}** Template

${template.description}

**Default Setup:**
• ${template.defaultRules.instrument} futures
• Entry: ${template.defaultRules.entry}
• Stop: ${template.defaultRules.stop}
• Target: ${template.defaultRules.target}
• Risk: ${template.defaultRules.sizing}
${template.defaultRules.session ? `• Session: ${template.defaultRules.session}` : ''}

[Use This Template] [Customize First]`;

  return {
    message,
    template,
    action: 'template_offered',
  };
}

/**
 * Get all available templates sorted by popularity
 */
export function getAllTemplates(): StrategyTemplate[] {
  return [...BEGINNER_TEMPLATES].sort((a, b) => b.popularity - a.popularity);
}
