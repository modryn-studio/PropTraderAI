/**
 * PARAMETER-BASED ANIMATION INTEGRATION
 * 
 * Bridges the gap between existing template-based system and new
 * parameter-based system for precise visual accuracy.
 */

import { useMemo } from 'react';
import { StrategyRule } from '@/components/strategy/StrategySummaryPanel';
import { 
  extractStrategyParameters, 
  calculateVisualCoordinates,
  debugParameters,
  StrategyParameters 
} from './intelligentParameterExtractor';
import ParameterBasedAnimation from './ParameterBasedAnimation';

interface SmartAnimationContainerProps {
  rules: StrategyRule[];
  fallbackToTemplate?: boolean; // If true, use old system when params incomplete
  debug?: boolean;
}

/**
 * Smart Animation Container
 * 
 * Automatically extracts parameters from rules and renders precise animation.
 * Falls back gracefully if parameters incomplete.
 */
export default function SmartAnimationContainer({ 
  rules,
  fallbackToTemplate = true,
  debug = false
}: SmartAnimationContainerProps) {
  
  // Extract parameters from current rules
  const parameters = useMemo(() => {
    if (debug) {
      debugParameters(rules);
    }
    return extractStrategyParameters(rules);
  }, [rules, debug]);
  
  // If parameters incomplete and fallback enabled, show message
  if (!parameters && fallbackToTemplate) {
    return (
      <div className="w-full px-4 py-8 text-center">
        <p className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
          Define entry, stop, and target to see visualization
        </p>
      </div>
    );
  }
  
  // If parameters incomplete and no fallback, show nothing
  if (!parameters) {
    return null;
  }
  
  // Render parameter-based animation
  return (
    <div className="relative">
      <ParameterBasedAnimation parameters={parameters} />
      
      {/* Debug overlay */}
      {debug && <DebugOverlay parameters={parameters} rules={rules} />}
    </div>
  );
}

// ============================================================================
// DEBUG OVERLAY
// ============================================================================

