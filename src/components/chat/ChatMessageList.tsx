'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Terminal } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  pendingMessage?: string; // Optimistic UI: show user's message immediately
  isLoading?: boolean;
}

export default function ChatMessageList({ 
  messages, 
  pendingMessage, 
  isLoading 
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pendingMessage, isLoading]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
    >
      {/* Welcome message if no messages yet */}
      {messages.length === 0 && !pendingMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          {/* Terminal prompt with cyan glow and blinking cursor */}
          <div className="relative inline-flex items-center justify-center gap-1 mb-4">
            <div className="absolute inset-0 blur-2xl bg-accent-cyan/30" />
            <span className="text-accent-cyan text-5xl font-mono relative z-10">&gt;</span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.06, repeat: Infinity, ease: "steps(1)" }}
              className="text-accent-cyan text-4xl font-mono relative z-10"
            >
              █
            </motion.span>
          </div>
          
          <h2 className="text-xl font-display font-bold text-content-primary mb-2">
            Turn your edge into executed trades
          </h2>
          <p className="text-content-secondary text-sm max-w-md mx-auto">
            Describe your setup in plain English. I&apos;ll ask questions to make it precise.
          </p>
          <div className="mt-6 text-xs text-content-tertiary">
            Example: &quot;Trade pullbacks to 20 EMA when RSI is below 40 during NY session&quot;
          </div>
        </motion.div>
      )}

      {/* Message list */}
      {messages.map((message, index) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          isLatest={index === messages.length - 1 && !pendingMessage}
        />
      ))}

      {/* Optimistic UI: Show pending user message immediately */}
      {pendingMessage && (
        <MessageBubble
          message={{
            id: 'pending',
            role: 'user',
            content: pendingMessage,
          }}
          isOptimistic
        />
      )}

      {/* Typing indicator while waiting for Claude */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-accent-purple" />
          </div>
          <div className="bg-bg-secondary border border-line-subtle rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-accent-cyan font-data">→</span>
              <span className="text-content-secondary text-sm animate-pulse">
                Analyzing your strategy...
              </span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isLatest?: boolean;
  isOptimistic?: boolean;
}

function MessageBubble({ message, isLatest: _isLatest, isOptimistic }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  // Reserved for scroll-to-latest behavior
  void _isLatest;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-accent-cyan/10' 
          : 'bg-accent-purple/10'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-accent-cyan" />
        ) : (
          <Bot className="w-4 h-4 text-accent-purple" />
        )}
      </div>

      {/* Message bubble */}
      <div className={`max-w-[80%] ${
        isUser
          ? 'bg-accent-cyan/10 border border-accent-cyan/20 rounded-2xl rounded-tr-sm'
          : 'bg-bg-secondary border border-line-subtle rounded-2xl rounded-tl-sm'
      } px-4 py-3`}>
        {/* Terminal prompt for assistant */}
        {!isUser && (
          <span className="text-accent-cyan font-data mr-2">→</span>
        )}
        
        {/* Message content */}
        <span className={`text-sm leading-relaxed ${
          isUser ? 'text-content-primary' : 'text-content-secondary'
        }`}>
          {message.content}
        </span>

        {/* Optimistic indicator */}
        {isOptimistic && (
          <span className="ml-2 text-xs text-content-tertiary">Sending...</span>
        )}
      </div>
    </motion.div>
  );
}
