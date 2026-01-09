'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import ChatMessageList, { ChatMessage } from '@/components/chat/ChatMessageList';
import ChatInput from '@/components/chat/ChatInput';
import StrategyConfirmationCard from '@/components/chat/StrategyConfirmationCard';
import { ParsedRules, ConversationMessage } from '@/lib/claude/client';

interface ChatInterfaceProps {
  userId: string;
  userStrategyCount: number;
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
  userId: _userId,
  userStrategyCount,
  existingConversation,
}: ChatInterfaceProps) {
  const router = useRouter();
  
  // Reserved for future behavioral logging client-side
  void _userId;
  
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
  
  // Strategy completion state
  const [strategyComplete, setStrategyComplete] = useState(false);
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [currentStrategyCount, setCurrentStrategyCount] = useState(userStrategyCount);

  // Track the full conversation text for saving
  const [fullConversationText, setFullConversationText] = useState('');
  
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
    return () => window.removeEventListener('keydown', handleEscape);
  }, [router, strategyComplete]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setPendingMessage(null);
    }
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    // Optimistic UI: show message immediately
    setPendingMessage(message);
    setIsLoading(true);
    setError(null);

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/strategy/parse', {
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

      const data = await response.json();

      // Update conversation ID if this was a new conversation
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Add messages to state
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMsg, assistantMsg]);
      
      // Track conversation text for natural_language field
      setFullConversationText(prev => 
        prev + `User: ${message}\nAssistant: ${data.message}\n\n`
      );

      // Check if strategy is complete
      if (data.complete) {
        setStrategyComplete(true);
        setStrategyData({
          strategyName: data.strategyName,
          summary: data.summary,
          parsedRules: data.parsedRules,
          instrument: data.instrument,
        });
      }

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
  }, [conversationId]);

  const handleEditMessage = useCallback(async (messageIndex: number, newContent: string) => {
    // Delete all messages after the edited message (branching)
    const updatedMessages = messages.slice(0, messageIndex);
    setMessages(updatedMessages);
    
    // Update the conversation text to match (remove everything after this point)
    const conversationUpToEdit = updatedMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    setFullConversationText(conversationUpToEdit + '\n\n');
    
    // Re-submit the edited message
    await handleSendMessage(newContent);
  }, [messages, handleSendMessage]);

  const handleSaveStrategy = useCallback(async (name: string) => {
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
    setError(null);
  }, [conversationId]);

  const handleStartOver = useCallback(() => {
    setShowStartOverModal(true);
  }, []);

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
    setError(null);
  }, [conversationId]);

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-xl border-b border-line-subtle">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 p-2 -ml-2 text-content-tertiary hover:text-content-primary transition-colors group"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-xs text-content-tertiary group-hover:text-content-secondary font-mono">ESC</span>
            </Link>
            <div>
              <div className="font-display font-bold text-lg">Strategy Builder</div>
              {messages.length > 0 && (
                <div className="text-xs text-content-tertiary">
                  {messages.length} messages
                </div>
              )}
            </div>
          </div>
          
          {messages.length > 0 && !strategyComplete && (
            <button
              onClick={handleStartOver}
              className="p-2 text-content-tertiary hover:text-content-primary transition-colors"
              title="Start over"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Messages area - scrollable */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ChatMessageList
          messages={messages}
          pendingMessage={pendingMessage || undefined}
          isLoading={isLoading}
          onEditMessage={handleEditMessage}
        />

        {/* Strategy confirmation card */}
        {strategyComplete && strategyData && (
          <div className="px-4 pb-4">
            <StrategyConfirmationCard
              strategyName={strategyData.strategyName}
              summary={strategyData.summary}
              parsedRules={strategyData.parsedRules}
              instrument={strategyData.instrument}
              onSave={handleSaveStrategy}
              onRefine={handleRefine}
              userStrategyCount={currentStrategyCount}
              onAddAnother={handleAddAnother}
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-4 py-3 bg-loss/10 border-t border-loss/20">
            <p className="text-loss text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Input area - fixed at bottom (hide when strategy complete) */}
      {!strategyComplete && (
        <ChatInput
          onSubmit={handleSendMessage}
          onStop={handleStopGeneration}
          disabled={isLoading}
          placeholder={
            messages.length === 0
              ? "Describe your trading strategy in plain English..."
              : "Answer the question or add more details..."
          }
        />
      )}

      {/* Spacer for fixed input */}
      {!strategyComplete && <div className="h-32" />}

      {/* Start Over Confirmation Modal */}
      {showStartOverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-semibold text-content-primary mb-2">
                Start a new conversation?
              </h3>
              <p className="text-sm text-content-secondary">
                Your current conversation will be cleared. This cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowStartOverModal(false)}
                className="flex-1 px-4 py-2.5 bg-bg-tertiary text-content-primary rounded-md hover:bg-bg-tertiary/80 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartOver}
                className="flex-1 px-4 py-2.5 bg-danger text-white rounded-md hover:bg-danger/90 transition-colors font-medium"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
