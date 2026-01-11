/**
 * COMPLETE INTEGRATION EXAMPLE
 * 
 * Shows how the validation layer works in a real conversation flow.
 * This is a working example you can adapt to your ChatInterface.
 */

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import ChatMessageList from '@/components/chat/ChatMessageList';
import ChatInput from '@/components/chat/ChatInput';
import StrategySummaryPanel, { StrategyRule } from '@/components/strategy/StrategySummaryPanel';
import { extractFromMessage } from '@/lib/utils/ruleExtractor';
import { validateStrategy, ValidationResult, getValidationSummary } from '@/lib/strategy/strategyValidator';
import ValidationStatus from '@/components/strategy/ValidationStatus';
import StrategyReadinessGate, { ReadinessIndicator } from '@/components/strategy/StrategyReadinessGate';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatInterfaceWithValidation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [accumulatedRules, setAccumulatedRules] = useState<StrategyRule[]>([]);
  const [showReadinessGate, setShowReadinessGate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validate rules in real-time
  const validation = useMemo(() => {
    if (accumulatedRules.length === 0) {
      return {
        isComplete: false,
        isValid: false,
        completionScore: 0,
        requiredMissing: [],
        recommendedMissing: [],
        errors: [],
        warnings: [],
      };
    }
    return validateStrategy(accumulatedRules);
  }, [accumulatedRules]);

  // Handle user message
  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Extract rules from user message IMMEDIATELY
    setAccumulatedRules(prev => extractFromMessage(content, 'user', prev));
    
    // Send to Claude API
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/strategy-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          accumulatedRules, // Pass current rules for context
          validation, // Pass validation state to Claude
        }),
      });

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Extract rules from Claude's confirmation (not questions)
      setAccumulatedRules(prev => extractFromMessage(data.content, 'assistant', prev));
      
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [messages, accumulatedRules, validation]);

  // Handle "Proceed to Backtest" click
  const handleBacktestClick = useCallback(() => {
    // Check if strategy is complete
    if (!validation.isComplete) {
      toast.error(getValidationSummary(validation));
      setShowReadinessGate(true);
      return;
    }

    // Check for validation errors
    if (validation.errors.length > 0) {
      toast.error('Please fix validation errors before proceeding');
      setShowReadinessGate(true);
      return;
    }

    // Strategy is complete and valid - proceed!
    toast.success('Strategy validated! Proceeding to backtest...');
    // Navigate to backtest page or show backtest modal
    window.location.href = '/backtest';
  }, [validation]);

  // Handle issue navigation from validation status
  const handleNavigateToIssue = useCallback((issue: any) => {
    // Scroll to relevant chat section or trigger Claude to ask about it
    const message = `Can you help me define ${issue.field}? ${issue.suggestion || ''}`;
    handleSendMessage(message);
    setShowReadinessGate(false);
  }, [handleSendMessage]);

  // Show completion milestone
  const showCompletionMilestone = validation.isComplete && messages.length > 0 && 
    messages[messages.length - 1].role === 'assistant';

  return (
    <div className="flex h-screen bg-[#000000]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
          <h1 className="text-white font-mono font-semibold">Strategy Builder</h1>
          <p className="text-xs text-[rgba(255,255,255,0.5)] font-mono mt-1">
            Build professional trading strategies with AI guidance
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <ChatMessageList messages={messages} isLoading={isLoading} />
          
          {/* Completion Milestone */}
          {showCompletionMilestone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-6 my-4 p-4 rounded-lg border-2 border-[#00FFD1] bg-[rgba(0,255,209,0.05)]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-sm bg-[rgba(0,255,209,0.1)]">
                  <Sparkles className="w-5 h-5 text-[#00FFD1]" />
                </div>
                <div>
                  <h3 className="text-white font-mono font-semibold">
                    Strategy Complete!
                  </h3>
                  <p className="text-xs text-[rgba(255,255,255,0.6)] font-mono">
                    All required components defined
                  </p>
                </div>
              </div>
              <ReadinessIndicator 
                validation={validation}
                onClick={() => setShowReadinessGate(true)}
              />
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[rgba(255,255,255,0.1)]">
          {/* Show readiness indicator if close to complete */}
          {validation.completionScore >= 60 && validation.completionScore < 100 && (
            <div className="px-6 py-3 bg-[rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
                    {validation.completionScore}% Complete
                  </p>
                  <p className="text-xs font-mono text-white mt-0.5">
                    {validation.requiredMissing.length} component{validation.requiredMissing.length === 1 ? '' : 's'} remaining
                  </p>
                </div>
                <button
                  onClick={() => setShowReadinessGate(true)}
                  className="text-xs font-mono text-[#00FFD1] hover:underline"
                >
                  View Details →
                </button>
              </div>
            </div>
          )}
          
          <ChatInput 
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder={
              validation.completionScore === 0 
                ? "Describe your trading strategy..."
                : validation.isComplete
                ? "Strategy complete! Click 'Proceed to Backtest' above."
                : `Define: ${validation.requiredMissing[0]?.field || 'next component'}`
            }
          />
        </div>
      </div>

      {/* Strategy Summary Sidebar with Validation */}
      <StrategySummaryPanel
        strategyName={accumulatedRules.find(r => r.label === 'Strategy')?.value}
        rules={accumulatedRules}
        isVisible={accumulatedRules.length > 0}
      >
        {/* Inject Validation Status into Sidebar */}
        <div className="px-4 py-4 border-b border-[rgba(255,255,255,0.1)]">
          <ValidationStatus 
            validation={validation}
            onNavigateToIssue={handleNavigateToIssue}
          />
        </div>
      </StrategySummaryPanel>

      {/* Strategy Readiness Gate Modal */}
      <StrategyReadinessGate
        validation={validation}
        isOpen={showReadinessGate}
        onClose={() => setShowReadinessGate(false)}
        onNavigateToIssue={handleNavigateToIssue}
        onProceedAnyway={undefined} // Hide "proceed anyway" in Phase 1
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE CONVERSATION FLOW WITH VALIDATION
// ============================================================================

/**
 * This shows how the conversation would progress with validation enforcement:
 * 
 * User: "I want to trade NQ breakouts"
 * 
 * Claude: "Great! Let's build this properly. Opening range breakouts or pattern-based?"
 * [Validation: 0% - No components defined yet]
 * 
 * User: "Opening range, 15 minute"
 * [Rules extracted: Pattern=ORB, Instrument=NQ, Timeframe=15min]
 * [Validation: 40% - Entry type + Instrument defined]
 * 
 * Claude: "Perfect. Where will you place your stop-loss?"
 * [Sidebar shows: ✓ Entry, ✓ Instrument, ○ Stop, ○ Target, ○ Position Size]
 * 
 * User: "50% of the range"
 * [Rules extracted: Stop Loss = 50% of range]
 * [Validation: 60% - Stop-loss added]
 * [Sidebar updates: ✓ Entry, ✓ Instrument, ✓ Stop, ○ Target, ○ Position Size]
 * 
 * Claude: "Got it. What's your profit target? Most pros use 1.5-2R for ORB."
 * 
 * User: "2x the range, so 1:2 R:R"
 * [Rules extracted: Target = 2x range (1:2 R:R)]
 * [Validation: 80% - Profit target added]
 * [Sidebar updates: ✓ Entry, ✓ Instrument, ✓ Stop, ✓ Target, ○ Position Size]
 * 
 * Claude: "Excellent! Last thing: how will you size your positions?"
 * 
 * User: "1% risk per trade"
 * [Rules extracted: Position Size = 1% risk per trade]
 * [Validation: 100% - STRATEGY COMPLETE! ✓]
 * [Sidebar updates: ✓ ALL COMPONENTS GREEN]
 * 
 * [UI shows completion milestone card]
 * [Readiness Indicator appears: "✓ Ready to Backtest →"]
 * 
 * User clicks "Proceed to Backtest"
 * → Validation check passes
 * → Navigate to backtest page
 * 
 * ============================================================================
 * 
 * ALTERNATIVE: User tries to proceed early
 * 
 * User: "Can I backtest this?"
 * [Validation: 60% - Missing target + position size]
 * 
 * Claude: "Not quite yet! We need to define your profit target and position 
 * sizing before backtesting. These are required for any professional strategy.
 * 
 * What's your profit target approach?"
 * 
 * [Readiness Gate blocks if user clicks backtest button]
 * → Shows: "Strategy Incomplete - 2 required components missing"
 * → Lists: Profit Target, Position Sizing
 * → Suggests: "Define: profitTarget"
 */
