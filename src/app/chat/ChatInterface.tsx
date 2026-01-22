'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/sonner';
import ChatMessageList, { ChatMessage } from '@/components/chat/ChatMessageList';
import ChatInput from '@/components/chat/ChatInput';
import StrategyConfirmationCard from '@/components/chat/StrategyConfirmationCard';
import ValidationWarningsModal, { ValidationWarning } from '@/components/chat/ValidationWarningsModal';
import { ParsedRules, ConversationMessage } from '@/lib/claude/client';
import { logBehavioralEvent } from '@/lib/behavioral/logger';
import { 
  extractTimezoneFromConversation, 
  processTimezones, 
  formatConversionSummary 
} from '@/lib/utils/timezoneProcessor';
import { AnimationConfig, tryExtractFromStream } from '@/components/strategy-animation';
import { shouldExpectAnimation } from '@/lib/claude/promptManager';
import { logAnimationGenerated } from '@/lib/behavioral/animationLogger';
import { cn } from '@/lib/utils';
import StrategySummaryPanel, { StrategyRule } from '@/components/strategy/StrategySummaryPanel';
import StrategyReadinessGate, { type GateMode } from '@/components/strategy/StrategyReadinessGate';
import StrategyPreviewCard from '@/components/strategy/StrategyPreviewCard';
import { validateStrategy, type ValidationResult } from '@/lib/strategy/strategyValidator';
import { useResponsiveBreakpoints } from '@/lib/hooks/useResponsiveBreakpoints';
import { 
  extractFromMessage,
  mapParsedRulesToStrategyRules,
  accumulateRules
} from '@/lib/utils/ruleExtractor';
import { 
  detectAnimationTrigger, 
  saveAnimationPreference,
  loadAnimationPreference 
} from '@/lib/utils/animationTriggers';
import ToolsManager from '@/components/chat/SmartTools';
import type { ActiveTool } from '@/components/chat/SmartTools/types';
import { formatToolResponse, type ToolType } from '@/lib/utils/toolDetection';
import { FEATURES } from '@/config/features';
import StrategyEditableCard from '@/components/strategy/StrategyEditableCard';
import { StrategySwipeableCards, ReviewAllModal, ParameterEditModal } from '@/components/strategy/mobile';
import { PatternConfirmation, UnsupportedPattern } from '@/components/strategy/PatternConfirmation';
import { MissingFieldPrompt } from '@/components/strategy/MissingFieldPrompt';
import { validatePattern, detectsVWAP, getAlternativePatterns, type FieldInfo } from '@/lib/strategy/validateAgainstCanonical';
import type { SupportedPattern } from '@/lib/execution/canonical-schema';

/**
 * Issue #47 Week 4: Unified endpoint - no more A/B routing
 * The unified /api/strategy/build endpoint is now the only endpoint
 */
const STRATEGY_BUILD_ENDPOINT = '/api/strategy/build';

function getStrategyBuildEndpoint(): string {
  return STRATEGY_BUILD_ENDPOINT;
}

/**
 * Issue #49: Build conversation history for tool-choice extraction
 * This preserves context from earlier messages (e.g., "ES" from message 1)
 */
function buildConversationHistory(messages: ChatMessage[]): ConversationMessage[] {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp,
    }));
}

interface ChatInterfaceProps {
  userId: string;
  userStrategyCount: number;
  userProfile: {
    firm_name: string | null;
    account_size: number | null;
    account_type: string | null;
    timezone: string | null;
  } | null;
  existingConversation: {
    id: string;
    messages: ConversationMessage[];
  } | null;
}

interface StrategyData {
  strategyName: string;
  summary: string;
  parsedRules: ParsedRules;
  instrument: string;
}

