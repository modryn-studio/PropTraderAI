'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, HelpCircle } from 'lucide-react';

/**
 * BEGINNER 3-QUESTION FLOW
 * 
 * Structured multi-choice component for users with very vague input (< 30% complete).
 * Offers 3 quick questions that educate through options, not lectures.
 * 
 * From STRATEGY_BUILDER_UNIFIED_GUIDE.md:
 * - Detect very vague input (< 30% complete)
 * - Offer 3 structured multi-choice questions
 * - Educational through options, not lectures
 * 
 * Design: Clean, mobile-first, Terminal Luxe aesthetic
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface QuestionOption {
  id: string;
  label: string;
  subtext?: string;
  value: string;
}

interface StructuredQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
}

interface BeginnerFlowProps {
  onComplete: (answers: Record<string, string>) => void;
  onDismiss?: () => void;
  isVisible?: boolean;
}

// ============================================================================
// STRUCTURED QUESTIONS DATA
// ============================================================================

const STRUCTURED_QUESTIONS: StructuredQuestion[] = [
  {
    id: 'pattern',
    question: "What catches your eye in the market?",
    options: [
      { 
        id: 'breakout', 
        label: 'Breakouts', 
        subtext: 'Price breaking key levels',
        value: 'breakout'
      },
      { 
        id: 'pullback', 
        label: 'Pullbacks', 
        subtext: 'Buying dips in trends',
        value: 'pullback'
      },
      { 
        id: 'orb', 
        label: 'Opening Range', 
        subtext: 'First 15-30 min setups',
        value: 'orb'
      },
      { 
        id: 'unsure', 
        label: 'Not sure yet', 
        subtext: 'Show me examples',
        value: 'unsure'
      },
    ],
  },
  {
    id: 'instrument',
    question: "Which market do you want to trade?",
    options: [
      { 
        id: 'es', 
        label: 'ES', 
        subtext: 'S&P 500 • Slower, forgiving',
        value: 'ES'
      },
      { 
        id: 'nq', 
        label: 'NQ', 
        subtext: 'Nasdaq • Faster moves',
        value: 'NQ'
      },
      { 
        id: 'micro', 
        label: 'Micros', 
        subtext: 'MES/MNQ • 1/10 size',
        value: 'MES'
      },
      { 
        id: 'unsure', 
        label: 'Recommend for me', 
        subtext: 'Based on my risk level',
        value: 'MES'
      },
    ],
  },
  {
    id: 'risk',
    question: "How much to risk per trade?",
    options: [
      { 
        id: 'conservative', 
        label: '$50', 
        subtext: 'Conservative • Tight control',
        value: '$50'
      },
      { 
        id: 'standard', 
        label: '$100', 
        subtext: 'Standard • Industry norm',
        value: '$100'
      },
      { 
        id: 'aggressive', 
        label: '$200', 
        subtext: 'Aggressive • Faster growth',
        value: '$200'
      },
      { 
        id: 'unsure', 
        label: 'Help me decide', 
        subtext: 'Based on account size',
        value: '$100'
      },
    ],
  },
];

// ============================================================================
// OPTION BUTTON COMPONENT
// ============================================================================

interface OptionButtonProps {
  option: QuestionOption;
  isSelected: boolean;
  onSelect: () => void;
}

function OptionButton({ option, isSelected, onSelect }: OptionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        w-full p-3 rounded-lg text-left transition-all duration-200
        border ${isSelected 
          ? 'border-[#00FFD1] bg-[#00FFD1]/10' 
          : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.02)]'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className={`font-mono text-sm ${isSelected ? 'text-[#00FFD1]' : 'text-white'}`}>
            {option.label}
          </span>
          {option.subtext && (
            <p className="text-xs text-[rgba(255,255,255,0.5)] mt-0.5">
              {option.subtext}
            </p>
          )}
        </div>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-5 h-5 rounded-full bg-[#00FFD1] flex items-center justify-center"
          >
            <ChevronRight className="w-3 h-3 text-black" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`
            h-1 flex-1 rounded-full transition-all duration-300
            ${i < currentStep 
              ? 'bg-[#00FFD1]' 
              : i === currentStep 
                ? 'bg-[rgba(0,255,209,0.4)]' 
                : 'bg-[rgba(255,255,255,0.1)]'
            }
          `}
        />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BeginnerThreeQuestionFlow({ 
  onComplete, 
  onDismiss,
  isVisible = true 
}: BeginnerFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const currentQuestion = STRUCTURED_QUESTIONS[currentStep];
  const isLastQuestion = currentStep === STRUCTURED_QUESTIONS.length - 1;
  
  const handleSelect = useCallback((optionId: string, value: string) => {
    setSelectedOption(optionId);
    
    // Update answers
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
    
    // Auto-advance after brief delay
    setTimeout(() => {
      if (isLastQuestion) {
        // Complete the flow
        onComplete({
          ...answers,
          [currentQuestion.id]: value,
        });
      } else {
        // Move to next question
        setCurrentStep(prev => prev + 1);
        setSelectedOption(null);
      }
    }, 400);
  }, [currentQuestion, isLastQuestion, answers, onComplete]);
  
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-auto w-full max-w-md my-4"
    >
      <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#6366f1]/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#6366f1]" />
          </div>
          <div>
            <h3 className="text-white text-sm font-medium">
              Quick Setup
            </h3>
            <p className="text-[rgba(255,255,255,0.5)] text-xs">
              3 questions to get you trading
            </p>
          </div>
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="ml-auto p-1.5 text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Progress */}
          <ProgressIndicator 
            currentStep={currentStep} 
            totalSteps={STRUCTURED_QUESTIONS.length} 
          />
          
          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h4 className="text-white font-medium mb-4">
                {currentQuestion.question}
              </h4>
              
              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map(option => (
                  <OptionButton
                    key={option.id}
                    option={option}
                    isSelected={selectedOption === option.id}
                    onSelect={() => handleSelect(option.id, option.value)}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <span className="text-xs text-[rgba(255,255,255,0.4)] font-mono">
            {currentStep + 1} / {STRUCTURED_QUESTIONS.length}
          </span>
          <span className="text-xs text-[rgba(255,255,255,0.4)]">
            Tap to select
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { STRUCTURED_QUESTIONS };
export type { StructuredQuestion, QuestionOption, BeginnerFlowProps };
