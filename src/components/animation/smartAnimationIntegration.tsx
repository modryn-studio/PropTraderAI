/**
 * SMART ANIMATION INTEGRATION
 * 
 * Container component that:
 * 1. Extracts parameters from StrategyRule[]
 * 2. Renders ParameterBasedAnimation with precise positions
 * 3. Handles graceful fallback for incomplete parameters
 * 
 * Also exports testParameterExtraction() for deployment verification.
 * 
 * @see docs/Animations/Parameter-Based Animation System/README.md
 */

'use client';

import { useMemo } from 'react';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';
import { 
  extractStrategyParameters, 
  debugParameters,
} from '@/lib/animation/intelligentParameterExtractor';
import ParameterBasedAnimation from './ParameterBasedAnimation';

interface SmartAnimationContainerProps {
  rules: StrategyRule[];
  /** Enable debug logging to console */
  debug?: boolean;
  /** Custom width for animation */
  width?: number;
  /** Custom height for animation */
  height?: number;
  /** Animation duration in seconds */
  duration?: number;
}

/**
 * Smart Animation Container
 * 
 * Automatically extracts parameters from rules and renders precise animation.
 * Shows placeholder message if parameters are incomplete.
 */
export default function SmartAnimationContainer({ 
  rules,
  debug = false,
  width,
  height,
  duration,
}: SmartAnimationContainerProps) {
  
  // Extract parameters from current rules with validation
  const parameters = useMemo(() => {
    if (!rules || rules.length === 0) {
      return null;
    }
    
    try {
      if (debug) {
        debugParameters(rules);
      }
      return extractStrategyParameters(rules);
    } catch (error) {
      console.error('Parameter extraction failed:', error);
      return null;
    }
  }, [rules, debug]);
  
  // If parameters incomplete, show helpful placeholder
  if (!parameters) {
    return (
      <div className="w-full px-4 py-8 text-center bg-[#000000] rounded-sm border border-[rgba(255,255,255,0.1)]">
        <p className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
          Define entry, stop, and target to see visualization
        </p>
        <p className="text-[10px] font-mono text-[rgba(255,255,255,0.3)] mt-2">
          The animation will show your exact specifications
        </p>
      </div>
    );
  }
  
  // Render parameter-based animation
  return (
    <ParameterBasedAnimation 
      parameters={parameters}
      width={width}
      height={height}
      duration={duration}
    />
  );
}

// ============================================================================
// TESTING UTILITY
// ============================================================================

/**
 * Test parameter extraction with sample rules
 * Run this before deploying to verify extraction accuracy
 * 
 * Usage: 
 * ```
 * import { testParameterExtraction } from '@/components/animation/smartAnimationIntegration';
 * testParameterExtraction();
 * ```
 */
