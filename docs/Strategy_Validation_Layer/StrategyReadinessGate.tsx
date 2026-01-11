/**
 * STRATEGY READINESS GATE
 * 
 * Blocks progression to backtesting/execution until strategy meets professional standards.
 * Shows exactly what's missing and guides user to completion.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle2, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { ValidationResult, ValidationIssue, getValidationSummary, getNextActionSuggestion } from '@/lib/strategy/strategyValidator';

interface StrategyReadinessGateProps {
  validation: ValidationResult;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToIssue?: (issue: ValidationIssue) => void;
  onProceedAnyway?: () => void; // For advanced users (hidden by default)
}

export default function StrategyReadinessGate({
  validation,
  isOpen,
  onClose,
  onNavigateToIssue,
  onProceedAnyway,
}: StrategyReadinessGateProps) {
  const canProceed = validation.isComplete && validation.errors.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4"
          >
            <div className="bg-[#000000] border border-[rgba(255,255,255,0.2)] rounded-lg shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {canProceed ? (
                      <div className="p-2 rounded-sm bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)]">
                        <CheckCircle2 className="w-5 h-5 text-[#00FFD1]" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-sm bg-[rgba(255,200,0,0.1)] border border-[rgba(255,200,0,0.3)]">
                        <Lock className="w-5 h-5 text-yellow-400" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-white font-mono font-semibold">
                        {canProceed ? 'Strategy Ready!' : 'Strategy Incomplete'}
                      </h2>
                      <p className="text-xs text-[rgba(255,255,255,0.5)] font-mono mt-0.5">
                        {getValidationSummary(validation)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {canProceed ? (
                  <ReadyToBacktest validation={validation} />
                ) : (
                  <MissingComponents 
                    validation={validation} 
                    onNavigate={onNavigateToIssue}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-mono text-[rgba(255,255,255,0.7)] hover:text-white transition-colors"
                >
                  Continue Editing
                </button>

                {canProceed ? (
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-[#00FFD1] text-black font-mono font-semibold text-sm rounded-sm hover:bg-[#00FFD1]/90 transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Proceed to Backtest
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Hidden "proceed anyway" for advanced users */}
                    {onProceedAnyway && (
                      <button
                        onClick={onProceedAnyway}
                        className="px-4 py-2 text-xs font-mono text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.5)] transition-colors"
                      >
                        Proceed Anyway (Not Recommended)
                      </button>
                    )}
                    
                    <div className="px-4 py-2 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] font-mono font-semibold text-sm rounded-sm cursor-not-allowed flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Locked
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Custom scrollbar styles */}
          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.05);
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(0, 255, 209, 0.3);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(0, 255, 209, 0.5);
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// READY TO BACKTEST VIEW
// ============================================================================

