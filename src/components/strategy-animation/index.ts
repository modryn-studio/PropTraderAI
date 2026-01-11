// Re-export all animation system components and utilities
export { default as StrategyVisualizer } from './StrategyVisualizer';
export { default as AnimationContainer, useStrategyAnimation } from './AnimationContainer';
export { default as AnimationLoader } from './AnimationLoader';
export { AnimationErrorBoundary } from './AnimationErrorBoundary';

// Taxonomy exports (types and templates)
export { 
  STRATEGY_TEMPLATES,
  generateAnimationConfig,
  type AnimationConfig,
  type AnimationType,
} from './taxonomy';

// Config parser exports (use this validateAnimationConfig for type guarding)
export {
  extractAnimationConfig,
  removeAnimationConfig,
  hasAnimationConfig,
  hasCompleteAnimationConfig,
  tryExtractFromStream,
  mergeAnimationConfigs,
  validateAnimationConfig,
} from './configParser';

export { STRATEGY_ANIMATION_PROMPT } from './claude-prompt';
