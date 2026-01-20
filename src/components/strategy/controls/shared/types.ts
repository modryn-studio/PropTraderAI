/**
 * Shared Types for Control Components
 */

// Instrument types
export type InstrumentValue = 
  | 'ES' | 'MES' 
  | 'NQ' | 'MNQ' 
  | 'YM' | 'MYM' 
  | 'RTY' | 'M2K' 
  | 'CL' | 'MCL' 
  | 'GC' | 'MGC';

// Direction types  
export type DirectionValue = 'long_only' | 'short_only' | 'both';

// Session types
export type SessionValue = 
  | 'NY Session (9:30 AM - 4:00 PM ET)'
  | 'NY Morning (9:30 AM - 12:00 PM ET)'
  | 'NY Afternoon (12:00 PM - 4:00 PM ET)'
  | 'Opening Hour (9:30 AM - 10:30 AM ET)'
  | 'Power Hour (3:00 PM - 4:00 PM ET)'
  | string; // Allow custom sessions

// Common control props
export interface BaseControlProps {
  /** Current value */
  value: string | number;
  /** Called when value changes */
  onChange: (value: string | number) => void;
  /** Optional label override */
  label?: string;
  /** Whether control is disabled */
  disabled?: boolean;
  /** Error state */
  error?: string;
}
