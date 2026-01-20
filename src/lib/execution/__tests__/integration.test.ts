/**
 * Integration Tests - End-to-End Pipeline
 * 
 * Tests the complete flow from Claude output through to compiled executable strategy:
 * Claude → claudeToCanonical() → validateCanonical() → compileCanonicalStrategy()
 * 
 * This validates that:
 * 1. Claude output can be normalized to canonical format
 * 2. Canonical format passes validation
 * 3. Validated canonical compiles to executable strategy
 * 4. Compiled strategy functions are callable
 * 
 * @module lib/execution/__tests__/integration.test
 */

import { describe, it, expect } from 'vitest';
import { claudeToCanonical } from '../../strategy/claudeToCanonical';
import { validateCanonical } from '../canonical-schema';
import { compileCanonicalStrategy } from '../canonical-compilers';
import type { ClaudeStrategyOutput } from '../../strategy/claudeToCanonical';

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration: Full Pipeline', () => {
  describe('ORB Strategy: Claude → Canonical → Compiled', () => {
    it('should transform and compile ORB strategy end-to-end', () => {
      // Step 1: Claude output (from Strategy Builder)
      const claudeOutput: ClaudeStrategyOutput = {
        strategy_name: 'ORB Strategy',
        summary: '15-minute opening range breakout on ES',
        parsed_rules: {
          entry_conditions: [
            {
              indicator: 'opening range breakout',
              period: 15,
              relation: 'break_above',
              description: '15 minute opening range',
            },
          ],
          exit_conditions: [
            {
              type: 'stop_loss',
              value: 20,
              unit: 'ticks',
            },
            {
              type: 'take_profit',
              value: 2,
              unit: 'ticks', // Fixed from 'risk_reward_ratio'
            },
          ],
          position_sizing: {
            method: 'risk_percent',
            value: 1,
            max_contracts: 5,
          },
          filters: [
            {
              type: 'time_window',
              start: '09:30',
              end: '16:00',
            },
          ],
        },
        instrument: 'ES',
      };

      // Step 2: Normalize to canonical format
      const normalizeResult = claudeToCanonical(claudeOutput);
      if (!normalizeResult.success) {
        console.log('ORB Normalization errors:', normalizeResult.errors);
      }
      expect(normalizeResult.success).toBe(true);
      if (!normalizeResult.success) throw new Error('Normalization failed');

      const canonical = normalizeResult.canonical;

      // Step 3: Validate canonical schema
      const validationResult = validateCanonical(canonical);
      expect(validationResult.success).toBe(true);
      if (!validationResult.success) {
        console.log('Validation errors:', validationResult.errors);
        throw new Error('Validation failed');
      }

      // Step 4: Compile to executable strategy
      const compiled = compileCanonicalStrategy(validationResult.data);

      // Step 5: Verify compiled functions exist and are callable
      expect(compiled).toBeDefined();
      expect(typeof compiled.shouldEnter).toBe('function');
      expect(typeof compiled.getStopPrice).toBe('function');
      expect(typeof compiled.getContractQuantity).toBe('function');
      expect(typeof compiled.getEntryPrice).toBe('function');
      expect(typeof compiled.getStopPrice).toBe('function');
      expect(typeof compiled.getTargetPrice).toBe('function');

      // Step 6: Test a simple function call (getContractQuantity)
      // getContractQuantity(accountBalance, entryPrice, stopPrice)
      const positionSize = compiled.getContractQuantity(100000, 5000, 4980);
      expect(typeof positionSize).toBe('number');
      expect(positionSize).toBeGreaterThan(0);
      expect(positionSize).toBeLessThanOrEqual(5); // max_contracts
    });
  });

  describe('EMA Pullback Strategy: Claude → Canonical → Compiled', () => {
    it('should transform and compile EMA Pullback strategy end-to-end', () => {
      // Step 1: Claude output
      const claudeOutput: ClaudeStrategyOutput = {
        strategy_name: 'EMA Pullback Strategy',
        summary: 'Pullback to 20 EMA on NQ with RSI confirmation',
        parsed_rules: {
          entry_conditions: [
            {
              indicator: 'EMA pullback',
              period: 20,
              relation: 'price_above',
              description: 'pullback to 20 EMA',
            },
            {
              indicator: 'RSI',
              period: 14,
              value: 30,
              relation: 'crosses_above',
            },
          ],
          exit_conditions: [
            {
              type: 'stop_loss',
              value: 15,
              unit: 'ticks',
            },
            {
              type: 'take_profit',
              value: 45,
              unit: 'ticks',
            },
          ],
          position_sizing: {
            method: 'risk_percent',
            value: 1.5,
            max_contracts: 3,
          },
          filters: [],
        },
        instrument: 'NQ',
      };

      // Step 2: Normalize
      const normalizeResult = claudeToCanonical(claudeOutput);
      expect(normalizeResult.success).toBe(true);
      if (!normalizeResult.success) throw new Error('Normalization failed');

      // Step 3: Validate
      const validationResult = validateCanonical(normalizeResult.canonical);
      expect(validationResult.success).toBe(true);
      if (!validationResult.success) throw new Error('Validation failed');

      // Step 4: Compile
      const compiled = compileCanonicalStrategy(validationResult.data);

      // Step 5: Verify
      expect(compiled).toBeDefined();
      expect(compiled.shouldEnter).toBeDefined();
      expect(compiled.getStopPrice).toBeDefined();
    });
  });

  describe('Breakout Strategy: Claude → Canonical → Compiled', () => {
    it('should transform and compile Breakout strategy end-to-end', () => {
      // Step 1: Claude output
      const claudeOutput: ClaudeStrategyOutput = {
        strategy_name: 'Breakout Strategy',
        summary: 'Break above resistance on YM',
        parsed_rules: {
          entry_conditions: [
            {
              indicator: 'resistance breakout',
              relation: 'price_breaks_above',
              description: 'break above resistance level',
            },
          ],
          exit_conditions: [
            {
              type: 'stop_loss',
              value: 25,
              unit: 'ticks',
            },
            {
              type: 'take_profit',
              value: 75, // 3:1 R:R = 75 ticks (3 * 25)
              unit: 'ticks',
            },
          ],
          position_sizing: {
            method: 'fixed',  // Fixed from 'fixed_contracts'
            value: 2,
            max_contracts: 2,
          },
          filters: [],
        },
        instrument: 'YM',
      };

      // Step 2: Normalize
      const normalizeResult = claudeToCanonical(claudeOutput);
      expect(normalizeResult.success).toBe(true);
      if (!normalizeResult.success) throw new Error('Normalization failed');

      // Step 3: Validate
      const validationResult = validateCanonical(normalizeResult.canonical);
      expect(validationResult.success).toBe(true);
      if (!validationResult.success) throw new Error('Validation failed');

      // Step 4: Compile
      const compiled = compileCanonicalStrategy(validationResult.data);

      // Step 5: Verify compiled strategy
      expect(compiled).toBeDefined();
      
      // Verify pattern-specific behavior: Breakout should have lookbackPeriod
      const canonical = validationResult.data;
      if (canonical.pattern === 'breakout') {
        expect(canonical.entry.breakout.lookbackPeriod).toBeDefined();
        expect(canonical.entry.breakout.lookbackPeriod).toBeGreaterThanOrEqual(5);
        expect(canonical.entry.breakout.lookbackPeriod).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Error Handling: Invalid Claude Output', () => {
    it('should fail gracefully when Claude output is missing required fields', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invalidOutput: any = {
        strategy_name: 'Invalid Strategy',
        summary: 'Missing required fields',
        parsed_rules: {
          entry_conditions: [],
          exit_conditions: [],
          position_sizing: { method: 'risk_percent', value: 1, max_contracts: 5 },
          filters: [],
        },
        instrument: 'INVALID_INSTRUMENT', // Unknown instrument should cause failure
      };

      const result = claudeToCanonical(invalidOutput);
      // Should fail due to unknown instrument and no valid pattern
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
        // Should contain error about unknown instrument or pattern
        expect(result.errors.some(e => e.includes('Unknown instrument') || e.includes('pattern'))).toBe(true);
      }
    });

    it('should fail validation when canonical is malformed', () => {
      const malformedCanonical = {
        pattern: 'opening_range_breakout',
        direction: 'long',
        // Missing required fields: instrument, entry, exit, risk, time
      };

      const result = validateCanonical(malformedCanonical);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Real-World Scenario: User Creates Strategy', () => {
    it('should handle complete user flow from natural language to execution-ready', () => {
      // Simulate user input: "I want to trade ORB on ES with 15-minute opening range"
      // Claude parses this to:
      const claudeOutput: ClaudeStrategyOutput = {
        strategy_name: 'ES ORB Strategy',
        summary: '15-minute opening range breakout on ES',
        parsed_rules: {
          entry_conditions: [
            {
              indicator: 'opening range breakout',
              period: 15,
              relation: 'break_above',
              description: '15 minute opening range',
            },
          ],
          exit_conditions: [
            {
              type: 'stop_loss',
              value: 20,
              unit: 'ticks',
            },
            {
              type: 'take_profit',
              value: 40, // 2:1 R:R = 40 ticks
              unit: 'ticks',
            },
          ],
          position_sizing: {
            method: 'risk_percent',
            value: 1,
            max_contracts: 10,
          },
          filters: [
            {
              type: 'time_window',
              start: '09:30',
              end: '16:00',
            },
          ],
        },
        instrument: 'ES',
      };

      // Save route calls claudeToCanonical
      const normalizeResult = claudeToCanonical(claudeOutput);
      if (!normalizeResult.success) {
        throw new Error(`Normalization failed: ${normalizeResult.errors.join(', ')}`);
      }

      // Validate before saving to database
      const validationResult = validateCanonical(normalizeResult.canonical);
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Store to database (canonical_rules column)
      const canonicalRules = validationResult.data;
      expect(canonicalRules.pattern).toBe('opening_range_breakout');
      expect(canonicalRules.instrument.symbol).toBe('ES');

      // Later: Activation API loads from database and compiles
      const compiled = compileCanonicalStrategy(canonicalRules);

      // Execution engine can now use compiled.shouldEnter(), etc.
      expect(compiled.shouldEnter).toBeDefined();
      expect(compiled.getStopPrice).toBeDefined();
      expect(compiled.getContractQuantity).toBeDefined();

      // Verify pattern-specific configuration was preserved
      if (canonicalRules.pattern === 'opening_range_breakout') {

        expect(canonicalRules.entry.openingRange.periodMinutes).toBe(15);
        expect(canonicalRules.entry.openingRange.entryOn).toBe('both');
      }
      expect(canonicalRules.direction).toBe('both');
    });
  });

  describe('Multiple Pattern Support', () => {
    it('should handle all 3 patterns in sequence', () => {
      const patterns: { name: string; output: ClaudeStrategyOutput }[] = [
        {
          name: 'ORB',
          output: {
            strategy_name: 'ORB Strategy',
            summary: '15-min ORB on ES',
            parsed_rules: {
              entry_conditions: [{ indicator: 'opening range breakout', period: 15, relation: 'break_above', description: '15 min ORB' }],
              exit_conditions: [
                { type: 'stop_loss', value: 20, unit: 'ticks' },
                { type: 'take_profit', value: 40, unit: 'ticks' },
              ],
              position_sizing: { method: 'risk_percent', value: 1, max_contracts: 5 },
              filters: [],
            },
            instrument: 'ES',
          },
        },
        {
          name: 'EMA Pullback',
          output: {
            strategy_name: 'EMA Pullback Strategy',
            summary: 'Pullback to 20 EMA on NQ',
            parsed_rules: {
              entry_conditions: [
                { indicator: 'EMA pullback', period: 20, relation: 'price_above', description: 'pullback to 20 EMA' },
              ],
              exit_conditions: [
                { type: 'stop_loss', value: 15, unit: 'ticks' },
                { type: 'take_profit', value: 45, unit: 'ticks' },
              ],
              position_sizing: { method: 'risk_percent', value: 1, max_contracts: 3 },
              filters: [],
            },
            instrument: 'NQ',
          },
        },
        {
          name: 'Breakout',
          output: {
            strategy_name: 'Breakout Strategy',
            summary: 'Break above resistance on YM',
            parsed_rules: {
              entry_conditions: [{ indicator: 'resistance breakout', relation: 'price_breaks_above', description: 'break above resistance' }],
              exit_conditions: [
                { type: 'stop_loss', value: 25, unit: 'ticks' },
                { type: 'take_profit', value: 75, unit: 'ticks' },
              ],
              position_sizing: { method: 'fixed', value: 2, max_contracts: 2 },
              filters: [],
            },
            instrument: 'YM',
          },
        },
      ];

      patterns.forEach(({ name, output }) => {
        const normalizeResult = claudeToCanonical(output);
        expect(normalizeResult.success).toBe(true);
        if (!normalizeResult.success) {
          console.log(`${name} normalization failed:`, normalizeResult.errors);
          return;
        }

        const validationResult = validateCanonical(normalizeResult.canonical);
        expect(validationResult.success).toBe(true);
        if (!validationResult.success) {
          console.log(`${name} validation failed:`, validationResult.errors);
          return;
        }

        const compiled = compileCanonicalStrategy(validationResult.data);
        expect(compiled).toBeDefined();
        expect(compiled.shouldEnter).toBeDefined();
        expect(compiled.getStopPrice).toBeDefined();
      });
    });
  });
});
