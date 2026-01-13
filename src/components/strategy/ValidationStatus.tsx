'use client';

/**
 * VALIDATION STATUS COMPONENT
 * 
 * Visual display of strategy completeness in the Summary Sidebar.
 * Shows completion progress, missing components, and validation errors.
 * 
 * Design: Progressive reveal (Option C)
 * - Shows ONLY after first rule detected
 * - Required components as checklist
 * - Warnings as yellow, no blocking
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Circle, ChevronRight } from 'lucide-react';
import type { ValidationResult, ValidationIssue } from '@/lib/strategy/strategyValidator';

/**
 * Trigger haptic feedback on mobile devices
 */
function triggerHapticFeedback(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50,
    };
    navigator.vibrate(patterns[style]);
  }
}

interface ValidationStatusProps {
  validation: ValidationResult;
  onNavigateToIssue?: (issue: ValidationIssue) => void;
  compact?: boolean;
}

/**
 * Stabilize rapidly changing values to prevent UI flashing
 * Only updates after the value has been stable for the delay period
 */
function useStabilizedValue<T>(value: T, delay: number = 500): T {
  const [stableValue, setStableValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to update stable value
    timeoutRef.current = setTimeout(() => {
      setStableValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return stableValue;
}

export default function ValidationStatus({ 
  validation, 
  onNavigateToIssue,
  compact = false 
}: ValidationStatusProps) {
  const { completionScore, requiredMissing, recommendedMissing, errors, isComplete } = validation;
  
  // Stabilize warnings to prevent flash during rapid streaming
  // Warnings only update after being stable for 300ms
  const stableWarnings = useStabilizedValue(validation.warnings, 300);

  // Compact mode for inline display
  if (compact) {
    return <ValidationBadge validation={validation} />;
  }

  return (
    <div className="space-y-3">
      {/* Completion Progress */}
      <CompletionProgress score={completionScore} isComplete={isComplete} />

      {/* Required Components Status */}
      <RequiredComponentsStatus 
        missing={requiredMissing} 
        onNavigate={onNavigateToIssue}
      />

      {/* Validation Errors */}
      {errors.length > 0 && (
        <ValidationIssues 
          title="Errors" 
          issues={errors} 
          icon={<AlertCircle className="w-4 h-4 text-red-400" />}
          onNavigate={onNavigateToIssue}
        />
      )}

      {/* Validation Warnings - use stabilized to prevent flash */}
      {stableWarnings.length > 0 && (
        <ValidationIssues 
          title="Warnings" 
          issues={stableWarnings} 
          icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
          onNavigate={onNavigateToIssue}
        />
      )}

      {/* Recommended Components (only show after required complete) */}
      {isComplete && recommendedMissing.length > 0 && (
        <ValidationIssues 
          title="Recommended" 
          issues={recommendedMissing} 
          icon={<Circle className="w-4 h-4 text-[rgba(255,255,255,0.3)]" />}
          onNavigate={onNavigateToIssue}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPLETION PROGRESS
// ============================================================================

interface CompletionProgressProps {
  score: number;
  isComplete: boolean;
}

function CompletionProgress({ score, isComplete }: CompletionProgressProps) {
  const dots = 5;
  const filledDots = Math.round((score / 100) * dots);
  const previousScoreRef = useRef(0);

  // Trigger haptic feedback and screen reader announcement at milestones
  useEffect(() => {
    const milestones = [20, 40, 60, 80, 100];
    const previousScore = previousScoreRef.current;
    
    // Check if we crossed a milestone
    const crossedMilestone = milestones.find(
      milestone => previousScore < milestone && score >= milestone
    );
    
    if (crossedMilestone) {
      // Haptic feedback
      triggerHapticFeedback(crossedMilestone === 100 ? 'heavy' : 'medium');
      
      // Screen reader announcement
      const announcement = crossedMilestone === 100 
        ? 'Strategy complete! All required components defined.'
        : `${crossedMilestone}% complete. ${5 - Math.floor(crossedMilestone / 20)} components remaining.`;
      
      announceToScreenReader(announcement);
    }
    
    previousScoreRef.current = score;
  }, [score]);

  return (
    <div 
      className="px-3 py-3 border border-[rgba(255,255,255,0.1)] rounded-sm bg-[rgba(0,0,0,0.3)]"
      role="status"
      aria-label={`Strategy completion: ${score}%`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Completion dots */}
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: dots }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`w-2 h-2 rounded-full ${
                  i < filledDots
                    ? 'bg-[#00FFD1]'
                    : 'bg-[rgba(255,255,255,0.1)]'
                }`}
              />
            ))}
          </div>
          
          <span className="text-xs font-mono text-[rgba(255,255,255,0.7)]">
            {score}% Complete
          </span>
        </div>

        {isComplete && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1"
          >
            <CheckCircle2 className="w-4 h-4 text-[#00FFD1]" />
          </motion.div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-[#00FFD1] rounded-full"
        />
      </div>

      {/* Status message */}
      <p className="mt-2 text-[10px] font-mono text-[rgba(255,255,255,0.5)]" aria-live="polite">
        {isComplete 
          ? '✓ All required components defined'
          : 'Define required components to proceed'
        }
      </p>
    </div>
  );
}

/**
 * Announce message to screen readers
 */
function announceToScreenReader(message: string) {
  if (typeof window === 'undefined') return;
  
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// ============================================================================
// REQUIRED COMPONENTS STATUS
// ============================================================================

interface RequiredComponentsStatusProps {
  missing: ValidationIssue[];
  onNavigate?: (issue: ValidationIssue) => void;
}

const REQUIRED_COMPONENT_ORDER = ['entry', 'stopLoss', 'profitTarget', 'positionSizing', 'instrument'] as const;
const REQUIRED_COMPONENT_LABELS: Record<string, string> = {
  entry: 'Entry Criteria',
  stopLoss: 'Stop-Loss',
  profitTarget: 'Profit Target',
  positionSizing: 'Position Sizing',
  instrument: 'Instrument',
};

function RequiredComponentsStatus({ missing, onNavigate }: RequiredComponentsStatusProps) {
  const missingFields = new Set(missing.map(m => m.field));

  return (
    <div className="space-y-2" role="region" aria-label="Required strategy components">
      <h3 className="text-[#00FFD1] text-xs font-mono font-semibold tracking-wider px-3">
        REQUIRED COMPONENTS
      </h3>

      <div className="space-y-1" role="list">
        {REQUIRED_COMPONENT_ORDER.map(field => {
          const isMissing = missingFields.has(field);
          const issue = missing.find(m => m.field === field);

          return (
            <motion.div
              key={field}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              role="listitem"
              aria-label={`${REQUIRED_COMPONENT_LABELS[field]}: ${isMissing ? 'missing' : 'complete'}`}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-sm
                ${isMissing 
                  ? 'bg-[rgba(255,0,0,0.05)] border border-[rgba(255,0,0,0.2)]' 
                  : 'bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.1)]'
                }
                ${onNavigate && isMissing ? 'cursor-pointer hover:bg-[rgba(255,0,0,0.1)]' : ''}
              `}
              onClick={() => {
                if (issue && onNavigate) {
                  onNavigate(issue);
                }
              }}
            >
              {isMissing ? (
                <Circle className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00FFD1]" />
              )}

              <span className={`
                flex-1 text-xs font-mono
                ${isMissing ? 'text-[rgba(255,255,255,0.7)]' : 'text-[rgba(255,255,255,0.9)]'}
              `}>
                {REQUIRED_COMPONENT_LABELS[field]}
              </span>

              {isMissing && onNavigate && (
                <ChevronRight className="w-3 h-3 text-[rgba(255,255,255,0.3)]" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// VALIDATION ISSUES LIST
// ============================================================================

interface ValidationIssuesProps {
  title: string;
  issues: ValidationIssue[];
  icon: React.ReactNode;
  onNavigate?: (issue: ValidationIssue) => void;
}

function ValidationIssues({ title, issues, icon, onNavigate }: ValidationIssuesProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3">
        {icon}
        <h3 className="text-xs font-mono font-semibold tracking-wider text-[rgba(255,255,255,0.7)]">
          {title.toUpperCase()} ({issues.length})
        </h3>
      </div>

      <div className="space-y-1">
        {issues.map((issue, index) => (
          <motion.div
            key={`${issue.field}-${index}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              px-3 py-2 rounded-sm border
              ${issue.severity === 'error' 
                ? 'bg-[rgba(255,0,0,0.05)] border-[rgba(255,0,0,0.2)]'
                : issue.severity === 'warning'
                ? 'bg-[rgba(255,200,0,0.05)] border-[rgba(255,200,0,0.2)]'
                : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.1)]'
              }
              ${onNavigate ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.05)]' : ''}
            `}
            onClick={() => onNavigate?.(issue)}
          >
            <p className="text-xs font-mono text-[rgba(255,255,255,0.9)] mb-1">
              {issue.message}
            </p>
            
            {issue.suggestion && (
              <p className="text-[10px] font-mono text-[rgba(255,255,255,0.5)] leading-relaxed">
                💡 {issue.suggestion}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// VALIDATION BADGE (for inline/compact use)
// ============================================================================

interface ValidationBadgeProps {
  validation: ValidationResult;
  showScore?: boolean;
}

export function ValidationBadge({ validation, showScore = true }: ValidationBadgeProps) {
  const { isComplete, completionScore, errors } = validation;

  if (isComplete && errors.length === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)]">
        <CheckCircle2 className="w-3 h-3 text-[#00FFD1]" />
        <span className="text-[10px] font-mono text-[#00FFD1] font-semibold">
          COMPLETE
        </span>
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[rgba(255,0,0,0.1)] border border-[rgba(255,0,0,0.3)]">
        <AlertCircle className="w-3 h-3 text-red-400" />
        <span className="text-[10px] font-mono text-red-400 font-semibold">
          {errors.length} ERROR{errors.length > 1 ? 'S' : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
      <Circle className="w-3 h-3 text-[rgba(255,255,255,0.5)]" />
      <span className="text-[10px] font-mono text-[rgba(255,255,255,0.7)] font-semibold">
        {showScore ? `${completionScore}%` : 'IN PROGRESS'}
      </span>
    </div>
  );
}

// ============================================================================
// READINESS INDICATOR (for chat interface button area)
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
      <Circle className="w-3.5 h-3.5 text-[rgba(255,255,255,0.5)]" />
      <span className="text-xs font-mono text-[rgba(255,255,255,0.7)]">
        {validation.completionScore}% Complete
      </span>
      <ChevronRight className="w-3 h-3 text-[rgba(255,255,255,0.3)]" />
    </button>
  );
}
