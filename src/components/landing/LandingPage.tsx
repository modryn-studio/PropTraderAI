'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import FeedbackButton from '@/components/feedback/FeedbackButton';

// Large Terminal Demo - The Star of the Show
function TerminalHero() {
  const [text, setText] = useState('');
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const demoStrategy = "Trade pullbacks to 20 EMA when RSI < 40 during NY session. Risk 1% per trade, 2:1 reward.";
  const steps = useMemo(() => [
    { label: 'Strategy parsed', delay: 400 },
    { label: 'Rules validated', delay: 700 },
    { label: 'Ready to execute', delay: 1000 },
  ], []);

  useEffect(() => {
    if (isTyping && text.length < demoStrategy.length) {
      const timeout = setTimeout(() => {
        setText(demoStrategy.slice(0, text.length + 1));
      }, 25);
      return () => clearTimeout(timeout);
    } else if (text.length === demoStrategy.length) {
      setIsTyping(false);
      steps.forEach((s, i) => {
        setTimeout(() => setStep(i + 1), s.delay);
      });
    }
  }, [text, isTyping, steps, demoStrategy.length]);

  const resetDemo = () => {
    setText('');
    setStep(0);
    setIsTyping(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-bg-secondary/80 border border-line rounded-2xl overflow-hidden backdrop-blur-sm">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line-subtle bg-bg-tertiary/50">
          <div className="w-3 h-3 rounded-full bg-loss/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-profit/60" />
          <span className="ml-3 text-sm text-content-tertiary font-data">proptrader.ai</span>
        </div>

        {/* Terminal Content */}
        <div className="p-8 md:p-12 space-y-6">
          {/* Prompt */}
          <div className="flex items-start gap-3">
            <span className="text-accent-cyan font-data text-lg">→</span>
            <span className="text-content-secondary font-data">Describe your strategy</span>
          </div>

          {/* Strategy Text - Large and Prominent */}
          <div className="pl-8 min-h-[4rem]">
            <span className="font-data text-content-primary text-lg md:text-xl leading-relaxed">
              {text}
            </span>
            {isTyping && (
              <span className="inline-block w-3 h-6 bg-accent-cyan ml-1 animate-pulse" />
            )}
          </div>

          {/* Status Indicators */}
          <div className="pl-8 flex flex-wrap gap-4 pt-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: step > i ? 1 : 0.3,
                  x: step > i ? 0 : -10,
                }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step > i ? 'bg-profit' : 'bg-line'
                  }`}
                >
                  {step > i && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className={`font-data text-sm transition-colors ${
                    step > i ? 'text-profit' : 'text-content-tertiary'
                  }`}
                >
                  {s.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Replay */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pl-8 pt-2"
            >
              <button
                onClick={resetDemo}
                className="text-content-tertiary text-sm hover:text-accent-cyan transition-colors font-data"
              >
                ↻ replay
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Landing Page - Linear-Inspired
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header - Minimal */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="font-display font-bold text-xl tracking-tight">
            PropTrader<span className="text-accent-cyan">.</span>AI
          </div>
          <div className="flex items-center gap-4">
            <a href="/auth/login" className="text-sm text-content-secondary hover:text-content-primary transition-colors hidden sm:block">
              Sign in
            </a>
            <a href="/auth/login" className="bg-content-primary text-bg-primary text-sm font-medium px-4 py-2 rounded-lg hover:bg-content-secondary transition-colors">
              Sign in
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section - Massive Typography + Terminal */}
      <section className="pt-32 md:pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Headline - MASSIVE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-6"
          >
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Pass your prop challenge.
            </h1>
          </motion.div>

          {/* Subheadline - Simple */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center text-content-secondary text-lg md:text-xl max-w-2xl mx-auto mb-16"
          >
            Describe your strategy in plain English. 
            AI executes it perfectly while you sleep.
          </motion.p>

          {/* Terminal Demo - THE STAR */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <TerminalHero />
          </motion.div>

          {/* CTA Below Terminal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center mt-12"
          >
            <a 
              href="/auth/login" 
              className="inline-flex items-center gap-2 bg-accent-cyan text-bg-primary font-medium px-8 py-4 rounded-xl hover:brightness-110 transition-all text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </a>
            <p className="text-content-tertiary text-sm mt-4">
              No credit card required
            </p>
          </motion.div>
        </div>
      </section>

      {/* Section 2 - The Reality (Not "Why Choose Us") */}
      <section className="py-24 md:py-32 px-6 border-t border-line-subtle">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            {/* Left - The Problem */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-content-tertiary text-sm font-data uppercase tracking-wider mb-4">
                The reality
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight mb-6">
                <span className="text-loss">94%</span> of traders fail their prop challenge.
              </h2>
              <p className="text-content-secondary text-lg leading-relaxed">
                Not because their strategy is bad. Because emotions take over. 
                Revenge trades. Oversizing after losses. Breaking rules at the worst moment.
              </p>
            </motion.div>

            {/* Right - The Solution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-bg-secondary border border-line rounded-2xl p-8 md:p-10"
            >
              <p className="text-accent-cyan text-sm font-data uppercase tracking-wider mb-4">
                The fix
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-bold leading-tight mb-6">
                AI executes your strategy perfectly. Every time.
              </h3>
              <ul className="space-y-4 text-content-secondary">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-profit mt-0.5 shrink-0" />
                  <span>No emotional decisions. No revenge trades.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-profit mt-0.5 shrink-0" />
                  <span>Follows your rules exactly, 24/7.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-profit mt-0.5 shrink-0" />
                  <span>Protects you from blowing your account.</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3 - How It Actually Works (Visual, not numbered steps) */}
      <section className="py-24 md:py-32 px-6 bg-bg-secondary/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Three steps to funded.
            </h2>
          </motion.div>

          {/* Visual Flow - Not Generic Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: 'Describe',
                detail: '"Trade pullbacks to 20 EMA during London session"',
                subtext: 'Plain English. No code.',
              },
              {
                step: 'Connect',
                detail: 'Link your Tradovate account',
                subtext: 'Secure OAuth. 2 clicks.',
              },
              {
                step: 'Pass',
                detail: 'AI executes. You get funded.',
                subtext: 'While you sleep.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                {/* Connector Line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-line to-transparent z-0" />
                )}
                
                <div className="bg-bg-primary border border-line rounded-xl p-8 relative z-10">
                  <div className="text-accent-cyan font-data text-sm mb-4">
                    0{i + 1}
                  </div>
                  <h3 className="font-display text-xl font-bold mb-3">
                    {item.step}
                  </h3>
                  <p className="text-content-primary font-data text-sm mb-2">
                    {item.detail}
                  </p>
                  <p className="text-content-tertiary text-sm">
                    {item.subtext}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 - Final CTA (Clean) */}
      <section className="py-24 md:py-32 px-6 border-t border-line-subtle">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
              Your strategy deserves
              <br />
              <span className="text-accent-cyan">perfect execution.</span>
            </h2>
            <p className="text-content-secondary text-lg mb-10 max-w-xl mx-auto">
              Stop letting emotions cost you funded accounts. 
              Start trading the way you always planned to.
            </p>
            <a 
              href="/auth/login" 
              className="inline-flex items-center gap-2 bg-accent-cyan text-bg-primary font-medium px-8 py-4 rounded-xl hover:brightness-110 transition-all text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="py-8 px-6 border-t border-line-subtle">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-display font-bold text-lg">
            PropTrader<span className="text-accent-cyan">.</span>AI
          </div>
          <div className="flex gap-6 text-sm text-content-tertiary">
            <a href="/privacy" className="hover:text-content-primary transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-content-primary transition-colors">Terms</a>
          </div>
          <p className="text-content-tertiary text-sm">
            © 2026
          </p>
        </div>
      </footer>

      {/* Feedback Button - Landing page position (low) */}
      <FeedbackButton mobilePosition="low" />
    </div>
  );
}
