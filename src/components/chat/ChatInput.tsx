'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSubmit, 
  disabled = false,
  placeholder = "Describe your trading strategy..."
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window && window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle iOS keyboard pushing content up
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        setKeyboardHeight(Math.max(0, windowHeight - viewportHeight));
      }
    };

    // Listen to visual viewport changes (keyboard show/hide)
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150); // Max 150px
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  const handleSubmit = () => {
    const trimmedValue = value.trim();
    if (trimmedValue && !disabled) {
      onSubmit(trimmedValue);
      setValue('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Desktop: Submit on Enter (not Shift+Enter)
    // Mobile: Enter always creates new line, must use send button
    if (e.key === 'Enter') {
      if (isMobile) {
        // On mobile, Enter creates new line (default behavior)
        return;
      } else {
        // On desktop, Enter submits (unless Shift is held)
        if (!e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-line-subtle"
      style={{
        paddingBottom: `max(env(safe-area-inset-bottom, 0px), ${keyboardHeight}px)`,
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-end gap-3">
          {/* Input area with terminal prompt inside */}
          <div className="flex-1 relative">
            {/* Terminal prompt - just >> */}
            <div className="absolute left-4 top-[13px] text-gray-900 font-mono text-base pointer-events-none z-10">
              &gt;&gt;
            </div>
            
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="input-terminal w-full resize-none py-3 pl-[48px] pr-12 min-h-[44px] text-gray-900 font-mono"
              style={{
                maxHeight: '150px',
              }}
            />

            {/* Send button (inside textarea) */}
            <button
              onClick={handleSubmit}
              disabled={disabled || !value.trim()}
              className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all duration-200 ${
                disabled || !value.trim()
                  ? 'text-content-tertiary cursor-not-allowed'
                  : 'text-accent-cyan hover:bg-accent-cyan/10'
              }`}
              aria-label="Send message"
            >
              {disabled ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Helper text - Terminal aesthetic (desktop only) */}
        <div className="hidden sm:block mt-2 text-xs text-content-tertiary text-center sm:text-left font-mono">
          <span className="text-accent-cyan">Enter ↵</span> to send, 
          <span className="text-accent-cyan ml-1">Shift+Enter ↵↵</span> for new line
        </div>
      </div>
    </div>
  );
}
