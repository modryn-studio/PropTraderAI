'use client';

/**
 * Stop Loss Calculator - Smart Tool
 * 
 * Calculate optimal stop loss placement based on ATR, fixed ticks,
 * or dollar amount. Shows risk per contract.
 * 
 * Created: January 13, 2026
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronDown, ChevronUp, AlertTriangle, Info, Keyboard } from 'lucide-react';
import { 
  getContractSpec, 
  getTypicalATR,
  CONTRACT_SPECS 
} from '@/lib/utils/contractSpecs';
import type { StopLossCalculatorProps, StopLossValues } from './types';
import { VALIDATION_THRESHOLDS } from './types';

type StopMethod = 'atr' | 'fixed' | 'dollar';

// Instrument options for dropdown
const INSTRUMENT_OPTIONS = ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'RTY', 'M2K', 'CL', 'MCL', 'GC', 'MGC'];

export default function StopLossCalculator({
  prefilledData,
  instrument: prefillInstrument,
  contractQuantity = 1,
  onComplete,
  onDismiss,
  isCollapsed = false,
  onToggleCollapse,
}: StopLossCalculatorProps) {
  // Form state
  const [instrument, setInstrument] = useState<string>(
    prefillInstrument || prefilledData.instrument || 'NQ'
  );
  const [method, setMethod] = useState<StopMethod>('atr');
  const [atrMultiple, setAtrMultiple] = useState<number>(1.5);
  const [currentATR, setCurrentATR] = useState<number>(() => {
    const atrInfo = getTypicalATR(prefillInstrument || prefilledData.instrument || 'NQ');
    return atrInfo.value;
  });
  const [fixedTicks, setFixedTicks] = useState<number>(20);
  const [dollarRisk, setDollarRisk] = useState<number>(100);
  
  // Completed state
  const [completedValues, setCompletedValues] = useState<StopLossValues | null>(null);

  // Get contract and ATR info
  const spec = getContractSpec(instrument);
  const atrInfo = getTypicalATR(instrument);

  // Update ATR when instrument changes
  const handleInstrumentChange = useCallback((newInstrument: string) => {
    setInstrument(newInstrument);
    const newAtrInfo = getTypicalATR(newInstrument);
    setCurrentATR(newAtrInfo.value);
  }, []);

  // ========================================================================
  // CALCULATIONS
  // ========================================================================
  
  const calculations = useMemo(() => {
    if (!spec) return null;
    
    let stopTicks: number;
    let reasoning: string;
    
    switch (method) {
      case 'atr':
        stopTicks = Math.round(atrMultiple * currentATR);
        reasoning = `${atrMultiple}x ATR (${currentATR} ticks) = ${stopTicks} ticks`;
        break;
      case 'fixed':
        stopTicks = fixedTicks;
        reasoning = `Fixed: ${fixedTicks} ticks`;
        break;
      case 'dollar':
        stopTicks = spec.tickValue > 0 ? Math.round(dollarRisk / spec.tickValue) : 0;
        reasoning = `$${dollarRisk} ÷ $${spec.tickValue}/tick = ${stopTicks} ticks`;
        break;
      default:
        stopTicks = 20;
        reasoning = 'Default';
    }
    
    const riskPerContract = stopTicks * spec.tickValue;
    const totalRisk = riskPerContract * contractQuantity;
    
    return {
      stopTicks,
      riskPerContract,
      totalRisk,
      reasoning,
      tickValue: spec.tickValue,
    };
  }, [method, atrMultiple, currentATR, fixedTicks, dollarRisk, spec, contractQuantity]);

  // ========================================================================
  // VALIDATION
  // ========================================================================
  
  const validation = useMemo(() => {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (!calculations) return { warnings, errors, isValid: true };
    
    // ATR multiple warnings
    if (method === 'atr') {
      if (atrMultiple > VALIDATION_THRESHOLDS.atrMultiple.error) {
        errors.push(`${atrMultiple}x ATR is very wide. Most use 1.0-2.0x.`);
      } else if (atrMultiple > VALIDATION_THRESHOLDS.atrMultiple.warning) {
        warnings.push(`${atrMultiple}x ATR is wide. Consider 1.5-2.0x.`);
      } else if (atrMultiple < 1.0) {
        warnings.push('Stops tighter than 1x ATR often get stopped out by noise.');
      }
    }
    
    // ATR sanity check
    if (currentATR < atrInfo.value * 0.5) {
      warnings.push('ATR seems unusually low. Verify on your chart.');
    } else if (currentATR > atrInfo.value * 2) {
      warnings.push('ATR seems high. Are you in overnight session?');
    }
    
    // Stop too small
    if (calculations.stopTicks < 5) {
      warnings.push('Very tight stop. High chance of getting stopped out.');
    }
    
    // Stop too large relative to typical
    if (calculations.stopTicks > atrInfo.value * 3) {
      warnings.push('Stop much wider than typical for this instrument.');
    }
    
    return { warnings, errors, isValid: errors.length === 0 };
  }, [calculations, method, atrMultiple, currentATR, atrInfo.value]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  
  const handleComplete = useCallback(() => {
    if (!calculations) return;
    
    const values: StopLossValues = {
      stopType: method,
      stopLossTicks: calculations.stopTicks,
      riskPerContract: calculations.riskPerContract,
      totalRisk: calculations.totalRisk,
    };
    
    setCompletedValues(values);
    onComplete(values as unknown as Record<string, unknown>);
  }, [calculations, method, onComplete]);

  // ========================================================================
  // COLLAPSED VIEW
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
            <Target className="w-4 h-4 text-[#00ff41]" />
            <span className="text-sm text-white font-mono">
              {completedValues.stopLossTicks} tick stop (${completedValues.riskPerContract.toFixed(2)}/contract)
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
        </button>
      </motion.div>
    );
  }

  // ========================================================================
  // FULL VIEW
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
            <Target className="w-4 h-4 text-[#00ff41]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[rgba(255,255,255,0.5)]">
              Stop Loss Calculator
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
          {/* Instrument */}
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
              Instrument
            </label>
            <select
              value={instrument}
              onChange={(e) => handleInstrumentChange(e.target.value)}
              className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                         py-2.5 px-3 text-white text-sm
                         focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                         transition-colors appearance-none cursor-pointer"
            >
              {INSTRUMENT_OPTIONS.map((sym) => (
                <option key={sym} value={sym}>
                  {sym} - {CONTRACT_SPECS[sym]?.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Method Tabs */}
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
              Calculation Method
            </label>
            <div className="flex rounded-md overflow-hidden border border-[rgba(255,255,255,0.1)]">
              {(['atr', 'fixed', 'dollar'] as StopMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                    method === m
                      ? 'bg-[#00ff41] text-black'
                      : 'bg-black text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)]'
                  }`}
                >
                  {m === 'atr' ? 'ATR' : m === 'fixed' ? 'Fixed Ticks' : 'Dollar'}
                </button>
              ))}
            </div>
          </div>

          {/* Method-specific inputs */}
          {method === 'atr' && (
            <div className="space-y-4">
              {/* ATR Input */}
              <div>
                <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
                  Current ATR (14-period)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={currentATR}
                    onChange={(e) => setCurrentATR(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                               py-2.5 px-3 text-white font-mono text-sm
                               focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                               transition-colors"
                  />
                  <span className="text-sm text-[rgba(255,255,255,0.5)]">ticks</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-[rgba(255,255,255,0.5)]">
                  <Info className="w-3 h-3" />
                  <span>Typical {instrument}: {atrInfo.range}</span>
                </div>
              </div>

              {/* ATR Multiple Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-[rgba(255,255,255,0.5)]">
                    ATR Multiple
                  </label>
                  <span className="font-mono text-sm text-white">{atrMultiple}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={atrMultiple}
                  onChange={(e) => setAtrMultiple(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-lg appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:w-4
                             [&::-webkit-slider-thumb]:h-4
                             [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:bg-[#00ff41]
                             [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-webkit-slider-thumb]:shadow-lg"
                />
                <div className="flex justify-between text-xs mt-1">
                  <span className={atrMultiple < 1.0 ? 'text-[#ffd700]' : 'text-[rgba(255,255,255,0.5)]'}>
                    Tight (0.5x)
                  </span>
                  <span className={atrMultiple >= 1.5 && atrMultiple <= 2.0 ? 'text-[#00ff41]' : 'text-[rgba(255,255,255,0.5)]'}>
                    Standard (1.5-2x)
                  </span>
                  <span className={atrMultiple > 2.5 ? 'text-[#ffd700]' : 'text-[rgba(255,255,255,0.5)]'}>
                    Wide (3x)
                  </span>
                </div>
              </div>
            </div>
          )}

          {method === 'fixed' && (
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
                Stop Distance
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={fixedTicks}
                  onChange={(e) => setFixedTicks(parseInt(e.target.value) || 0)}
                  className="flex-1 bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                             py-2.5 px-3 text-white font-mono text-sm
                             focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                             transition-colors"
                />
                <span className="text-sm text-[rgba(255,255,255,0.5)]">ticks</span>
              </div>
            </div>
          )}

          {method === 'dollar' && (
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
                Risk Per Contract
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)]">
                  $
                </span>
                <input
                  type="number"
                  value={dollarRisk}
                  onChange={(e) => setDollarRisk(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                             py-2.5 pl-7 pr-3 text-white font-mono text-sm
                             focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                             transition-colors"
                />
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">
                Tick value: ${spec?.tickValue.toFixed(2) || 'N/A'}
              </p>
            </div>
          )}

          {/* Results */}
          {calculations && (
            <div className="bg-[rgba(0,255,65,0.05)] border border-[rgba(0,255,65,0.2)] rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[rgba(255,255,255,0.7)]">Stop Distance</span>
                <span className="text-lg font-mono text-white">
                  {calculations.stopTicks} ticks
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[rgba(255,255,255,0.7)]">Risk Per Contract</span>
                <span className="text-lg font-mono text-[#00ff41]">
                  ${calculations.riskPerContract.toFixed(2)}
                </span>
              </div>
              {contractQuantity > 1 && (
                <div className="flex justify-between items-center pt-2 border-t border-[rgba(255,255,255,0.1)]">
                  <span className="text-sm text-[rgba(255,255,255,0.7)]">
                    Total Risk ({contractQuantity} contracts)
                  </span>
                  <span className="text-lg font-mono text-[#00ff41]">
                    ${calculations.totalRisk.toFixed(2)}
                  </span>
                </div>
              )}
              <p className="text-xs text-[rgba(255,255,255,0.5)] pt-2">
                {calculations.reasoning}
              </p>
            </div>
          )}

          {/* Professional Standard Note */}
          {method === 'atr' && atrMultiple >= 1.5 && atrMultiple <= 2.0 && (
            <div className="flex items-center gap-2 text-xs text-[#00ff41]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41]" />
              Professional standard: 1.5-2.0x ATR
            </div>
          )}

          {/* Warnings */}
          <AnimatePresence>
            {validation.errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[rgba(181,50,61,0.1)] border border-[rgba(181,50,61,0.3)] rounded-lg p-3"
              >
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#b5323d] flex-shrink-0 mt-0.5" />
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
              Use {calculations?.stopTicks || 0} tick stop
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
