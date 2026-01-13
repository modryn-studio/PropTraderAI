'use client';

/**
 * Smart Tools Manager
 * 
 * Routes to the appropriate tool component based on tool type.
 * Handles tool lifecycle: show → interact → complete/dismiss.
 * 
 * Created: January 13, 2026
 */

import React, { useCallback, useState } from 'react';
import type { ToolType } from '@/lib/utils/toolDetection';
import type { ActiveTool } from './types';
import PositionSizeCalculator from './PositionSizeCalculator';

interface ToolsManagerProps {
  activeTool: ActiveTool | null;
  onToolComplete: (toolType: ToolType, values: Record<string, unknown>) => void;
  onToolDismiss: (toolType: ToolType) => void;
}

/**
 * Manages which tool is currently active and handles completion/dismissal.
 * 
 * Usage in ChatInterface:
 * ```tsx
 * <ToolsManager
 *   activeTool={activeTool}
 *   onToolComplete={handleToolComplete}
 *   onToolDismiss={handleToolDismiss}
 * />
 * ```
 */
export default function ToolsManager({
  activeTool,
  onToolComplete,
  onToolDismiss,
}: ToolsManagerProps) {
  // Track collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);
  
  const handleComplete = useCallback((values: Record<string, unknown>) => {
    if (activeTool) {
      setIsCollapsed(true); // Collapse after completion
      onToolComplete(activeTool.type, values);
    }
  }, [activeTool, onToolComplete]);
  
  const handleDismiss = useCallback(() => {
    if (activeTool) {
      onToolDismiss(activeTool.type);
    }
  }, [activeTool, onToolDismiss]);

  // No active tool
  if (!activeTool) {
    return null;
  }

  // Route to appropriate tool component
  switch (activeTool.type) {
    case 'position_size_calculator':
      return (
        <PositionSizeCalculator
          prefilledData={activeTool.prefilledData}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      );
      
    case 'contract_selector':
      // TODO: Implement ContractSelector component
      return (
        <div className="my-4 p-4 bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg">
          <p className="text-sm text-[rgba(255,255,255,0.5)]">
            Contract Selector (coming soon)
          </p>
          <button
            onClick={handleDismiss}
            className="mt-2 text-xs text-[#00ff41] hover:underline"
          >
            Dismiss
          </button>
        </div>
      );
      
    case 'drawdown_visualizer':
      // TODO: Implement DrawdownVisualizer component
      return (
        <div className="my-4 p-4 bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg">
          <p className="text-sm text-[rgba(255,255,255,0.5)]">
            Drawdown Visualizer (coming soon)
          </p>
          <button
            onClick={handleDismiss}
            className="mt-2 text-xs text-[#00ff41] hover:underline"
          >
            Dismiss
          </button>
        </div>
      );
      
    case 'stop_loss_calculator':
      // TODO: Implement StopLossCalculator component
      return (
        <div className="my-4 p-4 bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg">
          <p className="text-sm text-[rgba(255,255,255,0.5)]">
            Stop Loss Calculator (coming soon)
          </p>
          <button
            onClick={handleDismiss}
            className="mt-2 text-xs text-[#00ff41] hover:underline"
          >
            Dismiss
          </button>
        </div>
      );
      
    case 'timeframe_helper':
      // TODO: Implement TimeframeHelper component
      return (
        <div className="my-4 p-4 bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg">
          <p className="text-sm text-[rgba(255,255,255,0.5)]">
            Timeframe Helper (coming soon)
          </p>
          <button
            onClick={handleDismiss}
            className="mt-2 text-xs text-[#00ff41] hover:underline"
          >
            Dismiss
          </button>
        </div>
      );
      
    default:
      return null;
  }
}

// Export ActiveTool type for use in ChatInterface
export type { ActiveTool };