function DebugOverlay({ 
  parameters,
  rules
}: { 
  parameters: StrategyParameters;
  rules: StrategyRule[];
}) {
  const coords = useMemo(() => 
    calculateVisualCoordinates(parameters), 
    [parameters]
  );
  
  return (
    <div className="absolute top-0 right-0 m-2 p-2 bg-black/90 border border-[rgba(255,255,255,0.2)] rounded text-[8px] font-mono max-w-xs">
      <div className="text-[#00FFD1] font-bold mb-1">DEBUG MODE</div>
      
      <div className="space-y-1 text-[rgba(255,255,255,0.7)]">
        <div>Type: {parameters.strategyType}</div>
        <div>Dir: {parameters.direction}</div>
        
        <div className="pt-1 border-t border-[rgba(255,255,255,0.1)]">
          <div className="text-red-400">Stop: {parameters.stopLoss.placement}</div>
          <div>  Value: {parameters.stopLoss.value}</div>
          <div>  Rel: {parameters.stopLoss.relativeTo}</div>
          <div>  Y: {coords.stop.toFixed(1)}</div>
        </div>
        
        <div className="pt-1 border-t border-[rgba(255,255,255,0.1)]">
          <div className="text-green-400">Target: {parameters.profitTarget.method}</div>
          <div>  Value: {parameters.profitTarget.value}</div>
          <div>  Y: {coords.target.toFixed(1)}</div>
        </div>
        
        <div className="pt-1 border-t border-[rgba(255,255,255,0.1)]">
          <div>R:R: {coords.riskRewardRatio}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Convert old AnimationConfig to new StrategyParameters
 * Use this during migration period
 */
export function migrateAnimationConfig(oldConfig: any): StrategyParameters | null {
  if (!oldConfig) return null;
  
  try {
    return {
      strategyType: oldConfig.type || 'breakout',
      direction: oldConfig.direction || 'long',
      entry: {
        trigger: oldConfig.entry?.type === 'breakout' ? 'breakout_above' : 'pullback_to',
        level: oldConfig.entry?.label?.includes('high') ? 'range_high' : 'range_low',
      },
      stopLoss: {
        placement: oldConfig.stopLoss?.placement || 'opposite_side',
        value: extractNumericValue(oldConfig.stopLoss?.label) || 0,
        relativeTo: oldConfig.stopLoss?.placement === 'range_low' ? 'range_low' : 'entry',
      },
      profitTarget: {
        method: oldConfig.target?.type || 'r_multiple',
        value: extractNumericValue(oldConfig.target?.label) || 2,
        relativeTo: 'stop_distance',
        unit: 'r',
      },
      range: oldConfig.priceAction?.consolidationTime ? {
        period: oldConfig.priceAction.consolidationTime
      } : undefined,
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return null;
  }
}

function extractNumericValue(text?: string): number | undefined {
  if (!text) return undefined;
  
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : undefined;
}

// ============================================================================
// TESTING UTILITIES
// ============================================================================

/**
 * Test parameter extraction with sample rules
 */
export function testParameterExtraction() {
  console.group('🧪 Parameter Extraction Tests');
  
  // Test 1: ORB with 50% stop
  const test1: StrategyRule[] = [
    { label: 'Pattern', value: 'Opening Range Breakout', category: 'setup' },
    { label: 'Entry', value: 'Break above 15-min high', category: 'entry' },
    { label: 'Stop Loss', value: '50% of range', category: 'risk' },
    { label: 'Target', value: '1:2 R:R', category: 'exit' },
  ];
  
  console.log('\nTest 1: ORB with 50% stop');
  const params1 = extractStrategyParameters(test1);
  console.log('Stop placement:', params1?.stopLoss.placement); // Should be 'percentage'
  console.log('Stop value:', params1?.stopLoss.value); // Should be 0.5
  console.log('✓ Expected: percentage, 0.5');
  
  // Test 2: ORB with bottom stop
  const test2: StrategyRule[] = [
    { label: 'Pattern', value: 'ORB', category: 'setup' },
    { label: 'Entry', value: 'Breakout', category: 'entry' },
    { label: 'Stop', value: 'Bottom of range', category: 'risk' },
    { label: 'Target', value: '2x range', category: 'exit' },
  ];
  
  console.log('\nTest 2: ORB with bottom stop');
  const params2 = extractStrategyParameters(test2);
  console.log('Stop placement:', params2?.stopLoss.placement); // Should be 'opposite_side'
  console.log('Stop value:', params2?.stopLoss.value); // Should be 0
  console.log('✓ Expected: opposite_side, 0');
  
  // Test 3: ATR-based stop
  const test3: StrategyRule[] = [
    { label: 'Entry', value: 'Pullback to EMA', category: 'entry' },
    { label: 'Stop', value: '2x ATR below entry', category: 'risk' },
    { label: 'Target', value: '3R', category: 'exit' },
  ];
  
  console.log('\nTest 3: ATR-based stop');
  const params3 = extractStrategyParameters(test3);
  console.log('Stop placement:', params3?.stopLoss.placement); // Should be 'atr_multiple'
  console.log('Stop value:', params3?.stopLoss.value); // Should be 2
  console.log('✓ Expected: atr_multiple, 2');
  
  console.groupEnd();
}

/**
 * Visual comparison tool
 * Shows old vs new animation side-by-side
 */
export function ComparisonView({ rules }: { rules: StrategyRule[] }) {
  const newParams = extractStrategyParameters(rules);
  
  if (!newParams) return <div>Insufficient parameters</div>;
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="text-xs font-mono text-[rgba(255,255,255,0.7)] mb-2">
          OLD (Template-Based)
        </h3>
        <div className="p-4 border border-[rgba(255,255,255,0.1)] rounded">
          <div className="text-[10px] font-mono text-[rgba(255,255,255,0.5)]">
            Generic template animation
            <br />Stop always at bottom
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-xs font-mono text-[#00FFD1] mb-2">
          NEW (Parameter-Based)
        </h3>
        <ParameterBasedAnimation parameters={newParams} />
      </div>
    </div>
  );
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
  
  // Check if stop value is precise
  if (params.stopLoss.placement === 'structure' && params.stopLoss.value === 0) {
    issues.push('Stop placement is vague (structure-based without specific offset)');
    suggestions.push('Specify exact placement: "2 ticks below swing low" or "50% of range"');
  }
  
  // Check if target is precise
  if (params.profitTarget.method === 'r_multiple' && !params.profitTarget.value) {
    issues.push('Target R-multiple not specified');
    suggestions.push('Specify exact ratio: "1:2", "2R", "1.5:1"');
  }
  
  return {
    accurate: issues.length === 0,
    issues,
    suggestions,
  };
}

/**
 * Generate human-readable accuracy report
 */
export function getAccuracyReport(rules: StrategyRule[]): string {
  const validation = validateAnimationAccuracy(rules);
  
  if (validation.accurate) {
    return '✅ Animation will accurately reflect your strategy specifications';
  }
  
  return `
⚠️ Animation may not be fully accurate:

Issues:
${validation.issues.map(i => `  • ${i}`).join('\n')}

Suggestions:
${validation.suggestions.map(s => `  • ${s}`).join('\n')}
  `.trim();
}
