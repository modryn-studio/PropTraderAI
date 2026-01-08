'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Zap, Shield, Bot, TrendingUp, Clock, Target } from 'lucide-react';

// Interactive Terminal Demo Component
function TerminalDemo({ compact = false }: { compact?: boolean }) {
  const [text, setText] = useState('');
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const demoStrategy = "Trade pullbacks to 20 EMA when RSI < 40 during morning session";
  const steps = useMemo(() => [
    { label: 'Parsed', delay: 500 },
    { label: 'Validated', delay: 800 },
    { label: 'Ready', delay: 1000 },
  ], []);

  useEffect(() => {
    if (isTyping && text.length < demoStrategy.length) {
      const timeout = setTimeout(() => {
        setText(demoStrategy.slice(0, text.length + 1));
      }, 30);
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
    <div className={`w-full ${compact ? '' : 'max-w-2xl mx-auto'}`}>
      <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden shadow-lg shadow-black/20">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line-subtle bg-bg-tertiary">
          <div className="w-3 h-3 rounded-full bg-loss/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-profit/60" />
          <span className="ml-2 text-xs text-content-tertiary font-data">strategy-builder</span>
        </div>

        {/* Terminal Content */}
        <div className={`${compact ? 'p-4' : 'p-6'} space-y-4`}>
          {/* Prompt */}
          <div className="flex items-start gap-2">
            <span className="text-accent-cyan font-data">&gt;</span>
            <span className="text-content-secondary font-data text-sm">Describe your strategy:</span>
          </div>

          {/* Strategy Text */}
          <div className="pl-4 min-h-[3rem]">
            <span className="font-data text-content-primary text-sm">
              &quot;{text}&quot;
            </span>
            {isTyping && (
              <span className="inline-block w-2 h-4 bg-accent-cyan ml-1 animate-pulse" />
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-3 pt-2">
            {steps.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: step > i ? 1 : 0.3,
                  scale: step > i ? 1 : 0.95,
                }}
                className="flex items-center gap-2"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
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

          {/* CTA when complete */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-2"
            >
              <button
                onClick={resetDemo}
                className="text-accent-cyan text-sm font-medium hover:underline"
              >
                ↻ Replay
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// Industry Stats Bar - Real industry numbers, not PropTraderAI stats
function CredibilityBar() {
  const stats = [
    { 
      value: '$300M+', 
      label: 'Paid to traders industry-wide in 2025',
      icon: TrendingUp 
    },
    { 
      value: '94%', 
      label: 'of traders fail their challenges',
      icon: Target 
    },
    { 
      value: '24/7', 
      label: 'AI execution while you sleep',
      icon: Clock 
    },
  ];

  return (
    <div className="border-y border-line-subtle bg-bg-secondary/50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-cyan/10 flex items-center justify-center shrink-0">
                <stat.icon className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <div className="font-display text-xl font-bold text-content-primary">
                  {stat.value}
                </div>
                <div className="text-xs text-content-tertiary">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Feature Cards - Results-focused messaging with staggered animation
function Features() {
  const features = [
    {
      icon: Bot,
      title: 'Plain English Strategy',
      description: 'Your strategy is good. Just describe it. No Pine Script, no coding, no complexity.',
    },
    {
      icon: Zap,
      title: 'Perfect Execution',
      description: 'AI executes exactly as you described. 24/7 monitoring. Zero emotional trades.',
    },
    {
      icon: Shield,
      title: 'Account Protection',
      description: 'AI monitors your patterns to prevent costly mistakes before they happen.',
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {features.map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -4, borderColor: 'rgba(0, 187, 212, 0.3)' }}
          className="card transition-all duration-200 group"
        >
          <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 flex items-center justify-center mb-4 group-hover:bg-accent-cyan/20 transition-colors">
            <feature.icon className="w-6 h-6 text-accent-cyan" />
          </div>
          <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
          <p className="text-content-secondary text-sm leading-relaxed">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  );
}

// How It Works - Horizontal timeline with connecting line
function HowItWorks() {
  const steps = [
    { step: '01', title: 'Describe', description: 'Tell us your strategy in plain English' },
    { step: '02', title: 'Connect', description: 'Link your Tradovate account securely' },
    { step: '03', title: 'Get Funded', description: 'AI executes perfectly. You pass your challenge.' },
  ];

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Connecting line (desktop only) */}
      <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-accent-cyan/0 via-accent-cyan/30 to-accent-cyan/0" />
      
      <div className="grid md:grid-cols-3 gap-8 md:gap-12">
        {steps.map((item, i) => (
          <motion.div 
            key={item.step} 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="relative text-center"
          >
            {/* Step number */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-tertiary border border-line mb-4 relative z-10">
              <span className="font-display text-xl font-bold text-accent-cyan">{item.step}</span>
            </div>
            <h4 className="font-display font-bold text-lg mb-2">{item.title}</h4>
            <p className="text-content-secondary text-sm">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Main Landing Page
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-line-subtle">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-display font-bold text-xl">
            PropTrader<span className="text-accent-cyan">.AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-content-secondary">
            <a href="#features" className="hover:text-content-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-content-primary transition-colors">How It Works</a>
            <a href="/auth/login" className="hover:text-content-primary transition-colors">Sign In</a>
          </nav>
          <a href="/auth/login" className="btn-primary text-sm py-2 px-4">
            Start Free Trial
          </a>
        </div>
      </header>

      {/* Hero Section - Asymmetric Layout */}
      <section className="pt-28 pb-8 md:pt-32 md:pb-12 px-4 min-h-[90vh] md:min-h-0 flex items-center">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left: Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="order-2 md:order-1"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-cyan/10 border border-accent-cyan/20 rounded-full text-accent-cyan text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
                AI-Powered Trading Execution
              </div>

              {/* Headline */}
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
                Pass your prop challenge.
                <br />
                <span className="text-content-secondary">Finally.</span>
              </h1>
              
              {/* Subheadline */}
              <p className="text-content-secondary text-lg mb-4">
                <span className="text-loss font-medium">94% fail.</span> You don&apos;t have to.
              </p>
              <p className="text-content-tertiary mb-8">
                Your strategy is good. Your execution isn&apos;t. We fix that.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/auth/login" className="btn-primary inline-flex items-center justify-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a href="#how-it-works" className="btn-secondary inline-flex items-center justify-center gap-2">
                  See How It Works
                </a>
              </div>

              {/* Trust indicator */}
              <p className="text-content-tertiary text-xs mt-6">
                No credit card required · Works with Tradovate
              </p>
            </motion.div>

            {/* Right: Terminal Demo */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="order-1 md:order-2"
            >
              <TerminalDemo compact />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Credibility Bar */}
      <CredibilityBar />

      {/* Features Section */}
      <section id="features" className="py-20 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Why Traders Pass With Us
            </h2>
            <p className="text-content-secondary max-w-xl mx-auto">
              Your strategy. Our execution. Perfect results.
            </p>
          </motion.div>
          <Features />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-24 px-4 bg-bg-secondary">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-content-secondary">
              Three steps to funded trading
            </p>
          </motion.div>
          <HowItWorks />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Stop failing challenges.
              <br />
              <span className="text-accent-cyan">Start passing them.</span>
            </h2>
            <p className="text-content-secondary mb-8 max-w-lg mx-auto">
              Your strategy deserves perfect execution. Join traders who&apos;ve stopped letting emotions cost them funded accounts.
            </p>
            <a href="/auth/login" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </a>
            <p className="text-content-tertiary text-sm mt-4">
              No credit card required
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-line-subtle">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="font-display font-bold text-lg">
              PropTrader<span className="text-accent-cyan">.AI</span>
            </div>
            <span className="text-content-tertiary text-sm">
              © 2026 All rights reserved.
            </span>
          </div>
          <div className="flex gap-6 text-sm text-content-tertiary">
            <a href="/privacy" className="hover:text-content-primary transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-content-primary transition-colors">Terms</a>
            <a href="/docs" className="hover:text-content-primary transition-colors">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
