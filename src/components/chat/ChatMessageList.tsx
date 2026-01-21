'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  /** Bug #5: Padding for iOS keyboard (passed from parent) */
  keyboardPadding?: number;
}

export default function ChatMessageList({ 
  messages, 
  pendingMessage, 
  isLoading,
  onEditMessage,
  keyboardPadding = 0,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  // Check if user is near bottom of scroll container
  const isNearBottom = () => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 100; // Within 100px of bottom
  };

  // Track when user manually scrolls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // If user scrolls away from bottom, mark as manually scrolling
      if (!isNearBottom()) {
        isUserScrollingRef.current = true;
      } else {
        // If they scroll back to bottom, re-enable auto-scroll
        isUserScrollingRef.current = false;
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom ONLY if user hasn't manually scrolled up
  useEffect(() => {
    if (bottomRef.current && !isUserScrollingRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pendingMessage, isLoading]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-[#000000]"
      style={{ paddingBottom: keyboardPadding > 0 ? `${keyboardPadding}px` : undefined }}
    >
      <div className="max-w-3xl mx-auto px-6 py-8">
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
                className="text-[#00FFD1] text-5xl font-mono relative z-10"
              >
                _
              </motion.span>
            </div>
            
            <h2 className="text-xl font-mono font-bold text-white mb-2">
              Turn your edge into executed trades
            </h2>
            <p className="text-[rgba(255,255,255,0.85)] text-sm max-w-md mx-auto">
              One message to build. Instant execution.
            </p>
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
  const [isCopied, setIsCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reserved for scroll-to-latest behavior
  void _isLatest;

  // Auto-resize textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, editContent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setShowMobileMenu(false);
    // Reset copied state after 2 seconds
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleMouseLeave = () => {
    // Bug #9: Don't hide if copy confirmation is showing
    if (isCopied) return;
    
    // Add delay before hiding icons
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  const handleMouseEnter = () => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
              <div className="w-full min-w-[300px] sm:min-w-[400px]">
                {/* Warning banner - Bug #3: Made sticky to stay visible on mobile */}
                <div className="sticky top-0 z-10 mb-3 p-3 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg flex items-start gap-2 backdrop-blur-sm">
                  <svg className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs text-[rgba(255,255,255,0.9)] leading-relaxed">
                      Editing will delete all messages after this point and restart the conversation from here.
                    </p>
                  </div>
                </div>
                
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    // Auto-resize as user types
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full text-white bg-[rgba(0,255,209,0.1)] px-4 py-3 rounded-lg border border-[rgba(0,255,209,0.4)] focus:border-[#00FFD1] focus:outline-none resize-none min-h-[120px]"
                  style={{ maxHeight: '400px', overflowY: 'auto' }}
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
                <div className="inline-flex flex-col items-end gap-1 relative">
                  <div className="text-white bg-[rgba(0,255,209,0.1)] px-4 py-3 rounded-lg border border-[rgba(0,255,209,0.2)]">
                    {message.content}
                  </div>
                  
                  {/* Desktop: Hover controls - positioned absolutely to prevent layout shift */}
                  {/* Bug #2: Removed pt-1 and added -mt-0.5 to eliminate gap that causes flicker */}
                  {isHovered && !isDisabled && (
                    <div 
                      className="hidden sm:flex items-center gap-1 text-xs absolute top-full right-0 -mt-0.5"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                    {message.timestamp && (
                      <span 
                        className="text-[rgba(255,255,255,0.5)] mr-2 cursor-default relative group/time"
                      >
                        {formatTimestamp(message.timestamp)}
                        <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-[#1a1a1a] border border-[rgba(255,255,255,0.2)] rounded text-xs text-white whitespace-nowrap opacity-0 group-hover/time:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
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
                      <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-[#1a1a1a] border border-[rgba(255,255,255,0.2)] text-xs text-white whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={handleCopy}
                      className="group/btn p-1.5 text-[rgba(255,255,255,0.5)] hover:text-[#00FFD1] transition-colors relative"
                    >
                      {isCopied ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                      <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-[#1a1a1a] border border-[rgba(255,255,255,0.2)] text-xs text-white whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
                        {isCopied ? 'copied!' : 'copy'}
                      </span>
                    </button>
                  </div>
                )}
                </div>
                
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
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        // AI message: Full-width terminal style with markdown rendering
        <div id={`message-${message.id}`} className="text-white leading-relaxed prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Style bold text
              strong: ({ children }) => (
                <strong className="font-semibold text-white">{children}</strong>
              ),
              // Style italic text
              em: ({ children }) => (
                <em className="italic text-[rgba(255,255,255,0.85)]">{children}</em>
              ),
              // Style lists
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
              ),
              // Style paragraphs
              p: ({ children }) => (
                <p className="mb-3 last:mb-0">{children}</p>
              ),
              // Style code
              code: ({ children }) => (
                <code className="bg-[rgba(255,255,255,0.1)] px-1.5 py-0.5 rounded text-[#00FFD1] font-mono text-sm">
                  {children}
                </code>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </motion.div>
  );
}

