'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';

interface FeedbackButtonProps {
  /** Position for mobile FAB - 'high' for dashboard (above bottom nav), 'low' for landing */
  mobilePosition?: 'high' | 'low';
  /** Hide on mobile entirely (optional) */
  hideOnMobile?: boolean;
}

interface OpenFeedbackEvent extends CustomEvent {
  detail: {
    type?: 'general' | 'bug' | 'feature';
    message?: string;
  };
}

export default function FeedbackButton({ 
  mobilePosition = 'low',
  hideOnMobile = false 
}: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'feature'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Listen for custom event to open with pre-filled content
  const handleOpenFeedback = useCallback((e: Event) => {
    const customEvent = e as OpenFeedbackEvent;
    if (customEvent.detail) {
      if (customEvent.detail.type) {
        setFeedbackType(customEvent.detail.type);
      }
      if (customEvent.detail.message) {
        setFeedback(customEvent.detail.message);
      }
    }
    setIsOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('openFeedback', handleOpenFeedback);
    return () => window.removeEventListener('openFeedback', handleOpenFeedback);
  }, [handleOpenFeedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      setError('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          feedback, 
          feedbackType,
          email: email.trim() || undefined,
          page: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
        }),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');

      setSubmitted(true);
      setFeedback('');
      setEmail('');
      setFeedbackType('general');

      // Reset after 3 seconds
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
      }, 3000);
    } catch {
      setError('Failed to send. Try again?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mobileBottomClass = mobilePosition === 'high' ? 'bottom-24' : 'bottom-6';

  return (
    <>
      {/* Side Tab - Desktop Only */}
      <motion.button
        initial={{ x: 100 }}
        animate={{ x: 0 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 100 }}
        onClick={() => setIsOpen(true)}
        className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-0 z-40 bg-[rgba(10,10,10,0.9)] backdrop-blur-sm border-l border-t border-b border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] hover:text-[#00FFD1] hover:bg-[#121212] px-3 py-6 shadow-lg hover:px-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00FFD1] items-center"
        aria-label="Send feedback"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="text-xs font-medium tracking-wider flex items-center gap-2">
          <MessageSquare 
            className="w-4 h-4" 
            style={{ writingMode: 'horizontal-tb' }} 
          />
          FEEDBACK
        </span>
      </motion.button>

      {/* FAB - Mobile Only */}
      {!hideOnMobile && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 }}
          onClick={() => setIsOpen(true)}
          className={`md:hidden fixed ${mobileBottomClass} right-4 z-40 bg-[rgba(10,10,10,0.9)] backdrop-blur-sm border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] hover:text-[#00FFD1] hover:bg-[#121212] rounded-full p-3 shadow-lg active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[#00FFD1]`}
          aria-label="Send feedback"
        >
          <MessageSquare className="w-5 h-5" />
        </motion.button>
      )}

      {/* Feedback Slide-out Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0a0a0a] border-l border-[rgba(255,255,255,0.1)] shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="font-mono font-bold text-xl text-white">
                      Send Feedback
                    </h3>
                    <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">
                      Help us build what you need
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-[rgba(255,255,255,0.5)] hover:text-white transition-colors p-1"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Success State */}
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 flex items-center justify-center"
                  >
                    <div className="text-center">
                      <div className="w-20 h-20 bg-[rgba(0,255,209,0.1)] flex items-center justify-center mx-auto mb-4">
                        <Send className="w-10 h-10 text-[#00FFD1]" />
                      </div>
                      <p className="text-lg text-white font-medium">
                        Thanks for the feedback!
                      </p>
                      <p className="text-sm text-[rgba(255,255,255,0.5)] mt-2">
                        Every bit helps us help you pass.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    {/* Feedback Type */}
                    <div className="mb-4">
                      <label className="text-sm text-[rgba(255,255,255,0.85)] block mb-2">
                        What type of feedback?
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'general', label: 'General' },
                          { value: 'bug', label: 'Bug' },
                          { value: 'feature', label: 'Feature Idea' },
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFeedbackType(type.value as typeof feedbackType)}
                            className={`px-4 py-2 text-sm font-medium transition-all ${
                              feedbackType === type.value
                                ? 'bg-[#00FFD1] text-black'
                                : 'bg-[#121212] text-[rgba(255,255,255,0.85)] hover:text-white border border-[rgba(255,255,255,0.1)]'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Textarea */}
                    <div className="flex-1 mb-4">
                      <label htmlFor="feedback" className="text-sm text-[rgba(255,255,255,0.85)] block mb-2">
                        What&apos;s on your mind?
                      </label>
                      <textarea
                        id="feedback"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={
                          feedbackType === 'bug' 
                            ? "What happened? What did you expect?" 
                            : feedbackType === 'feature'
                            ? "What would help you pass your challenge?"
                            : "Bug? Feature idea? General thoughts?"
                        }
                        className="w-full h-48 bg-[#121212] border border-[rgba(255,255,255,0.1)] px-4 py-3 text-white placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[#00FFD1] focus:border-transparent resize-none"
                        disabled={isSubmitting}
                        autoFocus
                      />
                    </div>

                    {/* Email (Optional) */}
                    <div className="mb-4">
                      <label htmlFor="email" className="text-sm text-[rgba(255,255,255,0.85)] block mb-2">
                        Email (optional)
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full bg-[#121212] border border-[rgba(255,255,255,0.1)] px-4 py-3 text-white placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[#00FFD1] focus:border-transparent"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">
                        Only if you want a reply
                      </p>
                    </div>

                    {/* Error */}
                    {error && (
                      <p className="text-sm text-[#b5323d] mb-4">{error}</p>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Feedback
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
