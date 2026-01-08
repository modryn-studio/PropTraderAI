# PropTraderAI Landing Page Design Specification
## "Terminal Credibility Meets Trading Psychology"

**Version:** 1.0  
**Created:** January 8, 2026  
**Status:** Vision Document (Pre-Implementation)

---

## Executive Summary

This document defines the visual direction, structure, and implementation strategy for the PropTraderAI landing page. The goal is to create a **credible, professional pre-launch page** that:

1. Positions PropTraderAI as serious technology (not a weekend hackathon project)
2. Captures emails for waitlist and update communications
3. Establishes the "vibe trading" category without looking like every other AI SaaS
4. Communicates innovation + aspiration ("Pass your next challenge")

---

## Research Findings & Anti-Patterns

### What to Avoid (The "Vibe Coded SaaS" Problem)

Based on research, these patterns scream "template" or "AI-generated":

| Pattern | Why It's Overused | What Props Firms Do |
|---------|-------------------|---------------------|
| Centered hero with "Revolutionary AI-Powered Platform" | Every SaaS 2020-2025 | Topstep uses video hero + stats |
| Purple/blue gradients on white | Default AI aesthetic | Brokers use dark themes |
| Inter + system fonts | Zero personality | Linear uses SF Pro Display |
| Cards grid → "Why choose us" → Testimonials → CTA | Predictable flow | Stripe breaks patterns |
| Generic stock photos | Lazy, unauthentic | Show actual product |
| Confetti/celebration animations | Gamified, toy-like | Minimal, purposeful motion |

### What Works (Research-Backed)

| Source | Pattern That Works | Why |
|--------|-------------------|-----|
| **Linear** | Dark mode, Inter + SF Pro, gradient orb backgrounds, product-first hero | Professional developer aesthetic, feels like actual tool |
| **Stripe** | Dense info presented elegantly, asymmetric layouts, gradient waves | Technical credibility without overwhelming |
| **Topstep** | Video hero, real statistics (10,000+ traders, 81,177 payouts), pricing tables prominent | Social proof + transparency builds trust |
| **Vercel** | Pure black/white, terminal-inspired, Geist typography | Speed + sophistication for technical users |

### The Sweet Spot for PropTraderAI

**Not Robinhood** (too gamified, hides complexity)  
**Not Bloomberg** (too overwhelming, intimidating)  
**Not Generic SaaS** (too template, forgettable)

**= "Terminal Luxe meets Trading Psychology"**

A landing page that says: *"This was built by someone who understands trading AND serious software."*

---

## Aesthetic Direction: "Terminal Command Center"

### The Concept

Imagine walking into a professional trading floor at night. Dark screens, focused light, data streams, the hum of serious work being done. That's the feeling.

**Inspiration Blend:**
- Linear's dark elegance + gradient orbs
- Topstep's credibility signals + real statistics
- Terminal/IDE aesthetic (monospace where it matters)
- Trading floor gravitas (not crypto hype)

### Color Palette

```css
/* Base - Deep Terminal Black (Not Pure Black) */
--bg-primary: #0a0e14;        /* Canvas - easier on eyes than #000 */
--bg-secondary: #12171f;      /* Cards, elevated surfaces */
--bg-tertiary: #1a2029;       /* Hover states, borders */

/* Text - High Contrast Hierarchy */
--text-primary: #e6edf3;      /* Headlines, important text */
--text-secondary: #8b949e;    /* Body text, descriptions */
--text-tertiary: #6e7681;     /* Captions, subtle info */

/* Accent - Single Distinctive Color */
--accent-cyan: #00bbd4;       /* Primary CTA, active states */
--accent-cyan-glow: rgba(0, 187, 212, 0.3);  /* Glow effects */

/* Semantic - Trading Specific */
--profit-green: #00897b;      /* Success, gains (not neon) */
--loss-red: #b5323d;          /* Warnings, losses (not alarm red) */

/* Decorative - Atmospheric */
--gradient-start: rgba(0, 187, 212, 0.15);
--gradient-end: rgba(139, 92, 246, 0.1);
```

### Typography

