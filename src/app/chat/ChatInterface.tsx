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
  const { isMobile, defaultAnimationExpanded, animationAutoExpandable } = useResponsiveBreakpoints();
  const prevRuleCountRef = useRef(0);
  
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

  const handleSendMessage = useCallback(async (message: string) => {
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
              } else if (data.type === 'rule_update') {
                // Claude called update_rule tool - add to summary panel
                // Defensive validation
                if (!data.rule?.category || !data.rule?.label || !data.rule?.value) {
                  console.warn('Invalid rule_update received:', data);
                } else {
                  const newRule: StrategyRule = {
                    category: data.rule.category,
                    label: data.rule.label,
                    value: data.rule.value
                  };
                  
                  // Check if this is an overwrite of existing rule
                  const wasOverwrite = accumulatedRules.some(
                    r => r.category === newRule.category && r.label === newRule.label
                  );
                  
                  // Use existing accumulation logic
                  setAccumulatedRules(prev => accumulateRules(prev, [newRule]));
                  
                  // Log behavioral event for rule updates
                  logBehavioralEvent(
                    userId,
                    'rule_updated_via_tool',
                    {
                      conversationId,
                      category: newRule.category,
                      label: newRule.label,
                      wasOverwrite
                    }
                  ).catch(console.error);
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
  }, [conversationId, messages, userId, userProfile?.timezone, animationConfig, handleAnimationAutoExpand, accumulatedRules]);

  const handleEditMessage = useCallback(async (messageIndex: number, newContent: string) => {
    // Delete all messages after the edited message (branching)
    const updatedMessages = messages.slice(0, messageIndex);
    setMessages(updatedMessages);
    
    // Clear animation when branching conversation
    setAnimationConfig(null);
    
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
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save strategy');
    }

    const data = await response.json();
    setCurrentStrategyCount(data.userStrategyCount);
  }, [conversationId, strategyData, fullConversationText]);

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
          
          {messages.length > 0 && !strategyComplete && (
            <button
              onClick={handleStartOver}
              className="p-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
              title="Start over"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Strategy Summary Panel (desktop: left sidebar, mobile: FAB + slide-up) */}
      <StrategySummaryPanel
        strategyName={accumulatedRules.find(r => r.label === 'Strategy')?.value || strategyData?.strategyName}
        rules={accumulatedRules}
        isVisible={accumulatedRules.length > 0}
        isAnimationExpanded={isAnimationExpanded}
        onToggleAnimation={handleToggleAnimation}
        onValidationChange={handleValidationChange}
      />

      {/* Messages area - scrollable (with margin for sidebar on desktop) */}
      <div className={`flex-1 overflow-hidden flex flex-col ${
        !isMobile && accumulatedRules.length > 0 ? 'ml-80' : ''
      }`}>
        <ChatMessageList
          messages={messages}
          pendingMessage={pendingMessage || undefined}
          isLoading={isLoading}
          onEditMessage={handleEditMessage}
        />

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

      {/* Input area - fixed at bottom (hide when strategy complete) */}
      {!strategyComplete && (
        <ChatInput
          onSubmit={handleSendMessage}
          onStop={handleStopGeneration}
          disabled={isLoading}
          showAnimation={messages.length === 0}
          hasSidebar={!isMobile && accumulatedRules.length > 0}
          placeholder={
            messages.length === 0
              ? ""
              : "Answer the question or add more details..."
          }
        />
      )}

      {/* Spacer for fixed input */}
      {!strategyComplete && <div className="h-32" />}

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
