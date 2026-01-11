/**
 * ANIMATION TRIGGER DETECTOR
 * 
 * Detects Claude's natural language cues that indicate
 * when animation should auto-expand to show visual context.
 * 
 * Uses phrase matching on Claude's responses to find "milestone moments"
 * where visualization adds value.
 */

// Phrases that indicate Claude wants to show a visualization
const EXPAND_TRIGGER_PHRASES = [
  // Explicit visualization references
  "here's what that looks like",
  "let me visualize",
  "here's how your strategy",
  "here's how that would look",
  "here's the setup",
  "let me show you",
  "this is what it looks like",
  "visually, this means",
  "on the chart",
  "the animation shows",
  
  // Strategy completion milestones
  "great! i've got everything",
  "perfect, your strategy is",
  "that completes your",
  "your strategy is ready",
  "strategy looks complete",
  "we have all the details",
  
  // Section completion milestones
  "entry rules are set",
  "your entry is defined",
  "got your exit rules",
  "risk management is set",
  "your stops and targets are",
  
  // Explicit animation mentions
  "the preview shows",
  "as you can see in the preview",
  "the visualization",
];

// Phrases that suggest animation should stay minimized
const MINIMIZE_TRIGGER_PHRASES = [
  "let me ask",
  "i need to clarify",
  "one more question",
  "before we continue",
  "can you tell me",
  "what about",
  "how do you handle",
  "what's your",
];

export interface AnimationTriggerResult {
  shouldExpand: boolean;
  shouldMinimize: boolean;
  matchedPhrase: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Analyze Claude's response to determine if animation should auto-expand
 */
export function detectAnimationTrigger(responseText: string): AnimationTriggerResult {
  const lowerText = responseText.toLowerCase();
  
  // Check for expand triggers
  for (const phrase of EXPAND_TRIGGER_PHRASES) {
    if (lowerText.includes(phrase)) {
      return {
        shouldExpand: true,
        shouldMinimize: false,
        matchedPhrase: phrase,
        confidence: phrase.includes('visual') || phrase.includes('show') ? 'high' : 'medium',
      };
    }
  }
  
  // Check for minimize triggers (Claude asking questions = focus on chat)
  for (const phrase of MINIMIZE_TRIGGER_PHRASES) {
    if (lowerText.includes(phrase)) {
      return {
        shouldExpand: false,
        shouldMinimize: true,
        matchedPhrase: phrase,
        confidence: 'medium',
      };
    }
  }
  
  // No trigger detected
  return {
    shouldExpand: false,
    shouldMinimize: false,
    matchedPhrase: null,
    confidence: 'low',
  };
}

/**
 * Detect if strategy has reached a milestone worth visualizing
 * Based on rule categories being populated
 */
export function detectMilestoneFromRules(
  rules: Array<{ category: string; label?: string }>,
  previousRuleCount: number
): {
  isMilestone: boolean;
  milestoneType: 'entry_complete' | 'exit_complete' | 'strategy_complete' | null;
} {
  if (rules.length <= previousRuleCount) {
    return { isMilestone: false, milestoneType: null };
  }

  const categories = new Set(rules.map(r => r.category));
  
  // Strategy complete: Has entry, exit, and risk
  if (
    categories.has('entry') && 
    categories.has('exit') && 
    categories.has('risk')
  ) {
    return { isMilestone: true, milestoneType: 'strategy_complete' };
  }
  
  // Check for newly completed sections
  const entryRules = rules.filter(r => r.category === 'entry');
  const exitRules = rules.filter(r => r.category === 'exit' || r.category === 'risk');
  
  // Entry complete: 2+ entry rules
  if (entryRules.length >= 2 && previousRuleCount < rules.length) {
    // Check if entry was just completed (new rule is entry)
    const latestCategory = rules[rules.length - 1]?.category;
    if (latestCategory === 'entry') {
      return { isMilestone: true, milestoneType: 'entry_complete' };
    }
  }
  
  // Exit complete: Has both stop and target
  if (exitRules.length >= 2) {
    const hasStop = rules.some(r => r.label?.toLowerCase().includes('stop'));
    const hasTarget = rules.some(r => 
      r.label?.toLowerCase().includes('target') || 
      r.category === 'exit'
    );
    if (hasStop && hasTarget) {
      return { isMilestone: true, milestoneType: 'exit_complete' };
    }
  }
  
  return { isMilestone: false, milestoneType: null };
}

/**
 * Session storage for animation preferences per strategy
 */
const STORAGE_KEY = 'proptrader_animation_prefs';

interface AnimationPreferences {
  [strategyId: string]: {
    isExpanded: boolean;
    wasManuallySet: boolean;
    lastUpdated: number;
  };
}

export function saveAnimationPreference(
  strategyId: string, 
  isExpanded: boolean,
  wasManuallySet: boolean = false
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const prefs: AnimationPreferences = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) || '{}'
    );
    prefs[strategyId] = {
      isExpanded,
      wasManuallySet,
      lastUpdated: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save animation preference:', e);
  }
}

export function loadAnimationPreference(
  strategyId: string
): { isExpanded: boolean; wasManuallySet: boolean } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const prefs: AnimationPreferences = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) || '{}'
    );
    const pref = prefs[strategyId];
    if (pref) {
      return {
        isExpanded: pref.isExpanded,
        wasManuallySet: pref.wasManuallySet,
      };
    }
  } catch (e) {
    console.warn('Failed to load animation preference:', e);
  }
  return null;
}

export function clearAnimationPreferences(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
