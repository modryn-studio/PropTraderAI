'use client';

/**
 * STRATEGY READINESS GATE
 * 
 * Blocks progression to backtesting/execution until strategy meets professional standards.
 * Shows exactly what's missing and guides user to completion.
 * 
 * Behavior:
 * - Backtest: HARD BLOCK (technically impossible to backtest incomplete strategy)
 * - Save: SOFT BLOCK (warning with "Save Anyway" option for drafts)
 * 
 * Mobile: Bottom sheet pattern
 * Desktop: Centered modal
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle2, AlertCircle, ChevronRight, Sparkles, Save } from 'lucide-react';
import type { ValidationResult, ValidationIssue } from '@/lib/strategy/strategyValidator';
import { getValidationSummary, getNextActionSuggestion, REQUIRED_COMPONENTS } from '@/lib/strategy/strategyValidator';

export type GateMode = 'backtest' | 'save';

interface StrategyReadinessGateProps {
  validation: ValidationResult;
  mode: GateMode;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToIssue?: (issue: ValidationIssue) => void;
  onProceedAnyway?: () => void; // Only for save mode (soft block)
  onProceed?: () => void; // When strategy is ready
}

export default function StrategyReadinessGate({
  validation,
  mode,
  isOpen,
  onClose,
  onNavigateToIssue,
  onProceedAnyway,
  onProceed,
}: StrategyReadinessGateProps) {
  const canProceed = validation.isComplete && validation.errors.length === 0;
  const isBacktestMode = mode === 'backtest';
  const isSaveMode = mode === 'save';

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

          {/* Modal - Bottom sheet on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 300 || info.offset.y > 100) {
                onClose();
              }
            }}
            className="fixed left-0 right-0 bottom-0 md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-lg md:mx-4"
          >
            <div className="bg-[#000000] border border-[rgba(255,255,255,0.2)] md:rounded-lg rounded-t-2xl shadow-2xl overflow-hidden">
              {/* Drag handle (mobile only) */}
              <div className="md:hidden pt-3 pb-2 flex justify-center">
                <div className="w-10 h-1 bg-[rgba(255,255,255,0.2)] rounded-full" />
              </div>

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
                        {canProceed 
                          ? 'Strategy Ready!' 
                          : isBacktestMode 
                            ? 'Cannot Backtest' 
                            : 'Strategy Incomplete'
                        }
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
                  <ReadyToBacktest validation={validation} mode={mode} />
                ) : (
                  <MissingComponents 
                    validation={validation} 
                    mode={mode}
                    onNavigate={onNavigateToIssue}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-mono text-[rgba(255,255,255,0.7)] hover:text-white transition-colors"
                >
                  Continue Editing
                </button>

                {canProceed ? (
                  <button
                    onClick={onProceed || onClose}
                    className="px-6 py-2 bg-[#00FFD1] text-black font-mono font-semibold text-sm rounded-sm hover:bg-[#00FFD1]/90 transition-colors flex items-center gap-2"
                  >
                    {isBacktestMode ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Proceed to Backtest
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Strategy
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* "Save Anyway" only for save mode (soft block) */}
                    {isSaveMode && onProceedAnyway && (
                      <button
                        onClick={onProceedAnyway}
                        className="px-4 py-2 text-xs font-mono text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.2)] rounded-sm hover:border-[rgba(255,255,255,0.3)] transition-colors"
                      >
                        Save Draft Anyway
                      </button>
                    )}
                    
                    {/* Hard block for backtest */}
                    {isBacktestMode && (
                      <div className="px-4 py-2 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] font-mono font-semibold text-sm rounded-sm cursor-not-allowed flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Locked
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// READY TO BACKTEST VIEW
// ============================================================================

interface ReadyToBacktestProps {
  validation: ValidationResult;
  mode: GateMode;
}

function ReadyToBacktest({ validation, mode }: ReadyToBacktestProps) {
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
          All required components are defined. Your strategy follows prop firm standards and is ready for {mode === 'backtest' ? 'backtesting' : 'saving'}.
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
  mode: GateMode;
  onNavigate?: (issue: ValidationIssue) => void;
}

function MissingComponents({ validation, mode, onNavigate }: MissingComponentsProps) {
  const { requiredMissing, errors, completionScore } = validation;
  const isBacktestMode = mode === 'backtest';

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
          <span className="text-2xl font-mono font-bold text-white">{completionScore}%</span>
          <span className="text-sm font-mono text-[rgba(255,255,255,0.5)]">Complete</span>
        </div>
      </div>

      {/* Explanation for backtest hard block */}
      {isBacktestMode && requiredMissing.length > 0 && (
        <div className="px-4 py-3 rounded-sm bg-[rgba(255,0,0,0.05)] border border-[rgba(255,0,0,0.2)]">
          <p className="text-xs font-mono text-[rgba(255,255,255,0.7)] leading-relaxed">
            <strong className="text-red-400">Cannot backtest:</strong> A trading strategy requires all 5 components to simulate. Missing components make backtesting technically impossible.
          </p>
        </div>
      )}

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
            {requiredMissing.map((issue, index) => {
              const component = REQUIRED_COMPONENTS[issue.field as keyof typeof REQUIRED_COMPONENTS];
              
              return (
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
                        {component?.name || issue.field}
                      </p>
                      <p className="text-xs font-mono text-[rgba(255,255,255,0.7)] mb-2">
                        {component?.description || issue.message}
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
              );
            })}
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
          specification. This isn't bureaucracy—it's how prop firms ensure consistent execution.
        </p>
      </div>
    </div>
  );
}
