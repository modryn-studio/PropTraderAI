/**
 * PROFESSIONAL TRADING INTELLIGENCE SYSTEM
 * 
 * Contextual intelligence that makes Claude understand futures trading
 * like a professional prop trader with 15+ years of experience.
 * 
 * Usage:
 * ```typescript
 * import { TradingIntelligenceSkill, detectCriticalErrors } from '@/lib/trading';
 * 
 * // Generate enhanced prompt
 * const enhancedPrompt = TradingIntelligenceSkill.generateSystemPrompt(
 *   rules,
 *   lastUserMessage,
 *   basePrompt
 * );
 * 
 * // Check for critical errors
 * const errors = detectCriticalErrors(rules);
 * ```
 */

// Master Skill (main integration point)
export { 
  TradingIntelligenceSkill,
  detectCriticalErrors,
  detectConversationPhase,
  detectCurrentFocus,
  detectMistakes,
  ENTRY_DECISION_TREE,
  STOP_DECISION_TREE,
  TARGET_DECISION_TREE,
  type ResponseValidation,
  type IntelligenceMetadata,
  type CriticalError,
  type ConversationPhase,
  type ConversationContext,
} from './tradingIntelligenceSkill';

// Knowledge Base (taxonomies, standards, formulas)
export {
  ENTRY_TAXONOMY,
  EXIT_TAXONOMY,
  POSITION_SIZING_METHODS,
  COMMON_MISTAKES,
  PROP_FIRM_STANDARDS,
  PROFESSIONAL_STANDARDS,
  INSTRUMENTS,
  CALCULATIONS,
  type EntryType,
  type InstrumentType,
  type PropFirmName,
  type MistakeType,
} from './tradingKnowledgeBase';

// Contextual Intelligence (dynamic prompts)
export {
  generateContextualPrompt,
  getRelevantExamples,
  getCalculationHelp,
  detectEntryType,
} from './contextualIntelligence';
