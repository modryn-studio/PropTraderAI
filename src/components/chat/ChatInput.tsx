'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  showAnimation?: boolean; // Show animated placeholder on welcome screen
}

// Example prompts to cycle through
const EXAMPLE_PROMPTS = [
  "Trade pullbacks to 20 EMA when RSI is below 40 during NY session",
  "Buy when price breaks above VWAP with volume 2x average, exit at 1.5% profit or 0.5% stop",
  "Sell ES when it's overbought on 5-min chart during first hour of trading",
  "Fade the extremes on NQ between 9:30-11am, take profit at 15 ticks",
  "Scalp MES on 1-min chart using order flow imbalances, risk 5 ticks per trade",
];

// Quick prompt templates (short buttons that expand to full prompts)
const QUICK_PROMPTS = [
  { label: "ICT", prompt: "I trade using ICT (Inner Circle Trader) concepts like order blocks, fair value gaps, and liquidity grabs on ES futures" },
  { label: "ORB", prompt: "I trade the Opening Range Breakout - buy/sell breakouts from the first 15 minutes of trading on NQ" },
  { label: "VWAP", prompt: "I trade mean reversion to VWAP - fade extremes when price gets too far from VWAP on 5-min chart" },
  { label: "Scalping", prompt: "I scalp ES futures using 1-min charts, in and out quickly for 4-8 ticks, during high volume hours" },
  { label: "Momentum", prompt: "I trade momentum breakouts - enter on strong directional moves with increasing volume, hold for larger targets" },
  { label: "Order Flow", prompt: "I trade using order flow and tape reading - watch for bid/ask imbalances and large orders on the DOM" },
];

export default function ChatInput({ 
  onSubmit,
  onStop,
  disabled = false,
  placeholder = "Describe your trading strategy...",
  showAnimation = false,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      className="fixed bottom-0 left-0 right-0 bg-[#000000] border-t border-[rgba(255,255,255,0.1)]"
      style={{
        paddingBottom: `max(env(safe-area-inset-bottom, 0px), ${keyboardHeight}px)`,
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-3">
        {/* Quick prompt buttons (only on welcome screen) */}
        {showAnimation && value.length === 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {QUICK_PROMPTS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleQuickPrompt(item.prompt)}
                className="px-3 py-1.5 text-xs font-mono bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.1)] rounded hover:bg-[rgba(255,255,255,0.1)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all whitespace-nowrap flex-shrink-0"
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
            {showAnimation && value.length === 0 && animatedPlaceholder && (
              <div className="absolute left-[48px] top-[13px] text-gray-400 font-mono text-sm pointer-events-none z-10">
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
              className="input-terminal w-full resize-none py-3 pl-[48px] pr-12 min-h-[88px] text-gray-900 font-mono"
              style={{
                maxHeight: '200px',
              }}
            />

            {/* Send/Stop button (inside textarea, always at bottom) */}
            <button
              onClick={disabled ? onStop : handleSubmit}
              disabled={!disabled && !value.trim()}
              className={`absolute right-2 bottom-3 p-2 rounded-lg transition-all duration-200 ${
                disabled
                  ? 'text-gray-700 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 cursor-pointer'
                  : !value.trim()
                  ? 'text-[rgba(0,0,0,0.3)] cursor-not-allowed'
                  : 'text-[#00FFD1] hover:bg-[rgba(0,255,209,0.1)]'
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
