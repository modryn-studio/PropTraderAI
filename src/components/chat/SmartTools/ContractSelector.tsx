'use client';

/**
 * Contract Selector - Smart Tool
 * 
 * Helps users choose between full-size and micro contracts based on
 * their account size and risk tolerance. Shows exact contract quantities.
 * 
 * Created: January 13, 2026
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ChevronDown, ChevronUp, AlertTriangle, Check, Keyboard } from 'lucide-react';
import { 
  CONTRACT_SPECS, 
  getContractSpec, 
  getRelatedContract,
  isMicroContract 
} from '@/lib/utils/contractSpecs';
import type { ContractSelectorProps, ContractSelectorValues } from './types';
import { VALIDATION_THRESHOLDS } from './types';

// Available instruments for selection
const INSTRUMENT_OPTIONS = [
  { group: 'E-mini Indices', symbols: ['NQ', 'ES', 'YM', 'RTY'] },
  { group: 'Micro Indices', symbols: ['MNQ', 'MES', 'MYM', 'M2K'] },
  { group: 'Energy', symbols: ['CL', 'MCL'] },
  { group: 'Metals', symbols: ['GC', 'MGC'] },
];

export default function ContractSelector({
  prefilledData,
  riskAmount: propRiskAmount,
  onComplete,
  onDismiss,
  isCollapsed = false,
  onToggleCollapse,
}: ContractSelectorProps) {
  // Form state
  const [instrument, setInstrument] = useState<string>(
    prefilledData.instrument || 'NQ'
  );
  const [stopLossTicks, setStopLossTicks] = useState<number>(
    prefilledData.stopLossTicks || 20
  );
  // Allow user to input risk amount if not prefilled
  const [inputRiskAmount, setInputRiskAmount] = useState<number>(
    propRiskAmount || prefilledData.riskAmount || 500
  );
  
  // Use prop, then prefilled, then user input
  const effectiveRiskAmount = propRiskAmount ?? prefilledData.riskAmount ?? inputRiskAmount;
  
  // Completed state
  const [completedValues, setCompletedValues] = useState<ContractSelectorValues | null>(null);

  // Get contract spec
  const spec = getContractSpec(instrument);
  const relatedContract = getRelatedContract(instrument);
  const relatedSpec = relatedContract ? getContractSpec(relatedContract.symbol) : null;

  // ========================================================================
  // CALCULATIONS
  // ========================================================================
  
  const calculations = useMemo(() => {
    if (!spec) return null;
    
    const riskPerContract = stopLossTicks * spec.tickValue;
    const contracts = Math.floor(effectiveRiskAmount / riskPerContract);
    const actualRisk = contracts * riskPerContract;
    const unusedRisk = effectiveRiskAmount - actualRisk;
    
    // Calculate for related contract (micro or full)
    let relatedCalc = null;
    if (relatedSpec) {
      const relatedRiskPerContract = stopLossTicks * relatedSpec.tickValue;
      const relatedContracts = Math.floor(effectiveRiskAmount / relatedRiskPerContract);
      const relatedActualRisk = relatedContracts * relatedRiskPerContract;
      
      relatedCalc = {
        symbol: relatedSpec.symbol,
        fullName: relatedSpec.fullName,
        riskPerContract: relatedRiskPerContract,
        contracts: relatedContracts,
        actualRisk: relatedActualRisk,
        tickValue: relatedSpec.tickValue,
      };
    }
    
    return {
      current: {
        symbol: spec.symbol,
        fullName: spec.fullName,
        riskPerContract,
        contracts,
        actualRisk,
        unusedRisk,
        tickValue: spec.tickValue,
      },
      related: relatedCalc,
    };
  }, [spec, relatedSpec, stopLossTicks, effectiveRiskAmount]);

  // ========================================================================
  // VALIDATION
  // ========================================================================
  
  const validation = useMemo(() => {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (!calculations) return { warnings, errors, isValid: true };
    
    const { current } = calculations;
    
    // Can't trade with 0 contracts
    if (current.contracts === 0) {
      errors.push('Risk amount too small for this contract. Try micro version.');
    }
    
    // Too many contracts
    if (current.contracts > VALIDATION_THRESHOLDS.contracts.warningHigh) {
      warnings.push(`${current.contracts} contracts is high. Consider full-size.`);
    }
    
    // Single contract uses most of risk
    if (current.contracts === 1 && current.riskPerContract > effectiveRiskAmount * 0.8) {
      warnings.push(`1 contract = ${Math.round(current.riskPerContract / effectiveRiskAmount * 100)}% of your risk budget.`);
    }
    
    // Very few contracts (hard to scale)
    if (current.contracts > 0 && current.contracts < VALIDATION_THRESHOLDS.contracts.warningLow) {
      warnings.push('Few contracts means less flexibility to scale in/out.');
    }
    
    return { warnings, errors, isValid: errors.length === 0 };
  }, [calculations, effectiveRiskAmount]);

  // ========================================================================
  // RECOMMENDATION
  // ========================================================================
  
  const recommendation = useMemo(() => {
    if (!calculations) return null;
    
    const { current, related } = calculations;
    
    // If current gives 0 contracts but related gives some, recommend related
    if (current.contracts === 0 && related && related.contracts > 0) {
      return { symbol: related.symbol, reason: 'Account too small for ' + current.symbol };
    }
    
    // If micro and contracts > 100, recommend full
    if (isMicroContract(instrument) && current.contracts > 100 && related) {
      return { symbol: related.symbol, reason: 'Over 100 micros - consider full-size' };
    }
    
    // If full and contracts < 5, recommend micro
    if (!isMicroContract(instrument) && current.contracts < 5 && current.contracts > 0 && related) {
      return { symbol: related.symbol, reason: 'More flexibility with micro contracts' };
    }
    
    return null;
  }, [calculations, instrument]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  
  const handleComplete = useCallback(() => {
    if (!calculations) return;
    
    const values: ContractSelectorValues = {
      instrument: calculations.current.symbol,
      stopLossTicks,
      contractQuantity: calculations.current.contracts,
      riskPerContract: calculations.current.riskPerContract,
      totalRisk: calculations.current.actualRisk,
    };
    
    setCompletedValues(values);
    onComplete(values as unknown as Record<string, unknown>);
  }, [calculations, stopLossTicks, onComplete]);

  const handleSelectRecommended = useCallback(() => {
    if (recommendation) {
      setInstrument(recommendation.symbol);
    }
  }, [recommendation]);

  const handleStopLossChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
    setStopLossTicks(value);
  }, []);

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
            <BarChart3 className="w-4 h-4 text-[#00ff41]" />
            <span className="text-sm text-white font-mono">
              {completedValues.contractQuantity} {completedValues.instrument} contracts ({stopLossTicks} tick stop)
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
            <BarChart3 className="w-4 h-4 text-[#00ff41]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[rgba(255,255,255,0.5)]">
              Contract Selector
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
          {/* Risk Amount Display/Input */}
          <div className="bg-[rgba(0,255,65,0.05)] border border-[rgba(0,255,65,0.2)] rounded-lg px-4 py-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[rgba(255,255,255,0.7)]">Risk Per Trade</span>
              {propRiskAmount || prefilledData.riskAmount ? (
                <span className="text-lg font-mono text-[#00ff41]">
                  ${effectiveRiskAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-[rgba(255,255,255,0.5)]">$</span>
                  <input
                    type="number"
                    value={inputRiskAmount}
                    onChange={(e) => setInputRiskAmount(Number(e.target.value))}
                    className="w-24 bg-black border border-[rgba(255,255,255,0.1)] rounded px-2 py-1
                               text-lg font-mono text-[#00ff41] text-right
                               focus:outline-none focus:border-[#00ff41]"
                    min={50}
                    max={10000}
                    step={50}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Instrument Selector */}
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
              Instrument
            </label>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                         py-2.5 px-3 text-white text-sm
                         focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                         transition-colors appearance-none cursor-pointer"
            >
              {INSTRUMENT_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.symbols.map((sym) => {
                    const s = CONTRACT_SPECS[sym];
                    return (
                      <option key={sym} value={sym}>
                        {sym} - {s?.fullName}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Stop Loss Input */}
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
              Stop Loss Distance
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={stopLossTicks}
                onChange={handleStopLossChange}
                className="flex-1 bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                           py-2.5 px-3 text-white font-mono text-sm
                           focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                           transition-colors"
              />
              <span className="text-sm text-[rgba(255,255,255,0.5)]">ticks</span>
            </div>
          </div>

          {/* Contract Comparison Cards */}
          {calculations && (
            <div className="space-y-3">
              {/* Current Selection */}
              <div className={`border rounded-lg p-4 transition-colors ${
                !recommendation ? 'border-[#00ff41] bg-[rgba(0,255,65,0.05)]' : 'border-[rgba(255,255,255,0.1)]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{calculations.current.symbol}</span>
                  {!recommendation && (
                    <span className="text-xs text-[#00ff41] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  )}
                </div>
                <div className="text-xs text-[rgba(255,255,255,0.5)] space-y-1">
                  <p>Tick value: ${calculations.current.tickValue.toFixed(2)}</p>
                  <p>Risk per contract: ${calculations.current.riskPerContract.toFixed(2)}</p>
                  <p className="text-white font-mono text-sm">
                    Contracts: {calculations.current.contracts}
                  </p>
                </div>
              </div>

              {/* Related Contract */}
              {calculations.related && (
                <div className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                  recommendation?.symbol === calculations.related.symbol 
                    ? 'border-[#00ff41] bg-[rgba(0,255,65,0.05)]' 
                    : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'
                }`}
                onClick={() => setInstrument(calculations.related!.symbol)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{calculations.related.symbol}</span>
                    {recommendation?.symbol === calculations.related.symbol && (
                      <span className="text-xs text-[#00ff41]">✓ Recommended</span>
                    )}
                  </div>
                  <div className="text-xs text-[rgba(255,255,255,0.5)] space-y-1">
                    <p>Tick value: ${calculations.related.tickValue.toFixed(2)}</p>
                    <p>Risk per contract: ${calculations.related.riskPerContract.toFixed(2)}</p>
                    <p className="text-white font-mono text-sm">
                      Contracts: {calculations.related.contracts}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendation Notice */}
          {recommendation && (
            <button
              onClick={handleSelectRecommended}
              className="w-full py-2 px-3 bg-[rgba(0,255,65,0.1)] border border-[rgba(0,255,65,0.3)]
                         rounded-md text-sm text-[#00ff41] hover:bg-[rgba(0,255,65,0.15)] transition-colors"
            >
              Switch to {recommendation.symbol}: {recommendation.reason}
            </button>
          )}

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
              Use {calculations?.current.contracts || 0} {instrument}
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
