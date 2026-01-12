/**
 * Animation Library Exports
 * 
 * This module provides the Parameter-Based Animation System for
 * generating precise strategy visualizations.
 * 
 * @see docs/Animations/Parameter-Based Animation System/README.md
 */

// Core extraction logic
export {
  extractStrategyParameters,
  calculateVisualCoordinates,
  debugParameters,
  type StrategyParameters,
  type VisualCoordinates,
} from './intelligentParameterExtractor';

// Claude prompt for precise parameter extraction
export {
  STRATEGY_ANIMATION_PROMPT,
  hasPreciseParameters,
  validateParameterPrecision,
  parseAnimationConfig,
} from './parameterAnimationPrompt';
