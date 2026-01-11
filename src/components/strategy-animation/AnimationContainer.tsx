'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import StrategyVisualizer from './StrategyVisualizer';
import { AnimationConfig } from './taxonomy';
import { useUser } from '@/contexts/UserContext';
import { logAnimationEvent } from '@/lib/behavioral/animationLogger';
import { useResponsiveBreakpoints } from '@/lib/hooks/useResponsiveBreakpoints';

interface AnimationContainerProps {
  /** Current animation config (updates in place as conversation progresses) */
  config: AnimationConfig | null;
  /** Position for desktop */
  desktopPosition?: 'sidebar' | 'inline';
  /** Auto-hide after X seconds of inactivity */
  autoHideDuration?: number;
  /** External control: is animation expanded/visible? (undefined = internal state) */
  isExpanded?: boolean;
  /** Callback when animation expand/collapse state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Whether this was manually set by user (for smart minimize behavior) */
  wasManuallySet?: boolean;
}

/**
 * ANIMATION CONTAINER
 * 
 * Handles responsive placement:
 * - Desktop: Fixed sidebar on right (minimized by default, auto-expands at milestones)
 * - Mobile: Embedded in Summary Panel (handled by parent, FAB hidden)
 * 
 * Updates in place when config changes.
 * 
 * Now supports external state control for integration with Summary Panel:
 * - isExpanded prop overrides internal state when provided
 * - onExpandedChange notifies parent of state changes
 * - Smart minimize: only auto-minimize if not manually set by user
 */
