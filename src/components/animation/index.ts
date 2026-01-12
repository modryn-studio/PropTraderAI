/**
 * Animation Components Exports
 * 
 * This module provides React components for the Parameter-Based Animation System.
 * 
 * Usage:
 * ```tsx
 * import SmartAnimationContainer from '@/components/animation';
 * 
 * <SmartAnimationContainer rules={strategyRules} />
 * ```
 * 
 * @see docs/Animations/Parameter-Based Animation System/README.md
 */

// Main container component
export { default, default as SmartAnimationContainer } from './smartAnimationIntegration';

// Direct animation component (if you have pre-extracted parameters)
export { default as ParameterBasedAnimation } from './ParameterBasedAnimation';

// Utilities
export {
  testParameterExtraction,
  validateAnimationAccuracy,
  getAccuracyReport,
  extractStrategyParameters,
  debugParameters,
  type StrategyParameters,
  type VisualCoordinates,
} from './smartAnimationIntegration';