export default function ChatInterface({
  userId,
  userStrategyCount,
  userProfile,
  existingConversation,
}: ChatInterfaceProps) {
  const router = useRouter();
  
  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(
    existingConversation?.id || null
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    existingConversation?.messages.map((msg, i) => ({
      id: `existing-${i}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    })) || []
  );
  
  // UI state
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  
  // Validation modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [validationIsValid, setValidationIsValid] = useState(true);
  const [pendingStrategyName, setPendingStrategyName] = useState<string | null>(null);
  
  // Strategy completion state
  const [strategyComplete, setStrategyComplete] = useState(false);
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [currentStrategyCount, setCurrentStrategyCount] = useState(userStrategyCount);
  const [timezoneConversionSummary, setTimezoneConversionSummary] = useState<string>('');

  // Track the full conversation text for saving
  const [fullConversationText, setFullConversationText] = useState('');
  
  // Animation state for strategy visualization
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  
  // Summary Panel state (V2: single accumulated state)
  const [accumulatedRules, setAccumulatedRules] = useState<StrategyRule[]>([]);
  
  // Validation state (from StrategySummaryPanel)
  const [currentValidation, setCurrentValidation] = useState<ValidationResult | null>(null);
  
  // Readiness Gate state
  const [showReadinessGate, setShowReadinessGate] = useState(false);
  const [gateMode, setGateMode] = useState<GateMode>('save');
  
  // Animation expand/collapse state (controlled by Summary Panel)
  const [isAnimationExpanded, setIsAnimationExpanded] = useState(false);
  const [wasAnimationManuallySet, setWasAnimationManuallySet] = useState(false);
  
  // Strategy status for smart tools gating
  // 'building' = in progress, hide refinement tools
  // 'saved' = complete, show all tools for optional refinement
  const [strategyStatus, setStrategyStatus] = useState<'building' | 'saved'>('building');
  
  // Completeness tracking for quick-save preview card
  const [currentCompleteness, setCurrentCompleteness] = useState(0);
  const [showPreviewCard, setShowPreviewCard] = useState(false);
  
  // Rapid flow tracking for analytics
  const [expertiseData, setExpertiseData] = useState<{
    level: 'beginner' | 'intermediate' | 'advanced';
    questionCount: number;
    initialCompleteness: number;
    approach: string;
  } | null>(null);
  
  // Log strategy status for debugging (prevents unused warning)
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[StrategyStatus]', strategyStatus);
  }
  const { isMobile, defaultAnimationExpanded, animationAutoExpandable } = useResponsiveBreakpoints();
  
  // Smart Tools state
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null);
  const [toolsShown, setToolsShown] = useState<ToolType[]>([]);
  
  // Rapid Flow state (Week 2 implementation)
  // Issue #47 Week 4: Rapid flow is now the ONLY flow - no more A/B testing
  // const { flags } = useFeatureFlags(); // Removed - no longer needed
  
  // Check URL for legacy mode override (dev testing only: ?legacy=true)
  // NOTE: Legacy mode is deprecated - endpoint deleted in Issue #47 Week 4
  const searchParams = useSearchParams();
  const forceLegacy = searchParams.get('legacy') === 'true';
  
  // Issue #47 Week 4: Rapid flow is always enabled now
  // forceLegacy is kept for debugging but will just fail gracefully
  const useRapidFlow = !forceLegacy;
  
  // PHASE 1 FIX: Explicit conversation state for rapid flow
  type ConversationMode = 'initial' | 'answering_question';
  type QuestionType = 'stopLoss' | 'instrument' | 'entryTrigger' | 'direction' | 'profitTarget' | 'positionSizing';
  
  interface ConversationState {
    mode: ConversationMode;
    currentQuestion: {
      question: string;
      questionType: QuestionType;
      options: Array<{ value: string; label: string; default?: boolean }>;
      askedAt: string;
      showTextInput?: boolean;
    } | null;
  }
  
  const [conversationState, setConversationState] = useState<ConversationState>({
    mode: 'initial',
    currentQuestion: null,
  });
  
  // Critical question state (for rapid flow) - DEPRECATED: use conversationState instead
  // Keeping for backward compatibility during transition
  const [criticalQuestion, setCriticalQuestion] = useState<{
    question: string;
    questionType: QuestionType;
    options: Array<{ value: string; label: string; default?: boolean }>;
    partialStrategy: {
      rules: StrategyRule[];
      pattern?: string;
      instrument?: string;
    };
  } | null>(null);
  
  // Generated strategy state (for rapid flow complete)
  const [generatedStrategy, setGeneratedStrategy] = useState<{
    id: string;
    name: string;
    natural_language: string;
    parsed_rules: StrategyRule[];
    pattern?: string;
    instrument?: string;
  } | null>(null);
  
  // Original message for re-processing after pattern confirmation (Issue #44/#46)
  const [rapidFlowOriginalMessage, setRapidFlowOriginalMessage] = useState<string>('');
  
  // Mobile swipeable cards state (Week 3-4, Issue #7)
  const [mobileConfirmedParams, setMobileConfirmedParams] = useState<Set<number>>(new Set());
  const [mobileCardIndex, setMobileCardIndex] = useState(0);
  const [showReviewAllModal, setShowReviewAllModal] = useState(false);
  
  // Bug #5: iOS keyboard height for proper message scrolling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Parameter edit modal state (Week 5-6, Issue #7)
  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);
  const editingParam = editingParamIndex !== null && generatedStrategy 
    ? generatedStrategy.parsed_rules[editingParamIndex] 
    : null;
  
  // Desktop: Panel visibility state (independent of strategy existence)
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  
  // Pattern confirmation flow state (Issue #44)
  const [patternConfirmationState, setPatternConfirmationState] = useState<{
    pending: boolean;
    detectedPattern: SupportedPattern | null;
    isUnsupported: boolean;
    unsupportedName?: string;
    missingFields: FieldInfo[];
    showMissingFields: boolean;
  }>({
    pending: false,
    detectedPattern: null,
    isUnsupported: false,
    missingFields: [],
    showMissingFields: false,
  });
  
  // AbortController for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // ESC to go back (power user keyboard shortcut) or close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      // ESC closes panel if it's open (desktop only)
      if (e.key === 'Escape' && !isMobile && generatedStrategy && isPanelVisible) {
        setIsPanelVisible(false);
        return;
      }
      // Otherwise ESC goes back to dashboard
      if (e.key === 'Escape' && !strategyComplete) {
        router.push('/dashboard');
      }
    };
    window.addEventListener('keydown', handleEscape);
    
    // Cleanup on unmount
    return () => {
      // Abort any in-flight streaming request to prevent memory leak
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      window.removeEventListener('keydown', handleEscape);
      setAnimationConfig(null);
    };
  }, [router, strategyComplete, isMobile, generatedStrategy, isPanelVisible]);

  // Load saved animation preference when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      const pref = loadAnimationPreference(conversationId);
      if (pref) {
        setIsAnimationExpanded(pref.isExpanded);
        setWasAnimationManuallySet(pref.wasManuallySet);
      } else {
        // Default based on screen size
        setIsAnimationExpanded(defaultAnimationExpanded);
        setWasAnimationManuallySet(false);
      }
    }
  }, [conversationId, defaultAnimationExpanded]);

  // Handle animation toggle from Summary Panel
  const handleToggleAnimation = useCallback(() => {
    const newValue = !isAnimationExpanded;
    setIsAnimationExpanded(newValue);
    setWasAnimationManuallySet(true);
    
    if (conversationId) {
      saveAnimationPreference(conversationId, newValue, true);
    }
  }, [isAnimationExpanded, conversationId]);

  // Auto-expand animation at key moments (only if not manually set)
  const handleAnimationAutoExpand = useCallback((shouldExpand: boolean) => {
    if (!wasAnimationManuallySet && animationAutoExpandable && shouldExpand) {
      setIsAnimationExpanded(true);
      if (conversationId) {
        saveAnimationPreference(conversationId, true, false);
      }
    }
  }, [wasAnimationManuallySet, animationAutoExpandable, conversationId]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setPendingMessage(null);
    }
  }, []);

  // ============================================================================
  // RAPID FLOW HANDLERS (Week 2 Implementation)
  // ============================================================================

  /**
   * Handle critical question answer (rapid flow message 2)
   */
  const handleCriticalAnswer = useCallback(async (value: string) => {
    if (!criticalQuestion) return;
    
    // Bug #4: Clear any previous errors from rapid flow
    setError(null);

    // Use the value as-is (could be from button click or typed text)
    const matchingOption = criticalQuestion.options.find(o => o.value === value);
    const answerLabel = matchingOption?.label || value;
    
    // Add user's answer to chat
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: answerLabel,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // PHASE 1 FIX: Store current question context before making API call
    const currentQuestionContext = {
      questionType: criticalQuestion.questionType,
      partialStrategy: criticalQuestion.partialStrategy,
    };

    try {
      // Issue #49: Include conversation history for tool-choice extraction
      const conversationHistory = buildConversationHistory(messages);
      
      const response = await fetch(getStrategyBuildEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: answerLabel,
          conversationId,
          conversationHistory,
          criticalAnswer: {
            questionType: currentQuestionContext.questionType,
            value,
          },
          partialStrategy: currentQuestionContext.partialStrategy,
        }),
      });

      const data = await response.json();

      // PHASE 1 FIX: Handle both critical_question and strategy_complete responses
      if (data.type === 'critical_question') {
        // Another question needed - update state with new question
        setCriticalQuestion({
          question: data.question,
          questionType: data.questionType,
          options: data.options,
          partialStrategy: data.partialStrategy,
        });
        
        // Add question to chat history for visibility
        setMessages(prev => [...prev, {
          id: `question-${Date.now()}`,
          role: 'assistant',
          content: data.question,
        }]);
        
        // Update conversation state
        setConversationState({
          mode: 'answering_question',
          currentQuestion: {
            question: data.question,
            questionType: data.questionType,
            options: data.options,
            askedAt: new Date().toISOString(),
          },
        });

        // Set conversation ID if not already set
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Log that another question was asked
        await logBehavioralEvent(
          userId,
          'critical_question_followup',
          {
            conversationId: data.conversationId,
            previousQuestionType: currentQuestionContext.questionType,
            nextQuestionType: data.questionType,
            pattern: data.partialStrategy.pattern,
          }
        );
      } else if (data.type === 'strategy_complete') {
        // Strategy generation complete - but first validate pattern (Issue #44)
        const strategy = data.strategy;
        const detectedPattern = strategy.pattern as SupportedPattern | undefined;
        
        // Check for unsupported patterns (VWAP, etc.)
        if (detectsVWAP({ pattern: detectedPattern || 'unknown' } as never)) {
          setPatternConfirmationState({
            pending: true,
            detectedPattern: null,
            isUnsupported: true,
            unsupportedName: strategy.pattern || 'VWAP',
            missingFields: [],
            showMissingFields: false,
          });
          
          // Store strategy for later use after pattern selection
          setGeneratedStrategy(strategy);
          
          // Add guidance message
          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: 'This pattern isn\'t supported yet. Choose an alternative:',
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMsg]);
          return;
        }
        
        // Validate pattern against canonical schema
        if (detectedPattern) {
          const validation = validatePattern({ pattern: detectedPattern } as never);
          
          if (validation.missingFields.length > 0) {
            // Show pattern confirmation first, then missing fields
            setPatternConfirmationState({
              pending: true,
              detectedPattern,
              isUnsupported: false,
              missingFields: validation.missingFields,
              showMissingFields: false, // Will be true after pattern confirmed
            });
            
            setGeneratedStrategy(strategy);
            setIsPanelVisible(true);
            
            // Add confirmation message
            const assistantMsg: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: `I've detected a **${detectedPattern.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}** pattern. Please confirm:`,
              timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, assistantMsg]);
            return;
          }
        }
        
        // No missing fields - proceed directly
        setGeneratedStrategy(strategy);
        setIsPanelVisible(true); // Show panel when new strategy generated
        
        // Clear question state since we're done
        setCriticalQuestion(null);
        setConversationState({
          mode: 'initial',
          currentQuestion: null,
        });

        // Add confirmation message
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Strategy created! Review and edit below:',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);

        // Set conversation ID from response
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Log completion
        await logBehavioralEvent(
          userId,
          'rapid_flow_completed',
          {
            conversationId: data.conversationId,
            messageCount: messages.length + 1,
            defaultsApplied: data.defaultsApplied || [],
          }
        );
      } else if (data.type === 'error') {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('[RapidFlow] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      
      // Add context-aware error message to chat
      let userFriendlyError = 'Sorry, something went wrong. Please try again.';
      
      // Provide specific guidance based on error context
      if (criticalQuestion) {
        const questionType = criticalQuestion.questionType;
        if (questionType === 'instrument') {
          userFriendlyError = 'I had trouble understanding that instrument. Could you provide more details? (e.g., "NQ" or "E-mini Nasdaq")';
        } else if (questionType === 'stopLoss' || questionType === 'profitTarget') {
          userFriendlyError = 'I couldn\'t process that answer. Try selecting one of the options or describing your exit strategy in more detail.';
        } else if (questionType === 'entryTrigger') {
          userFriendlyError = 'I need more clarity on your entry setup. Could you describe what signals you look for before entering a trade?';
        } else {
          userFriendlyError = 'That answer seems unclear. Could you provide more details or try selecting one of the suggested options?';
        }
      }
      
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: userFriendlyError,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
      
      // PHASE 1 FIX: Don't clear question on error - let user retry
    } finally {
      setIsLoading(false);
    }
  }, [criticalQuestion, conversationId, userId, messages]);

  /**
   * Handle rapid flow message (generate-first approach)
   */
  const handleRapidFlowMessage = useCallback(async (message: string) => {
    // Optimistic UI: show user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      // Issue #49: Include conversation history for tool-choice extraction
      // This enables Claude to preserve context across messages (e.g., "ES" from message 1)
      const conversationHistory = buildConversationHistory(messages);
      
      const response = await fetch(getStrategyBuildEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (data.type === 'critical_question') {
        // Need stop loss or other critical param
        setCriticalQuestion({
          question: data.question,
          questionType: data.questionType,
          options: data.options,
          partialStrategy: data.partialStrategy,
        });

        // Add question to chat history for visibility
        setMessages(prev => [...prev, {
          id: `question-${Date.now()}`,
          role: 'assistant',
          content: data.question,
        }]);

        // Set conversation ID from response
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Log critical question shown
        await logBehavioralEvent(
          userId,
          'critical_question_shown',
          {
            conversationId: data.conversationId,
            questionType: data.questionType,
            pattern: data.partialStrategy.pattern,
          }
        );
      } else if (data.type === 'pattern_detected') {
        // ====================================================================
        // PATTERN DETECTED (Issue #44/#46) - Show PatternConfirmation component
        // ====================================================================
        
        // Check if it's VWAP (unsupported in Phase 1)
        const isVWAP = data.pattern === 'vwap';
        
        if (isVWAP) {
          setPatternConfirmationState({
            pending: true,
            detectedPattern: null,
            isUnsupported: true,
            unsupportedName: 'VWAP',
            missingFields: [],
            showMissingFields: false,
          });
        } else {
          setPatternConfirmationState({
            pending: true,
            detectedPattern: data.pattern as SupportedPattern,
            isUnsupported: false,
            missingFields: [],
            showMissingFields: false,
          });
        }
        
        // Store original message for re-processing after confirmation
        setRapidFlowOriginalMessage(data.originalMessage);
        
        // Add pattern confirmation message to chat
        const patternMessage: ChatMessage = {
          id: `pattern-${Date.now()}`,
          role: 'assistant',
          content: isVWAP 
            ? `**VWAP** — coming in Phase 2. Choose from our supported patterns.`
            : `**${data.patternName}** — building with smart defaults.`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, patternMessage]);

        // Set conversation ID from response
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Log pattern detection
        await logBehavioralEvent(
          userId,
          'pattern_confirmation_shown',
          {
            conversationId: data.conversationId,
            pattern: data.pattern,
            patternName: data.patternName,
            isUnsupported: isVWAP,
          }
        );
      } else if (data.type === 'strategy_complete') {
        // Strategy generated without questions!
        setGeneratedStrategy(data.strategy);
        setIsPanelVisible(true); // Show panel when new strategy generated

        // Add confirmation message
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Strategy created! Review and edit below:',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);

        // Set conversation ID from response
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Log completion
        await logBehavioralEvent(
          userId,
          'rapid_flow_completed',
          {
            conversationId: data.conversationId,
            messageCount: 1,
            defaultsApplied: data.defaultsApplied || [],
          }
        );
      } else if (data.type === 'error') {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('[RapidFlow] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      
      // Add context-aware error message to chat
      let userFriendlyError = 'Sorry, something went wrong. Please try again.';
      
      // Check if error is about incomplete strategy
      if (errorMessage.includes('describe your trading strategy') || errorMessage.includes('not enough information')) {
        userFriendlyError = 'That seems too brief. Could you describe your trading setup in more detail? Include what you trade and when you enter trades.';
      } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        userFriendlyError = 'I couldn\'t validate that strategy. Please make sure to include your entry setup, stop loss, and what instrument you trade.';
      }
      
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: userFriendlyError,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, userId, messages]);

  // ============================================================================
  // MAIN MESSAGE HANDLER (Routes between rapid flow and traditional)
  // ============================================================================

  const handleSendMessage = useCallback(async (message: string) => {
    // Debug logging
    console.log('[ChatInterface] handleSendMessage called', {
      message,
      useRapidFlow,
      generatedStrategy: !!generatedStrategy,
      criticalQuestion: !!criticalQuestion,
      conversationState,
      forceLegacy,
    });

    // PHASE 1 FIX: Check conversation state first
    // If we're in "answering_question" mode, treat ANY input as answer to that question
    if (conversationState.mode === 'answering_question' && criticalQuestion) {
      console.log('[ChatInterface] ✅ In answering mode - routing to CRITICAL ANSWER');
      return handleCriticalAnswer(message);
    }

    // Legacy check: If there's a critical question, treat this as an answer to it
    if (criticalQuestion) {
      console.log('[ChatInterface] ✅ Legacy check - routing to CRITICAL ANSWER');
      return handleCriticalAnswer(message);
    }

    // Route to rapid flow if enabled
    if (useRapidFlow && !generatedStrategy) {
      console.log('[ChatInterface] ✅ Routing to RAPID FLOW');
      return handleRapidFlowMessage(message);
    }

    console.log('[ChatInterface] ❌ Routing to TRADITIONAL flow');
    // Traditional Socratic flow continues below...
    // Optimistic UI: show user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    
    // NOTE: Rule extraction is now handled solely by server-driven rule_update events
    // to avoid race conditions (previously extracted here AND from server events)
    
    setIsLoading(true);
    setError(null);

    // Abort previous request if still running (prevent memory leak)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Prepare assistant message that will be streamed
    const assistantMsgId = `assistant-${Date.now()}`;
    let streamedContent = '';

    try {
      const response = await fetch('/api/strategy/parse-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId,
          toolsShown, // Pass tools already shown to prevent duplicates
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Add empty assistant message that will be updated
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }]);
      setPendingMessage(null);
      setIsLoading(false); // Hide "Thinking..." as soon as streaming starts

      let buffer = '';
      
      // Track whether we should look for animation in this response
      const conversationForPrompt = messages.map(m => ({ role: m.role, content: m.content }));
      conversationForPrompt.push({ role: 'user', content: message });
      const expectAnimation = shouldExpectAnimation(conversationForPrompt);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);

              if (data.type === 'text') {
                // Update streamed content
                streamedContent += data.content;
                
                // Always try to extract and clean animation markers from display
                const extracted = tryExtractFromStream(streamedContent);
                const displayText = extracted.cleanText; // This removes markers even if config not yet extracted
                
                // Set animation config if successfully extracted and not already set
                if (expectAnimation && extracted.extractedSuccessfully && extracted.config && !animationConfig) {
                  setAnimationConfig(extracted.config);
                  const sessionTime = Date.now() - sessionStartRef.current;
                  logAnimationGenerated(userId, extracted.config, sessionTime).catch(console.error);
                  
                  // Check for animation auto-expand trigger in response
                  const triggerResult = detectAnimationTrigger(streamedContent);
                  if (triggerResult.shouldExpand) {
                    handleAnimationAutoExpand(true);
                  }
                }
                
                // Rule extraction now handled by update_rule tool (no regex parsing needed)
                
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMsgId 
                    ? { ...msg, content: displayText }
                    : msg
                ));
              } else if (data.type === 'metadata') {
                // Expertise detection metadata from backend (first message only)
                // Log for analytics - frontend doesn't need to display this
                console.log('[Expertise] Detected:', {
                  level: data.expertiseLevel,
                  questionCount: data.questionCount,
                  completeness: data.completeness,
                  detectedComponents: data.detectedComponents,
                });
                
                // Store expertise data for rapid flow tracking
                if (data.expertiseLevel && !expertiseData) {
                  setExpertiseData({
                    level: data.expertiseLevel,
                    questionCount: data.questionCount || 0,
                    initialCompleteness: typeof data.completeness === 'number' ? data.completeness / 100 : 0,
                    approach: data.approach || 'unknown',
                  });
                }
                
                // Store completeness for preview card trigger
                if (typeof data.completeness === 'number') {
                  setCurrentCompleteness(data.completeness);
                  
                  // Show preview card if completeness >= 70% (ready for quick save)
                  if (data.completeness >= 70) {
                    setShowPreviewCard(true);
                  }
                }
              } else if (data.type === 'rule_update') {
                // Claude called update_rule tool - add to summary panel
                // Bug #8: Validate required fields AND category enum value
                const validCategories = ['setup', 'entry', 'exit', 'risk', 'timeframe', 'filters'];
                
                if (!data.rule?.category || !data.rule?.label || !data.rule?.value) {
                  console.warn('Invalid rule_update received (missing fields):', data);
                } else if (!validCategories.includes(data.rule.category)) {
                  console.warn('Invalid rule_update received (invalid category):', data.rule.category);
                } else {
                  const newRule: StrategyRule = {
                    category: data.rule.category as StrategyRule['category'],
                    label: data.rule.label,
                    value: data.rule.value,
                    // Include smart defaults metadata
                    isDefaulted: data.rule.isDefaulted || false,
                    explanation: data.rule.explanation,
                    source: data.rule.source || 'user',
                  };
                  
                  // Use existing accumulation logic
                  setAccumulatedRules(prev => accumulateRules(prev, [newRule]));
                  
                  // Note: Backend already logs 'rule_updated_via_tool' when emitting rule_update
                  // No need to log again here (would create duplicates)
                }
              } else if (data.type === 'tool') {
                // Smart Tool detected - show inline calculator
                if (data.toolType) {
                  console.log('[Smart Tool] Received tool event:', data.toolType);
                  
                  setActiveTool({
                    type: data.toolType,
                    prefilledData: data.prefilledData || {},
                    messageId: assistantMsgId,
                    isCollapsed: false,
                  });
                  
                  // Track that this tool has been shown
                  setToolsShown(prev => 
                    prev.includes(data.toolType) ? prev : [...prev, data.toolType]
                  );
                }
              } else if (data.type === 'template_offered') {
                // Template offered to frustrated user - add rules to summary panel
                console.log('[Template] Offered:', data.templateName);
                
                if (Array.isArray(data.rules)) {
                  const templateRules: StrategyRule[] = data.rules.map((r: {
                    category: string;
                    label: string;
                    value: string;
                    isDefaulted?: boolean;
                    explanation?: string;
                    source?: string;
                  }) => ({
                    category: r.category as StrategyRule['category'],
                    label: r.label,
                    value: r.value,
                    isDefaulted: r.isDefaulted ?? true,
                    explanation: r.explanation,
                    source: r.source || 'template',
                  }));
                  
                  setAccumulatedRules(prev => accumulateRules(prev, templateRules));
                  
                  // Set high completeness since template has all components
                  setCurrentCompleteness(100);
                  setShowPreviewCard(true);
                  
                  toast.success('Template loaded!', {
                    description: `${data.templateName} - ready to save or customize`,
                  });
                }
              } else if (data.type === 'complete') {
                // Update conversation ID if new
                if (!conversationId && data.conversationId) {
                  setConversationId(data.conversationId);
                }

                // Handle strategy completion
                if (data.complete) {
                  // Process timezone conversions
                  const userMessages = messages
                    .filter(msg => msg.role === 'user')
                    .map(msg => msg.content);
                  userMessages.push(message);
                  
                  const detectedTimezone = extractTimezoneFromConversation(userMessages);
                  const timezoneResult = processTimezones(data.parsedRules, {
                    userTimezone: detectedTimezone || undefined,
                    profileTimezone: (userProfile?.timezone as keyof typeof import('@/lib/utils/timezone').TRADER_TIMEZONES) || undefined,
                  });
                  
                  const summary = formatConversionSummary(timezoneResult);
                  setTimezoneConversionSummary(summary);
                  
                  if (timezoneResult.conversions.length > 0) {
                    await logBehavioralEvent(
                      userId,
                      'timezone_conversion_applied',
                      {
                        detectedTimezone,
                        conversions: timezoneResult.conversions,
                        warnings: timezoneResult.warnings,
                      }
                    );
                  }
                  
                  // Map final parsed rules to Summary Panel format
                  const finalRules = mapParsedRulesToStrategyRules(
                    timezoneResult.processedRules,
                    data.strategyName,
                    data.instrument
                  );
                  setAccumulatedRules(prev => accumulateRules(prev, finalRules));
                  
                  setStrategyComplete(true);
                  setStrategyData({
                    strategyName: data.strategyName,
                    summary: data.summary,
                    parsedRules: timezoneResult.processedRules,
                    instrument: data.instrument,
                  });
                }
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // Track conversation text for natural_language field
      setFullConversationText(prev => 
        prev + `User: ${message}\nAssistant: ${streamedContent}\n\n`
      );

    } catch (err) {
      // Ignore abort errors - user intentionally stopped generation
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      abortControllerRef.current = null;
      setPendingMessage(null);
      setIsLoading(false);
    }
  }, [conversationId, messages, userId, userProfile?.timezone, animationConfig, handleAnimationAutoExpand, toolsShown, expertiseData, useRapidFlow, generatedStrategy, handleRapidFlowMessage, criticalQuestion, handleCriticalAnswer, conversationState, forceLegacy]);

  // ========================================================================
  // PATTERN CONFIRMATION HANDLERS (Issue #44/#46)
  // ========================================================================
  
  const handlePatternConfirm = useCallback(async () => {
    // User confirmed the detected pattern - now build the strategy
    const confirmedPattern = patternConfirmationState.detectedPattern;
    
    if (!confirmedPattern) {
      console.error('[PatternConfirm] No pattern detected');
      return;
    }
    
    // Log confirmation
    await logBehavioralEvent(
      userId,
      'pattern_confirmed',
      {
        conversationId,
        pattern: confirmedPattern,
      }
    );
    
    // Reset pattern confirmation state
    setPatternConfirmationState({
      pending: false,
      detectedPattern: null,
      isUnsupported: false,
      missingFields: [],
      showMissingFields: false,
    });
    
    setIsLoading(true);
    
    try {
      // Issue #49: Include conversation history for tool-choice extraction
      const conversationHistory = buildConversationHistory(messages);
      
      // Continue to strategy builder with confirmed pattern
      // Send the original message again but this will now skip pattern detection
      // because we're confirming, and go to strategy generation
      const response = await fetch(getStrategyBuildEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Confirmed pattern: ${confirmedPattern}. Original: ${rapidFlowOriginalMessage}`,
          conversationId,
          conversationHistory,
          // Indicate this is a follow-up to skip pattern detection
          patternConfirmation: {
            confirmed: true,
            pattern: confirmedPattern,
          },
          criticalAnswer: {
            questionType: 'entryTrigger',
            value: confirmedPattern,
          },
          partialStrategy: {
            rules: [],
            pattern: confirmedPattern,
            instrument: undefined,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.type === 'strategy_complete') {
        setGeneratedStrategy(data.strategy);
        setIsPanelVisible(true);
        
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Strategy created! Review and edit below:',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        
        await logBehavioralEvent(
          userId,
          'rapid_flow_completed',
          {
            conversationId: data.conversationId,
            messageCount: 2,
            defaultsApplied: data.defaultsApplied || [],
            pattern: confirmedPattern,
          }
        );
      } else if (data.type === 'critical_question') {
        // Still need more info (e.g., stop loss)
        setCriticalQuestion({
          question: data.question,
          questionType: data.questionType,
          options: data.options,
          partialStrategy: data.partialStrategy,
        });
        
        setMessages(prev => [...prev, {
          id: `question-${Date.now()}`,
          role: 'assistant',
          content: data.question,
        }]);
      } else if (data.type === 'error') {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('[PatternConfirm] Error:', err);
      toast.error('Failed to build strategy. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [patternConfirmationState, userId, conversationId, rapidFlowOriginalMessage, messages]);
  
  const handlePatternChange = useCallback(() => {
    // Show pattern selector
    // This is already handled in PatternConfirmation component's internal state
    logBehavioralEvent(
      userId,
      'pattern_change_requested',
      {
        conversationId,
        originalPattern: patternConfirmationState.detectedPattern,
      }
    );
  }, [patternConfirmationState.detectedPattern, userId, conversationId]);
  
  const handlePatternSelect = useCallback(async (pattern: SupportedPattern) => {
    // User selected a different pattern (e.g., from VWAP alternatives)
    
    await logBehavioralEvent(
      userId,
      'pattern_selected',
      {
        conversationId,
        pattern,
        wasUnsupported: patternConfirmationState.isUnsupported,
      }
    );
    
    // Update state to show the selected pattern for confirmation
    setPatternConfirmationState({
      pending: true,
      detectedPattern: pattern,
      isUnsupported: false,
      missingFields: [],
      showMissingFields: false,
    });
    
    // If already have generated strategy, update it
    if (generatedStrategy) {
      setGeneratedStrategy(prev => prev ? { ...prev, pattern } : prev);
    }
  }, [generatedStrategy, userId, conversationId, patternConfirmationState.isUnsupported]);
  
  const handleMissingFieldsComplete = useCallback((values: Record<string, string | number>) => {
    // User provided missing field values
    if (generatedStrategy) {
      // Merge values into strategy rules
      const updatedRules = generatedStrategy.parsed_rules.map(rule => {
        const fieldKey = rule.label.toLowerCase().replace(/\s+/g, '_');
        if (values[fieldKey] !== undefined) {
          return { ...rule, value: String(values[fieldKey]), isDefaulted: false };
        }
        return rule;
      });
      
      setGeneratedStrategy(prev => prev ? { ...prev, parsed_rules: updatedRules } : prev);
    }
    
    // Clear confirmation state
    setPatternConfirmationState({
      pending: false,
      detectedPattern: null,
      isUnsupported: false,
      missingFields: [],
      showMissingFields: false,
    });
    
    logBehavioralEvent(
      userId,
      'missing_fields_completed',
      {
        conversationId,
        fields: Object.keys(values),
      }
    );
  }, [generatedStrategy, userId, conversationId]);

  // ========================================================================
  // SMART TOOL HANDLERS
  // ========================================================================
  
  const handleToolComplete = useCallback(async (toolType: ToolType, values: Record<string, unknown>) => {
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
        timeSpent: 0, // TODO: Track actual time
      }
    );
    
    // Collapse the tool (keep showing summary)
    setActiveTool(prev => prev ? { ...prev, isCollapsed: true, completedValues: values } : null);
    
    // Send the formatted response as a new user message
    // This continues the conversation naturally
    await handleSendMessage(toolMessage);
  }, [userId, conversationId, handleSendMessage]);
  
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

  const handleEditMessage = useCallback(async (messageIndex: number, newContent: string) => {
    // Delete all messages after the edited message (branching)
    const updatedMessages = messages.slice(0, messageIndex);
    setMessages(updatedMessages);
    
    // Clear animation when branching conversation
    setAnimationConfig(null);
    
    // Clear active tool when editing
    setActiveTool(null);
    
    // Bug #10: Reset mobile state to avoid stale confirmations after edit
    setMobileConfirmedParams(new Set());
    setMobileCardIndex(0);
    setGeneratedStrategy(null);
    setCriticalQuestion(null);
    
    // CRITICAL: Reset accumulated rules to only include rules from messages BEFORE the edit
    // We need to re-extract rules from the remaining messages
    const remainingUserMessages = updatedMessages
      .filter(m => m.role === 'user')
      .map(m => m.content);
    
    // Start fresh and re-accumulate from remaining messages only
    let newAccumulatedRules: StrategyRule[] = [];
    for (const content of remainingUserMessages) {
      newAccumulatedRules = extractFromMessage(content, 'user', newAccumulatedRules);
    }
    setAccumulatedRules(newAccumulatedRules);
    
    // Update the conversation text to match (remove everything after this point)
    const conversationUpToEdit = updatedMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    setFullConversationText(conversationUpToEdit + '\n\n');
    
    // Re-submit the edited message
    await handleSendMessage(newContent);
  }, [messages, handleSendMessage]);

  // Separate function for actual database save (defined first so it can be used below)
  const saveStrategyToDatabase = useCallback(async (name: string) => {
    if (!conversationId || !strategyData) {
      throw new Error('No strategy to save');
    }

    // Calculate completion time in seconds
    const completionTimeSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    const messageCount = messages.filter(m => m.role === 'user').length;
    
    // Track which defaults were used (for analytics)
    const defaultsUsed = accumulatedRules
      .filter(r => r.isDefaulted)
      .map(r => r.label);

    const response = await fetch('/api/strategy/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        name,
        naturalLanguage: fullConversationText,
        parsedRules: strategyData.parsedRules,
        instrument: strategyData.instrument,
        summary: strategyData.summary,
        // Completion tracking for analytics
        completionTimeSeconds,
        messageCount,
        defaultsUsed, // Track which components used smart defaults
        // Rapid flow tracking
        expertiseDetected: expertiseData?.level,
        initialCompleteness: expertiseData?.initialCompleteness,
        finalCompleteness: currentCompleteness ? currentCompleteness / 100 : undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save strategy');
    }

    const data = await response.json();
    setCurrentStrategyCount(data.userStrategyCount);
    
    // Update strategy status to 'saved' - enables post-save tools
    setStrategyStatus('saved');
  }, [conversationId, strategyData, fullConversationText, messages, accumulatedRules, expertiseData, currentCompleteness]);

  // Handler for validation changes from StrategySummaryPanel
  const handleValidationChange = useCallback((validation: ValidationResult) => {
    setCurrentValidation(validation);
  }, []);

  const handleSaveStrategy = useCallback(async (name: string) => {
    if (!conversationId || !strategyData) {
      throw new Error('No strategy to save');
    }

    // Check strategy completeness validation (SOFT BLOCK for save - show warning)
    const validation = currentValidation || validateStrategy(accumulatedRules);
    if (!validation.isComplete || validation.errors.length > 0) {
      // Store the name and show the readiness gate (soft block)
      setPendingStrategyName(name);
      setGateMode('save');
      setShowReadinessGate(true);
      
      // Toast notification
      const missingCount = validation.requiredMissing.length;
      toast.warning('Strategy Incomplete', {
        description: `${missingCount} required component${missingCount > 1 ? 's' : ''} missing. Complete your strategy or save as draft.`,
        duration: 5000,
      });
      
      return;
    }

    // If user has a prop firm, validate before saving
    if (userProfile?.firm_name && userProfile?.account_size) {
      // Store the name for later (after validation)
      setPendingStrategyName(name);
      
      try {
        const validationResponse = await fetch('/api/strategy/validate-firm-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firmName: userProfile.firm_name,
            accountSize: userProfile.account_size,
            parsedRules: strategyData.parsedRules,
            instrument: strategyData.instrument,
          }),
        });

        if (!validationResponse.ok) {
          throw new Error('Validation failed');
        }

        const validationData = await validationResponse.json();
        
        // Log validation event for PATH 2 behavioral analytics
        await logBehavioralEvent(
          userId,
          'strategy_validated',
          {
            firmName: userProfile.firm_name,
            accountSize: userProfile.account_size,
            instrument: strategyData.instrument,
            isValid: validationData.isValid,
            status: validationData.status,
            warningCount: validationData.warnings?.length || 0,
            hardViolations: validationData.warnings?.filter((w: ValidationWarning) => w.severity === 'error').length || 0,
            softWarnings: validationData.warnings?.filter((w: ValidationWarning) => w.severity === 'warning').length || 0,
            violations: validationData.warnings?.map((w: ValidationWarning) => w.type) || [],
          }
        );
        
        // Show modal with warnings (if any)
        setValidationWarnings(validationData.warnings || []);
        setValidationIsValid(validationData.isValid);
        setShowValidationModal(true);
        
        // Don't save yet - wait for user to confirm in modal
        return;
      } catch (err) {
        console.error('Validation error:', err);
        // If validation fails, proceed with save anyway (non-blocking)
      }
    }

    // If no firm or validation passed/bypassed, save directly
    await saveStrategyToDatabase(name);
  }, [conversationId, strategyData, userProfile, userId, saveStrategyToDatabase, accumulatedRules, currentValidation]);

  const handleRefine = useCallback(() => {
    // Clear completion state so user can continue chatting
    setStrategyComplete(false);
    setStrategyData(null);
  }, []);

  // Shared reset function for Start Over and Add Another Strategy
  const resetConversationState = useCallback(() => {
    // Traditional flow state
    setConversationId(null);
    setMessages([]);
    setStrategyComplete(false);
    setStrategyData(null);
    setFullConversationText('');
    setTimezoneConversionSummary('');
    setAnimationConfig(null);
    setAccumulatedRules([]);
    setCurrentValidation(null);
    setIsAnimationExpanded(false);
    setWasAnimationManuallySet(false);
    
    // Rapid flow state
    setCriticalQuestion(null);
    setConversationState({
      mode: 'initial',
      currentQuestion: null,
    });
    setGeneratedStrategy(null);
    setIsPanelVisible(true);
    
    // Mobile state
    setMobileConfirmedParams(new Set());
    setMobileCardIndex(0);
    setShowReviewAllModal(false);
    setEditingParamIndex(null);
    
    // Tool state
    setActiveTool(null);
    setToolsShown([]);
    
    // Rapid flow tracking
    setExpertiseData(null);
    setStrategyStatus('building');
    setCurrentCompleteness(0);
    setShowPreviewCard(false);
    
    // Session timer
    sessionStartRef.current = Date.now();
    
    // Error state
    setError(null);
  }, []);

  const handleAddAnother = useCallback(async () => {
    // Archive current conversation before starting new one (PATH 2: behavioral data)
    if (conversationId) {
      try {
        await fetch('/api/strategy/abandon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            reason: 'user_add_another',
          }),
        });
      } catch (err) {
        // Silent failure - don't block user from starting new conversation
        console.error('Failed to archive conversation:', err);
      }
    }
    
    // Reset all state for new conversation
    resetConversationState();
  }, [conversationId, resetConversationState]);

  const handleStartOver = useCallback(() => {
    setShowStartOverModal(true);
  }, []);

  // Handler for "Save Draft Anyway" from readiness gate (soft block bypass)
  const handleSaveAnyway = useCallback(async () => {
    setShowReadinessGate(false);
    
    // Log that user bypassed validation (PATH 2 behavioral data)
    await logBehavioralEvent(
      userId,
      'strategy_saved_incomplete',
      {
        completionScore: currentValidation?.completionScore || 0,
        missingComponents: currentValidation?.requiredMissing.map(m => m.field) || [],
        errors: currentValidation?.errors.map(e => e.message) || [],
      }
    );
    
    if (pendingStrategyName) {
      await saveStrategyToDatabase(pendingStrategyName);
      setPendingStrategyName(null);
    }
  }, [userId, pendingStrategyName, currentValidation, saveStrategyToDatabase]);

  const confirmStartOver = useCallback(async () => {
    setShowStartOverModal(false);
    
    // Archive current conversation (PATH 2: behavioral data)
    if (conversationId) {
      try {
        await fetch('/api/strategy/abandon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            reason: 'user_restarted',
          }),
        });
      } catch (err) {
        // Silent failure - don't block user from restarting
        console.error('Failed to archive conversation:', err);
      }
    }
    
    // Reset all state for new conversation
    resetConversationState();
  }, [conversationId, resetConversationState]);

  // Validation modal handlers
  const handleValidationSaveAnyway = useCallback(async () => {
    // Log that user ignored warnings (PATH 2 behavioral data)
    await logBehavioralEvent(
      userId,
      'validation_warnings_ignored',
      {
        warningCount: validationWarnings.length,
        hardViolations: validationWarnings.filter((w: ValidationWarning) => w.severity === 'error').length,
        softWarnings: validationWarnings.filter((w: ValidationWarning) => w.severity === 'warning').length,
        firmName: userProfile?.firm_name,
        accountSize: userProfile?.account_size,
      }
    );
    
    setShowValidationModal(false);
    if (pendingStrategyName) {
      await saveStrategyToDatabase(pendingStrategyName);
      setPendingStrategyName(null);
    }
  }, [userId, pendingStrategyName, validationWarnings, userProfile, saveStrategyToDatabase]);

  const handleValidationRevise = useCallback(async () => {
    // Log that user chose to revise (PATH 2 behavioral data)
    await logBehavioralEvent(
      userId,
      'strategy_revision_after_validation',
      {
        warningCount: validationWarnings.length,
        firmName: userProfile?.firm_name,
      }
    );
    
    setShowValidationModal(false);
    setPendingStrategyName(null);
    // User returns to confirmation card to refine
  }, [userId, validationWarnings, userProfile]);

  return (
    <div className="flex flex-col h-screen bg-[#000000]">
      {/* Header */}
      <header className="app-header">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 p-2 -ml-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden md:inline text-xs text-[rgba(255,255,255,0.5)] group-hover:text-[rgba(255,255,255,0.85)] font-mono">ESC</span>
            </Link>
            <div>
              <div className="font-mono font-bold text-lg text-white">Strategy Builder</div>
              {messages.length > 0 && (
                <div className="text-xs text-[rgba(255,255,255,0.5)]">
                  {messages.length} messages
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {messages.length > 0 && !strategyComplete && (
              <button
                onClick={handleStartOver}
                className="p-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
                title={generatedStrategy ? "Create another strategy" : "Start over"}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Strategy Summary Panel (desktop: left sidebar, mobile: FAB + slide-up) */}
      {/* PHASE 1: Hidden for vibe-first simplicity. Enable via FEATURES.summary_panel_visible */}
      {FEATURES.summary_panel_visible && (
        <StrategySummaryPanel
          strategyName={accumulatedRules.find(r => r.label === 'Strategy')?.value || strategyData?.strategyName}
          rules={accumulatedRules}
          isVisible={accumulatedRules.length > 0}
          isAnimationExpanded={FEATURES.chart_animations_visible && isAnimationExpanded}
          onToggleAnimation={handleToggleAnimation}
          onValidationChange={handleValidationChange}
        />
      )}

      {/* Messages area - scrollable (with margin for sidebar on desktop when panel visible) */}
      <div className={`flex-1 overflow-y-auto min-h-0 flex flex-col ${
        FEATURES.summary_panel_visible && !isMobile && accumulatedRules.length > 0 ? 'ml-80' : ''
      } ${
        generatedStrategy && !isMobile && isPanelVisible ? 'mr-[480px]' : ''
      }`}>
        <ChatMessageList
          messages={messages}
          pendingMessage={pendingMessage || undefined}
          isLoading={isLoading}
          onEditMessage={useRapidFlow ? undefined : handleEditMessage}
          keyboardPadding={isMobile ? keyboardHeight : 0}
        />

        {/* Smart Tool - appears ONLY after save for optional refinement (rapid flow philosophy) */}
        {/* PHASE 1: Hidden during chat. Enable via FEATURES.smart_tools_visible */}
        {FEATURES.smart_tools_visible && activeTool && strategyStatus === 'saved' && (
          <div className={`mx-auto w-full ${
            isMobile ? 'px-4' : 'max-w-3xl px-6'
          }`}>
            <ToolsManager
              activeTool={activeTool}
              onToolComplete={handleToolComplete}
              onToolDismiss={handleToolDismiss}
            />
          </div>
        )}

        {/* Quick-save preview card - appears when completeness >= 70% */}
        {showPreviewCard && !strategyComplete && accumulatedRules.length >= 3 && (
          <div className={`mx-auto w-full ${
            isMobile ? 'px-4' : 'max-w-3xl px-6'
          } mb-4`}>
            <StrategyPreviewCard
              strategyName={accumulatedRules.find(r => r.label === 'Strategy')?.value || 'My Strategy'}
              rules={accumulatedRules}
              completenessPercentage={currentCompleteness}
              onSave={() => {
                // Send finalization request to Claude
                setShowPreviewCard(false);
                handleSendMessage("I'm happy with this strategy. Please finalize it.");
              }}
              onCustomize={() => {
                // Dismiss card and continue refining
                setShowPreviewCard(false);
                toast.info('Continue chatting to refine your strategy');
              }}
            />
          </div>
        )}

        {/* Pattern Confirmation Flow (Issue #44) */}
        {patternConfirmationState.pending && (
          <div className={`mx-auto w-full ${isMobile ? 'px-4' : 'max-w-3xl px-6'} mb-4`}>
            {patternConfirmationState.isUnsupported ? (
              <UnsupportedPattern
                detectedPattern={patternConfirmationState.unsupportedName || 'Unknown'}
                alternatives={getAlternativePatterns(patternConfirmationState.unsupportedName || 'vwap')}
                onSelectAlternative={handlePatternSelect}
                onJoinWaitlist={() => {
                  toast.success('You\'ll be notified when this pattern launches!');
                  logBehavioralEvent(userId, 'waitlist_joined', {
                    pattern: patternConfirmationState.unsupportedName,
                    conversationId,
                  });
                }}
              />
            ) : patternConfirmationState.showMissingFields && patternConfirmationState.detectedPattern ? (
              <MissingFieldPrompt
                pattern={patternConfirmationState.detectedPattern}
                missingFields={patternConfirmationState.missingFields}
                onComplete={handleMissingFieldsComplete}
                onCancel={() => setPatternConfirmationState(prev => ({ ...prev, showMissingFields: false }))}
              />
            ) : patternConfirmationState.detectedPattern ? (
              <PatternConfirmation
                detectedPattern={patternConfirmationState.detectedPattern}
                onConfirm={handlePatternConfirm}
                onChangePattern={handlePatternChange}
                onPatternSelect={handlePatternSelect}
              />
            ) : null}
          </div>
        )}

        {/* Rapid Flow: Strategy editable card (responsive desktop/mobile) */}
        {generatedStrategy && !patternConfirmationState.pending && (
          <>
            {isMobile ? (
              /* Mobile: Swipeable Cards */
              <div>
              <StrategySwipeableCards
                name={generatedStrategy.name}
                rules={generatedStrategy.parsed_rules}
                pattern={generatedStrategy.pattern}
                instrument={generatedStrategy.instrument}
                confirmedParams={mobileConfirmedParams}
                currentIndex={mobileCardIndex}
                onIndexChange={setMobileCardIndex}
                onParameterConfirm={(originalIndex) => {
                  setMobileConfirmedParams(prev => new Set(prev).add(originalIndex));
                }}
                onParameterEdit={(originalIndex) => {
                  // Week 5-6: Open edit modal for this parameter
                  console.log('[RapidFlow] Edit requested for index:', originalIndex);
                  setEditingParamIndex(originalIndex);
                }}
                onReviewAll={() => setShowReviewAllModal(true)}
                onSave={async () => {
                  // Save strategy to database
                  setIsLoading(true);
                  try {
                    const response = await fetch('/api/strategy/save', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: generatedStrategy.name,
                        natural_language: generatedStrategy.natural_language,
                        parsed_rules: generatedStrategy.parsed_rules,
                        instrument: generatedStrategy.instrument,
                        pattern: generatedStrategy.pattern,
                        conversationId,
                      }),
                    });

                    if (!response.ok) {
                      throw new Error('Failed to save strategy');
                    }

                    toast.success('Strategy saved successfully!');
                    router.push('/dashboard');
                  } catch (err) {
                    console.error('[RapidFlow] Save error:', err);
                    toast.error('Failed to save strategy');
                  } finally {
                    setIsLoading(false);
                  }
                }}
              />
              </div>
            ) : (
              /* Desktop: Slide-out Panel from Right (ChatGPT-style) */
              <>
                {/* Panel - slides in/out based on visibility */}
                {isPanelVisible && (
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 right-0 h-screen w-[480px] bg-zinc-950 border-l border-zinc-800 shadow-2xl overflow-y-auto z-40"
                  >
                    {/* Hide button (on left edge of panel) */}
                    <button
                      onClick={() => setIsPanelVisible(false)}
                      className="absolute top-1/2 -left-8 -translate-y-1/2 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors border-l border-t border-b border-zinc-800"
                      aria-label="Hide panel"
                      title="Hide panel (ESC)"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                <div className="p-6 pt-16">
                  <StrategyEditableCard
                name={generatedStrategy.name}
                rules={generatedStrategy.parsed_rules}
                pattern={generatedStrategy.pattern}
                instrument={generatedStrategy.instrument}
                onParameterEdit={(rule, newValue) => {
                  console.log('[RapidFlow] Parameter edited:', rule, newValue);
                  // Update the rule in generatedStrategy state
                  setGeneratedStrategy(prev => {
                    if (!prev) return prev;
                    const updatedRules = prev.parsed_rules.map(r =>
                      r.label === rule.label ? { ...r, value: newValue, isDefaulted: false } : r
                    );
                    return { ...prev, parsed_rules: updatedRules };
                  });
                  // Also sync to mobile confirmation state
                  const ruleIndex = generatedStrategy.parsed_rules.findIndex(r => r.label === rule.label);
                  if (ruleIndex !== -1) {
                    setMobileConfirmedParams(prev => new Set(prev).add(ruleIndex));
                  }
                }}
                onSave={async () => {
                  // Save strategy to database
                  setIsLoading(true);
                  try {
                    const response = await fetch('/api/strategy/save', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: generatedStrategy.name,
                        natural_language: generatedStrategy.natural_language,
                        parsed_rules: generatedStrategy.parsed_rules,
                        instrument: generatedStrategy.instrument,
                        pattern: generatedStrategy.pattern,
                        conversationId,
                      }),
                    });

                    if (!response.ok) {
                      throw new Error('Failed to save strategy');
                    }

                    toast.success('Strategy saved successfully!');
                    router.push('/dashboard');
                  } catch (err) {
                    console.error('[RapidFlow] Save error:', err);
                    toast.error('Failed to save strategy');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                isSaving={isLoading}
              />
                </div>
              </motion.div>
                )}

                {/* Show button when panel is hidden */}
                {!isPanelVisible && (
                  <motion.button
                    initial={{ x: 100 }}
                    animate={{ x: 0 }}
                    onClick={() => setIsPanelVisible(true)}
                    className="fixed top-1/2 right-0 -translate-y-1/2 p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors border-l border-t border-b border-zinc-800 shadow-lg z-40"
                    aria-label="Show strategy panel"
                    title="Show strategy panel"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </motion.button>
                )}
              </>
            )}
          </>
        )}

        {/* Mobile: Review All Modal */}
        {generatedStrategy && (
          <ReviewAllModal
            isOpen={showReviewAllModal}
            parameters={generatedStrategy.parsed_rules
              .filter(r => !r.label.toLowerCase().includes('instrument'))
              .map((rule, index) => ({ rule, originalIndex: index }))}
            confirmedParams={mobileConfirmedParams}
            onClose={() => setShowReviewAllModal(false)}
            onCardSelect={(displayIndex) => {
              setMobileCardIndex(displayIndex);
              setShowReviewAllModal(false);
            }}
            onEditParameter={(originalIndex) => {
              // Open edit modal directly from ReviewAllModal (Week 5-6)
              setEditingParamIndex(originalIndex);
            }}
            strategyName={generatedStrategy.name}
          />
        )}

        {/* Mobile: Parameter Edit Modal (Week 5-6, Issue #7) */}
        {generatedStrategy && editingParam && editingParamIndex !== null && (
          <ParameterEditModal
            parameter={editingParam}
            isOpen={editingParamIndex !== null}
            instrument={generatedStrategy.instrument}
            onClose={() => setEditingParamIndex(null)}
            onSave={(newValue) => {
              // Update the parameter in generatedStrategy
              const updatedRules = [...generatedStrategy.parsed_rules];
              updatedRules[editingParamIndex] = {
                ...updatedRules[editingParamIndex],
                value: newValue,
                isDefaulted: false, // User explicitly edited, no longer default
                source: 'user' as const,
              };
              setGeneratedStrategy({
                ...generatedStrategy,
                parsed_rules: updatedRules,
              });
              
              // Auto-confirm edited parameter (user reviewed by editing)
              setMobileConfirmedParams(prev => new Set(prev).add(editingParamIndex));
              
              toast.success(`Updated ${editingParam.label}`);
              console.log('[RapidFlow] Parameter edited:', editingParamIndex, newValue);
            }}
          />
        )}

        {/* Strategy confirmation card */}
        {strategyComplete && strategyData && (
          <div className="max-w-3xl mx-auto px-6 pb-4">
            <StrategyConfirmationCard
              strategyName={strategyData.strategyName}
              summary={strategyData.summary}
              parsedRules={strategyData.parsedRules}
              instrument={strategyData.instrument}
              onSave={handleSaveStrategy}
              onRefine={handleRefine}
              userStrategyCount={currentStrategyCount}
              onAddAnother={handleAddAnother}
              timezoneConversionSummary={timezoneConversionSummary}
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="max-w-3xl mx-auto px-6 py-3 bg-[rgba(181,50,61,0.1)] border-t border-[rgba(181,50,61,0.2)">
            <p className="text-[#b5323d] text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Rapid Flow: Critical question buttons - show inline after question message */}
      {criticalQuestion && (
        <div className="max-w-3xl mx-auto px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {criticalQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleCriticalAnswer(option.value)}
                className={cn(
                  'px-4 py-2 border transition-all',
                  'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)]',
                  'hover:bg-[rgba(0,255,209,0.1)] hover:border-[rgba(0,255,209,0.3)]',
                  'text-white text-sm',
                  option.default && 'border-[#00FFD1] bg-[rgba(0,255,209,0.1)]'
                )}
              >
                {option.label}
                {option.default && ' (recommended)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area - in flow at bottom (hide only when preview or confirmation shows) */}
      {!showPreviewCard && !strategyComplete && (
        <div className={`${
          FEATURES.summary_panel_visible && !isMobile && accumulatedRules.length > 0 ? 'ml-80' : ''
        } ${
          generatedStrategy && !isMobile && isPanelVisible ? 'mr-[480px]' : ''
        }`}>
          <ChatInput
            onSubmit={handleSendMessage}
            onStop={handleStopGeneration}
            disabled={isLoading}
            showAnimation={messages.length === 0}
            hasSidebar={!isMobile && accumulatedRules.length > 0}
            onKeyboardHeightChange={setKeyboardHeight}
            placeholder={
              messages.length === 0
                ? ""
                : criticalQuestion
                  ? "Please answer the question above"
                  : "Answer the question or add more details..."
            }
          />
        </div>
      )}

      {/* Start Over Confirmation Modal */}
      {showStartOverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Start a new conversation?
              </h3>
              <p className="text-sm text-[rgba(255,255,255,0.85)]">
                Your current conversation will be cleared. This cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowStartOverModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartOver}
                className="flex-1 px-4 py-2.5 bg-[#b5323d] text-white rounded-none hover:bg-[#b5323d]/90 transition-colors font-medium"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Readiness Gate (completeness validation) */}
      {currentValidation && (
        <StrategyReadinessGate
          validation={currentValidation}
          mode={gateMode}
          isOpen={showReadinessGate}
          onClose={() => setShowReadinessGate(false)}
          onProceedAnyway={gateMode === 'save' ? handleSaveAnyway : undefined}
          onProceed={() => {
            setShowReadinessGate(false);
            // If complete, proceed to prop firm validation or save
            if (pendingStrategyName) {
              // Re-trigger save (will now pass completeness check)
              handleSaveStrategy(pendingStrategyName);
            }
          }}
        />
      )}

      {/* Prop Firm Validation Warnings Modal */}
      {userProfile?.firm_name && userProfile?.account_size && (
        <ValidationWarningsModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          onSaveAnyway={handleValidationSaveAnyway}
          onRevise={handleValidationRevise}
          firmName={userProfile.firm_name}
          accountSize={userProfile.account_size}
          warnings={validationWarnings}
          isValid={validationIsValid}
        />
      )}
    </div>
  );
}
