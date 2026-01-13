/**
 * MASTER TRADING INTELLIGENCE SKILL
 * 
 * Real-time intelligence system that makes Claude understand futures trading
 * like a professional prop trader and coach.
 * 
 * This is the "brain" that gets injected into Claude's system prompt.
 * 
 * Integrates with:
 * - promptManager.ts (enhances getSystemPrompt)
 * - behavioral/logger.ts (logs intelligence decisions)
 */

import {
  detectConversationPhase,
  detectCurrentFocus,
  detectMistakes,
  generateContextualPrompt,
  getRelevantExamples,
  getCalculationHelp,
  type ConversationContext,
  type ConversationPhase,
} from './contextualIntelligence';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// MASTER SKILL SYSTEM
// ============================================================================

export class TradingIntelligenceSkill {
  /**
   * Generate enhanced system prompt based on current conversation state
   * 
   * This is called by promptManager.ts to inject trading intelligence
   * into Claude's context.
   */
  static generateSystemPrompt(
    rules: StrategyRule[],
    lastUserMessage: string,
    basePrompt: string
  ): string {
    // Detect conversation state
    const phase = detectConversationPhase(rules);
    const currentFocus = detectCurrentFocus(lastUserMessage);
    const mistakes = detectMistakes(rules);
    const missingComponents = this.getMissingComponents(rules);
    
    const context: ConversationContext = {
      phase,
      rules,
      lastUserMessage,
      missingComponents,
      detectedIssues: mistakes,
    };
    
    // Generate contextual guidance
    const contextualPrompt = generateContextualPrompt(context);
    const examples = getRelevantExamples(currentFocus);
    const calculations = getCalculationHelp(rules);
    
    // Assemble enhanced prompt
    return `
${basePrompt}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PROFESSIONAL FUTURES TRADING INTELLIGENCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are operating with professional-grade futures trading knowledge.
This isn't amateur hour - you understand trading at the level of:
• Prop firm traders (FTMO, TopStep, Apex)
• Institutional trading desks
• Professional trading educators (Al Brooks, Van Tharp, SMB Capital)

## CURRENT CONVERSATION STATE:

**Phase:** ${phase}
**User Focus:** ${currentFocus}
**Rules Defined:** ${rules.length}
**Missing Components:** ${missingComponents.join(', ') || 'None'}

${mistakes.length > 0 ? `
## ⚠️ DETECTED ISSUES:

${mistakes.map(m => `• ${m}`).join('\n')}

**Your response MUST address these issues.**
` : ''}

## CONTEXTUAL GUIDANCE FOR THIS PHASE:

${contextualPrompt}

${examples.length > 0 ? `
## RELEVANT EXAMPLES:

${examples.map(e => `• ${e}`).join('\n')}
` : ''}

${calculations ? `
## CALCULATION REFERENCE:

${calculations}
` : ''}

## CRITICAL REMINDERS:

1. **ONE question at a time** - Never ask multiple questions
2. **Specific before moving on** - Don't proceed until current component is precise
3. **No assumptions** - If unsure, ask for clarification
4. **Use their language first** - Then translate to professional terms
5. **Catch mistakes immediately** - Don't let vague/dangerous rules pass

## SOCRATIC METHOD FRAMEWORK:

Ask → Listen → Clarify → Confirm → Proceed

Example:
You: "What tells you it's time to enter?"
User: "When it breaks out"
You: "Breakout of what specifically? The 15-minute high, a trend line, a pattern?"
User: "The 15-minute high"
You: "Perfect! And do you enter immediately on the break, or wait for confirmation?"

That's the rhythm. Keep it conversational, not interrogational.

## VALIDATION CHECKPOINTS:

Before considering any component "complete":

✓ Entry: Can it be programmed? Is it measurable?
✓ Stop: Exact placement known? No vagueness?
✓ Target: Method defined? Not "depends"?
✓ Size: Tied to risk? Not arbitrary?

## PROFESSIONAL STANDARDS YOU ENFORCE:

• Max 2% risk per trade (3%+ is "financial suicide")
• Minimum 1.5:1 risk:reward (2:1 standard)
• Specific entry conditions (no "when it looks good")
• Written stop-loss (no "mental stops")
• Position sizing formula (not fixed regardless of account)

You're not just collecting information. You're ensuring they build something that could actually be funded by a prop firm.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
  
  /**
   * Detect missing required components
   */
  private static getMissingComponents(rules: StrategyRule[]): string[] {
    const missing: string[] = [];
    
    const hasEntry = rules.some(r => 
      r.category === 'entry' || 
      r.label.toLowerCase().includes('entry') ||
      r.label.toLowerCase().includes('trigger')
    );
    const hasStop = rules.some(r => 
      (r.label.toLowerCase().includes('stop') && !r.label.toLowerCase().includes('time')) ||
      r.label.toLowerCase().includes('sl')
    );
    const hasTarget = rules.some(r => 
      r.label.toLowerCase().includes('target') || 
      r.label.toLowerCase().includes('profit') ||
      r.label.toLowerCase().includes('tp')
    );
    const hasSize = rules.some(r => 
      r.label.toLowerCase().includes('position') || 
      r.label.toLowerCase().includes('size') ||
      (r.label.toLowerCase().includes('risk') && r.value.includes('%'))
    );
    const hasInstrument = rules.some(r => 
      r.label.toLowerCase().includes('instrument') || 
      r.label.toLowerCase().includes('symbol') ||
      /\b(es|nq|mes|mnq)\b/i.test(r.value)
    );
    
    if (!hasEntry) missing.push('Entry Criteria');
    if (!hasStop) missing.push('Stop-Loss');
    if (!hasTarget) missing.push('Profit Target');
    if (!hasSize) missing.push('Position Sizing');
    if (!hasInstrument) missing.push('Instrument');
    
    return missing;
  }
  
  /**
   * Validate if response is acceptable before sending to user
   * 
   * Returns validation result with issues to address
   */
  static validateResponse(response: string, context: ConversationContext): ResponseValidation {
    const issues: string[] = [];
    
    // Check for multiple questions
    const questionCount = (response.match(/\?/g) || []).length;
    if (questionCount > 2) {
      issues.push('Too many questions - stick to ONE at a time');
    }
    
    // Check if addressing detected issues
    if (context.detectedIssues.length > 0) {
      const addressedAny = context.detectedIssues.some(issue => 
        response.toLowerCase().includes(issue.toLowerCase().split(':')[0])
      );
      if (!addressedAny) {
        issues.push('Did not address detected issues in strategy');
      }
    }
    
    // Check if being too accepting of vague answers
    const vagueAcceptance = [
      'sounds good',
      'perfect, moving on',
      'great, next question',
      'let\'s proceed',
    ];
    const isAcceptingVague = vagueAcceptance.some(phrase => 
      response.toLowerCase().includes(phrase)
    );
    
    if (isAcceptingVague && context.missingComponents.length > 0) {
      issues.push('Accepting vague answer when specificity needed');
    }
    
    // Check for multiple questions in one response
    // Allow pattern: "Main question?" + "Which fits your approach?"
    const questionPatterns = response.match(/\b(what|where|when|how|which|do you|are you|will you|would you)\b.*?\?/gi) || [];
    const hasMainQuestion = questionPatterns.length >= 1;
    const hasWhichFits = /which fits (your|the)/i.test(response);
    
    // Only flag if 2+ questions AND NOT the "which fits" pattern
    if (questionPatterns.length > 1 && !(hasMainQuestion && hasWhichFits)) {
      issues.push('Asked multiple questions - should be ONE at a time');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      severity: issues.length > 1 ? 'critical' : issues.length === 1 ? 'warning' : 'ok',
    };
  }
  
  /**
   * Get next recommended action based on state
   */
  static getNextAction(rules: StrategyRule[]): string {
    const phase = detectConversationPhase(rules);
    
    switch (phase) {
      case 'initial':
        return 'Ask what instrument they want to trade';
      
      case 'entry_definition':
        return 'Get specific entry conditions with examples';
      
      case 'stop_definition':
        return 'Define exact stop-loss placement';
      
      case 'target_definition':
        return 'Establish profit target methodology';
      
      case 'sizing_definition':
        return 'Determine position sizing approach';
      
      case 'complete':
        return 'Validate strategy and summarize';
      
      default:
        return 'Continue refining current component';
    }
  }
  
  /**
   * Get intelligence metadata for behavioral logging
   */
  static getIntelligenceMetadata(rules: StrategyRule[], lastUserMessage: string): IntelligenceMetadata {
    const phase = detectConversationPhase(rules);
    const focus = detectCurrentFocus(lastUserMessage);
    const mistakes = detectMistakes(rules);
    const missing = this.getMissingComponents(rules);
    
    // Calculate completion matching UI (strategyValidator.ts)
    // Required = 70%, Recommended = 30% (but recommended only counts after required complete)
    const requiredCount = 5; // Entry, Stop, Target, Position Size, Instrument
    const requiredMet = requiredCount - missing.length;
    
    // Don't give recommended credit until all required are met
    const recommendedMet = missing.length === 0 ? 0 : 0; // TODO: Add recommended tracking when needed
    const recommendedCount = 4;
    
    const completionPercentage = Math.round(
      ((requiredMet / requiredCount) * 70) + ((recommendedMet / recommendedCount) * 30)
    );
    
    return {
      phase,
      focus,
      rulesCount: rules.length,
      errorsDetected: mistakes.length,
      missingComponents: missing,
      completionPercentage,
    };
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface ResponseValidation {
  valid: boolean;
  issues: string[];
  severity: 'ok' | 'warning' | 'critical';
}

export interface IntelligenceMetadata {
  phase: ConversationPhase;
  focus: string;
  rulesCount: number;
  errorsDetected: number;
  missingComponents: string[];
  completionPercentage: number;
}

// ============================================================================
// DECISION TREES
// ============================================================================

/**
 * Decision tree for handling entry questions
 */
export const ENTRY_DECISION_TREE = {
  userSaysVague: {
    examples: ['when it looks good', 'when I feel it', 'when momentum picks up'],
    response: 'Ask: "What does [their phrase] mean specifically? Is it a price level, indicator reading, or pattern?"',
  },
  
  userSaysPattern: {
    examples: ['breakout', 'pullback', 'reversal'],
    response: 'Drill down: "Breakout of what? The high, a trendline, a pattern?" Get specifics.',
  },
  
  userSaysIndicator: {
    examples: ['RSI', 'MACD', 'EMA cross'],
    response: 'Get settings: "Which period RSI? What level? What timeframe?"',
  },
  
  userGivesSpecifics: {
    examples: ['break above 15-min high', 'price crosses above 20 EMA on 5-min'],
    response: 'Confirm: "So you enter when [restate]. Any other confirmation needed?"',
  },
} as const;

/**
 * Decision tree for handling stop-loss questions
 */
export const STOP_DECISION_TREE = {
  userSaysNoStop: {
    examples: ['I don\'t use stops', 'mental stop', 'I\'ll decide'],
    response: 'Educate: CME Group says "mental stops don\'t count." Professional traders define stops before entry. What would your stop be?',
  },
  
  userSaysVague: {
    examples: ['below', 'tight', 'depends'],
    response: 'Clarify: "Below what exactly? The swing low, range low, entry minus X ticks?"',
  },
  
  userGivesStructure: {
    examples: ['below swing low', 'range low', 'previous support'],
    response: 'Get buffer: "How many ticks beyond that level? 1-2 ticks is standard."',
  },
  
  userGivesFixed: {
    examples: ['10 ticks', '8 points', '2 ATR'],
    response: 'Confirm calculation: "So on ES, 10 ticks = $125 risk per contract. That clear?"',
  },
} as const;

/**
 * Decision tree for handling target questions
 */
export const TARGET_DECISION_TREE = {
  userSaysNoTarget: {
    examples: ['I let it run', 'depends on the move', 'no target'],
    response: 'Explain: "Professional strategies need exit rules. Do you trail a stop, use time-based exit, or have a target level?"',
  },
  
  userSaysRR: {
    examples: ['2:1', '1:2', '2R'],
    response: 'Confirm math: "So if your risk is X, your target is 2X. That gives you Y points profit. Correct?"',
  },
  
  userSaysFixed: {
    examples: ['20 points', '50 ticks'],
    response: 'Compare to risk: "Your stop is X and target is Y. That\'s a Z:1 reward-to-risk ratio. Intentional?"',
  },
  
  userSaysTrail: {
    examples: ['trailing stop', 'let it run with trail'],
    response: 'Get method: "Trailing how? Fixed distance, ATR-based, or structure-based?"',
  },
} as const;

// ============================================================================
// ERROR DETECTION
// ============================================================================

/**
 * Detect critical errors that must be corrected immediately
 */
export function detectCriticalErrors(rules: StrategyRule[]): CriticalError[] {
  const errors: CriticalError[] = [];
  
  // Check for no stop loss after entry defined
  const hasEntry = rules.some(r => r.category === 'entry');
  const hasStop = rules.some(r => r.label.toLowerCase().includes('stop'));
  if (hasEntry && !hasStop && rules.length > 3) {
    errors.push({
      severity: 'critical',
      message: 'No stop-loss defined',
      fix: 'MUST define stop-loss before proceeding. Ask: "Where will your stop be?"',
    });
  }
  
  // Check for excessive risk
  const riskRules = rules.filter(r => r.value.includes('%'));
  for (const rule of riskRules) {
    const match = rule.value.match(/(\d+(?:\.\d+)?)\s*%/);
    if (match && parseFloat(match[1]) > 3) {
      errors.push({
        severity: 'critical',
        message: `Excessive risk: ${rule.value}`,
        fix: 'Van Tharp: >3% per trade is "financial suicide". Reduce to 1-2%.',
      });
    }
  }
  
  // Check for vague entries
  const entryRules = rules.filter(r => r.category === 'entry');
  for (const rule of entryRules) {
    const vagueTerms = ['looks good', 'feels right', 'depends', 'maybe', 'probably', 'sometimes'];
    if (vagueTerms.some(term => rule.value.toLowerCase().includes(term))) {
      errors.push({
        severity: 'critical',
        message: `Vague entry: "${rule.value}"`,
        fix: 'Get specific: "What EXACTLY triggers entry? Price level? Indicator value?"',
      });
    }
  }
  
  // Check for poor risk:reward
  const targetRule = rules.find(r => r.label.toLowerCase().includes('target'));
  if (targetRule && /\b1:1\b|1 to 1/.test(targetRule.value)) {
    errors.push({
      severity: 'warning',
      message: '1:1 risk:reward requires 50% win rate',
      fix: 'Suggest 1.5:1 minimum (40% breakeven) or 2:1 standard (33.3% breakeven)',
    });
  }
  
  // Check for mental stops
  const stopRules = rules.filter(r => r.label.toLowerCase().includes('stop'));
  for (const rule of stopRules) {
    if (/mental|depends|figure|decide later/.test(rule.value.toLowerCase())) {
      errors.push({
        severity: 'critical',
        message: 'Mental stop detected',
        fix: 'CME Group: "Mental stops don\'t count". Define exact placement.',
      });
    }
  }
  
  return errors;
}

export interface CriticalError {
  severity: 'critical' | 'warning';
  message: string;
  fix: string;
}

// ============================================================================
// EXPORTS FOR INTEGRATION
// ============================================================================

// Re-export types and functions needed by promptManager
export { 
  detectConversationPhase,
  detectCurrentFocus,
  detectMistakes,
  type ConversationContext,
  type ConversationPhase,
};
