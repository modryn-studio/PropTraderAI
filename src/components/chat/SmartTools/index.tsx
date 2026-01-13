'use client';

/**
 * Smart Tools Manager
 * 
 * Routes to the appropriate tool component based on tool type.
 * Handles tool lifecycle: show → interact → complete/dismiss.
 * 
 * Created: January 13, 2026
 * Updated: January 13, 2026 - Added 4 remaining tools
 */

import React, { useCallback, useState } from 'react';
import type { ToolType } from '@/lib/utils/toolDetection';
import type { ActiveTool } from './types';
import PositionSizeCalculator from './PositionSizeCalculator';
import ContractSelector from './ContractSelector';
import DrawdownVisualizer from './DrawdownVisualizer';
import StopLossCalculator from './StopLossCalculator';
import TimeframeHelper from './TimeframeHelper';

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
      return (
        <ContractSelector
          prefilledData={activeTool.prefilledData}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      );
      
    case 'drawdown_visualizer':
      return (
        <DrawdownVisualizer
          prefilledData={activeTool.prefilledData}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      );
      
    case 'stop_loss_calculator':
      return (
        <StopLossCalculator
          prefilledData={activeTool.prefilledData}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      );
      
    case 'timeframe_helper':
      return (
        <TimeframeHelper
          prefilledData={activeTool.prefilledData}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      );
      
    default:
      return null;
  }
}

// Export ActiveTool type for use in ChatInterface
export type { ActiveTool };
