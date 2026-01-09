"use client";

import { Suspense, lazy, FormEvent, ChangeEvent } from "react";
import { heroData } from "@/data/mock";
import { ArrowRight, Cpu, Terminal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface HeroSectionProps {
  onWaitlistSubmit: (e: FormEvent<HTMLFormElement>) => void;
  email: string;
  setEmail: (email: string) => void;
}

export function HeroSection({
  onWaitlistSubmit,
  email,
  setEmail,
}: HeroSectionProps) {
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  return (
    <section className="hero-section">
      <div className="hero-grid-overlay"></div>

      <div className="hero-container">
        <div className="hero-content">
          <Badge className="hero-badge">
            <Cpu size={14} />
            {heroData.badge}
          </Badge>

          <h1 className="hero-headline">
            {heroData.headline}
            <span className="headline-accent">{heroData.headlineAccent}</span>
          </h1>

          <p className="hero-subheadline">{heroData.subheadline}</p>

          <div className="hero-integrations">
            {heroData.integrations.map((item, index) => (
              <span key={index} className="integration-tag">
                <Terminal size={14} />
                {item}
              </span>
            ))}
          </div>

          <form className="hero-form" onSubmit={onWaitlistSubmit}>
            <div className="form-input-wrapper">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleEmailChange}
                className="hero-input"
              />
              <button type="submit" className="btn-primary hero-btn">
                {heroData.ctaPrimary}
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>

        <div className="hero-visual">
          <Suspense
            fallback={
              <div className="spline-fallback">
                <div className="spline-loader"></div>
              </div>
            }
          >
            <Spline scene="https://prod.spline.design/NbVmy6DPLhY-5Lvg/scene.splinecode" />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