export function testParameterExtraction(): {
  passed: number;
  failed: number;
  results: Array<{test: string; passed: boolean}>;
} {
  console.group('🧪 Parameter Extraction Tests');
  const testResults: Array<{test: string; passed: boolean}> = [];
  
  // Test 1: ORB with 50% stop
  const test1: StrategyRule[] = [
    { label: 'Pattern', value: 'Opening Range Breakout', category: 'setup' },
    { label: 'Entry', value: 'Break above 15-min high', category: 'entry' },
    { label: 'Stop Loss', value: '50% of range', category: 'risk' },
    { label: 'Target', value: '1:2 R:R', category: 'exit' },
  ];
  
  console.log('\n📋 Test 1: ORB with 50% stop');
  const params1 = extractStrategyParameters(test1);
  const pass1 = params1?.stopLoss.placement === 'percentage' && params1?.stopLoss.value === 0.5;
  console.log(`  Stop placement: ${params1?.stopLoss.placement} (expected: percentage)`);
  console.log(`  Stop value: ${params1?.stopLoss.value} (expected: 0.5)`);
  console.log(`  ${pass1 ? '✅ PASS' : '❌ FAIL'}`);
  testResults.push({ test: 'ORB with 50% stop', passed: pass1 });
  
  // Test 2: ORB with bottom stop
  const test2: StrategyRule[] = [
    { label: 'Pattern', value: 'ORB', category: 'setup' },
    { label: 'Entry', value: 'Breakout above range', category: 'entry' },
    { label: 'Stop', value: 'Bottom of range', category: 'risk' },
    { label: 'Target', value: '2x range', category: 'exit' },
  ];
  
  console.log('\n📋 Test 2: ORB with bottom stop');
  const params2 = extractStrategyParameters(test2);
  const pass2 = params2?.stopLoss.placement === 'opposite_side' && params2?.stopLoss.value === 0;
  console.log(`  Stop placement: ${params2?.stopLoss.placement} (expected: opposite_side)`);
  console.log(`  Stop value: ${params2?.stopLoss.value} (expected: 0)`);
  console.log(`  ${pass2 ? '✅ PASS' : '❌ FAIL'}`);
  testResults.push({ test: 'ORB with bottom stop', passed: pass2 });
  
  // Test 3: ATR-based stop
  const test3: StrategyRule[] = [
    { label: 'Entry', value: 'Pullback to EMA', category: 'entry' },
    { label: 'Stop', value: '2x ATR below entry', category: 'risk' },
    { label: 'Target', value: '3R', category: 'exit' },
  ];
  
  console.log('\n📋 Test 3: ATR-based stop');
  const params3 = extractStrategyParameters(test3);
  const pass3 = params3?.stopLoss.placement === 'atr_multiple' && params3?.stopLoss.value === 2;
  console.log(`  Stop placement: ${params3?.stopLoss.placement} (expected: atr_multiple)`);
  console.log(`  Stop value: ${params3?.stopLoss.value} (expected: 2)`);
  console.log(`  ${pass3 ? '✅ PASS' : '❌ FAIL'}`);
  testResults.push({ test: 'ATR-based stop', passed: pass3 });
  
  // Test 4: Tick-based stop
  const test4: StrategyRule[] = [
    { label: 'Entry', value: 'Break above resistance', category: 'entry' },
    { label: 'Stop', value: '10 ticks below entry', category: 'risk' },
    { label: 'Target', value: '1:2', category: 'exit' },
  ];
  
  console.log('\n📋 Test 4: Tick-based stop');
  const params4 = extractStrategyParameters(test4);
  const pass4 = params4?.stopLoss.placement === 'fixed_distance' && params4?.stopLoss.value === 10;
  console.log(`  Stop placement: ${params4?.stopLoss.placement} (expected: fixed_distance)`);
  console.log(`  Stop value: ${params4?.stopLoss.value} (expected: 10)`);
  console.log(`  ${pass4 ? '✅ PASS' : '❌ FAIL'}`);
  testResults.push({ test: 'Tick-based stop', passed: pass4 });
  
  // Test 5: Various target formats
  const test5a: StrategyRule[] = [
    { label: 'Entry', value: 'Breakout', category: 'entry' },
    { label: 'Stop', value: 'Range low', category: 'risk' },
    { label: 'Target', value: '2.5R', category: 'exit' },
  ];
  
  console.log('\n📋 Test 5: Target parsing (2.5R)');
  const params5a = extractStrategyParameters(test5a);
  const pass5a = params5a?.profitTarget.method === 'r_multiple' && params5a?.profitTarget.value === 2.5;
  console.log(`  Target method: ${params5a?.profitTarget.method} (expected: r_multiple)`);
  console.log(`  Target value: ${params5a?.profitTarget.value} (expected: 2.5)`);
  console.log(`  ${pass5a ? '✅ PASS' : '❌ FAIL'}`);
  testResults.push({ test: 'Target parsing (2.5R)', passed: pass5a });
  
  // Test 6: 25% of range stop
  const test6: StrategyRule[] = [
    { label: 'Pattern', value: 'ORB long', category: 'setup' },
    { label: 'Entry', value: 'Break above range high', category: 'entry' },
    { label: 'Stop', value: '25% of range', category: 'risk' },
    { label: 'Target', value: '1:3 R:R', category: 'exit' },
  ];
  
  console.log('\n📋 Test 6: 25% of range stop');
  const params6 = extractStrategyParameters(test6);
  const pass6 = params6?.stopLoss.placement === 'percentage' && params6?.stopLoss.value === 0.25;
  console.log(`  Stop placement: ${params6?.stopLoss.placement} (expected: percentage)`);
  console.log(`  Stop value: ${params6?.stopLoss.value} (expected: 0.25)`);
  console.log(`  ${pass6 ? '✅ PASS' : '❌ FAIL'}`);
  testResults.push({ test: '25% of range stop', passed: pass6 });
  
  // Summary
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const allPassed = failed === 0;
  console.log('\n' + '='.repeat(50));
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('='.repeat(50));
  
  console.groupEnd();
  
  return { passed, failed, results: testResults };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if animation will be accurate
 */
export function validateAnimationAccuracy(rules: StrategyRule[]): {
  accurate: boolean;
  issues: string[];
  suggestions: string[];
} {
  const params = extractStrategyParameters(rules);
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  if (!params) {
    issues.push('Cannot extract parameters - missing entry, stop, or target');
    suggestions.push('Define all required components first');
    return { accurate: false, issues, suggestions };
  }
  
  // Check if stop value is precise (safe to access after null check)
  if (params.stopLoss.placement === 'structure' && params.stopLoss.value === 0) {
    issues.push('Stop placement is vague (structure-based without specific offset)');
    suggestions.push('Specify exact placement: "2 ticks below swing low" or "50% of range"');
  }
  
  // Check if target is precise
  if (params.profitTarget.method === 'r_multiple' && params.profitTarget.value === 2 && !hasExplicitTarget(rules)) {
    issues.push('Target defaulted to 2R (not explicitly specified)');
    suggestions.push('Specify exact ratio: "1:2", "2R", "1.5:1"');
  }
  
  return {
    accurate: issues.length === 0,
    issues,
    suggestions,
  };
}

function hasExplicitTarget(rules: StrategyRule[]): boolean {
  const targetRule = rules.find(r => 
    r.label.toLowerCase().includes('target') ||
    r.label.toLowerCase().includes('profit') ||
    r.category === 'exit'
  );
  
  if (!targetRule) return false;
  
  const text = targetRule.value.toLowerCase();
  // Check for explicit target patterns
  return /\d/.test(text); // Contains at least one number
}

/**
 * Generate human-readable accuracy report
 */
export function getAccuracyReport(rules: StrategyRule[]): string {
  const validation = validateAnimationAccuracy(rules);
  
  if (validation.accurate) {
    return '✅ Animation will accurately reflect your strategy specifications';
  }
  
  const issuesList = validation.issues.map(i => `  • ${i}`).join('\n');
  const suggestionsList = validation.suggestions.map(s => `  • ${s}`).join('\n');
  
  return `⚠️ Animation may not be fully accurate:

Issues:
${issuesList}

Suggestions:
${suggestionsList}`;
}

// ============================================================================
// RE-EXPORTS for convenience
// ============================================================================

export { extractStrategyParameters, debugParameters } from '@/lib/animation/intelligentParameterExtractor';
export type { StrategyParameters, VisualCoordinates } from '@/lib/animation/intelligentParameterExtractor';
