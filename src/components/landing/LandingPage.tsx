'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Zap, Shield, Bot } from 'lucide-react';

// Interactive Terminal Demo Component
function TerminalDemo() {
  const [text, setText] = useState('');
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const demoStrategy = "Trade pullbacks to 20 EMA when RSI < 40 during morning session";
  const steps = [
    { label: 'Parsed', delay: 500 },
    { label: 'Validated', delay: 800 },
    { label: 'Ready', delay: 1000 },
  ];

  useEffect(() => {
    if (isTyping && text.length < demoStrategy.length) {
      const timeout = setTimeout(() => {
        setText(demoStrategy.slice(0, text.length + 1));
      }, 30);
      return () => clearTimeout(timeout);
    } else if (text.length === demoStrategy.length) {
      setIsTyping(false);
      // Start showing checkmarks
      steps.forEach((s, i) => {
        setTimeout(() => setStep(i + 1), s.delay);
      });
    }
  }, [text, isTyping]);

  const resetDemo = () => {
    setText('');
    setStep(0);
    setIsTyping(true);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line-subtle bg-bg-tertiary">
          <div className="w-3 h-3 rounded-full bg-loss/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-profit/60" />
          <span className="ml-2 text-xs text-content-tertiary font-data">strategy-builder</span>
        </div>

        {/* Terminal Content */}
        <div className="p-6 space-y-4">
          {/* Prompt */}
          <div className="flex items-start gap-2">
            <span className="text-accent-cyan font-data">&gt;</span>
            <span className="text-content-secondary font-data text-sm">Describe your strategy:</span>
          </div>

          {/* Strategy Text */}
          <div className="pl-4 min-h-[3rem]">
            <span className="font-data text-content-primary">
              &quot;{text}&quot;
            </span>
            {isTyping && (
              <span className="inline-block w-2 h-4 bg-accent-cyan ml-1 animate-typing" />
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-3 pt-4">
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
              className="pt-4 flex flex-col sm:flex-row gap-3"
            >
              <button className="btn-primary flex items-center justify-center gap-2">
                Try it yourself
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={resetDemo}
                className="btn-secondary"
              >
                Replay demo
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stats Component - COMMENTED OUT (demo data)
// function Stats() {
//   const stats = [
//     { value: '1,247', label: 'Traders' },
//     { value: '64%', label: 'Pass Rate' },
//     { value: '$2.4M', label: 'In Payouts' },
//   ];

//   return (
//     <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
//       {stats.map((stat) => (
//         <div key={stat.label} className="text-center">
//           <div className="font-data text-2xl sm:text-3xl font-bold text-content-primary">
//             {stat.value}
//           </div>
//           <div className="text-xs sm:text-sm text-content-tertiary mt-1">
//             {stat.label}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// Feature Cards
function Features() {
  const features = [
    {
      icon: Bot,
      title: 'Natural Language',
      description: 'Describe your strategy in plain English. No Pine Script. No coding.',
    },
    {
      icon: Zap,
      title: 'AI Execution',
      description: 'AI monitors 24/7 and executes perfectly. No emotions. No hesitation.',
    },
    {
      icon: Shield,
      title: 'Challenge Guardian',
      description: 'Enforces prop firm rules. Prevents violations before they happen.',
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {features.map((feature) => (
        <motion.div
          key={feature.title}
          whileHover={{ y: -4, borderColor: 'rgba(0, 187, 212, 0.3)' }}
          className="card transition-all duration-200"
        >
          <feature.icon className="w-8 h-8 text-accent-cyan mb-4" />
          <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
          <p className="text-content-secondary text-sm">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  );
}

// How It Works
function HowItWorks() {
  const steps = [
    { step: '01', title: 'Describe', description: 'Tell the AI your strategy in natural language' },
    { step: '02', title: 'Connect', description: 'Link your Tradovate account via OAuth' },
    { step: '03', title: 'Execute', description: 'AI trades for you. You pass your challenge.' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-3xl mx-auto">
      {steps.map((item, i) => (
        <div key={item.step} className="flex-1 relative">
          <div className="flex md:flex-col items-start gap-4">
            <div className="font-display text-4xl font-bold text-accent-cyan/20">
              {item.step}
            </div>
            <div>
              <h4 className="font-display font-bold text-lg">{item.title}</h4>
              <p className="text-content-secondary text-sm mt-1">{item.description}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-accent-cyan/30 to-transparent" />
          )}
        </div>
      ))}
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

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Problem Statement */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-content-secondary mb-6"
          >
            90% fail prop challenges due to{' '}
            <span className="text-loss">execution failure</span>, not strategy failure.
          </motion.p>

          {/* Terminal Demo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <TerminalDemo />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-lg text-content-secondary mb-12"
          >
            Ready to execute. <span className="text-accent-cyan">No code required.</span>
          </motion.p>

          {/* Stats - COMMENTED OUT (demo data) */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Stats />
          </motion.div> */}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 border-t border-line-subtle">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-center mb-4">
            Professional Tools, Human Interface
          </h2>
          <p className="text-content-secondary text-center mb-12 max-w-xl mx-auto">
            Everything you need to pass your prop firm challenge, powered by AI.
          </p>
          <Features />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-bg-secondary">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-center mb-4">
            How It Works
          </h2>
          <p className="text-content-secondary text-center mb-12">
            Describe → AI Executes → You Pass
          </p>
          <HowItWorks />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-line-subtle">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold mb-4">
            You bring the vision.
            <br />
            <span className="text-gradient">We handle everything else.</span>
          </h2>
          <p className="text-content-secondary mb-8">
            Start your free trial. No credit card required.
          </p>
          <a href="/auth/login" className="btn-primary inline-flex items-center gap-2">
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-line-subtle">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-display text-sm text-content-tertiary">
            © 2026 PropTrader.AI. All rights reserved.
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
