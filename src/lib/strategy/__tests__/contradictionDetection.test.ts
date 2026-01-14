/**
 * CONTRADICTION DETECTION TESTS
 * 
 * Tests the contradiction detection system for catching conflicting
 * values in user strategy descriptions.
 */

import { 
  detectContradictions, 
  detectTextContradictions,
  resolveContradiction 
} from '../contradictionDetection';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createRule(
  label: string, 
  value: string, 
  category: StrategyRule['category'] = 'exit'
): StrategyRule {
  return {
    category,
    label,
    value,
    isDefaulted: false,
    source: 'user',
  };
}

// ============================================================================
// RULE CONTRADICTION TESTS
// ============================================================================

console.log('=== CONTRADICTION DETECTION TESTS ===\n');

// Test 1: No contradictions
const noContradictions: StrategyRule[] = [
  createRule('Stop Loss', '20 ticks'),
  createRule('Profit Target', '1:2 R:R'),
  createRule('Position Size', '1% risk', 'risk'),
];

const result1 = detectContradictions(noContradictions);
console.log('Test 1: No contradictions');
console.log(`  Has contradictions: ${result1.hasContradictions} (expected: false)`);
console.log(`  ✓ ${result1.hasContradictions === false ? 'PASS' : 'FAIL'}\n`);

// Test 2: Conflicting stop losses
const conflictingStops: StrategyRule[] = [
  createRule('Stop Loss', '20 ticks'),
  createRule('Stop Loss', '30 ticks'),
  createRule('Profit Target', '1:2 R:R'),
];

const result2 = detectContradictions(conflictingStops);
console.log('Test 2: Conflicting stop losses');
console.log(`  Has contradictions: ${result2.hasContradictions} (expected: true)`);
console.log(`  Contradiction type: ${result2.contradictions[0]?.type} (expected: conflicting)`);
console.log(`  ✓ ${result2.hasContradictions === true && result2.contradictions[0]?.type === 'conflicting' ? 'PASS' : 'FAIL'}\n`);

// Test 3: Conditional logic (advanced user)
const conditionalStops: StrategyRule[] = [
  createRule('Stop Loss', '20 ticks or structure, whichever is smaller'),
  createRule('Stop Loss', 'structure-based if range > 20 ticks'),
];

const result3 = detectContradictions(conditionalStops);
console.log('Test 3: Conditional logic (advanced)');
console.log(`  Has contradictions: ${result3.hasContradictions} (expected: true)`);
console.log(`  Contradiction type: ${result3.contradictions[0]?.type} (expected: conditional)`);
console.log(`  ✓ ${result3.hasContradictions === true && result3.contradictions[0]?.type === 'conditional' ? 'PASS' : 'FAIL'}\n`);

// Test 4: Uncertainty
const uncertainStops: StrategyRule[] = [
  createRule('Stop Loss', '20 ticks'),
  createRule('Stop Loss', 'maybe structure-based is better'),
];

const result4 = detectContradictions(uncertainStops);
console.log('Test 4: Uncertainty');
console.log(`  Has contradictions: ${result4.hasContradictions} (expected: true)`);
console.log(`  Contradiction type: ${result4.contradictions[0]?.type} (expected: uncertain)`);
console.log(`  ✓ ${result4.hasContradictions === true && result4.contradictions[0]?.type === 'uncertain' ? 'PASS' : 'FAIL'}\n`);

// ============================================================================
// TEXT CONTRADICTION TESTS
// ============================================================================

console.log('=== TEXT CONTRADICTION TESTS ===\n');

// Test 5: Single stop in text
const text5 = 'I trade NQ ORB with 20 tick stop';
const result5 = detectTextContradictions(text5);
console.log('Test 5: Single stop in text');
console.log(`  Has contradictions: ${result5.hasContradictions} (expected: false)`);
console.log(`  ✓ ${result5.hasContradictions === false ? 'PASS' : 'FAIL'}\n`);

// Test 6: Multiple stops in text
const text6 = 'I use 20 tick stop, actually 30 tick stop is better';
const result6 = detectTextContradictions(text6);
console.log('Test 6: Multiple stops in text');
console.log(`  Has contradictions: ${result6.hasContradictions} (expected: true)`);
console.log(`  ✓ ${result6.hasContradictions === true ? 'PASS' : 'FAIL'}\n`);

// Test 7: Fixed + structure stop (conditional)
const text7 = 'I use 20 tick stop or structure based stop';
const result7 = detectTextContradictions(text7);
console.log('Test 7: Fixed + structure stop');
console.log(`  Has contradictions: ${result7.hasContradictions} (expected: true)`);
console.log(`  Contradiction type: ${result7.contradictions[0]?.type} (expected: conditional)`);
console.log(`  ✓ ${result7.hasContradictions === true ? 'PASS' : 'FAIL'}\n`);

// ============================================================================
// RESOLUTION TESTS
// ============================================================================

console.log('=== RESOLUTION TESTS ===\n');

// Test 8: Resolve by keeping preferred value
const conflicting8: StrategyRule[] = [
  createRule('Stop Loss', '20 ticks'),
  createRule('Stop Loss', '30 ticks'),
  createRule('Profit Target', '1:2 R:R'),
];

const resolved8 = resolveContradiction(conflicting8, 'stop loss', '20 ticks');
const remainingStops = resolved8.filter(r => r.label.toLowerCase() === 'stop loss');
console.log('Test 8: Resolve by preferred value');
console.log(`  Remaining stops: ${remainingStops.length} (expected: 1)`);
console.log(`  Value kept: ${remainingStops[0]?.value} (expected: 20 ticks)`);
console.log(`  ✓ ${remainingStops.length === 1 && remainingStops[0]?.value === '20 ticks' ? 'PASS' : 'FAIL'}\n`);

// Test 9: Resolve by keeping last (no preference)
const resolved9 = resolveContradiction(conflicting8, 'stop loss');
const remainingStops9 = resolved9.filter(r => r.label.toLowerCase() === 'stop loss');
console.log('Test 9: Resolve by keeping last');
console.log(`  Remaining stops: ${remainingStops9.length} (expected: 1)`);
console.log(`  Value kept: ${remainingStops9[0]?.value} (expected: 30 ticks)`);
console.log(`  ✓ ${remainingStops9.length === 1 && remainingStops9[0]?.value === '30 ticks' ? 'PASS' : 'FAIL'}\n`);

console.log('=== ALL TESTS COMPLETE ===');
