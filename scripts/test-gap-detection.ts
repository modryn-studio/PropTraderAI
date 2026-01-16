/**
 * Test script for Gap Detection API
 * 
 * Run with: npx ts-node scripts/test-gap-detection.ts
 * 
 * Tests the 10 cases from Issue #6 spec
 */

import { validateInputQuality, detectAllGaps, detectInstrumentGap } from '../src/lib/strategy/gapDetection';
import type { StrategyRule } from '../src/lib/utils/ruleExtractor';

// Test cases from Issue #6
const testCases = [
  {
    id: 1,
    input: "ES opening range breakout",
    expected: "Ask stop_loss",
    description: "Complete except stop loss"
  },
  {
    id: 2,
    input: "NQ pullback to 20 EMA with 10 tick stop",
    expected: "Generate",
    description: "Complete strategy"
  },
  {
    id: 3,
    input: "I trade breakouts",
    expected: "Ask instrument → ask stop_loss",
    description: "Multi-gap flow"
  },
  {
    id: 4,
    input: "ES ORB, stop below range low, 2:1 target",
    expected: "Generate",
    description: "Fully specified"
  },
  {
    id: 5,
    input: "NQ scalping strategy",
    expected: "Ask stop_loss",
    description: "Scalping needs stop"
  },
  {
    id: 6,
    input: "Opening range with 15 tick stop",
    expected: "Ask instrument",
    description: "Missing instrument"
  },
  {
    id: 7,
    input: ".",
    expected: "Reject",
    description: "Invalid input"
  },
  {
    id: 8,
    input: "Buy when it goes up",
    expected: "Reject/Ask more",
    description: "Too vague"
  },
  {
    id: 9,
    input: "ES and NQ breakout",
    expected: "Ask which instrument",
    description: "Ambiguous instrument"
  },
  {
    id: 10,
    input: "Long with 20% risk per trade",
    expected: "Flag dangerous sizing",
    description: "Dangerous sizing"
  }
];

function runTests() {
  console.log('========================================');
  console.log('Gap Detection Test Suite');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    console.log(`\n--- Test #${test.id}: ${test.description} ---`);
    console.log(`Input: "${test.input}"`);
    console.log(`Expected: ${test.expected}`);

    // First check input quality
    const inputQuality = validateInputQuality(test.input);
    
    if (!inputQuality.canProceed) {
      console.log(`Result: REJECTED (${inputQuality.issues.join(', ')})`);
      const isPass = test.expected.toLowerCase().includes('reject');
      console.log(`Status: ${isPass ? '✅ PASS' : '❌ FAIL'}`);
      if (isPass) passed++; else failed++;
      continue;
    }

    // Run gap detection
    const mockRules: StrategyRule[] = [];
    const result = detectAllGaps(test.input, mockRules);

    console.log(`Result: ${result.action.type} (severity: ${result.severity})`);
    
    if (result.action.type === 'ask_question' && result.action.questions?.length) {
      const q = result.action.questions[0];
      console.log(`Question: "${q.question}"`);
      const firstGap = result.gaps.find(g => g.status !== 'present');
      console.log(`Gap type: ${firstGap?.component}`);
    }

    // Determine pass/fail based on expected
    let isPass = false;
    const expected = test.expected.toLowerCase();
    
    if (expected.includes('generate') && result.action.type === 'generate') {
      isPass = true;
    } else if (expected.includes('ask') && result.action.type === 'ask_question') {
      // Check if the right type of question is being asked
      const firstGap = result.gaps.find(g => g.status !== 'present');
      if (expected.includes('stop') && firstGap?.component === 'stop_loss') {
        isPass = true;
      } else if (expected.includes('instrument') && firstGap?.component === 'instrument') {
        isPass = true;
      } else if (expected.includes('which instrument') && firstGap?.component === 'instrument') {
        // Check if it's ambiguous
        const instrGap = result.gaps.find(g => g.component === 'instrument');
        if (instrGap?.status === 'ambiguous') {
          isPass = true;
        }
      } else {
        // Generic ask
        isPass = true;
      }
    } else if (expected.includes('flag') && result.action.type === 'ask_question') {
      const sizingGap = result.gaps.find(g => g.component === 'position_sizing');
      if (sizingGap?.severity === 'blocker') {
        isPass = true;
      }
    }

    console.log(`Status: ${isPass ? '✅ PASS' : '❌ FAIL'}`);
    if (isPass) passed++; else failed++;
  }

  console.log('\n========================================');
  console.log(`RESULTS: ${passed}/${testCases.length} passed (${Math.round(passed/testCases.length*100)}%)`);
  console.log('========================================');

  return { passed, failed, total: testCases.length };
}

// Run if executed directly
runTests();
