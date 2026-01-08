'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';

interface FeedbackButtonProps {
  /** Position for mobile FAB - 'high' for dashboard (above bottom nav), 'low' for landing */
  mobilePosition?: 'high' | 'low';
  /** Hide on mobile entirely (optional) */
  hideOnMobile?: boolean;
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
        className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-0 z-40 bg-bg-secondary/90 backdrop-blur-sm border-l border-t border-b border-line text-content-tertiary hover:text-accent-cyan hover:bg-bg-tertiary px-3 py-6 rounded-l-lg shadow-lg hover:px-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-cyan items-center"
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
          className={`md:hidden fixed ${mobileBottomClass} right-4 z-40 bg-bg-secondary/90 backdrop-blur-sm border border-line text-content-tertiary hover:text-accent-cyan hover:bg-bg-tertiary rounded-full p-3 shadow-lg active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-accent-cyan`}
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
              className="fixed top-0 right-0 h-full w-full max-w-md bg-bg-secondary border-l border-line shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="font-display font-bold text-xl text-content-primary">
                      Send Feedback
                    </h3>
                    <p className="text-sm text-content-tertiary mt-1">
                      Help us build what you need
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-content-tertiary hover:text-content-primary transition-colors p-1"
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
                      <div className="w-20 h-20 bg-accent-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-10 h-10 text-accent-cyan" />
                      </div>
                      <p className="text-lg text-content-primary font-medium">
                        Thanks for the feedback!
                      </p>
                      <p className="text-sm text-content-tertiary mt-2">
                        Every bit helps us help you pass.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    {/* Feedback Type */}
                    <div className="mb-4">
                      <label className="text-sm text-content-secondary block mb-2">
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
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              feedbackType === type.value
                                ? 'bg-accent-cyan text-bg-primary'
                                : 'bg-bg-tertiary text-content-secondary hover:text-content-primary border border-line'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Textarea */}
                    <div className="flex-1 mb-4">
                      <label htmlFor="feedback" className="text-sm text-content-secondary block mb-2">
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
                        className="w-full h-48 bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent resize-none"
                        disabled={isSubmitting}
                        autoFocus
                      />
                    </div>

                    {/* Email (Optional) */}
                    <div className="mb-4">
                      <label htmlFor="email" className="text-sm text-content-secondary block mb-2">
                        Email (optional)
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-content-tertiary mt-1">
                        Only if you want a reply
                      </p>
                    </div>

                    {/* Error */}
                    {error && (
                      <p className="text-sm text-loss mb-4">{error}</p>
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
