'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw } from 'lucide-react';
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
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
import InlineCriticalQuestion from '@/components/strategy/InlineCriticalQuestion';
import StrategyEditableCard from '@/components/strategy/StrategyEditableCard';
import { StrategySwipeableCards, ReviewAllModal, ParameterEditModal } from '@/components/strategy/mobile';

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
  console.debug('[StrategyStatus]', strategyStatus);
  const { isMobile, defaultAnimationExpanded, animationAutoExpandable } = useResponsiveBreakpoints();
  const prevRuleCountRef = useRef(0);
  
  // Smart Tools state
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null);
  const [toolsShown, setToolsShown] = useState<ToolType[]>([]);
  
  // Rapid Flow state (Week 2 implementation)
  const { flags } = useFeatureFlags();
  const [devOverrideRapidFlow, setDevOverrideRapidFlow] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';
  const useRapidFlow = isDev ? devOverrideRapidFlow : (flags.generate_first_flow ?? false);
  
  // Critical question state (for rapid flow)
  const [criticalQuestion, setCriticalQuestion] = useState<{
    question: string;
    questionType: 'stopLoss' | 'instrument' | 'entryTrigger' | 'direction';
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
  
  // Mobile swipeable cards state (Week 3-4, Issue #7)
  const [mobileConfirmedParams, setMobileConfirmedParams] = useState<Set<number>>(new Set());
  const [mobileCardIndex, setMobileCardIndex] = useState(0);
  const [showReviewAllModal, setShowReviewAllModal] = useState(false);
  
  // Parameter edit modal state (Week 5-6, Issue #7)
  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);
  const editingParam = editingParamIndex !== null && generatedStrategy 
    ? generatedStrategy.parsed_rules[editingParamIndex] 
    : null;
  
  // AbortController for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // ESC to go back (power user keyboard shortcut)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !strategyComplete) {
        router.push('/dashboard');
      }
    };
    window.addEventListener('keydown', handleEscape);
    
    // Cleanup animation state on unmount
    return () => {
      window.removeEventListener('keydown', handleEscape);
      setAnimationConfig(null);
    };
  }, [router, strategyComplete]);

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

    // If they clicked "Other (specify)" button, ignore it - they'll type custom answer
    const matchingOption = criticalQuestion.options.find(o => o.value === value);
    if (matchingOption && (matchingOption.label.toLowerCase().includes('other') || matchingOption.label.toLowerCase().includes('specify'))) {
      // They clicked the "Other (specify)" button - do nothing, they should type instead
      return;
    }

    // Use the value as-is (could be from button click or typed text)
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

    try {
      const response = await fetch('/api/strategy/generate-rapid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: answerLabel,
          conversationId,
          criticalAnswer: {
            questionType: criticalQuestion.questionType,
            value,
          },
        }),
      });

      const data = await response.json();

      if (data.type === 'strategy_complete') {
        // Strategy generated successfully
        setGeneratedStrategy(data.strategy);
        setCriticalQuestion(null);

        // Add confirmation message
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Perfect! Strategy created. Review and edit below:',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);

        // Log completion
        await logBehavioralEvent(
          userId,
          'rapid_flow_completed',
          {
            conversationId,
            messageCount: 2,
            defaultsApplied: data.defaultsApplied || [],
          }
        );
      } else if (data.type === 'error') {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('[RapidFlow] Error handling answer:', err);
      setError(err instanceof Error ? err.message : 'Failed to process answer');
      
      // Add error message to chat
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [criticalQuestion, conversationId, userId]);

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
      const response = await fetch('/api/strategy/generate-rapid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId,
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

        // Don't add to chat - InlineCriticalQuestion component will show it

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
      } else if (data.type === 'strategy_complete') {
        // Strategy generated without questions!
        setGeneratedStrategy(data.strategy);

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
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Add error message to chat
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, userId]);

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
      isDev,
      devOverrideRapidFlow,
      'flags.generate_first_flow': flags.generate_first_flow,
      'final useRapidFlow': useRapidFlow,
    });

    // If there's a critical question, treat this as an answer to it
    if (criticalQuestion) {
      console.log('[ChatInterface] ✅ Routing to CRITICAL ANSWER');
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
    
    // V2: Extract rules from user message IMMEDIATELY (they're stating facts)
    setAccumulatedRules(prev => extractFromMessage(message, 'user', prev));
    
    setIsLoading(true);
    setError(null);

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
                // Defensive validation
                if (!data.rule?.category || !data.rule?.label || !data.rule?.value) {
                  console.warn('Invalid rule_update received:', data);
                } else {
                  const newRule: StrategyRule = {
                    category: data.rule.category,
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
  }, [conversationId, messages, userId, userProfile?.timezone, animationConfig, handleAnimationAutoExpand, toolsShown, expertiseData, useRapidFlow, generatedStrategy, handleRapidFlowMessage, criticalQuestion, handleCriticalAnswer, isDev, devOverrideRapidFlow, flags.generate_first_flow]);

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
    
    // Reset everything for a new conversation
    setConversationId(null);
    setMessages([]);
    setStrategyComplete(false);
    setStrategyData(null);
    setFullConversationText('');
    setTimezoneConversionSummary('');
    setAnimationConfig(null);
    setAccumulatedRules([]);
    setIsAnimationExpanded(false);
    setWasAnimationManuallySet(false);
    setStrategyStatus('building'); // Reset to building mode
    setCurrentCompleteness(0); // Reset completeness tracking
    setShowPreviewCard(false); // Hide preview card
    sessionStartRef.current = Date.now();
    prevRuleCountRef.current = 0;
    setError(null);
  }, [conversationId]);

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
    
    // Reset UI for new conversation
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
    setStrategyStatus('building'); // Reset to building mode
    setCurrentCompleteness(0); // Reset completeness tracking
    setShowPreviewCard(false); // Hide preview card
    sessionStartRef.current = Date.now();
    prevRuleCountRef.current = 0;
    setError(null);
  }, [conversationId]);

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
            {/* Dev mode toggle for rapid flow testing */}
            {isDev && (
              <label className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)]">
                <input
                  type="checkbox"
                  checked={devOverrideRapidFlow}
                  onChange={(e) => setDevOverrideRapidFlow(e.target.checked)}
                  className="rounded"
                />
                Rapid Flow
              </label>
            )}
            
            {messages.length > 0 && !strategyComplete && !generatedStrategy && (
              <button
                onClick={handleStartOver}
                className="p-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
                title="Start over"
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
      }`}>
        <ChatMessageList
          messages={messages}
          pendingMessage={pendingMessage || undefined}
          isLoading={isLoading}
          onEditMessage={handleEditMessage}
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

        {/* Rapid Flow: Strategy editable card (responsive desktop/mobile) */}
        {generatedStrategy && (
          <div className={isMobile ? '' : 'max-w-3xl mx-auto px-6 pb-4'}>
            {isMobile ? (
              /* Mobile: Swipeable Cards */
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
            ) : (
              /* Desktop: Editable Card */
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
            )}
          </div>
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

      {/* Rapid Flow: Critical question */}
      {criticalQuestion && (
        <div className="max-w-3xl mx-auto px-6 pb-4">
          <InlineCriticalQuestion
            question={criticalQuestion.question}
            options={criticalQuestion.options}
            onSelect={handleCriticalAnswer}
            variant={criticalQuestion.questionType === 'stopLoss' ? 'stop_loss' : criticalQuestion.questionType as 'instrument' | 'entry' | 'direction'}
          />
        </div>
      )}

      {/* Input area - in flow at bottom (hide when preview, confirmation, or generated strategy shows) */}
      {!showPreviewCard && !strategyComplete && !generatedStrategy && (
        <div className={!isMobile && accumulatedRules.length > 0 ? 'ml-80' : ''}>
          <ChatInput
            onSubmit={handleSendMessage}
            onStop={handleStopGeneration}
            disabled={isLoading}
            showAnimation={messages.length === 0}
            hasSidebar={!isMobile && accumulatedRules.length > 0}
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
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
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
