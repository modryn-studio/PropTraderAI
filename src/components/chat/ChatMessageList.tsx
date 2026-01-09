'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  onEditMessage?: (messageIndex: number, newContent: string) => void;
}

export default function ChatMessageList({ 
  messages, 
  pendingMessage, 
  isLoading,
  onEditMessage
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
      className="flex-1 overflow-y-auto bg-[#000000]"
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
              <div className="absolute inset-0 blur-2xl bg-[rgba(0,255,209,0.3)]" />
              <span className="text-[#00FFD1] text-5xl font-mono relative z-10">&gt;</span>
              <motion.span
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1.06, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
                className="text-[#00FFD1] text-4xl font-mono relative z-10"
              >
                █
              </motion.span>
            </div>
            
            <h2 className="text-xl font-mono font-bold text-white mb-2">
              Turn your edge into executed trades
            </h2>
            <p className="text-[rgba(255,255,255,0.85)] text-sm max-w-md mx-auto">
              Describe your setup in plain English. I&apos;ll ask questions to make it precise.
            </p>
            <div className="mt-6 text-xs text-[rgba(255,255,255,0.5)]">
              Example: &quot;Trade pullbacks to 20 EMA when RSI is below 40 during NY session&quot;
            </div>
          </motion.div>
        )}

        {/* Message list - Full width terminal style */}
        {messages.map((message, index) => (
          <MessageBlock 
            key={message.id} 
            message={message}
            messageIndex={index}
            isLatest={index === messages.length - 1 && !pendingMessage}
            onEdit={message.role === 'user' ? onEditMessage : undefined}
            isDisabled={isLoading}
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
            messageIndex={messages.length}
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
            <div className="flex items-center gap-2 text-[rgba(255,255,255,0.5)] text-sm mb-2">
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
                  className="w-2 h-2 bg-[#00FFD1] rounded-full"
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
  messageIndex: number;
  isLatest?: boolean;
  isOptimistic?: boolean;
  onEdit?: (messageIndex: number, newContent: string) => void;
  isDisabled?: boolean;
}

function MessageBlock({ 
  message, 
  messageIndex,
  isLatest: _isLatest, 
  isOptimistic,
  onEdit,
  isDisabled
}: MessageBlockProps) {
  const isUser = message.role === 'user';
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reserved for scroll-to-latest behavior
  void _isLatest;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowMobileMenu(false);
  };

  const handleEdit = () => {
    if (isDisabled) return;
    setIsEditing(true);
    setShowMobileMenu(false);
    // Focus textarea after state updates
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(messageIndex, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Long press handlers for mobile
  const handleTouchStart = () => {
    if (isUser && !isDisabled) {
      longPressTimerRef.current = setTimeout(() => {
        setShowMobileMenu(true);
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatFullDate = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-8 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {isUser ? (
        // User message: Right-aligned with cyan accent
        <div className="flex justify-end mb-4">
          <div className="max-w-[85%] relative group">
            {isEditing ? (
              // Edit mode
              <div className="w-full">
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full text-white bg-[rgba(0,255,209,0.1)] px-4 py-3 rounded-lg border border-[rgba(0,255,209,0.4)] focus:border-[#00FFD1] focus:outline-none resize-none min-h-[44px]"
                  rows={3}
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-xs text-[rgba(255,255,255,0.85)] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || editContent === message.content}
                    className="px-3 py-1 text-xs bg-[#00FFD1] text-black rounded-none hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                <div className="inline-block text-white bg-[rgba(0,255,209,0.1)] px-4 py-3 rounded-lg border border-[rgba(0,255,209,0.2)]">
                  {message.content}
                </div>
                
                {/* Desktop: Hover controls */}
                {isHovered && !isDisabled && (
                  <div className="hidden sm:flex absolute -bottom-6 right-0 items-center gap-1 text-xs">
                    {message.timestamp && (
                      <span 
                        className="text-[rgba(255,255,255,0.5)] mr-2 cursor-default relative group/time"
                      >
                        {formatTimestamp(message.timestamp)}
                        <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-[#121212] rounded text-xs text-[rgba(255,255,255,0.85)] whitespace-nowrap opacity-0 group-hover/time:opacity-100 transition-opacity pointer-events-none">
                          {formatFullDate(message.timestamp)}
                        </span>
                      </span>
                    )}
                    <button
                      onClick={handleEdit}
                      className="group/btn p-1.5 text-[rgba(255,255,255,0.5)] hover:text-[#00FFD1] transition-colors relative"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-[#121212] rounded text-xs text-[rgba(255,255,255,0.85)] whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={handleCopy}
                      className="group/btn p-1.5 text-[rgba(255,255,255,0.5)] hover:text-[#00FFD1] transition-colors relative"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-[#121212] rounded text-xs text-[rgba(255,255,255,0.85)] whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                        copy
                      </span>
                    </button>
                  </div>
                )}
                
                {/* Mobile: Long press menu */}
                {showMobileMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="sm:hidden fixed inset-0 bg-black/50 z-40"
                      onClick={() => setShowMobileMenu(false)}
                    />
                    {/* Menu */}
                    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-[rgba(255,255,255,0.1)] rounded-t-xl p-4 z-50 space-y-3">
                      <button
                        onClick={handleEdit}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#121212] rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-[#00FFD1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <div>
                          <div className="text-white font-medium">Edit</div>
                          <div className="text-xs text-[rgba(255,255,255,0.5)]">Modify this message</div>
                        </div>
                      </button>
                      <button
                        onClick={handleCopy}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#121212] rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-[#00FFD1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="text-white font-medium">Copy</div>
                          <div className="text-xs text-[rgba(255,255,255,0.5)]">Copy message text</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          const selection = window.getSelection();
                          const range = document.createRange();
                          const messageElement = document.getElementById(`message-${message.id}`);
                          if (messageElement) {
                            range.selectNodeContents(messageElement);
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                          }
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#121212] rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-[#00FFD1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <div className="text-white font-medium">Select Text</div>
                          <div className="text-xs text-[rgba(255,255,255,0.5)]">Select message content</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        // AI message: Full-width terminal style
        <div id={`message-${message.id}`} className="text-white leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      )}
    </motion.div>
  );
}