```css
/* Display - Terminal Authority */
--font-display: 'Space Mono', 'IBM Plex Mono', monospace;
/* Use for: Logo lockup, hero stat numbers, emphasis */

/* Body - Clean Readability */
--font-body: 'Inter var', -apple-system, BlinkMacSystemFont, sans-serif;
/* Use for: All body text, descriptions, buttons */

/* Data - Precision Numbers */
--font-data: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
/* Use for: Statistics, prices, percentages, financial data */

/* Scale */
--text-hero: clamp(2.5rem, 6vw, 4rem);     /* Hero headline */
--text-subhero: clamp(1.125rem, 2vw, 1.5rem);  /* Subheadline */
--text-body: 1rem;                          /* 16px base */
--text-small: 0.875rem;                     /* 14px captions */
```

**Typography Rationale:**
- Monospace for numbers establishes financial credibility
- Inter body text is professional without being boring (it's fine for body, just not headlines)
- Scale is large and confident, not cramped

---

## Page Structure (Breaking the Template)

### The Anti-Template Approach

Instead of the typical:
```
Hero (centered) → Features Grid → Testimonials → Pricing → CTA Footer
```

We use:
```
1. Immersive Hero (asymmetric, interactive demo)
2. Credibility Bar (hard numbers, no fluff)
3. The Problem/Solution Split (visual contrast)
4. Interactive Preview (typewriter demo of the product)
5. Waitlist Capture (prominent, above-fold option)
6. Footer (minimal, professional)
```

---

## Section-by-Section Specification

### Section 1: Hero - "The Terminal Intro"

**Layout:** Full viewport, asymmetric split

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]                                    [Waitlist CTA]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    PROPTRADER                              ┌─────────────────┐ │
│    .AI                                     │                 │ │
│                                            │  [Animated      │ │
│    Pass your next challenge.               │   Terminal      │ │
│                                            │   Demo]         │ │
│    AI that executes your strategy          │                 │ │
│    perfectly. No code required.            │  > Trade pull.. │ │
│                                            │  ✓ Parsing...   │ │
│    ┌────────────────────────────────────┐  │                 │ │
│    │ Enter email for early access      │  └─────────────────┘ │
│    └────────────────────────────────────┘                      │
│    [Join Waitlist]                                              │
│                                                                 │
│    [Scroll indicator]                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**

1. **Logo Treatment:**
   - "PROPTRADER" in Space Mono, bold
   - ".AI" in accent cyan
   - Positioned top-left (not centered)

2. **Headline:**
   - "Pass your next challenge." (aspirational, not fear-based)
   - Large, confident typography (clamp 2.5-4rem)
   - Left-aligned (breaks centered hero pattern)

3. **Subheadline:**
   - "AI that executes your strategy perfectly. No code required."
   - Secondary color, supporting text

4. **Interactive Terminal Demo (Right Side):**
   - Animated typewriter effect showing:
     ```
     > Trade pullbacks to 20 EMA when RSI is below 40
     
     ✓ Strategy parsed
     ✓ Rules validated  
     ✓ Connected to Tradovate
     
     Ready to monitor. We'll protect you.
     ```
   - Dark card with subtle glow
   - Shows product value immediately
   - NOT a screenshot - animated to capture attention

5. **Email Capture (Above Fold):**
   - Simple input + button
   - Placeholder: "Enter email for early access"
   - Button: "Join Waitlist" (cyan accent)
   - Note: "Be first to know when we launch"

6. **Background:**
   - Gradient orb (Linear-style) positioned behind terminal
   - Subtle grid pattern (terminal aesthetic)
   - NO stock photos, NO generic graphics

**Motion:**
- Logo fades in (0.3s)
- Headline slides up (0.4s, staggered)
- Terminal demo starts after 0.8s
- Typewriter effect at 50ms per character
- Checkmarks appear with slight bounce

---

### Section 2: Credibility Bar - "The Numbers That Matter"

**Layout:** Horizontal strip, full width

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    90%              $1B+                 24/7              2025 │
│    of traders       in prop firm         market             Q2  │
│    fail from        payouts             monitoring        Launch│
│    emotions,        available           capability              │
│    not strategy                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**

