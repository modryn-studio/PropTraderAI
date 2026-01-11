'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface OAuthLoadingModalProps {
  isOpen: boolean;
  firmName: string | null;
  isPersonal: boolean;
}

export default function OAuthLoadingModal({
  isOpen,
  firmName,
  isPersonal,
}: OAuthLoadingModalProps) {
  const [step, setStep] = useState<'connecting' | 'authorizing' | 'syncing' | 'complete'>('connecting');

  // Simulate progress through steps
  useEffect(() => {
    if (!isOpen) {
      setStep('connecting');
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setStep('authorizing'), 600));
    timers.push(setTimeout(() => setStep('syncing'), 1200));
    timers.push(setTimeout(() => setStep('complete'), 1800));

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  const steps = [
    { id: 'connecting', label: 'Connecting to Tradovate...' },
    { id: 'authorizing', label: 'Authorizing access...' },
    { id: 'syncing', label: 'Syncing account data...' },
    { id: 'complete', label: 'Connected!' },
  ];

  const getStepIndex = (stepId: string) => steps.findIndex(s => s.id === stepId);
  const currentStepIndex = getStepIndex(step);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="bg-[#000000] border border-[rgba(255,255,255,0.1)] p-8 w-full max-w-sm">
              {/* Firm Name */}
              <div className="text-center mb-8">
                <h3 className="font-mono font-bold text-xl text-white mb-2">
                  {isPersonal ? 'Personal Account' : firmName}
                </h3>
                <p className="text-sm text-[rgba(255,255,255,0.5)]">
                  Setting up your connection
                </p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-4 mb-8">
                {steps.map((s, index) => {
                  const isActive = index === currentStepIndex;
                  const isComplete = index < currentStepIndex;
                  const isPending = index > currentStepIndex;

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ 
                        opacity: isPending ? 0.3 : 1, 
                        x: 0 
                      }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 ${
                        isPending ? 'opacity-30' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-6 h-6 flex items-center justify-center ${
                        isComplete ? 'text-[#00FFD1]' : 
                        isActive ? 'text-[#00FFD1]' : 'text-[rgba(255,255,255,0.3)]'
                      }`}>
                        {isComplete ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>

                      {/* Label */}
                      <span className={`font-mono text-sm ${
                        isComplete || isActive ? 'text-white' : 'text-[rgba(255,255,255,0.5)]'
                      }`}>
                        {s.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="h-1 bg-[#121212] overflow-hidden">
                <motion.div
                  className="h-full bg-[#00FFD1]"
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: step === 'connecting' ? '25%' :
                           step === 'authorizing' ? '50%' :
                           step === 'syncing' ? '75%' : '100%'
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Info Text */}
              <p className="text-xs text-[rgba(255,255,255,0.4)] text-center mt-6">
                {step === 'complete' 
                  ? 'Redirecting to dashboard...'
                  : 'Please wait while we set up your account'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
