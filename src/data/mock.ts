// Mock data for PropTraderAI Landing Page

export interface NavLink {
  label: string;
  href: string;
}

export interface NavData {
  logo: string;
  links: NavLink[];
  cta: string;
}

export interface HeroData {
  badge: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  integrations: string[];
}

export interface Problem {
  title: string;
  description: string;
}

export interface ProblemData {
  stat: string;
  statLabel: string;
  headline: string;
  description: string;
  problems: Problem[];
}

export interface Feature {
  title: string;
  description: string;
  icon: "MessageSquare" | "Shield" | "Zap" | "CheckCircle";
}

export interface SolutionData {
  headline: string;
  subheadline: string;
  features: Feature[];
}

export interface Step {
  number: string;
  title: string;
  description: string;
}

export interface HowItWorksData {
  headline: string;
  steps: Step[];
}

export interface Platform {
  name: string;
  status: string;
  description: string;
}

export interface IntegrationsData {
  headline: string;
  subheadline: string;
  platforms: Platform[];
  comingSoon: string[];
}

export interface CTAData {
  headline: string;
  subheadline: string;
  inputPlaceholder: string;
  buttonText: string;
  disclaimer: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterData {
  brand: string;
  tagline: string;
  links: FooterLink[];
  legal: FooterLink[];
  copyright: string;
  riskDisclaimer: string;
}

export const heroData: HeroData = {
  badge: "Beta Launching Q2 2026",
  headline: "Your Strategy.",
  headlineAccent: "Our Execution.",
  subheadline: "PropTraderAI helps prop traders pass funding challenges by executing their strategy flawlessly. Natural language commands, institutional-grade execution.",
  ctaPrimary: "Join Early Access",
  ctaSecondary: "See How It Works",
  integrations: ["Tradovate Integration", "Natural Language → Execution"]
};

export const problemData: ProblemData = {
  stat: "94%",
  statLabel: "of prop traders fail their funding challenges",
  headline: "The Problem Isn't Your Strategy",
  description: "You've backtested. You've paper traded. Your edge is real. But when real money hits the screen, something changes. Hesitation. Overtrading. Moving stops. The same patterns that blow every challenge.",
  problems: [
    {
      title: "Emotional Interference",
      description: "Fear and greed override your tested rules at the worst moments"
    },
    {
      title: "Execution Drift",
      description: "Small deviations from your plan compound into failed challenges"
    },
    {
      title: "Inconsistent Application",
      description: "Your edge only works when applied with machine-like precision"
    }
  ]
};

export const solutionData: SolutionData = {
  headline: "Execute Like a Machine. Think Like a Trader.",
  subheadline: "PropTraderAI sits between your strategy and the market. You define the rules. We execute them without hesitation, fear, or deviation.",
  features: [
    {
      title: "Natural Language Strategy Input",
      description: "Describe your strategy in plain English. No coding required. 'Enter long when price breaks above the 15-min high with volume confirmation.'",
      icon: "MessageSquare"
    },
    {
      title: "Behavioral Protection Layer",
      description: "Prevents revenge trading, position oversizing, and rule violations before they happen. Your strategy stays pure.",
      icon: "Shield"
    },
    {
      title: "Institutional Execution",
      description: "Sub-second order placement with smart routing. The same execution quality hedge funds demand.",
      icon: "Zap"
    },
    {
      title: "Prop Firm Compliant",
      description: "Built specifically for prop firm rules. Daily loss limits, position sizing, and trading hour restrictions enforced automatically.",
      icon: "CheckCircle"
    }
  ]
};

export const howItWorksData: HowItWorksData = {
  headline: "From Strategy to Funded in 3 Steps",
  steps: [
    {
      number: "01",
      title: "Define Your Edge",
      description: "Describe your trading strategy using natural language. Our AI parses your rules into executable logic."
    },
    {
      number: "02",
      title: "Connect & Configure",
      description: "Link your Tradovate account. Set your prop firm parameters. Review and approve the execution rules."
    },
    {
      number: "03",
      title: "Execute Flawlessly",
      description: "PropTraderAI monitors the markets 24/5 and executes your strategy with zero emotional interference."
    }
  ]
};

export const integrationsData: IntegrationsData = {
  headline: "Built for Serious Traders",
  subheadline: "Direct integration with the platforms you trust",
  platforms: [
    {
      name: "Tradovate",
      status: "Live Integration",
      description: "Full API access for futures trading"
    }
  ],
  comingSoon: ["NinjaTrader", "Rithmic", "CQG"]
};

export const ctaData: CTAData = {
  headline: "Ready to Pass Your Challenge?",
  subheadline: "Join the waitlist for early access. Limited spots for beta testers.",
  inputPlaceholder: "Enter your email",
  buttonText: "Get Early Access",
  disclaimer: "No spam. Unsubscribe anytime. Beta launching Q2 2026."
};

export const footerData: FooterData = {
  brand: "PropTraderAI",
  tagline: "Your Strategy. Our Execution.",
  links: [
    { label: "Twitter", href: "#" },
    { label: "Discord", href: "#" },
    { label: "Contact", href: "#" }
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Risk Disclosure", href: "#" }
  ],
  copyright: "© 2025 PropTraderAI. All rights reserved.",
  riskDisclaimer: "Trading futures involves substantial risk of loss. PropTraderAI is a software tool and does not guarantee trading results."
};

export const navData: NavData = {
  logo: "PropTraderAI",
  links: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" }
  ],
  cta: "Join Waitlist"
};