export default function AnimationContainer({
  config,
  desktopPosition = 'sidebar',
  autoHideDuration,
  isExpanded: externalIsExpanded,
  onExpandedChange,
  wasManuallySet,
}: AnimationContainerProps) {
  const { userId } = useUser();
  const { isMobile, defaultAnimationExpanded, animationAutoExpandable } = useResponsiveBreakpoints();
  
  // Internal state (used when external control not provided)
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [viewStartTime, setViewStartTime] = useState<number | null>(null);
  const [hasLogged, setHasLogged] = useState(false);

  // Use external state if provided, otherwise internal
  const isMinimized = externalIsExpanded !== undefined 
    ? !externalIsExpanded 
    : !internalIsExpanded;

  // Set initial state based on screen size
  useEffect(() => {
    if (externalIsExpanded === undefined) {
      setInternalIsExpanded(defaultAnimationExpanded);
    }
  }, [defaultAnimationExpanded, externalIsExpanded]);

  // Handle state changes
  const handleToggleExpanded = useCallback(() => {
    const newValue = isMinimized;
    
    if (externalIsExpanded !== undefined) {
      // External control - notify parent
      onExpandedChange?.(newValue);
    } else {
      // Internal control
      setInternalIsExpanded(newValue);
    }
  }, [isMinimized, externalIsExpanded, onExpandedChange]);

  // Detect mobile keyboard (iOS and Android)
  useEffect(() => {
    if (typeof window === 'undefined' || !isMobile) return;
    
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      setIsKeyboardVisible(windowHeight - viewportHeight > 150);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [isMobile]);

  // Log desktop view (sidebar visible)
  useEffect(() => {
    if (config && !isMobile && !isMinimized && userId && !hasLogged) {
      logAnimationEvent(userId, 'animation_viewed', {
        device: 'desktop',
        type: config.type,
        direction: config.direction,
        time_to_view_ms: 0,
      });
      setHasLogged(true);
    }
  }, [config, isMobile, isMinimized, userId, hasLogged]);

  // Reset hasLogged when config changes significantly
  useEffect(() => {
    if (config) {
      setHasLogged(false);
    }
  }, [config, config?.type, config?.direction]);

  // Auto-hide logic (only if not manually set by user)
  useEffect(() => {
    if (!autoHideDuration || !config || wasManuallySet) return;

    const timer = setTimeout(() => {
      if (!isMobile && animationAutoExpandable) {
        if (externalIsExpanded !== undefined) {
          onExpandedChange?.(false);
        } else {
          setInternalIsExpanded(false);
        }
      }
    }, autoHideDuration * 1000);

    return () => clearTimeout(timer);
  }, [config, autoHideDuration, isMobile, wasManuallySet, animationAutoExpandable, externalIsExpanded, onExpandedChange]);

  // Handle mobile panel open
  const handleMobileOpen = useCallback(() => {
    const startTime = Date.now();
    setViewStartTime(startTime);
    
    if (externalIsExpanded !== undefined) {
      onExpandedChange?.(true);
    } else {
      setInternalIsExpanded(true);
    }
    
    if (userId && config) {
      logAnimationEvent(userId, 'animation_viewed', {
        device: 'mobile',
        type: config.type,
        direction: config.direction,
        time_to_view_ms: startTime,
      });
    }
  }, [userId, config, externalIsExpanded, onExpandedChange]);

  // Handle mobile panel close
  const handleMobileClose = useCallback(() => {
    const duration = viewStartTime ? Date.now() - viewStartTime : 0;
    
    if (userId && config) {
      logAnimationEvent(userId, duration < 5000 ? 'animation_dismissed_quickly' : 'animation_viewed', {
        view_duration_ms: duration,
        type: config.type,
        direction: config.direction,
        was_quick_dismissal: duration < 5000,
      });
    }
    
    if (externalIsExpanded !== undefined) {
      onExpandedChange?.(false);
    } else {
      setInternalIsExpanded(false);
    }
    setViewStartTime(null);
  }, [viewStartTime, userId, config, externalIsExpanded, onExpandedChange]);

  if (!config) return null;

  // === MOBILE LAYOUT ===
  // On mobile, animation is embedded in Summary Panel
  // This component only shows the FAB when Summary Panel is not handling it
  if (isMobile) {
    // Don't show FAB when keyboard is visible
    const showFAB = !isKeyboardVisible && !externalIsExpanded;
    
    // If parent is controlling, return null (Summary Panel handles mobile UI)
    if (externalIsExpanded !== undefined) {
      return null;
    }

    // Legacy mobile FAB behavior (when not integrated with Summary Panel)
    return (
      <AnimatePresence>
        {!internalIsExpanded ? (
          showFAB ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={handleMobileOpen}
              className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-[#00FFD1] shadow-lg flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <motion.div
                className="absolute inset-0 rounded-full bg-[#00FFD1]"
                animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            </motion.button>
          ) : null
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleMobileClose}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 150) handleMobileClose();
              }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#000000] border-t border-[rgba(255,255,255,0.2)] rounded-t-3xl shadow-2xl"
              style={{ maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-[rgba(255,255,255,0.3)] rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.direction === 'long' ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
                  <span className="font-mono text-sm text-white">Strategy Preview</span>
                </div>
                <button onClick={handleMobileClose} className="text-[rgba(255,255,255,0.5)] hover:text-white transition-colors p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 80px)' }}>
                <StrategyVisualizer config={config} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // === DESKTOP LAYOUT ===
  if (desktopPosition === 'sidebar') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`desktop-${config.type}-${config.direction}`}
          initial={{ x: 400, opacity: 0 }}
          animate={{ 
            x: isMinimized ? 350 : 0,
            opacity: 1 
          }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed top-16 right-6 w-[400px] z-40"
        >
          {/* Clickable expand tab when minimized */}
          {isMinimized && (
            <button
              onClick={handleToggleExpanded}
              className="absolute -left-10 top-0 w-10 h-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] border-r-0 rounded-l-lg flex items-center justify-center hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-[rgba(255,255,255,0.7)]" />
            </button>
          )}
          
          <div className="bg-[#000000] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.1)] bg-[#0A0A0A]">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  config.direction === 'long' ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                }`} />
                <span className="font-mono text-xs text-[rgba(255,255,255,0.7)]">
                  Strategy Preview
                </span>
              </div>
              <button
                onClick={handleToggleExpanded}
                className="text-[rgba(255,255,255,0.5)] hover:text-white transition-colors p-1"
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Content with smooth transition */}
            <AnimatePresence mode="wait">
              {!isMinimized && (
                <motion.div 
                  className="p-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <StrategyVisualizer config={config} />
                </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      );
    } else {
      // Inline mode (within chat messages) - not recommended but available
      return (
        <div className="my-4">
          <StrategyVisualizer config={config} />
        </div>
      );
    }

  // Fallback - should not reach here
  return null;
}

/**
 * Hook to manage animation state in your chat interface
 * 
 * Usage:
 * ```tsx
 * const { currentAnimation, updateAnimation, clearAnimation, updateCount } = useStrategyAnimation();
 * 
 * // When Claude responds with animation config:
 * updateAnimation(parsedConfig);
 * 
 * // Clear when starting new conversation:
 * clearAnimation();
 * ```
 */
export function useStrategyAnimation() {
  const [currentAnimation, setCurrentAnimation] = useState<AnimationConfig | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [previousType, setPreviousType] = useState<string | null>(null);
  const { userId } = useUser();

  const updateAnimation = useCallback((config: AnimationConfig) => {
    // Log animation update if type changed
    if (userId && previousType && previousType !== config.type) {
      logAnimationEvent(userId, 'animation_updated', {
        old_type: previousType,
        new_type: config.type,
        update_count: updateCount + 1,
      });
    }
    
    setCurrentAnimation(config);
    setPreviousType(config.type);
    setUpdateCount(c => c + 1);
  }, [userId, previousType, updateCount]);

  const clearAnimation = useCallback(() => {
    setCurrentAnimation(null);
    setUpdateCount(0);
    setPreviousType(null);
  }, []);

  return {
    currentAnimation,
    updateAnimation,
    clearAnimation,
    updateCount,
  };
}