1. **Four Statistics:**
   - **"90%"** - of traders fail from emotions, not strategy
   - **"$1B+"** - in prop firm payouts available annually (industry stat)
   - **"24/7"** - market monitoring capability (feature preview)
   - **"Q2 2025"** - Launch target (creates urgency)

2. **Design:**
   - Dark background, slightly elevated from hero
   - Numbers in monospace (JetBrains Mono), large
   - Descriptions in secondary text color
   - Subtle separator lines between stats
   - NO icons - let numbers speak

**Important:** Since we don't have user data yet, use industry statistics. This maintains credibility without faking metrics.

---

### Section 3: The Problem/Solution Split

**Layout:** Two-column visual contrast

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐│
│  │  WITHOUT PROPTRADER.AI   │  │  WITH PROPTRADER.AI          ││
│  │                          │  │                              ││
│  │  [Dark, chaotic visual]  │  │  [Clean, controlled visual]  ││
│  │                          │  │                              ││
│  │  ✗ Revenge trades after  │  │  ✓ AI detects tilt before    ││
│  │    losses                │  │    you trade                 ││
│  │  ✗ Breaking rules when   │  │  ✓ Rules enforced            ││
│  │    on tilt               │  │    automatically             ││
│  │  ✗ Watching charts 24/7  │  │  ✓ AI monitors, you live     ││
│  │  ✗ Coding Pine Script    │  │  ✓ Natural language          ││
│  │                          │  │                              ││
│  │  "I know what to do,     │  │  "AI executes what I         ││
│  │   I just can't stop      │  │   already know works."       ││
│  │   myself."               │  │                              ││
│  │                          │  │                              ││
│  └──────────────────────────┘  └──────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**

1. **Left Card (Problem):**
   - Slightly darker, muted
   - Red accent on X marks
   - Quote from the trader perspective
   - Visual: Chaotic chart lines, multiple indicators, stress

2. **Right Card (Solution):**
   - Slightly brighter, elevated
   - Green accent on checkmarks
   - Clear, confident messaging
   - Visual: Clean interface, single focused element

**Messaging Approach:**
- Speak to the REAL problem (emotional trading)
- Not "we're better than competitors"
- It's "with us vs without us"
- Quote format creates relatability

---

### Section 4: Interactive Preview - "See It In Action"

