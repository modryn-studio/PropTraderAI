'use client';

/**
 * Shared Control Components
 * 
 * Extracted from ConstrainedInputs for reuse across:
 * - MissingFieldPrompt (inline form)
 * - StrategyEditableCard (advanced editing)
 * - PatternConfirmation (pattern selector)
 * 
 * These are the atomic, pattern-agnostic controls.
 * 
 * @see Issue #44 - Enhanced Strategy Builder UX
 */

export { InstrumentSelector, INSTRUMENTS } from './InstrumentSelector';
export { DirectionControl, DIRECTIONS } from './DirectionControl';
export { TimeRangeSelector, SESSION_OPTIONS } from './TimeRangeSelector';
export { PeriodSelector } from './PeriodSelector';
export { TicksSlider } from './TicksSlider';
export { RiskPercentSlider } from './RiskPercentSlider';

// Types
export type { InstrumentValue, DirectionValue, SessionValue } from './types';
