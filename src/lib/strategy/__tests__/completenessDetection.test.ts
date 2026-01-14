/**
 * RAPID FLOW TESTS
 * 
 * Run with: npx ts-node --esm src/lib/strategy/__tests__/completenessDetection.test.ts
 * Or use in browser console during development
 */

import { 
  calculateCompleteness, 
  detectExpertiseLevel,
  getSmartDefaults,
  type CompletenessResult,
  type ExpertiseDetectionResult
} from '../completenessDetection';

// ============================================================================
// TEST CASES
// ============================================================================

interface TestCase {
  name: string;
  message: string;
  expectedComponents: string[];
  expectedPercentage: number;
  expectedExpertise: 'beginner' | 'intermediate' | 'advanced';
}

const TEST_CASES: TestCase[] = [
  // Beginner cases
  {
    name: 'Empty/vague message',
    message: 'I want to start trading futures',
    expectedComponents: [],
    expectedPercentage: 0,
    expectedExpertise: 'beginner',
  },
  
  // Intermediate-low cases (25-40%)
  {
    name: 'Instrument + pattern only',
    message: 'I trade ES opening range breakout',
    expectedComponents: ['instrument', 'pattern'],
    expectedPercentage: 0.33,
    expectedExpertise: 'intermediate',
  },
  {
    name: 'Pattern + stop only',
    message: 'Pullback trading with 10 tick stop',
    expectedComponents: ['pattern', 'stop'],
    expectedPercentage: 0.33,
    expectedExpertise: 'intermediate',
  },
  
  // Intermediate-high cases (50-70%)
  {
    name: 'ORB with stop and session',
    message: 'ES ORB 15 minute range, stop 10 ticks below the range, NY session',
    expectedComponents: ['instrument', 'pattern', 'stop', 'session'],
    expectedPercentage: 0.67,
    expectedExpertise: 'intermediate',
  },
  
  // Advanced cases (75%+)
  {
    name: 'Nearly complete strategy',
    message: 'NQ pullback to 20 EMA, stop below swing low, target 2R, risk 1% per trade, first 2 hours only',
    expectedComponents: ['instrument', 'pattern', 'stop', 'target', 'sizing', 'session'],
    expectedPercentage: 1.0,
    expectedExpertise: 'advanced',
  },
  {
    name: 'Complete ORB strategy',
    message: 'ES opening range breakout, 15 minute range, stop 2 ticks below range, 1.5x range target, 1% risk, 9:30-12pm',
    expectedComponents: ['instrument', 'pattern', 'stop', 'target', 'sizing', 'session'],
    expectedPercentage: 1.0,
    expectedExpertise: 'advanced',
  },
  
  // Edge cases
  {
    name: 'Multiple instruments mentioned',
    message: 'I switch between ES and NQ depending on volatility',
    expectedComponents: ['instrument'],
    expectedPercentage: 0.17,
    expectedExpertise: 'intermediate',
  },
  {
    name: 'Micro contracts',
    message: 'MNQ scalping with 5 tick stop and 5 tick target',
    expectedComponents: ['instrument', 'pattern', 'stop', 'target'],
    expectedPercentage: 0.67,
    expectedExpertise: 'intermediate',
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

function runTests(): void {
  console.log('\n🧪 RAPID FLOW COMPLETENESS DETECTION TESTS\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of TEST_CASES) {
    const result = calculateCompleteness(testCase.message);
    const expertise = detectExpertiseLevel(testCase.message);
    
    // Check component detection
    const detectedCorrect = testCase.expectedComponents.every(
      comp => result.detected.includes(comp)
    );
    
    // Check percentage (within tolerance)
    const percentageCorrect = Math.abs(result.percentage - testCase.expectedPercentage) < 0.15;
    
    // Check expertise level mapping
    const expertiseCorrect = 
      (testCase.expectedExpertise === 'beginner' && expertise.level === 'beginner') ||
      (testCase.expectedExpertise === 'intermediate' && expertise.level === 'intermediate') ||
      (testCase.expectedExpertise === 'advanced' && expertise.level === 'advanced');
    
    const allPassed = detectedCorrect && percentageCorrect && expertiseCorrect;
    
    if (allPassed) {
      console.log(`\n✅ ${testCase.name}`);
      passed++;
    } else {
      console.log(`\n❌ ${testCase.name}`);
      console.log(`   Message: "${testCase.message.substring(0, 50)}..."`);
      
      if (!detectedCorrect) {
        console.log(`   Components: expected ${testCase.expectedComponents.join(', ')}, got ${result.detected.join(', ')}`);
      }
      if (!percentageCorrect) {
        console.log(`   Percentage: expected ${testCase.expectedPercentage}, got ${result.percentage.toFixed(2)}`);
      }
      if (!expertiseCorrect) {
        console.log(`   Expertise: expected ${testCase.expectedExpertise}, got ${expertise.level}`);
      }
      failed++;
    }
    
    // Show question count recommendation
    console.log(`   → ${expertise.questionCount} questions needed (${expertise.approach})`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);
}

// ============================================================================
// INTERACTIVE TEST (for browser console)
// ============================================================================

export function testMessage(message: string): void {
  console.log('\n📝 Testing:', message);
  console.log('-'.repeat(50));
  
  const completeness = calculateCompleteness(message);
  const expertise = detectExpertiseLevel(message);
  const defaults = getSmartDefaults(completeness.components.pattern.value);
  
  console.log('\n🔍 COMPLETENESS:');
  console.log(`   Percentage: ${(completeness.percentage * 100).toFixed(0)}%`);
  console.log(`   Detected: ${completeness.detected.join(', ') || 'none'}`);
  console.log(`   Missing: ${completeness.missing.join(', ') || 'none'}`);
  
  console.log('\n🎯 EXPERTISE:');
  console.log(`   Level: ${expertise.level}`);
  console.log(`   Questions: ${expertise.questionCount}`);
  console.log(`   Approach: ${expertise.approach}`);
  console.log(`   Tone: ${expertise.tone}`);
  
  console.log('\n⚡ SMART DEFAULTS:');
  Object.entries(defaults).forEach(([key, val]) => {
    console.log(`   ${key}: ${val.value} (${val.reasoning})`);
  });
}

// Export for module usage
export { runTests, TEST_CASES };

// Run if executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runTests();
}