**Layout:** Full-width, centered terminal simulation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    HOW IT WORKS                                 │
│                                                                 │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ PropTrader.AI Terminal                            [_][-][x]│
│    ├────────────────────────────────────────────────────────┤  │
│    │                                                        │  │
│    │  > Describe your strategy:                             │  │
│    │                                                        │  │
│    │  [Animated typing: "Trade pullbacks to 20 EMA when     │  │
│    │   RSI is below 40 during morning session"]             │  │
│    │                                                        │  │
│    │  ──────────────────────────────────────────────────    │  │
│    │                                                        │  │
│    │  AI: "Which EMA period? (9, 20, or 50 are common)"     │  │
│    │                                                        │  │
│    │  > 20                                                  │  │
│    │                                                        │  │
│    │  AI: "Got it. What defines a pullback for you?"        │  │
│    │                                                        │  │
│    │  ✓ Strategy saved                                      │  │
│    │  ✓ Monitoring enabled                                  │  │
│    │  ✓ Challenge Guardian active                           │  │
│    │                                                        │  │
│    │  Ready. We'll watch the market. You live your life.    │  │
│    │                                                        │  │
│    └────────────────────────────────────────────────────────┘  │
│                                                                 │
│    [See the full platform →]  (links to waitlist)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Details:**

1. **Terminal Window:**
   - macOS-style window chrome (circles, not squares)
   - Dark background (#0a0e14)
   - Subtle drop shadow with glow

2. **Animation Sequence:**
   - User "typing" at 50ms per char
   - AI response "streams in" (ChatGPT-style)
   - Checkmarks appear with stagger (0.15s delay each)
   - Final message fades in

3. **Timing:**
   - Total sequence: ~15 seconds
   - Loops after 3 second pause
   - User can restart by clicking

4. **CTA Below:**
   - "See the full platform →"
   - Links to waitlist capture (scroll or modal)

---

### Section 5: Waitlist Capture - "Join the Movement"

**Layout:** Full-width, high contrast

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ██████████████████████████████████████████████████████████   │
│    █                                                        █   │
│    █   STOP FAILING FROM EXECUTION.                         █   │
│    █   START WINNING FROM DISCIPLINE.                       █   │
│    █                                                        █   │
│    █   Be first to access PropTrader.AI when we launch.     █   │
│    █                                                        █   │
│    █   ┌─────────────────────────────────┐                  █   │
│    █   │ Your email                      │  [Get Early      █   │
│    █   └─────────────────────────────────┘   Access]        █   │
│    █                                                        █   │
│    █   ○ Early access to beta                               █   │
│    █   ○ Development updates                                █   │
│    █   ○ Founding member pricing                            █   │
│    █                                                        █   │
│    ██████████████████████████████████████████████████████████   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**

1. **Bold Headline:**
   - Direct, not cute
   - "Stop failing" / "Start winning" contrast
   - Terminal uppercase aesthetic

2. **Value Prop for Signing Up:**
   - Early access to beta
   - Development updates (they'll see progress)
   - Founding member pricing (exclusivity)

3. **Form:**
   - Single email field (reduce friction)
   - Button: "Get Early Access" (action-oriented)
   - No name field needed

4. **Background:**
   - Gradient accent (cyan → purple subtle)
   - Differentiates from dark sections

---

### Section 6: Footer - "Professional Minimalism"

**Layout:** Clean, informative, not cluttered

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  PROPTRADER.AI                                                  │
│                                                                 │
│  AI agent system for prop trading discipline.                   │
│  Describe your strategy. We execute it perfectly.               │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Twitter/X]  [Discord]  [Email]                                │
│                                                                 │
│  © 2026 PropTrader AI. All rights reserved.                     │
│  [Privacy] [Terms] [Contact]                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**

1. **Logo + Tagline:**
   - Reinforce positioning
   - Simple mission statement

2. **Social Links:**
   - Twitter/X (for updates)
   - Discord (for community - can set up free)
   - Email (direct contact)

3. **Legal:**
   - Standard links
   - Can be placeholder initially
   - Shows professionalism

---

## Technical Implementation

### Framework & Stack

```javascript
// Recommended Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (for animations)

// Hosting
- Vercel (free tier sufficient)

// Email Capture Options (In order of recommendation)
1. Supabase (already in stack - direct to database)
2. Mailerlite (free tier, good deliverability)
3. ConvertKit (creator-focused, free tier)
4. Google Forms (backup - not ideal UX)
```

### Email Capture Implementation

**Option A: Supabase Direct (Recommended)**
```typescript
// Already in your stack, zero additional cost
// Create table: waitlist_signups (email, created_at, source)

async function handleWaitlistSubmit(email: string) {
  const { error } = await supabase
    .from('waitlist_signups')
    .insert({ 
      email, 
      source: 'landing_page',
      created_at: new Date().toISOString() 
    });
  
  // Send confirmation email via Resend or similar
  await sendWelcomeEmail(email);
}
```

**Option B: Mailerlite Integration**
```typescript
// Free tier: 1,000 subscribers, 12,000 emails/month
// Good deliverability, landing page builder included

const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;

async function subscribeToMailerlite(email: string) {
  await fetch('https://api.mailerlite.com/api/v2/subscribers', {
    method: 'POST',
    headers: {
      'X-MailerLite-ApiKey': MAILERLITE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      groups: ['proptrader-waitlist']
    })
  });
}
```

### Feedback Mechanism

**Google Forms Embed (Simple)**
```html
<!-- Hidden button that opens modal/new tab -->
<a href="https://forms.gle/YOUR_FORM_ID" target="_blank">
  Send Feedback
</a>
```

**Or Formsubmit.io**
```html
<form action="https://formsubmit.io/send/YOUR_EMAIL" method="POST">
  <input type="text" name="name" required>
  <textarea name="feedback" required></textarea>
  <button type="submit">Send</button>
</form>
```

### Animation Implementation

**Typewriter Effect (CSS + JS)**
```typescript
// components/Typewriter.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Typewriter({ text, speed = 50 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <span className="font-mono text-text-primary">
      {displayedText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="text-accent-cyan"
      >
        |
      </motion.span>
    </span>
  );
}
```

**Staggered Reveal (Framer Motion)**
```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};
```

---

## Mobile Considerations

### Responsive Breakpoints

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Mobile-Specific Adjustments

| Section | Desktop | Mobile |
|---------|---------|--------|
| Hero | Split layout (text + terminal) | Stacked (text → terminal) |
| Credibility Bar | 4 columns | 2x2 grid |
| Problem/Solution | Side by side | Stacked cards |
| Terminal Demo | Full width | Horizontal scroll or simplified |
| Footer | Multi-column | Single column |

### Touch Targets

- Minimum 44px for all interactive elements
- Email input: 48px height minimum
- CTA buttons: 52px height, generous padding

---

## Performance Targets

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| Total Page Weight | < 500KB |
| Time to Interactive | < 3s |

### Optimization Strategies

1. **Fonts:** Preload display fonts, use `font-display: swap`
2. **Images:** Use WebP/AVIF, lazy load below fold
3. **Animations:** CSS-only where possible, will-change for complex
4. **Code:** Tree-shake unused Tailwind, code-split if needed

---

## Pre-Launch Checklist

### Before Publishing

- [ ] Email capture functional (tested)
- [ ] Confirmation email sends
- [ ] Mobile responsive (tested on real devices)
- [ ] Privacy policy page (can be simple)
- [ ] Terms of use page (can be simple)
- [ ] SSL certificate (Vercel handles)
- [ ] Analytics setup (Vercel Analytics or Plausible)
- [ ] Social meta tags (og:image, twitter:card)
- [ ] Favicon + app icons

### Social Meta Tags

```html
<meta property="og:title" content="PropTrader.AI - Pass Your Next Challenge" />
<meta property="og:description" content="AI that executes your trading strategy perfectly. No code required." />
<meta property="og:image" content="https://proptrader.ai/og-image.png" />
<meta property="og:type" content="website" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="PropTrader.AI" />
<meta name="twitter:description" content="AI that executes your trading strategy perfectly." />
<meta name="twitter:image" content="https://proptrader.ai/og-image.png" />
```

---

## Success Metrics

### Week 1 Goals

- [ ] 50+ email signups
- [ ] <3% bounce rate
- [ ] Mobile usability score >90 (Google)
- [ ] Page load <3s on mobile

### Month 1 Goals

- [ ] 200+ email signups
- [ ] 10+ feedback submissions
- [ ] Social shares (track via UTM)
- [ ] "This looks legit" feedback from traders

---

## Summary: The PropTraderAI Difference

| Generic SaaS | PropTraderAI |
|--------------|--------------|
| Centered hero | Asymmetric, product-first |
| Purple gradients | Terminal dark, cyan accent |
| Inter everywhere | Space Mono + Inter + JetBrains |
| Feature cards grid | Problem/Solution contrast |
| Stock photos | Interactive demo |
| "Revolutionary AI" | "Pass your next challenge" |
| Testimonials section | Real statistics, no fake social proof |

**The One Thing People Will Remember:**

*The animated terminal demo that shows, in 15 seconds, exactly what the product does - without any marketing fluff.*

---

## Next Steps

1. **Set up project:** Next.js + Tailwind + Framer Motion
2. **Build components:** Hero, CredibilityBar, ProblemSolution, TerminalDemo
3. **Implement email capture:** Supabase or Mailerlite
4. **Test on mobile:** Real devices, not just devtools
5. **Deploy to Vercel:** Connect domain
6. **Share for feedback:** Discord, Twitter, trading communities

---

**Document prepared by:** Claude (with human direction)  
**Last updated:** January 8, 2026

---

*"The best landing page is one where the product speaks for itself. Everything else is just context."*
