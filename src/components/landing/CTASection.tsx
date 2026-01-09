"use client";

import { FormEvent, ChangeEvent } from "react";
import { ctaData } from "@/data/mock";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  onWaitlistSubmit: (e: FormEvent<HTMLFormElement>) => void;
  email: string;
  setEmail: (email: string) => void;
}

export function CTASection({
  onWaitlistSubmit,
  email,
  setEmail,
}: CTASectionProps) {
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  return (
    <section className="cta-section" id="pricing">
      <div className="cta-container">
        <div className="cta-content">
          <h2 className="cta-headline">{ctaData.headline}</h2>
          <p className="cta-subheadline">{ctaData.subheadline}</p>

          <form className="cta-form" onSubmit={onWaitlistSubmit}>
            <div className="cta-input-wrapper">
              <Input
                type="email"
                placeholder={ctaData.inputPlaceholder}
                value={email}
                onChange={handleEmailChange}
                className="cta-input"
              />
              <button type="submit" className="btn-primary cta-btn">
                {ctaData.buttonText}
                <ArrowRight size={18} />
              </button>
            </div>
          </form>

          <p className="cta-disclaimer">{ctaData.disclaimer}</p>
        </div>

        <div className="cta-visual">
          <div className="terminal-window">
            <div className="terminal-header">
              <span className="terminal-dot red"></span>
              <span className="terminal-dot yellow"></span>
              <span className="terminal-dot green"></span>
              <span className="terminal-title">proptrader-ai</span>
            </div>
            <div className="terminal-body">
              <p className="terminal-line">
                <span className="terminal-prompt">$</span> strategy.define()
              </p>
              <p className="terminal-line comment">
                {`// "Enter long ES futures when price breaks 15-min high"`}
              </p>
              <p className="terminal-line">
                <span className="terminal-prompt">$</span> protection.enable()
              </p>
              <p className="terminal-line success">✓ Max daily loss: $1,500</p>
              <p className="terminal-line success">
                ✓ Position sizing: 2 contracts
              </p>
              <p className="terminal-line success">✓ Trading hours: RTH only</p>
              <p className="terminal-line">
                <span className="terminal-prompt">$</span> execute.start()
              </p>
              <p className="terminal-line accent">
                → Monitoring ES_F... Waiting for setup...
              </p>
              <span className="terminal-cursor"></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
