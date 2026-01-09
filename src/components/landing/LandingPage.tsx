"use client";

import { useState, FormEvent } from "react";
import { Header } from "./Header";
import { HeroSection } from "./HeroSection";
import { ProblemSection } from "./ProblemSection";
import { SolutionSection } from "./SolutionSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { CTASection } from "./CTASection";
import { Footer } from "./Footer";
import { toast } from "@/components/ui/sonner";

export default function LandingPage() {
  const [email, setEmail] = useState("");

  const handleWaitlistSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      // TODO: Implement actual waitlist submission
      toast.success("You're on the list! We'll be in touch soon.");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="landing-page">
      <Header />
      <HeroSection
        onWaitlistSubmit={handleWaitlistSubmit}
        email={email}
        setEmail={setEmail}
      />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <CTASection
        onWaitlistSubmit={handleWaitlistSubmit}
        email={email}
        setEmail={setEmail}
      />
      <Footer />
    </div>
  );
}
