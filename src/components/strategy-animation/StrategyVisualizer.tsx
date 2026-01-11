'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimationConfig } from './taxonomy';

interface StrategyVisualizerProps {
  config: AnimationConfig;
  /** Auto-play on mount */
  autoPlay?: boolean;
  /** Loop the animation */
  loop?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * UNIVERSAL STRATEGY VISUALIZER
 * 
 * One component that renders ANY trading strategy animation.
 * Adapts based on the AnimationConfig provided by Claude.
 */
export default function StrategyVisualizer({
  config,
  autoPlay = true,
  loop = true,
  onComplete,
}: StrategyVisualizerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentPhase, setCurrentPhase] = useState<'setup' | 'action' | 'complete'>('setup');
  const [animationKey, setAnimationKey] = useState(0);
  
  const { 
    type, 
    direction, 
    priceAction, 
    indicators, 
    entry, 
    stopLoss, 
    target,
    display,
    context 
  } = config;

  const height = display?.height || 200;
  const duration = display?.duration || 8;
  const width = 600;

  // Calculate chart bounds
  const bounds = useMemo(() => {
    const centerY = height / 2;
    const rangeHeight = height * 0.3;
    
    return {
      centerY,
      rangeHeight,
      highY: centerY - rangeHeight,
      lowY: centerY + rangeHeight,
      entryY: direction === 'long' ? centerY - rangeHeight : centerY + rangeHeight,
      targetY: direction === 'long' ? centerY - rangeHeight * 2 : centerY + rangeHeight * 2,
    };
  }, [height, direction]);

  // Deterministic random for consistent animations
  const seededRandom = useMemo(() => {
    let seed = type.length + direction.length;
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }, [type, direction]);

  // Generate price path based on strategy type
  const generatePricePath = useMemo(() => {
    const { centerY, rangeHeight, highY, lowY } = bounds;
    let path = `M 0 ${centerY}`;
    
    // Reset seeded random for consistent paths
    let localSeed = type.length + direction.length;
    const localRandom = () => {
      localSeed = (localSeed * 9301 + 49297) % 233280;
      return localSeed / 233280;
    };
    
    // Phase 1: Setup/Consolidation (70% of animation)
    const setupPoints = 30;
    const setupWidth = width * 0.7;
    
    for (let i = 1; i <= setupPoints; i++) {
      const x = (i / setupPoints) * setupWidth;
      let y = centerY;
      
      switch (type) {
        case 'breakout_range':
          // Range-bound consolidation
          y = centerY + (localRandom() - 0.5) * rangeHeight;
          break;
          
        case 'ema_pullback':
        case 'pullback_entry':
          // Trending, then pullback
          if (i < setupPoints * 0.6) {
            y = direction === 'long' 
              ? centerY - (i / (setupPoints * 0.6)) * rangeHeight
              : centerY + (i / (setupPoints * 0.6)) * rangeHeight;
          } else {
            // Pullback phase
            const pullbackProgress = (i - setupPoints * 0.6) / (setupPoints * 0.4);
            y = direction === 'long'
              ? centerY - rangeHeight + pullbackProgress * rangeHeight * 0.5
              : centerY + rangeHeight - pullbackProgress * rangeHeight * 0.5;
          }
          break;
          
        case 'vwap_bounce':
        case 'mean_reversion':
          // Price drifts away from center, then returns
          const driftPhase = i / setupPoints;
          if (driftPhase < 0.7) {
            y = centerY + Math.sin(driftPhase * Math.PI) * rangeHeight * 1.5;
          } else {
            y = centerY + (1 - (driftPhase - 0.7) / 0.3) * rangeHeight * 0.5;
          }
          break;
          
        case 'liquidity_sweep':
          // False breakout then reversal
          if (i < setupPoints * 0.5) {
            y = centerY + (localRandom() - 0.5) * rangeHeight * 0.8;
          } else if (i < setupPoints * 0.7) {
            // Fake breakout
            y = direction === 'long' 
              ? lowY + rangeHeight * 0.2 
              : highY - rangeHeight * 0.2;
          } else {
            // Sharp reversal back
            const reversalProgress = (i - setupPoints * 0.7) / (setupPoints * 0.3);
            y = direction === 'long'
              ? lowY - reversalProgress * rangeHeight * 0.5
              : highY + reversalProgress * rangeHeight * 0.5;
          }
          break;
          
        case 'order_block':
        case 'fair_value_gap':
          // Drop to OB/FVG zone then bounce
          if (i < setupPoints * 0.6) {
            y = direction === 'long'
              ? highY - rangeHeight * 0.5
              : lowY + rangeHeight * 0.5;
          } else {
            const bounceProgress = (i - setupPoints * 0.6) / (setupPoints * 0.4);
            y = direction === 'long'
              ? highY - rangeHeight * 0.5 + bounceProgress * rangeHeight * 0.3
              : lowY + rangeHeight * 0.5 - bounceProgress * rangeHeight * 0.3;
          }
          break;
          
        case 'ema_cross':
        case 'macd_cross':
          // Converging then crossing
          const crossPhase = i / setupPoints;
          y = centerY + Math.sin(crossPhase * Math.PI * 2) * rangeHeight * (1 - crossPhase * 0.5);
          break;
          
        case 'vwap_breakout':
          // Price hovering near VWAP then breaking
          if (i < setupPoints * 0.8) {
            y = centerY + (localRandom() - 0.5) * rangeHeight * 0.3;
          } else {
            const breakProgress = (i - setupPoints * 0.8) / (setupPoints * 0.2);
            y = direction === 'long'
              ? centerY - breakProgress * rangeHeight * 0.5
              : centerY + breakProgress * rangeHeight * 0.5;
          }
          break;
          
        default:
          // Generic consolidation
          y = centerY + (localRandom() - 0.5) * rangeHeight;
      }
      
      path += ` L ${x} ${y}`;
    }
    
    // Phase 2: Breakout/Action (30% of animation)
    const actionPoints = 10;
    const actionStartX = setupWidth;
    
    for (let i = 1; i <= actionPoints; i++) {
      const x = actionStartX + (i / actionPoints) * (width - actionStartX);
      const progress = i / actionPoints;
      
      const speed = priceAction?.breakoutSpeed === 'fast' ? 1.5 :
                     priceAction?.breakoutSpeed === 'slow' ? 0.7 : 1;
      
      const targetY = direction === 'long' 
        ? centerY - rangeHeight * 2 * speed
        : centerY + rangeHeight * 2 * speed;
      
      const y = centerY + (targetY - centerY) * progress;
      path += ` L ${x} ${y}`;
    }
    
    return path;
  }, [type, direction, width, bounds, priceAction]);

