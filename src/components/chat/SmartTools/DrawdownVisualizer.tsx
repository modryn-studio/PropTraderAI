'use client';

/**
 * Drawdown Visualizer - Smart Tool
 * 
 * Shows visual representation of daily/total drawdown limits and
 * how many losing trades remain before hitting limits.
 * 
 * Created: January 13, 2026
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, ChevronDown, ChevronUp, AlertTriangle, Shield, Keyboard } from 'lucide-react';
import type { DrawdownVisualizerProps, DrawdownValues } from './types';
import { VALIDATION_THRESHOLDS } from './types';

export default function DrawdownVisualizer({
  prefilledData,
  riskPerTrade = 500,
  onComplete,
  onDismiss,
  isCollapsed = false,
  onToggleCollapse,
}: DrawdownVisualizerProps) {
  // Form state
  const [dailyLimit, setDailyLimit] = useState<number>(
    prefilledData.dailyLimit || 1000
  );
  const [drawdownLimit, setDrawdownLimit] = useState<number>(
    prefilledData.drawdownLimit || 2500
  );
  const [currentDailyPnL, setCurrentDailyPnL] = useState<number>(0);
  const [currentTotalPnL, setCurrentTotalPnL] = useState<number>(0);
  
  // Completed state
  const [completedValues, setCompletedValues] = useState<DrawdownValues | null>(null);

  // ========================================================================
  // CALCULATIONS
  // ========================================================================
  
  const calculations = useMemo(() => {
    // Remaining room (negative PnL reduces available room)
    const dailyRemaining = dailyLimit + currentDailyPnL; // If down $300, only $700 left of $1000
    const totalRemaining = drawdownLimit + currentTotalPnL;
    
    // Percentage used
    const dailyUsed = currentDailyPnL < 0 ? Math.abs(currentDailyPnL) : 0;
    const totalUsed = currentTotalPnL < 0 ? Math.abs(currentTotalPnL) : 0;
    const dailyPercentUsed = (dailyUsed / dailyLimit) * 100;
    const totalPercentUsed = (totalUsed / drawdownLimit) * 100;
    
    // Losses remaining
    const tradesRemainingDaily = riskPerTrade > 0 
      ? Math.floor(dailyRemaining / riskPerTrade) 
      : 0;
    const tradesRemainingTotal = riskPerTrade > 0 
      ? Math.floor(totalRemaining / riskPerTrade) 
      : 0;
    
    return {
      dailyRemaining: Math.max(0, dailyRemaining),
      totalRemaining: Math.max(0, totalRemaining),
      dailyPercentUsed: Math.min(100, Math.max(0, dailyPercentUsed)),
      totalPercentUsed: Math.min(100, Math.max(0, totalPercentUsed)),
      tradesRemainingDaily: Math.max(0, tradesRemainingDaily),
      tradesRemainingTotal: Math.max(0, tradesRemainingTotal),
    };
  }, [dailyLimit, drawdownLimit, currentDailyPnL, currentTotalPnL, riskPerTrade]);

  // ========================================================================
  // VALIDATION / STATUS
  // ========================================================================
  
  const status = useMemo(() => {
    const warnings: string[] = [];
    const { dailyPercentUsed, totalPercentUsed, tradesRemainingDaily, tradesRemainingTotal } = calculations;
    
    // Daily limit status
    let dailyStatus: 'safe' | 'warning' | 'danger' = 'safe';
    if (dailyPercentUsed >= VALIDATION_THRESHOLDS.dailyLimitUsage.danger) {
      dailyStatus = 'danger';
      warnings.push('⛔ Daily limit nearly exhausted. Stop trading today.');
    } else if (dailyPercentUsed >= VALIDATION_THRESHOLDS.dailyLimitUsage.warning) {
      dailyStatus = 'warning';
      warnings.push('⚠️ Over 70% of daily limit used. Trade cautiously.');
    }
    
    // Total drawdown status
    let totalStatus: 'safe' | 'warning' | 'danger' = 'safe';
    if (totalPercentUsed >= VALIDATION_THRESHOLDS.dailyLimitUsage.danger) {
      totalStatus = 'danger';
      warnings.push('⛔ Close to failing challenge. Consider pausing.');
    } else if (totalPercentUsed >= VALIDATION_THRESHOLDS.dailyLimitUsage.warning) {
      totalStatus = 'warning';
    }
    
    // Few trades remaining
    if (tradesRemainingDaily <= 1 && tradesRemainingDaily > 0) {
      warnings.push('Only 1 trade left before hitting daily limit.');
    }
    if (tradesRemainingTotal <= 3 && tradesRemainingTotal > 0) {
      warnings.push(`Only ${tradesRemainingTotal} losses until challenge failure.`);
    }
    
    return { dailyStatus, totalStatus, warnings };
  }, [calculations]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  
  const handleComplete = useCallback(() => {
    const values: DrawdownValues = {
      dailyLimit,
      drawdownLimit,
      currentPnL: currentDailyPnL,
      tradesRemainingDaily: calculations.tradesRemainingDaily,
      tradesRemainingTotal: calculations.tradesRemainingTotal,
    };
    
    setCompletedValues(values);
    onComplete(values as unknown as Record<string, unknown>);
  }, [dailyLimit, drawdownLimit, currentDailyPnL, calculations, onComplete]);

  const handleDollarInput = useCallback((
    setter: React.Dispatch<React.SetStateAction<number>>,
    allowNegative: boolean = false
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9-]/g, '');
    if (!allowNegative) value = value.replace(/-/g, '');
    setter(value ? parseInt(value) : 0);
  }, []);

  // ========================================================================
  // PROGRESS BAR COMPONENT
  // ========================================================================
  
  const ProgressBar = ({ 
    percentUsed, 
    status, 
    label 
  }: { 
    percentUsed: number; 
    status: 'safe' | 'warning' | 'danger';
    label: string;
  }) => {
    const colorMap = {
      safe: '#00ff41',
      warning: '#ffd700',
      danger: '#b5323d',
    };
    
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-[rgba(255,255,255,0.5)]">{label}</span>
          <span className={`font-mono ${
            status === 'danger' ? 'text-[#b5323d]' : 
            status === 'warning' ? 'text-[#ffd700]' : 
            'text-[rgba(255,255,255,0.7)]'
          }`}>
            {percentUsed.toFixed(0)}% used
          </span>
        </div>
        <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentUsed}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: colorMap[status] }}
          />
        </div>
      </div>
    );
  };

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
            <TrendingDown className="w-4 h-4 text-[#00ff41]" />
            <span className="text-sm text-white font-mono">
              Daily: ${completedValues.dailyLimit.toLocaleString()} | Total: ${completedValues.drawdownLimit.toLocaleString()}
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
            <TrendingDown className="w-4 h-4 text-[#00ff41]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[rgba(255,255,255,0.5)]">
              Drawdown Visualizer
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
          {/* Limit Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
                Daily Loss Limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)]">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dailyLimit.toLocaleString()}
                  onChange={handleDollarInput(setDailyLimit)}
                  className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                             py-2.5 pl-7 pr-3 text-white font-mono text-sm
                             focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                             transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
                Max Drawdown
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)]">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={drawdownLimit.toLocaleString()}
                  onChange={handleDollarInput(setDrawdownLimit)}
                  className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                             py-2.5 pl-7 pr-3 text-white font-mono text-sm
                             focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                             transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Current P&L Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
                Today&apos;s P&L
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)]">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentDailyPnL}
                  onChange={handleDollarInput(setCurrentDailyPnL, true)}
                  placeholder="0"
                  className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                             py-2.5 pl-7 pr-3 text-white font-mono text-sm
                             focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                             transition-colors"
                />
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">
                Negative if down
              </p>
            </div>
            
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
                Total P&L
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)]">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentTotalPnL}
                  onChange={handleDollarInput(setCurrentTotalPnL, true)}
                  placeholder="0"
                  className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                             py-2.5 pl-7 pr-3 text-white font-mono text-sm
                             focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                             transition-colors"
                />
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">
                Since account start
              </p>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4 py-2">
            <ProgressBar
              percentUsed={calculations.dailyPercentUsed}
              status={status.dailyStatus}
              label="Daily Limit"
            />
            <ProgressBar
              percentUsed={calculations.totalPercentUsed}
              status={status.totalStatus}
              label="Total Drawdown"
            />
          </div>

          {/* Buffer Analysis */}
          <div className="bg-[rgba(0,255,65,0.05)] border border-[rgba(0,255,65,0.2)] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#00ff41]" />
              <span className="text-sm font-medium text-white">Buffer Analysis</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[rgba(255,255,255,0.7)]">Daily losses remaining</span>
                <span className={`font-mono ${
                  calculations.tradesRemainingDaily <= 1 ? 'text-[#b5323d]' :
                  calculations.tradesRemainingDaily <= 3 ? 'text-[#ffd700]' :
                  'text-white'
                }`}>
                  {calculations.tradesRemainingDaily} trades
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[rgba(255,255,255,0.7)]">Total losses remaining</span>
                <span className={`font-mono ${
                  calculations.tradesRemainingTotal <= 3 ? 'text-[#b5323d]' :
                  calculations.tradesRemainingTotal <= 5 ? 'text-[#ffd700]' :
                  'text-white'
                }`}>
                  {calculations.tradesRemainingTotal} trades
                </span>
              </div>
              <div className="pt-2 border-t border-[rgba(255,255,255,0.1)] text-xs text-[rgba(255,255,255,0.5)]">
                Based on ${riskPerTrade.toLocaleString()} risk per trade
              </div>
            </div>
          </div>

          {/* Warnings */}
          <AnimatePresence>
            {status.warnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.2)] rounded-lg p-3"
              >
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#ffd700] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {status.warnings.map((warning, i) => (
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
              className="flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all
                         bg-[#00ff41] text-black hover:bg-[#00cc33] active:scale-[0.98]"
            >
              Set these limits
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