function ReadyToBacktest({ validation }: { validation: ValidationResult }) {
  const { warnings, recommendedMissing } = validation;

  return (
    <div className="space-y-6">
      {/* Success message */}
      <div className="text-center py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="inline-block p-4 rounded-full bg-[rgba(0,255,209,0.1)] border-2 border-[#00FFD1] mb-4"
        >
          <CheckCircle2 className="w-12 h-12 text-[#00FFD1]" />
        </motion.div>
        
        <h3 className="text-white font-mono font-semibold text-lg mb-2">
          Strategy Meets Professional Standards
        </h3>
        
        <p className="text-sm text-[rgba(255,255,255,0.6)] font-mono leading-relaxed max-w-md mx-auto">
          All required components are defined. Your strategy follows prop firm standards and is ready for backtesting.
        </p>
      </div>

      {/* Warnings (if any) */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-semibold text-yellow-400 tracking-wider flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            NOTES ({warnings.length})
          </h4>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="px-3 py-2 rounded-sm bg-[rgba(255,200,0,0.05)] border border-[rgba(255,200,0,0.2)]"
              >
                <p className="text-xs font-mono text-[rgba(255,255,255,0.9)]">
                  {warning.message}
                </p>
                {warning.suggestion && (
                  <p className="text-[10px] font-mono text-[rgba(255,255,255,0.5)] mt-1">
                    💡 {warning.suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended additions */}
      {recommendedMissing.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-mono font-semibold text-[rgba(255,255,255,0.5)] tracking-wider">
            OPTIONAL ENHANCEMENTS ({recommendedMissing.length})
          </h4>
          <div className="space-y-1">
            {recommendedMissing.map((item, index) => (
              <div
                key={index}
                className="px-3 py-2 rounded-sm bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)]"
              >
                <p className="text-xs font-mono text-[rgba(255,255,255,0.7)]">
                  {item.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MISSING COMPONENTS VIEW
// ============================================================================

interface MissingComponentsProps {
  validation: ValidationResult;
  onNavigate?: (issue: ValidationIssue) => void;
}

function MissingComponents({ validation, onNavigate }: MissingComponentsProps) {
  const { requiredMissing, errors, completionScore } = validation;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
          <span className="text-2xl font-mono font-bold text-white">{completionScore}%</span>
          <span className="text-sm font-mono text-[rgba(255,255,255,0.5)]">Complete</span>
        </div>
      </div>

      {/* Next action */}
      <div className="px-4 py-3 rounded-sm bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)]">
        <p className="text-xs font-mono text-[rgba(255,255,255,0.5)] mb-1">
          NEXT STEP
        </p>
        <p className="text-sm font-mono text-white font-semibold">
          {getNextActionSuggestion(validation)}
        </p>
      </div>

      {/* Missing required components */}
      {requiredMissing.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold text-red-400 tracking-wider flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            REQUIRED ({requiredMissing.length})
          </h4>
          
          <div className="space-y-2">
            {requiredMissing.map((issue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  px-4 py-3 rounded-sm border border-[rgba(255,0,0,0.3)] bg-[rgba(255,0,0,0.05)]
                  ${onNavigate ? 'cursor-pointer hover:bg-[rgba(255,0,0,0.1)] group' : ''}
                `}
                onClick={() => onNavigate?.(issue)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-mono text-white font-semibold mb-1">
                      {issue.field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-xs font-mono text-[rgba(255,255,255,0.7)] mb-2">
                      {issue.message}
                    </p>
                    {issue.suggestion && (
                      <p className="text-[10px] font-mono text-[rgba(255,255,255,0.5)] leading-relaxed">
                        💡 {issue.suggestion}
                      </p>
                    )}
                  </div>
                  
                  {onNavigate && (
                    <ChevronRight className="w-4 h-4 text-[rgba(255,255,255,0.3)] group-hover:text-[rgba(255,255,255,0.5)] flex-shrink-0 mt-1" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold text-red-400 tracking-wider flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            ERRORS ({errors.length})
          </h4>
          
          <div className="space-y-2">
            {errors.map((error, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="px-4 py-3 rounded-sm border border-[rgba(255,0,0,0.3)] bg-[rgba(255,0,0,0.05)]"
              >
                <p className="text-xs font-mono text-[rgba(255,255,255,0.9)] mb-1">
                  {error.message}
                </p>
                {error.suggestion && (
                  <p className="text-[10px] font-mono text-[rgba(255,255,255,0.5)]">
                    💡 {error.suggestion}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Professional standards note */}
      <div className="px-4 py-3 rounded-sm bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)]">
        <p className="text-[10px] font-mono text-[rgba(255,255,255,0.5)] leading-relaxed">
          <strong className="text-[#00FFD1]">Professional Standard:</strong> Every strategy
          requires entry criteria, stop-loss, profit target, position sizing, and instrument
          specification. This isn't bureaucracy—it's how prop firms and professional traders
          ensure consistent, profitable execution.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT READINESS INDICATOR (for chat interface)
// ============================================================================

interface ReadinessIndicatorProps {
  validation: ValidationResult;
  onClick?: () => void;
}

export function ReadinessIndicator({ validation, onClick }: ReadinessIndicatorProps) {
  const canProceed = validation.isComplete && validation.errors.length === 0;

  if (canProceed) {
    return (
      <motion.button
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={onClick}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] hover:bg-[rgba(0,255,209,0.15)] transition-colors"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-[#00FFD1]" />
        <span className="text-xs font-mono text-[#00FFD1] font-semibold">
          Ready to Backtest
        </span>
        <ChevronRight className="w-3 h-3 text-[#00FFD1]" />
      </motion.button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
    >
      <Lock className="w-3.5 h-3.5 text-[rgba(255,255,255,0.5)]" />
      <span className="text-xs font-mono text-[rgba(255,255,255,0.7)]">
        {validation.completionScore}% Complete
      </span>
      <ChevronRight className="w-3 h-3 text-[rgba(255,255,255,0.3)]" />
    </button>
  );
}