  // Animation lifecycle
  useEffect(() => {
    if (!isPlaying) return;
    
    setCurrentPhase('setup');
    
    const setupTimer = setTimeout(() => {
      setCurrentPhase('action');
    }, duration * 1000 * 0.7);
    
    const completeTimer = setTimeout(() => {
      setCurrentPhase('complete');
      onComplete?.();
      
      if (loop) {
        setTimeout(() => {
          setAnimationKey(k => k + 1);
          setCurrentPhase('setup');
        }, 1000);
      }
    }, duration * 1000);
    
    return () => {
      clearTimeout(setupTimer);
      clearTimeout(completeTimer);
    };
  }, [isPlaying, duration, loop, onComplete, animationKey]);

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            direction === 'long' ? 'bg-[#10b981]' : 'bg-[#ef4444]'
          }`} />
          <span className="font-mono text-xs text-[rgba(255,255,255,0.7)]">
            {entry.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {context?.session && (
            <span className="font-mono text-xs text-[rgba(255,255,255,0.5)]">
              {context.session}
            </span>
          )}
          {context?.timeframe && (
            <span className="font-mono text-xs text-[rgba(255,255,255,0.4)]">
              {context.timeframe}
            </span>
          )}
        </div>
      </div>

      {/* Chart SVG */}
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        key={animationKey}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent) => (
          <line
            key={percent}
            x1="0"
            y1={height * percent}
            x2={width}
            y2={height * percent}
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />
        ))}

        {/* VWAP Line (if enabled) */}
        {indicators?.vwap?.show && (
          <line
            x1="0"
            y1={bounds.centerY}
            x2={width}
            y2={bounds.centerY}
            stroke="#00FFD1"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        )}

        {/* EMA Line (if enabled) */}
        {indicators?.ema?.show && (
          <motion.path
            d={`M 0 ${bounds.centerY + 10} Q ${width/2} ${bounds.centerY - 15} ${width} ${bounds.centerY - 30}`}
            fill="none"
            stroke="#FFD700"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 2 }}
          />
        )}

        {/* Range/Zone lines (for breakouts, order blocks) */}
        {(type === 'breakout_range' || type === 'order_block') && (
          <>
            <motion.line
              x1="0"
              y1={bounds.highY}
              x2={width * 0.7}
              y2={bounds.highY}
              stroke="#00FFD1"
              strokeWidth="2"
              strokeDasharray="5,5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
            <motion.line
              x1="0"
              y1={bounds.lowY}
              x2={width * 0.7}
              y2={bounds.lowY}
              stroke="#00FFD1"
              strokeWidth="2"
              strokeDasharray="5,5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
            {/* Labels */}
            <text x="10" y={bounds.highY - 8} fill="#00FFD1" fontSize="10" fontFamily="monospace">
              High
            </text>
            <text x="10" y={bounds.lowY + 18} fill="#00FFD1" fontSize="10" fontFamily="monospace">
              Low
            </text>
          </>
        )}

        {/* Order Block / FVG Zone (for ICT strategies) */}
        {(type === 'order_block' || type === 'fair_value_gap') && display?.chartType === 'candle' && (
          <motion.rect
            x={width * 0.3}
            y={direction === 'long' ? bounds.lowY - 10 : bounds.highY - 10}
            width={width * 0.15}
            height={20}
            fill={direction === 'long' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
            stroke={direction === 'long' ? '#10b981' : '#ef4444'}
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.5 }}
          />
        )}

        {/* Price Path */}
        <motion.path
          d={generatePricePath}
          fill="none"
          stroke="white"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ 
            duration: duration,
            ease: "linear"
          }}
        />

        {/* Entry Arrow */}
        <AnimatePresence>
          {currentPhase !== 'setup' && (
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <line
                x1={width * 0.72}
                y1={bounds.entryY + (direction === 'long' ? 30 : -30)}
                x2={width * 0.72}
                y2={bounds.entryY + (direction === 'long' ? 5 : -5)}
                stroke={direction === 'long' ? '#10b981' : '#ef4444'}
                strokeWidth="2"
              />
              <polygon
                points={direction === 'long'
                  ? `${width * 0.72},${bounds.entryY} ${width * 0.72 - 5},${bounds.entryY + 10} ${width * 0.72 + 5},${bounds.entryY + 10}`
                  : `${width * 0.72},${bounds.entryY} ${width * 0.72 - 5},${bounds.entryY - 10} ${width * 0.72 + 5},${bounds.entryY - 10}`
                }
                fill={direction === 'long' ? '#10b981' : '#ef4444'}
              />
              <text 
                x={width * 0.72 + 15} 
                y={bounds.entryY + 5} 
                fill={direction === 'long' ? '#10b981' : '#ef4444'} 
                fontSize="11" 
                fontFamily="monospace"
                fontWeight="bold"
              >
                ENTER
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Stop Loss Line */}
        {currentPhase !== 'setup' && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <line
              x1={width * 0.6}
              y1={direction === 'long' ? bounds.lowY : bounds.highY}
              x2={width}
              y2={direction === 'long' ? bounds.lowY : bounds.highY}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.5"
            />
            <text 
              x={width * 0.62} 
              y={direction === 'long' ? bounds.lowY + 15 : bounds.highY - 8} 
              fill="#ef4444" 
              fontSize="9" 
              fontFamily="monospace"
              opacity="0.7"
            >
              STOP
            </text>
          </motion.g>
        )}

        {/* Target Line (if target defined) */}
        {currentPhase === 'complete' && target && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <line
              x1={width * 0.7}
              y1={bounds.targetY}
              x2={width}
              y2={bounds.targetY}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.5"
            />
            <text 
              x={width * 0.72} 
              y={direction === 'long' ? bounds.targetY - 8 : bounds.targetY + 15} 
              fill="#10b981" 
              fontSize="9" 
              fontFamily="monospace"
              opacity="0.7"
            >
              TARGET
            </text>
          </motion.g>
        )}
      </svg>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-[rgba(255,255,255,0.5)]">
            {stopLoss.label}
          </span>
          {target && (
            <span className="font-mono text-xs text-[rgba(255,255,255,0.4)]">
              {target.label}
            </span>
          )}
        </div>
        
        {/* Phase indicator */}
        <div className="flex gap-1">
          <div className={`w-12 h-1 rounded-full transition-all duration-300 ${
            currentPhase === 'setup' ? 'bg-[#00FFD1]' : 'bg-[rgba(255,255,255,0.2)]'
          }`} />
          <div className={`w-12 h-1 rounded-full transition-all duration-300 ${
            currentPhase === 'action' ? 'bg-[#00FFD1]' : 'bg-[rgba(255,255,255,0.2)]'
          }`} />
          <div className={`w-12 h-1 rounded-full transition-all duration-300 ${
            currentPhase === 'complete' ? 'bg-[#00FFD1]' : 'bg-[rgba(255,255,255,0.2)]'
          }`} />
        </div>
      </div>
    </div>
  );
}
