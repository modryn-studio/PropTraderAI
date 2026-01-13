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
import type { PrefilledData } from './types';

interface ToolsManagerProps {
  activeTool: ActiveTool | null;
  onToolComplete: (toolType: ToolType, values: Record<string, unknown>) => void;
  onToolDismiss: (toolType: ToolType) => void;
  /** Values from previously completed tools in this conversation - enables cross-tool data flow */
  previousToolValues?: Partial<PrefilledData>;
}

/**
 * Manages which tool is currently active and handles completion/dismissal.
 * Supports cross-tool data flow via previousToolValues prop.
 * 
 * Usage in ChatInterface:
 * ```tsx
 * <ToolsManager
 *   activeTool={activeTool}
 *   onToolComplete={handleToolComplete}
 *   onToolDismiss={handleToolDismiss}
 *   previousToolValues={completedToolValues}
 * />
 * ```
 */
export default function ToolsManager({
  activeTool,
  onToolComplete,
  onToolDismiss,
  previousToolValues = {},
}: ToolsManagerProps) {
  // Track collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Merge previous tool values into prefilled data for cross-tool data flow
  const enrichedPrefilledData = activeTool ? {
    ...activeTool.prefilledData,
    ...previousToolValues,
  } : {};
  
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
          prefilledData={enrichedPrefilledData}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      );
      
    case 'contract_selector':
      return (
        <ContractSelector
          prefilledData={enrichedPrefilledData}
          riskAmount={previousToolValues.riskAmount}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      );
      
    case 'drawdown_visualizer':
      return (
        <DrawdownVisualizer
          prefilledData={enrichedPrefilledData}
          riskPerTrade={previousToolValues.riskAmount}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      );
      
    case 'stop_loss_calculator':
      return (
        <StopLossCalculator
          prefilledData={enrichedPrefilledData}
          instrument={previousToolValues.instrument}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      );
      
    case 'timeframe_helper':
      return (
        <TimeframeHelper
          prefilledData={enrichedPrefilledData}
          userTimezone={previousToolValues.timezone}
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
