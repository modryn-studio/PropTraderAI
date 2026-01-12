/**
 * PARAMETER-BASED ANIMATION RENDERER
 * 
 * Dynamically generates animations based on ACTUAL strategy parameters
 * (not templates). Ensures visual accuracy to user's exact specifications.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { StrategyParameters, VisualCoordinates, calculateVisualCoordinates } from './intelligentParameterExtractor';

interface ParameterBasedAnimationProps {
  parameters: StrategyParameters;
  width?: number;
  height?: number;
  duration?: number;
}

export default function ParameterBasedAnimation({
  parameters,
  width = 400,
  height = 300,
  duration = 4,
}: ParameterBasedAnimationProps) {
  
  // Calculate exact visual positions from parameters
  const coords = useMemo(() => 
    calculateVisualCoordinates(parameters), 
    [parameters]
  );
  
  // Convert Y coordinates (0-100) to SVG Y pixels
  const toY = (coord: number) => (coord / 100) * height;
  
  return (
    <div className="w-full bg-[#000000] rounded-sm border border-[rgba(255,255,255,0.1)] overflow-hidden">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Price Axis Background */}
        <defs>
          <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#priceGradient)" />
        
        {/* Range Box (if ORB) */}
        {coords.rangeLow !== undefined && coords.rangeHigh !== undefined && (
          <RangeVisualization
            coords={coords}
            width={width}
            toY={toY}
          />
        )}
        
        {/* Stop Loss Line */}
        <StopLossLine
          coords={coords}
          width={width}
          toY={toY}
          direction={parameters.direction}
        />
        
        {/* Profit Target Line */}
        <ProfitTargetLine
          coords={coords}
          width={width}
          toY={toY}
          direction={parameters.direction}
        />
        
        {/* Price Action Animation */}
        <PriceActionPath
          coords={coords}
          width={width}
          toY={toY}
          direction={parameters.direction}
          duration={duration}
        />
        
        {/* Entry Arrow */}
        <EntryMarker
          coords={coords}
          width={width}
          toY={toY}
          direction={parameters.direction}
          duration={duration}
        />
        
        {/* Labels */}
        <VisualizationLabels
          coords={coords}
          parameters={parameters}
          width={width}
          toY={toY}
        />
      </svg>
      
      {/* Legend */}
      <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-[rgba(255,255,255,0.5)]">
            Risk: {coords.riskDistance.toFixed(1)} pts
          </span>
          <span className="text-[#00FFD1]">
            R:R {coords.riskRewardRatio}
          </span>
          <span className="text-[rgba(255,255,255,0.5)]">
            Reward: {coords.rewardDistance.toFixed(1)} pts
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function RangeVisualization({ 
  coords, 
  width, 
  toY 
}: { 
  coords: VisualCoordinates; 
  width: number; 
  toY: (n: number) => number;
}) {
  if (coords.rangeLow === undefined || coords.rangeHigh === undefined) return null;
  
  const y1 = toY(coords.rangeLow);
  const y2 = toY(coords.rangeHigh);
  const rangeHeight = y2 - y1;
  
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Range box */}
      <rect
        x={50}
        y={y1}
        width={width - 100}
        height={rangeHeight}
        fill="rgba(0,255,209,0.05)"
        stroke="rgba(0,255,209,0.3)"
        strokeWidth="1"
        strokeDasharray="4 2"
      />
      
      {/* High line */}
      <line
        x1={50}
        y1={y1}
        x2={width - 50}
        y2={y1}
        stroke="rgba(0,255,209,0.5)"
        strokeWidth="1.5"
      />
      
      {/* Low line */}
      <line
        x1={50}
        y1={y2}
        x2={width - 50}
        y2={y2}
        stroke="rgba(0,255,209,0.5)"
        strokeWidth="1.5"
      />
      
      {/* Label */}
      <text
        x={width - 40}
        y={y1 + rangeHeight / 2}
        fill="rgba(0,255,209,0.7)"
        fontSize="10"
        fontFamily="monospace"
        textAnchor="start"
      >
        Range
      </text>
    </motion.g>
  );
}

function StopLossLine({ 
  coords, 
  width, 
  toY,
  direction
}: { 
  coords: VisualCoordinates; 
  width: number; 
  toY: (n: number) => number;
  direction: 'long' | 'short';
}) {
  const stopY = toY(coords.stop);
  
  return (
    <motion.g
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {/* Stop line */}
      <line
        x1={50}
        y1={stopY}
        x2={width - 50}
        y2={stopY}
        stroke="rgba(255,0,0,0.6)"
        strokeWidth="2"
        strokeDasharray="6 3"
      />
      
      {/* Label */}
      <text
        x={width - 40}
        y={stopY - 5}
        fill="rgba(255,0,0,0.8)"
        fontSize="11"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="start"
      >
        STOP
      </text>
    </motion.g>
  );
}

