'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  pendingMessage?: string;
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
      className="flex-1 overflow-y-auto bg-bg-primary"
    >
      <div className="max-w-3xl mx-auto px-4 py-8">
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
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1.06, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
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

        {/* Message list - Full width terminal style */}
        {messages.map((message, index) => (
          <MessageBlock 
            key={message.id} 
            message={message}
            isLatest={index === messages.length - 1 && !pendingMessage}
          />
        ))}

        {/* Optimistic UI: Show pending user message */}
        {pendingMessage && (
          <MessageBlock
            message={{
              id: 'pending',
              role: 'user',
              content: pendingMessage,
            }}
            isOptimistic
          />
        )}

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 text-content-tertiary text-sm mb-2">
              <span>Thinking...</span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-2 h-2 bg-accent-cyan rounded-full"
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

interface MessageBlockProps {
  message: ChatMessage;
  isLatest?: boolean;
  isOptimistic?: boolean;
}

function MessageBlock({ message, isLatest: _isLatest, isOptimistic }: MessageBlockProps) {
  const isUser = message.role === 'user';
  // Reserved for scroll-to-latest behavior
  void _isLatest;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-8"
    >
      {isUser ? (
        // User message: Right-aligned with cyan accent
        <div className="flex justify-end mb-4">
          <div className="max-w-[85%]">
            <div className="inline-block text-content-primary bg-accent-cyan/10 px-4 py-3 rounded-lg border border-accent-cyan/20">
              {message.content}
            </div>
          </div>
        </div>
      ) : (
        // AI message: Full-width terminal style
        <div className="text-content-primary leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      )}
    </motion.div>
  );
}
