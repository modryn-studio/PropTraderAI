/**
 * Test Pattern Detection for Issue #46
 * 
 * Run with: npx tsx scripts/test-pattern-detection.ts
 */

import { detectExpertiseLevel } from '../src/lib/strategy/completenessDetection';

console.log('Testing Pattern Detection (Issue #46)\n');
console.log('=' .repeat(50) + '\n');

const testCases = [
  { input: 'i want to trade pullbacks', expectedPattern: 'ema_pullback' },
  { input: 'opening range breakout strategy', expectedPattern: 'opening_range_breakout' },
  { input: 'I want a breakout strategy', expectedPattern: 'breakout' },
  { input: 'VWAP trading strategy', expectedPattern: 'vwap' },
  { input: 'i want to trade NQ', expectedPattern: undefined }, // No pattern, just instrument
];

let passed = 0;
let failed = 0;

testCases.forEach((tc, index) => {
  const result = detectExpertiseLevel(tc.input);
  const success = result.detectedPattern === tc.expectedPattern;
  
  if (success) passed++;
  else failed++;
  
  console.log(`Test ${index + 1}: ${success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Input: "${tc.input}"`);
  console.log(`  Expected: ${tc.expectedPattern || 'undefined'}`);
  console.log(`  Got: ${result.detectedPattern || 'undefined'}`);
  console.log(`  Confidence: ${result.patternConfidence || 'N/A'}`);
  console.log('');
});

console.log('=' .repeat(50));
console.log(`Results: ${passed}/${testCases.length} passed`);

if (failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
