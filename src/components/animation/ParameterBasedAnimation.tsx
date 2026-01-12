/**
 * PARAMETER-BASED ANIMATION RENDERER
 * 
 * Dynamically generates animations based on ACTUAL strategy parameters
 * (not templates). Ensures visual accuracy to user's exact specifications.
 * 
 * Core principle: "Visual Algebra" - positions are calculated mathematically
 * from extracted parameters, not looked up from templates.
 * 
 * @see docs/Animations/Parameter-Based Animation System/README.md
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  StrategyParameters, 
  VisualCoordinates, 
  calculateVisualCoordinates 
} from '@/lib/animation/intelligentParameterExtractor';

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
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Background gradient */}
        <defs>
          <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#priceGradient)" />
        
        {/* Range Box (for ORB and range-based strategies) */}
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
          parameters={parameters}
        />
        
        {/* Profit Target Line */}
        <ProfitTargetLine
          coords={coords}
          width={width}
          toY={toY}
          parameters={parameters}
        />
        
        {/* Price Action Animation */}
        <PriceActionPath
          coords={coords}
          width={width}
          toY={toY}
          direction={parameters.direction}
          duration={duration}
        />
        
        {/* Entry Marker */}
        <EntryMarker
          coords={coords}
          width={width}
          toY={toY}
          direction={parameters.direction}
          duration={duration}
        />
        
        {/* Labels */}
        <VisualizationLabels
          parameters={parameters}
        />
      </svg>
      
      {/* Legend bar */}
      <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-[rgba(255,255,255,0.5)]">
            Risk: {coords.riskDistance.toFixed(1)}
          </span>
          <span className="text-[#00FFD1] font-semibold">
            R:R {coords.riskRewardRatio}
          </span>
          <span className="text-[rgba(255,255,255,0.5)]">
            Reward: {coords.rewardDistance.toFixed(1)}
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
  
  const y1 = toY(coords.rangeHigh); // rangeHigh is lower Y value (higher on screen)
  const y2 = toY(coords.rangeLow);  // rangeLow is higher Y value (lower on screen)
  const rangeHeight = y2 - y1;
  
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Range box fill */}
      <rect
        x={40}
        y={y1}
        width={width - 80}
        height={rangeHeight}
        fill="rgba(0,255,209,0.05)"
        stroke="rgba(0,255,209,0.2)"
        strokeWidth="1"
        strokeDasharray="4 2"
      />
      
      {/* Range high line */}
      <line
        x1={40}
        y1={y1}
        x2={width - 40}
        y2={y1}
        stroke="rgba(0,255,209,0.4)"
        strokeWidth="1.5"
      />
      
      {/* Range low line */}
      <line
        x1={40}
        y1={y2}
        x2={width - 40}
        y2={y2}
        stroke="rgba(0,255,209,0.4)"
        strokeWidth="1.5"
      />
      
      {/* Range label */}
      <text
        x={width - 32}
        y={(y1 + y2) / 2 + 3}
        fill="rgba(0,255,209,0.6)"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
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
  parameters
}: { 
  coords: VisualCoordinates; 
  width: number; 
  toY: (n: number) => number;
  parameters: StrategyParameters;
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
        x1={40}
        y1={stopY}
        x2={width - 40}
        y2={stopY}
        stroke="rgba(239,68,68,0.7)"
        strokeWidth="2"
        strokeDasharray="6 3"
      />
      
      {/* Stop label with exact placement info */}
      <text
        x={width - 32}
        y={stopY - 6}
        fill="rgba(239,68,68,0.9)"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
        textAnchor="start"
      >
        STOP
      </text>
      
      {/* Placement detail */}
      <text
        x={8}
        y={stopY - 4}
        fill="rgba(239,68,68,0.6)"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
      >
        {formatStopPlacement(parameters.stopLoss)}
      </text>
    </motion.g>
  );
}

