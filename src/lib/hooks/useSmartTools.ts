'use client';

/**
 * useSmartTools Hook
 * 
 * Manages Smart Tool state and handlers for the Strategy Builder.
 * Extracts tool logic from ChatInterface for better maintainability.
 * 
 * Part of: TOKEN SAVINGS INITIATIVE
 * Created: January 13, 2026
 */

import { useState, useCallback } from 'react';
import { logBehavioralEvent } from '@/lib/behavioral/logger';
import { formatToolResponse, type ToolType } from '@/lib/utils/toolDetection';
import type { ActiveTool } from '@/components/chat/SmartTools/types';

interface UseSmartToolsProps {
  userId: string;
  conversationId: string | null;
  onSendMessage: (message: string) => Promise<void>;
}

interface UseSmartToolsReturn {
  /** Currently active tool (or null if none) */
  activeTool: ActiveTool | null;
  
  /** Track which tools have been shown to prevent duplicates */
  toolsShown: ToolType[];
  
  /** Set the active tool (called from SSE handler) */
  setActiveTool: React.Dispatch<React.SetStateAction<ActiveTool | null>>;
  
  /** Add a tool type to the shown list */
  markToolShown: (toolType: ToolType) => void;
  
  /** Handle tool completion - formats response and sends to chat */
  handleToolComplete: (toolType: ToolType, values: Record<string, unknown>) => Promise<void>;
  
  /** Handle tool dismissal - user chose to type instead */
  handleToolDismiss: (toolType: ToolType) => Promise<void>;
  
  /** Clear active tool (e.g., when editing messages) */
  clearActiveTool: () => void;
  
  /** Reset all tool state (e.g., when starting new conversation) */
  resetToolState: () => void;
}

/**
 * Hook for managing Smart Tool state in the Strategy Builder.
 * 
 * @description Encapsulates all Smart Tool logic:
 * - State management (activeTool, toolsShown)
 * - Event handlers (complete, dismiss)
 * - Behavioral logging for PATH 2 analytics
 * - Tool response formatting
 * 
 * @param props.userId - Current user's ID for behavioral logging
 * @param props.conversationId - Current conversation ID (can be null)
 * @param props.onSendMessage - Function to send a message to the chat
 * 
 * @example
 * const { activeTool, handleToolComplete, handleToolDismiss } = useSmartTools({
 *   userId,
 *   conversationId,
 *   onSendMessage: handleSendMessage
 * });
 */
export function useSmartTools({
  userId,
  conversationId,
  onSendMessage,
}: UseSmartToolsProps): UseSmartToolsReturn {
  // State
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null);
  const [toolsShown, setToolsShown] = useState<ToolType[]>([]);

  // Mark a tool as shown
  const markToolShown = useCallback((toolType: ToolType) => {
    setToolsShown(prev => 
      prev.includes(toolType) ? prev : [...prev, toolType]
    );
  }, []);

  // Handle tool completion
  const handleToolComplete = useCallback(async (
    toolType: ToolType, 
    values: Record<string, unknown>
  ) => {
    console.log('[Smart Tool] Completed:', toolType, values);
    
    // Format tool response as natural language
    const { message: toolMessage } = formatToolResponse(toolType, values);
    
    // Log behavioral event
    await logBehavioralEvent(
      userId,
      'smart_tool_completed',
      {
        conversationId,
        toolType,
        values,
        // TODO: Track actual time spent in tool
        timeSpent: 0,
      }
    );
    
    // Collapse the tool (keep showing summary)
    setActiveTool(prev => prev 
      ? { ...prev, isCollapsed: true, completedValues: values } 
      : null
    );
    
    // Send the formatted response as a new user message
    await onSendMessage(toolMessage);
  }, [userId, conversationId, onSendMessage]);

  // Handle tool dismissal
  const handleToolDismiss = useCallback(async (toolType: ToolType) => {
    console.log('[Smart Tool] Dismissed:', toolType);
    
    // Log behavioral event
    await logBehavioralEvent(
      userId,
      'smart_tool_dismissed',
      {
        conversationId,
        toolType,
        reason: 'user_clicked_type_instead',
      }
    );
    
    // Hide the tool
    setActiveTool(null);
  }, [userId, conversationId]);

  // Clear active tool (e.g., when editing messages)
  const clearActiveTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  // Reset all tool state
  const resetToolState = useCallback(() => {
    setActiveTool(null);
    setToolsShown([]);
  }, []);

  return {
    activeTool,
    toolsShown,
    setActiveTool,
    markToolShown,
    handleToolComplete,
    handleToolDismiss,
    clearActiveTool,
    resetToolState,
  };
}

export default useSmartTools;
