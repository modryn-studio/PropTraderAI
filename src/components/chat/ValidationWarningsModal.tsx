'use client';

import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

// Matches the API response from /api/strategy/validate-firm-rules
export interface ValidationWarning {
  type: 'position_limit' | 'risk_limit' | 'consistency' | 'info';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

interface ValidationWarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAnyway: () => void;
  onRevise: () => void;
  firmName: string;
  accountSize: number;
  warnings: ValidationWarning[];
  isValid: boolean;
}

export default function ValidationWarningsModal({
  isOpen,
  onClose,
  onSaveAnyway,
  onRevise,
  firmName,
  accountSize,
  warnings,
}: ValidationWarningsModalProps) {
  if (!isOpen) return null;

  const hasErrors = warnings.some(w => w.severity === 'error');
  const errors = warnings.filter(w => w.severity === 'error');
  const softWarnings = warnings.filter(w => w.severity === 'warning');
  const infoItems = warnings.filter(w => w.severity === 'info');

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-[#12171f] border border-[#2d3544] rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-[#2d3544]">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                hasErrors 
                  ? 'bg-[rgba(239,68,68,0.15)]' 
                  : softWarnings.length > 0 
                    ? 'bg-[rgba(245,158,11,0.15)]' 
                    : 'bg-[rgba(16,185,129,0.15)]'
              }`}>
                {hasErrors || softWarnings.length > 0 ? (
                  <AlertTriangle className={`w-5 h-5 ${
                    hasErrors ? 'text-[#ef4444]' : 'text-[#f59e0b]'
                  }`} />
                ) : (
                  <CheckCircle className="w-5 h-5 text-[#10b981]" />
                )}
              </div>
              <div>
                <h2 className="font-mono font-bold text-lg text-white">
                  {hasErrors 
                    ? 'Rule Violations Detected' 
                    : softWarnings.length > 0 
                      ? 'Potential Issues Found'
                      : 'Strategy Validated'}
                </h2>
                <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">
                  {firmName.toUpperCase()} • ${accountSize.toLocaleString()} Account
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* All clear message */}
            {warnings.length === 0 && (
              <div className="text-center py-4">
                <p className="text-[rgba(255,255,255,0.85)] mb-2">
                  Your strategy complies with {firmName} rules.
                </p>
                <p className="text-sm text-[rgba(255,255,255,0.5)]">
                  You&apos;re ready to save and start trading.
                </p>
              </div>
            )}

            {/* Critical Errors */}
            {errors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-[rgba(239,68,68,0.3)]" />
                  <span className="text-xs font-mono text-[#ef4444] uppercase">
                    Critical Violations
                  </span>
                  <div className="h-px flex-1 bg-[rgba(239,68,68,0.3)]" />
                </div>
                
                {errors.map((warning, idx) => (
                  <div 
                    key={idx}
                    className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg p-4"
                  >
                    <p className="text-sm text-[rgba(255,255,255,0.85)] mb-2">
                      {warning.message}
                    </p>
                    {warning.suggestion && (
                      <p className="text-xs text-[rgba(255,255,255,0.6)] italic">
                        💡 {warning.suggestion}
                      </p>
                    )}
                  </div>
                ))}
                
                <div className="bg-[rgba(239,68,68,0.05)] border-l-4 border-[#ef4444] p-4 rounded">
                  <p className="text-xs text-[rgba(255,255,255,0.85)]">
                    <strong className="text-white">Note:</strong> These violations will likely cause {firmName} to reject trades or fail your challenge. We recommend revising your strategy.
                  </p>
                </div>
              </div>
            )}

            {/* Soft Warnings */}
            {softWarnings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-[rgba(245,158,11,0.3)]" />
                  <span className="text-xs font-mono text-[#f59e0b] uppercase">
                    Warnings
                  </span>
                  <div className="h-px flex-1 bg-[rgba(245,158,11,0.3)]" />
                </div>
                
                {softWarnings.map((warning, idx) => (
                  <div 
                    key={idx}
                    className="bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.2)] rounded-lg p-4"
                  >
                    <p className="text-sm text-[rgba(255,255,255,0.85)]">
                      {warning.message}
                    </p>
                    {warning.suggestion && (
                      <p className="text-xs text-[rgba(255,255,255,0.6)] mt-2 italic">
                        💡 {warning.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Info Items */}
            {infoItems.length > 0 && (errors.length > 0 || softWarnings.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-[rgba(99,102,241,0.3)]" />
                  <span className="text-xs font-mono text-[#6366f1] uppercase">
                    Information
                  </span>
                  <div className="h-px flex-1 bg-[rgba(99,102,241,0.3)]" />
                </div>
                
                {infoItems.map((item, idx) => (
                  <div 
                    key={idx}
                    className="bg-[rgba(99,102,241,0.05)] border border-[rgba(99,102,241,0.2)] rounded-lg p-4"
                  >
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#6366f1] mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-[rgba(255,255,255,0.85)]">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Advisory note */}
            {warnings.length > 0 && (
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-lg p-4 mt-4">
                <p className="text-xs text-[rgba(255,255,255,0.6)]">
                  <strong className="text-[rgba(255,255,255,0.85)]">Disclaimer:</strong> PropTraderAI validates against published firm rules. {firmName} and Tradovate enforce the actual rules. These warnings are advisory—you can save your strategy, but violations may cause trade rejections.
                </p>
              </div>
            )}
          </div>

          {/* Footer - Actions */}
          <div className="p-6 border-t border-[#2d3544] space-y-2">
            {!hasErrors && softWarnings.length === 0 ? (
              <button
                onClick={onSaveAnyway}
                className="w-full btn-primary"
              >
                Save Strategy
              </button>
            ) : (
              <>
                <button
                  onClick={onRevise}
                  className="w-full bg-[#6366f1] text-white px-4 py-3 rounded-md hover:bg-[#5558e3] transition-colors font-medium"
                >
                  Revise Strategy
                </button>
                <button
                  onClick={onSaveAnyway}
                  className="w-full bg-transparent border border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.85)] px-4 py-3 rounded-md hover:bg-[rgba(255,255,255,0.05)] transition-colors font-medium"
                >
                  {hasErrors ? 'Save Anyway (Not Recommended)' : 'Save Anyway'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-full text-sm text-[rgba(255,255,255,0.5)] hover:text-white transition-colors py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
