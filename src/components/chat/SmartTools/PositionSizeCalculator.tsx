'use client';

/**
 * Position Size Calculator - Smart Tool
 * 
 * Inline calculator that appears when Claude asks about risk per trade.
 * Reduces token usage by letting users visually set values instead of typing.
 * 
 * Created: January 13, 2026
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronDown, ChevronUp, AlertTriangle, XCircle, Keyboard } from 'lucide-react';
import type { PositionSizeCalculatorProps, PositionSizeValues } from './types';
import { VALIDATION_THRESHOLDS } from './types';

export default function PositionSizeCalculator({
  prefilledData,
  onComplete,
  onDismiss,
  isCollapsed = false,
  onToggleCollapse,
}: PositionSizeCalculatorProps) {
  // Form state with prefilled defaults
  const [accountSize, setAccountSize] = useState<number>(
    prefilledData.accountSize || 50000
  );
  const [drawdownLimit, setDrawdownLimit] = useState<number>(
    prefilledData.drawdownLimit || 2000
  );
  const [riskPercent, setRiskPercent] = useState<number>(
    prefilledData.riskPercent || 1.0
  );
  
  // Completed state (after user clicks "Use these values")
  const [completedValues, setCompletedValues] = useState<PositionSizeValues | null>(null);

  // ========================================================================
  // CALCULATIONS
  // ========================================================================
  
  const calculations = useMemo(() => {
    const riskAmount = accountSize * (riskPercent / 100);
    const tradesUntilDrawdown = riskAmount > 0 
      ? Math.floor(drawdownLimit / riskAmount) 
      : 0;
    
    return {
      riskAmount,
      tradesUntilDrawdown,
    };
  }, [accountSize, drawdownLimit, riskPercent]);

  // ========================================================================
  // VALIDATION
  // ========================================================================
  
  const validation = useMemo(() => {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Risk percentage checks
    if (riskPercent > VALIDATION_THRESHOLDS.riskPercent.error) {
      errors.push(`${riskPercent}% is extremely aggressive. Most traders blow accounts at this level.`);
    } else if (riskPercent > VALIDATION_THRESHOLDS.riskPercent.warning) {
      warnings.push(`${riskPercent}% is aggressive for prop trading. Consider 0.5-1%.`);
    }
    
    // Trades until drawdown checks
    if (calculations.tradesUntilDrawdown <= VALIDATION_THRESHOLDS.tradesUntilDrawdown.error) {
      errors.push(`Only ${calculations.tradesUntilDrawdown} losses until drawdown. You have no cushion.`);
    } else if (calculations.tradesUntilDrawdown <= VALIDATION_THRESHOLDS.tradesUntilDrawdown.warning) {
      warnings.push(`Only ${calculations.tradesUntilDrawdown} losses until drawdown. Consider lower risk.`);
    }
    
    // Risk amount exceeds drawdown
    if (calculations.riskAmount > drawdownLimit) {
      errors.push('Single trade risk exceeds total drawdown limit!');
    }
    
    return { warnings, errors, isValid: errors.length === 0 };
  }, [riskPercent, calculations, drawdownLimit]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  
  const handleComplete = useCallback(() => {
    const values: PositionSizeValues = {
      accountSize,
      drawdownLimit,
      riskPercent,
      riskAmount: calculations.riskAmount,
      tradesUntilDrawdown: calculations.tradesUntilDrawdown,
    };
    
    setCompletedValues(values);
    onComplete(values as unknown as Record<string, unknown>);
  }, [accountSize, drawdownLimit, riskPercent, calculations, onComplete]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRiskPercent(parseFloat(e.target.value));
  }, []);

  const handleAccountSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAccountSize(value ? parseInt(value) : 0);
  }, []);

  const handleDrawdownChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setDrawdownLimit(value ? parseInt(value) : 0);
  }, []);

  // Quick preset buttons for risk percentage
  const riskPresets = [0.5, 1.0, 1.5, 2.0];

  // ========================================================================
  // COLLAPSED VIEW (after completion)
  // ========================================================================
  
  if (isCollapsed && completedValues) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="my-3"
      >
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between px-4 py-3 
                     bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg
                     hover:border-[rgba(255,255,255,0.2)] transition-colors
                     text-left"
        >
          <div className="flex items-center gap-3">
            <Calculator className="w-4 h-4 text-[#00ff41]" />
            <span className="text-sm text-white font-mono">
              Risk: ${completedValues.riskAmount.toLocaleString()} per trade ({completedValues.riskPercent}%)
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
        </button>
      </motion.div>
    );
  }

  // ========================================================================
  // FULL CALCULATOR VIEW
  // ========================================================================
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="my-4"
    >
      <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#00ff41]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[rgba(255,255,255,0.5)]">
              Position Size Calculator
            </span>
          </div>
          {onToggleCollapse && completedValues && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Account Size Input */}
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
              Account Size
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)]">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={accountSize.toLocaleString()}
                onChange={handleAccountSizeChange}
                className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                           py-2.5 pl-7 pr-3 text-white font-mono text-sm
                           focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                           transition-colors"
              />
            </div>
          </div>

          {/* Drawdown Limit Input */}
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
              Total Drawdown Limit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)]">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={drawdownLimit.toLocaleString()}
                onChange={handleDrawdownChange}
                className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                           py-2.5 pl-7 pr-3 text-white font-mono text-sm
                           focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                           transition-colors"
              />
            </div>
          </div>

          {/* Risk Percentage Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[rgba(255,255,255,0.5)]">
                Risk Per Trade
              </label>
              <span className="text-sm font-mono text-white">
                {riskPercent.toFixed(1)}%
              </span>
            </div>
            
            {/* Slider */}
            <input
              type="range"
              min="0.25"
              max="5"
              step="0.25"
              value={riskPercent}
              onChange={handleSliderChange}
              className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-5
                         [&::-webkit-slider-thumb]:h-5
                         [&::-webkit-slider-thumb]:bg-[#00ff41]
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,255,65,0.5)]
                         [&::-moz-range-thumb]:w-5
                         [&::-moz-range-thumb]:h-5
                         [&::-moz-range-thumb]:bg-[#00ff41]
                         [&::-moz-range-thumb]:rounded-full
                         [&::-moz-range-thumb]:border-0
                         [&::-moz-range-thumb]:cursor-pointer"
            />
            
            {/* Quick preset buttons */}
            <div className="flex justify-between mt-2">
              {riskPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setRiskPercent(preset)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    riskPercent === preset
                      ? 'bg-[#00ff41] text-black font-medium'
                      : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          {/* Results Box */}
          <div className="bg-[rgba(0,255,65,0.05)] border border-[rgba(0,255,65,0.2)] rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[rgba(255,255,255,0.7)]">Risk Amount</span>
              <span className="text-lg font-mono text-[#00ff41]">
                ${calculations.riskAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[rgba(255,255,255,0.7)]">Trades until drawdown</span>
              <span className={`text-lg font-mono ${
                calculations.tradesUntilDrawdown <= 3 
                  ? 'text-[#b5323d]' 
                  : calculations.tradesUntilDrawdown <= 5 
                    ? 'text-[#ffd700]' 
                    : 'text-white'
              }`}>
                {calculations.tradesUntilDrawdown} losses
              </span>
            </div>
          </div>

          {/* Validation Messages */}
          <AnimatePresence>
            {validation.errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[rgba(181,50,61,0.1)] border border-[rgba(181,50,61,0.3)] rounded-lg p-3"
              >
                <div className="flex gap-2">
                  <XCircle className="w-4 h-4 text-[#b5323d] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {validation.errors.map((error, i) => (
                      <p key={i} className="text-xs text-[#b5323d]">{error}</p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            
            {validation.warnings.length > 0 && validation.errors.length === 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.2)] rounded-lg p-3"
              >
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#ffd700] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {validation.warnings.map((warning, i) => (
                      <p key={i} className="text-xs text-[#ffd700]">{warning}</p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleComplete}
              disabled={!validation.isValid}
              className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all ${
                validation.isValid
                  ? 'bg-[#00ff41] text-black hover:bg-[#00cc33] active:scale-[0.98]'
                  : 'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.3)] cursor-not-allowed'
              }`}
            >
              Use these values
            </button>
            <button
              onClick={onDismiss}
              className="py-2.5 px-4 rounded-md text-sm text-[rgba(255,255,255,0.7)]
                         bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]
                         transition-colors flex items-center gap-2"
            >
              <Keyboard className="w-4 h-4" />
              <span className="hidden sm:inline">Type instead</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
