'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  showAnimation?: boolean; // Show animated placeholder on welcome screen
  hasSidebar?: boolean; // Whether the summary sidebar is visible (desktop only)
  /** Bug #5: Callback when keyboard height changes (for iOS) */
  onKeyboardHeightChange?: (height: number) => void;
}

// Example prompts to cycle through - Match supported patterns only
const EXAMPLE_PROMPTS = [
  "ES opening range breakout with 15 tick stop",
  "NQ pullback to 20 EMA during NY session",
  "Buy breakouts above 50-period high",
];

// Quick prompt templates - Only supported patterns (matches canonical schema compilers)
const QUICK_PROMPTS = [
  { label: "ORB", prompt: "I trade the Opening Range Breakout - buy/sell breakouts from the first 15 minutes of trading on NQ with 20 tick stops" },
  { label: "Pullback", prompt: "I trade pullbacks to the 20 EMA on ES futures during the NY session, entering on confirmation candles" },
  { label: "Breakout", prompt: "I trade breakouts above the 50-period high on NQ, entering with volume confirmation and 30 tick stops" },
];

// Bug #6: Removed shuffleArray function - quick prompts now in curated order

export default function ChatInput({ 
  onSubmit,
  onStop,
  disabled = false,
  placeholder = "Describe your trading strategy...",
  showAnimation = false,
  onKeyboardHeightChange,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Bug #6 fix: Removed shuffle to prevent Cumulative Layout Shift (CLS)
  // Quick prompts are now displayed in a curated, predictable order

  // Handle iOS keyboard pushing content up
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const newHeight = Math.max(0, windowHeight - viewportHeight);
        setKeyboardHeight(newHeight);
        // Bug #5: Notify parent of keyboard height change
        onKeyboardHeightChange?.(newHeight);
      }
    };

    // Listen to visual viewport changes (keyboard show/hide)
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [onKeyboardHeightChange]);

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

  // Animated placeholder typewriter effect
  useEffect(() => {
    if (!showAnimation || value.length > 0) {
      setAnimatedPlaceholder('');
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      return;
    }

    let currentPromptIndex = 0;
    let currentText = '';
    let isDeleting = false;
    let charIndex = 0;

    const animate = () => {
      const currentPrompt = EXAMPLE_PROMPTS[currentPromptIndex];

      if (!isDeleting) {
        // Typing phase
        if (charIndex < currentPrompt.length) {
          currentText = currentPrompt.substring(0, charIndex + 1);
          charIndex++;
          setAnimatedPlaceholder(currentText);
          // Fast typing: 30-50ms per character
          animationTimeoutRef.current = setTimeout(animate, Math.random() * 20 + 30);
        } else {
          // Hold for 4 seconds at end
          animationTimeoutRef.current = setTimeout(() => {
            isDeleting = true;
            animate();
          }, 4000);
        }
      } else {
        // Deleting phase
        if (charIndex > 0) {
          charIndex--;
          currentText = currentPrompt.substring(0, charIndex);
          setAnimatedPlaceholder(currentText);
          // Fast deleting: 15-25ms per character (faster than typing)
          animationTimeoutRef.current = setTimeout(animate, Math.random() * 10 + 15);
        } else {
          // Move to next prompt
          currentPromptIndex = (currentPromptIndex + 1) % EXAMPLE_PROMPTS.length;
          isDeleting = false;
          // Brief pause before next prompt
          animationTimeoutRef.current = setTimeout(animate, 300);
        }
      }
    };

    animate();

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [showAnimation, value]);


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
    // Enter always creates new line on all devices
    // User must click send button to submit
    void e;
  };

  const handleQuickPrompt = (prompt: string) => {
    setValue(prompt);
    // Focus textarea after inserting prompt
    textareaRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#000000] border-t border-[rgba(255,255,255,0.1)] flex-shrink-0"
      style={{
        paddingBottom: `max(env(safe-area-inset-bottom, 0px), ${keyboardHeight}px)`,
      }}
    >
      <div className="max-w-3xl mx-auto px-6 py-3">
        {/* Quick prompt buttons (only on welcome screen) */}
        {showAnimation && value.length === 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {QUICK_PROMPTS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleQuickPrompt(item.prompt)}
                className="px-3 py-1.5 text-xs font-mono bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all whitespace-nowrap flex-shrink-0"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Input area with terminal prompt inside */}
          <div className="flex-1 relative">
            {/* Terminal prompt - just >> */}
            <div className="absolute left-4 top-[13px] text-gray-900 font-mono text-base pointer-events-none z-10">
              &gt;&gt;
            </div>
            
            {/* Animated placeholder overlay (only when showAnimation and no user input) */}
            {/* Bug #10: Removed z-10 to prevent overlap with user input */}
            {showAnimation && value.length === 0 && animatedPlaceholder && (
              <div className="absolute left-[48px] top-[13px] text-gray-400 font-mono text-sm pointer-events-none">
                {animatedPlaceholder}
              </div>
            )}
            
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={showAnimation ? "" : placeholder}
              disabled={disabled}
              rows={1}
              className="input-terminal w-full resize-none py-3 pl-[48px] pr-12 text-gray-900 font-mono"
              style={{
                minHeight: '88px',
                height: '88px', // Bug #4: Start at min height to prevent jump on first keystroke
                maxHeight: '200px',
              }}
            />

            {/* Send/Stop button (inside textarea, always at bottom) */}
            <button
              onClick={disabled ? onStop : handleSubmit}
              disabled={!disabled && !value.trim()}
              className={`absolute right-2 bottom-3 p-2 transition-all duration-200 ${
                disabled
                  ? 'text-gray-700 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 cursor-pointer'
                  : !value.trim()
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-900 hover:text-black hover:bg-gray-100'
              }`}
              aria-label={disabled ? 'Stop generating' : 'Send message'}
            >
              {disabled ? (
                // Stop icon: circle with square inside (ChatGPT/Claude style)
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="6.5"
                    y="6.5"
                    width="7"
                    height="7"
                    rx="1"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