function ProfitTargetLine({ 
  coords, 
  width, 
  toY,
  direction
}: { 
  coords: VisualCoordinates; 
  width: number; 
  toY: (n: number) => number;
  direction: 'long' | 'short';
}) {
  const targetY = toY(coords.target);
  
  return (
    <motion.g
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      {/* Target line */}
      <line
        x1={50}
        y1={targetY}
        x2={width - 50}
        y2={targetY}
        stroke="rgba(0,255,0,0.6)"
        strokeWidth="2"
        strokeDasharray="6 3"
      />
      
      {/* Label */}
      <text
        x={width - 40}
        y={targetY + 15}
        fill="rgba(0,255,0,0.8)"
        fontSize="11"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="start"
      >
        TARGET
      </text>
    </motion.g>
  );
}

function PriceActionPath({ 
  coords, 
  width, 
  toY,
  direction,
  duration
}: { 
  coords: VisualCoordinates; 
  width: number; 
  toY: (n: number) => number;
  direction: 'long' | 'short';
  duration: number;
}) {
  // Generate price path based on parameters
  const entryY = toY(coords.entry);
  const targetY = toY(coords.target);
  
  // Create path: consolidation → breakout → target
  const startX = 50;
  const consolidationEnd = width * 0.4;
  const breakoutX = width * 0.5;
  const targetX = width - 50;
  
  const pathData = direction === 'long'
    ? `
      M ${startX},${entryY - 10}
      L ${consolidationEnd},${entryY - 8}
      L ${consolidationEnd + 10},${entryY - 5}
      L ${breakoutX},${entryY}
      L ${breakoutX + 20},${entryY + 5}
      L ${targetX},${targetY}
    `
    : `
      M ${startX},${entryY + 10}
      L ${consolidationEnd},${entryY + 8}
      L ${consolidationEnd + 10},${entryY + 5}
      L ${breakoutX},${entryY}
      L ${breakoutX + 20},${entryY - 5}
      L ${targetX},${targetY}
    `;
  
  return (
    <motion.path
      d={pathData}
      stroke="#00FFD1"
      strokeWidth="2"
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ 
        duration: duration * 0.8, 
        ease: 'easeInOut',
        delay: 0.8
      }}
    />
  );
}

function EntryMarker({ 
  coords, 
  width, 
  toY,
  direction,
  duration
}: { 
  coords: VisualCoordinates; 
  width: number; 
  toY: (n: number) => number;
  direction: 'long' | 'short';
  duration: number;
}) {
  const entryY = toY(coords.entry);
  const entryX = width * 0.5;
  
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        delay: duration * 0.4, 
        type: 'spring',
        stiffness: 200
      }}
    >
      {/* Arrow */}
      <polygon
        points={
          direction === 'long'
            ? `${entryX},${entryY - 8} ${entryX - 4},${entryY - 2} ${entryX + 4},${entryY - 2}`
            : `${entryX},${entryY + 8} ${entryX - 4},${entryY + 2} ${entryX + 4},${entryY + 2}`
        }
        fill="#00FFD1"
      />
      
      {/* Label */}
      <text
        x={entryX}
        y={direction === 'long' ? entryY - 15 : entryY + 20}
        fill="#00FFD1"
        fontSize="11"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        ENTRY
      </text>
    </motion.g>
  );
}

function VisualizationLabels({ 
  coords, 
  parameters,
  width, 
  toY 
}: { 
  coords: VisualCoordinates; 
  parameters: StrategyParameters;
  width: number; 
  toY: (n: number) => number;
}) {
  return (
    <g>
      {/* Strategy type label */}
      <text
        x={10}
        y={20}
        fill="rgba(255,255,255,0.5)"
        fontSize="10"
        fontFamily="monospace"
      >
        {parameters.strategyType.toUpperCase()} - {parameters.direction.toUpperCase()}
      </text>
      
      {/* Stop placement detail */}
      <text
        x={10}
        y={toY(coords.stop)}
        fill="rgba(255,0,0,0.6)"
        fontSize="9"
        fontFamily="monospace"
      >
        {formatStopPlacement(parameters.stopLoss)}
      </text>
      
      {/* Target detail */}
      <text
        x={10}
        y={toY(coords.target)}
        fill="rgba(0,255,0,0.6)"
        fontSize="9"
        fontFamily="monospace"
      >
        {formatTargetMethod(parameters.profitTarget)}
      </text>
    </g>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatStopPlacement(stop: StrategyParameters['stopLoss']): string {
  if (stop.placement === 'percentage') {
    return `${(stop.value * 100).toFixed(0)}% of range`;
  }
  if (stop.placement === 'opposite_side') {
    return `Range ${stop.relativeTo === 'range_low' ? 'low' : 'high'}`;
  }
  if (stop.placement === 'fixed_distance') {
    return `${stop.value} ${stop.unit}`;
  }
  if (stop.placement === 'atr_multiple') {
    return `${stop.value}x ATR`;
  }
  return 'Structure';
}

function formatTargetMethod(target: StrategyParameters['profitTarget']): string {
  if (target.method === 'r_multiple') {
    return `${target.value}R`;
  }
  if (target.method === 'extension') {
    return `${target.value}x range`;
  }
  if (target.method === 'fixed_distance') {
    return `${target.value} ${target.unit}`;
  }
  return `${target.value}`;
}