function ProfitTargetLine({ 
  coords, 
  width, 
  toY,
  parameters
}: { 
  coords: VisualCoordinates; 
  width: number; 
  toY: (n: number) => number;
  parameters: StrategyParameters;
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
        x1={40}
        y1={targetY}
        x2={width - 40}
        y2={targetY}
        stroke="rgba(16,185,129,0.7)"
        strokeWidth="2"
        strokeDasharray="6 3"
      />
      
      {/* Target label */}
      <text
        x={width - 32}
        y={targetY + 14}
        fill="rgba(16,185,129,0.9)"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
        textAnchor="start"
      >
        TARGET
      </text>
      
      {/* Target detail */}
      <text
        x={8}
        y={targetY + 12}
        fill="rgba(16,185,129,0.6)"
        fontSize="8"
        fontFamily="ui-monospace, monospace"
      >
        {formatTargetMethod(parameters.profitTarget)}
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
  const entryY = toY(coords.entry);
  const targetY = toY(coords.target);
  
  // Create path: consolidation → breakout → move to target
  const startX = 40;
  const consolidationEnd = width * 0.35;
  const breakoutX = width * 0.45;
  const targetX = width - 40;
  
  // For long: price rises from consolidation to target (Y decreases)
  // For short: price falls from consolidation to target (Y increases)
  const consolidationRange = 8; // Small oscillation during consolidation
  
  const pathData = direction === 'long'
    ? `
      M ${startX},${entryY + consolidationRange}
      Q ${startX + 40},${entryY - consolidationRange / 2} ${startX + 80},${entryY + consolidationRange / 2}
      Q ${startX + 120},${entryY - consolidationRange} ${consolidationEnd},${entryY + consolidationRange / 2}
      L ${breakoutX},${entryY}
      Q ${breakoutX + 30},${entryY - 10} ${breakoutX + 60},${(entryY + targetY) / 2}
      L ${targetX},${targetY}
    `
    : `
      M ${startX},${entryY - consolidationRange}
      Q ${startX + 40},${entryY + consolidationRange / 2} ${startX + 80},${entryY - consolidationRange / 2}
      Q ${startX + 120},${entryY + consolidationRange} ${consolidationEnd},${entryY - consolidationRange / 2}
      L ${breakoutX},${entryY}
      Q ${breakoutX + 30},${entryY + 10} ${breakoutX + 60},${(entryY + targetY) / 2}
      L ${targetX},${targetY}
    `;
  
  return (
    <motion.path
      d={pathData}
      stroke="#00FFD1"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
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
  const entryX = width * 0.45;
  
  // Arrow pointing up for long, down for short
  const arrowSize = 8;
  const arrowPoints = direction === 'long'
    ? `${entryX},${entryY - arrowSize} ${entryX - arrowSize / 2},${entryY - 2} ${entryX + arrowSize / 2},${entryY - 2}`
    : `${entryX},${entryY + arrowSize} ${entryX - arrowSize / 2},${entryY + 2} ${entryX + arrowSize / 2},${entryY + 2}`;
  
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
      {/* Entry arrow */}
      <polygon
        points={arrowPoints}
        fill="#00FFD1"
      />
      
      {/* Entry label */}
      <text
        x={entryX}
        y={direction === 'long' ? entryY - arrowSize - 6 : entryY + arrowSize + 12}
        fill="#00FFD1"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
        textAnchor="middle"
      >
        ENTRY
      </text>
    </motion.g>
  );
}

function VisualizationLabels({ 
  parameters,
}: { 
  parameters: StrategyParameters;
}) {
  return (
    <g>
      {/* Strategy type label */}
      <text
        x={8}
        y={16}
        fill="rgba(255,255,255,0.4)"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
      >
        {parameters.strategyType.toUpperCase()} • {parameters.direction.toUpperCase()}
      </text>
    </g>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatStopPlacement(stop: StrategyParameters['stopLoss']): string {
  if (stop.placement === 'percentage') {
    return `${Math.round(stop.value * 100)}% of range`;
  }
  if (stop.placement === 'opposite_side') {
    return `Range ${stop.relativeTo === 'range_low' ? 'low' : 'high'}`;
  }
  if (stop.placement === 'fixed_distance') {
    return `${stop.value} ${stop.unit || 'ticks'}`;
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
    return `${target.value} ${target.unit || 'pts'}`;
  }
  return `${target.value}`;
}
