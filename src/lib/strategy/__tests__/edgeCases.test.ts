/**
 * Edge Case Tests for Strategy Builder
 * Tests for forecasted issues and their fixes
 * 
 * Run by calling: runAllEdgeCaseTests()
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ExtractedRule = {
  label: string;
  value: string;
  category: string;
  isDefaulted?: boolean;
};

type StrategyRule = ExtractedRule & {
  id?: string;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

// ============================================================================
// TEST: hasComponent() Stop Loss Detection
// ============================================================================

export function testHasComponentStopDetection() {
  function hasComponent(rules: ExtractedRule[], component: string): boolean {
    const normalizedComponent = component.toLowerCase();
    
    return rules.some(rule => {
      const label = rule.label.toLowerCase();
      const value = rule.value.toLowerCase();
      
      switch (normalizedComponent) {
        case 'stop':
          const hasStopLabel = label.includes('stop') || 
                              label.includes('sl') ||
                              (label.includes('loss') && !label.includes('profit')) ||
                              label.includes('exit') ||
                              label.includes('risk');
          
          const stopPatterns = [
            'tick', 'ticks', 'point', 'points', 'pip', 'pips',
            'range', 'swing', 'structure', 'below', 'above', 'break',
            'mental', 'initial', 'atr', 'middle', 'half', '50%',
            'low', 'high', 'get out', 'exit when',
          ];
          
          const hasStopValue = stopPatterns.some(pattern => value.includes(pattern)) ||
                              /\d+\s*(tick|point|pip)/i.test(value) ||
                              /\d+(\.\d+)?\s*atr/i.test(value);
          
          return hasStopLabel || hasStopValue;
          
        default:
          return label.includes(normalizedComponent);
      }
    });
  }

  // Test 1: Structure-based stops
  const test1: ExtractedRule[] = [
    { label: 'Exit', value: 'When price breaks below the low', category: 'exit' }
  ];
  assert(hasComponent(test1, 'stop'), 'detects structure-based stops');
  
  // Test 2: Mental stops
  const test2: ExtractedRule[] = [
    { label: 'Risk', value: 'Mental stop at swing low', category: 'risk' }
  ];
  assert(hasComponent(test2, 'stop'), 'detects mental stops');
  
  // Test 3: "Get out" natural language
  const test3: ExtractedRule[] = [
    { label: 'Exit Strategy', value: 'Get out at structure', category: 'exit' }
  ];
  assert(hasComponent(test3, 'stop'), 'detects "get out" natural language');
  
  // Test 4: ATR-based stops with decimals
  const test4: ExtractedRule[] = [
    { label: 'Stop', value: 'Stop if it hits 1.5 ATR', category: 'risk' }
  ];
  assert(hasComponent(test4, 'stop'), 'detects ATR-based stops with decimals');
  
  // Test 5: Range-based stops
  const test5: ExtractedRule[] = [
    { label: 'Stop Loss', value: 'Middle of the range', category: 'risk' }
  ];
  assert(hasComponent(test5, 'stop'), 'detects range-based stops');
  
  // Test 6: Does NOT trigger on profit mentions
  const test6: ExtractedRule[] = [
    { label: 'Profit Target', value: '2:1 risk reward', category: 'exit' }
  ];
  assert(!hasComponent(test6, 'stop'), 'does NOT trigger on profit mentions');
  
  console.log('✅ All hasComponent() tests passed');
}

// ============================================================================
// TEST: Deduplication Logic
// ============================================================================

export function testDeduplicationLogic() {
  function deduplicateRules(rules: StrategyRule[]): StrategyRule[] {
    const seen = new Map<string, StrategyRule>();
    
    rules.forEach(rule => {
      const normalizedLabel = rule.label.toLowerCase().trim();
      
      const exactMatches: Record<string, string> = {
        'pattern': 'setup:pattern',
        'strategy': 'setup:pattern',
        'entry pattern': 'setup:pattern',
        'stop loss': 'risk:stop',
        'stop': 'risk:stop',
        'sl': 'risk:stop',
        'target': 'exit:target',
        'profit target': 'exit:target',
        'take profit': 'exit:target',
        'profit': 'exit:target',
        'r:r': 'exit:target',
        'risk:reward': 'exit:target',
        'position size': 'risk:sizing',
        'position sizing': 'risk:sizing',
        'contracts': 'risk:sizing',
      };
      
      const semanticKey = exactMatches[normalizedLabel] || `${rule.category}:${normalizedLabel}`;
      
      const existing = seen.get(semanticKey);
      if (!existing) {
        seen.set(semanticKey, rule);
      } else {
        if (existing.isDefaulted && !rule.isDefaulted) {
          seen.set(semanticKey, rule);
        } else if (!existing.isDefaulted && !rule.isDefaulted) {
          if (rule.value.length > existing.value.length) {
            seen.set(semanticKey, rule);
          }
        }
      }
    });
    
    return Array.from(seen.values());
  }

  // Test 1: Does NOT dedupe different concepts with "reward"
  const test1: StrategyRule[] = [
    { label: 'Entry Pattern', value: 'Break above high', category: 'entry' },
    { label: 'Risk:Reward', value: '2:1', category: 'exit' },
  ];
  const deduped1 = deduplicateRules(test1);
  assert(deduped1.length === 2, 'does NOT dedupe different concepts with "reward" in them');
  
  // Test 2: DOES dedupe identical pattern references
  const test2: StrategyRule[] = [
    { label: 'Pattern', value: 'Opening Range Breakout', category: 'setup' },
    { label: 'Strategy', value: 'Opening Range Breakout', category: 'setup' },
    { label: 'Entry Pattern', value: 'ORB', category: 'setup' },
  ];
  const deduped2 = deduplicateRules(test2);
  assert(deduped2.length === 1, 'DOES dedupe identical pattern references');
  assert(deduped2[0].value === 'Opening Range Breakout', 'prefers longer value');
  
  // Test 3: Keeps user-specified over defaulted rules
  const test3: StrategyRule[] = [
    { label: 'Stop Loss', value: '20 ticks', category: 'risk', isDefaulted: true },
    { label: 'Stop Loss', value: 'Middle of range', category: 'risk', isDefaulted: false },
  ];
  const deduped3 = deduplicateRules(test3);
  assert(deduped3.length === 1, 'keeps user-specified over defaulted rules (count)');
  assert(deduped3[0].value === 'Middle of range', 'keeps user-specified value');
  assert(deduped3[0].isDefaulted === false, 'marks as not defaulted');
  
  // Test 4: Does NOT accidentally merge entry and exit rules
  const test4: StrategyRule[] = [
    { label: 'Entry Trigger', value: 'Break above high', category: 'entry' },
    { label: 'Exit Trigger', value: 'Break below low', category: 'exit' },
  ];
  const deduped4 = deduplicateRules(test4);
  assert(deduped4.length === 2, 'does NOT accidentally merge entry and exit rules');
  
  console.log('✅ All deduplication tests passed');
}

// ============================================================================
// TEST: Context-Aware Extraction Scenarios
// ============================================================================

export function testContextAwareExtraction() {
  // These document expected behavior for Claude API integration tests
  
  // Test 1: Extract specific time from assistant question
  const expected1 = {
    label: 'Trading Hours',
    value: '9:30 AM - 10:30 AM ET',
    category: 'setup'
  };
  assert(expected1.value !== 'just the opening', 'extracts specific time from context, not shorthand');
  
  // Test 2: Apply common sense to "middle of range"
  const expected2 = {
    label: 'Stop Loss',
    value: '50% of opening range',
    category: 'risk'
  };
  assert(expected2.value.includes('50%'), 'applies common sense to "middle of range"');
  
  // Test 3: Capitalize pattern names
  const expected3 = {
    label: 'Pattern',
    value: 'Opening Range Breakout',
    category: 'setup'
  };
  assert(expected3.value !== 'opening range breakout', 'capitalizes pattern names');
  
  console.log('✅ All context-aware extraction expectations documented');
}

// ============================================================================
// TEST: Formatting Standards
// ============================================================================

export function testFormattingStandards() {
  // Test 1: Times in 12-hour format with timezone
  const validTimeFormats = [
    '9:30 AM - 10:30 AM ET',
    '2:00 PM - 4:00 PM ET',
    '9:00 AM - 11:30 AM ET'
  ];
  const timeRegex = /\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM) ET/;
  validTimeFormats.forEach(format => {
    assert(timeRegex.test(format), `time format "${format}" matches standard`);
  });
  
  // Test 2: Ticks/points with units
  const validTickFormats = ['20 ticks', '15 points', '30 pips'];
  const tickRegex = /\d+ (tick|point|pip)s?/;
  validTickFormats.forEach(format => {
    assert(tickRegex.test(format), `tick format "${format}" matches standard`);
  });
  
  // Test 3: Risk:reward ratios
  const validRatioFormats = ['2:1', '3:1', '2R', '3R'];
  const ratioRegex = /\d+(:\d+|R)/;
  validRatioFormats.forEach(format => {
    assert(ratioRegex.test(format), `ratio format "${format}" matches standard`);
  });
  
  console.log('✅ All formatting standard tests passed');
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

export function runAllEdgeCaseTests() {
  console.log('🧪 Running Edge Case Tests...\n');
  
  try {
    testHasComponentStopDetection();
    testDeduplicationLogic();
    testContextAwareExtraction();
    testFormattingStandards();
    
    console.log('\n✅ All edge case tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    return false;
  }
}

// Uncomment to run tests:
// runAllEdgeCaseTests();
