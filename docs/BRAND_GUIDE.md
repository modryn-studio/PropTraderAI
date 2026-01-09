# PropTraderAI Visual Brand Guide

**Version 1.0 | January 2026**

> **Quick Reference for Designers & Developers**
>
> This document covers the **visual identity system** only. For UX philosophy, trader psychology, voice/tone, and product strategy, see:
> - [PropTraderAI_UX_Philosophy_Roadmap.md](PropTraderAI_UX_Philosophy_Roadmap.md) — Product phases, UX principles
> - [UI_UX_approach_for_traders.md](UI_UX_approach_for_traders.md) — Trader psychology, tone of voice, messaging

---

## Table of Contents

1. [Brand Essence: Terminal Luxe](#1-brand-essence-terminal-luxe)
2. [Logo & Wordmark](#2-logo--wordmark)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing & Grid](#5-spacing--grid)
6. [Component Patterns](#6-component-patterns)
7. [Visual Effects & Treatments](#7-visual-effects--treatments)
8. [Animation Principles](#8-animation-principles)
9. [Brand Application Guidelines](#9-brand-application-guidelines)

---

## 1. Brand Essence: Terminal Luxe

### The Aesthetic

PropTraderAI's visual identity is **Terminal Luxe** — the precision of a trading terminal meets the sophistication of premium fintech. We're not a "trading app that looks techy." We're **institutional software that happens to be beautiful**.

### Core Characteristics

| Attribute | Expression |
|-----------|------------|
| **Authority** | Pure black backgrounds, high contrast, zero visual noise |
| **Precision** | Monospace typography, sharp corners, mathematical grid |
| **Intelligence** | Cyan accent as "data consciousness", subtle glow effects |
| **Protection** | Contained elements, clear boundaries, deliberate negative space |

### Visual Hierarchy

```
1. Pure Black (#000000) — The void. Recedes completely.
2. Cyan Accent (#00FFD1) — The intelligence. Commands attention.
3. White Text (#FFFFFF) — The content. Clean and readable.
4. Subtle Borders — The structure. Defines without distracting.
```

### The Vibe in One Sentence

> "A Bloomberg terminal designed by a luxury brand, trusted by an AI that actually understands you."

---

## 2. Logo & Wordmark

### Primary Wordmark Treatment

The wordmark is **typographic only** (no symbol). This may evolve in future versions.

```
PROPTRADER.AI
PropTraderAI
```

### Typography Specifications

| Element | Font | Weight | Style |
|---------|------|--------|-------|
| **Wordmark** | JetBrains Mono | 700 (Bold) | Normal |
| **Letter Spacing** | -0.5px | — | — |
| **Period Treatment** | Same weight, no special styling | — | — |

### Usage Rules

| Context | Treatment |
|---------|-----------|
| **Header/Navigation** | `PropTraderAI` — Single word, PascalCase |
| **Footer/Brand** | `PropTraderAI` — Single word |
| **Marketing/Headlines** | `PROPTRADER.AI` — All caps acceptable for impact |

### Color Applications

| Background | Wordmark Color |
|------------|---------------|
| Pure Black (#000000) | White (#FFFFFF) |
| Dark surfaces (#0a0a0a, #121212) | White (#FFFFFF) |
| Light backgrounds (rare) | Black (#000000) |
| Cyan accent areas | Black (#000000) |

### Clear Space

Minimum clear space around wordmark = height of capital "P" on all sides.

### Minimum Size

- **Digital:** 120px wide minimum
- **Print:** 25mm wide minimum

### Don'ts

- ❌ Don't add a tagline directly attached to the wordmark
- ❌ Don't use the cyan color for the wordmark itself
- ❌ Don't stretch, distort, or rotate
- ❌ Don't add drop shadows, outlines, or effects
- ❌ Don't use on busy or low-contrast backgrounds

---

## 3. Color System

### Primary Palette

#### Backgrounds — Dark Theme Foundation

| Name | Variable | Hex | RGB | Usage |
|------|----------|-----|-----|-------|
| **Pure Black** | `--bg-primary` | `#000000` | 0, 0, 0 | Primary canvas, hero sections, main backgrounds |
| **Off Black** | `--bg-secondary` | `#0a0a0a` | 10, 10, 10 | Cards, elevated surfaces, section alternation |
| **Dark Gray** | `--bg-tertiary` | `#121212` | 18, 18, 18 | Input fields, terminal windows, nested elements |
| **Overlay** | `--bg-overlay` | `rgba(255,255,255,0.05)` | — | Subtle depth, badges, hover states |

```css
/* Usage Examples */
.landing-page { background: var(--bg-primary); }      /* Pure black canvas */
.feature-card { background: var(--bg-secondary); }    /* Elevated surface */
.terminal-window { background: var(--bg-tertiary); }  /* Container element */
```

#### Text — High Contrast Hierarchy

| Name | Variable | Hex/RGBA | Usage |
|------|----------|----------|-------|
| **Primary** | `--text-primary` | `#FFFFFF` | Headlines, important content, key numbers |
| **Secondary** | `--text-secondary` | `rgba(255,255,255,0.85)` | Body text, descriptions |
| **Muted** | `--text-muted` | `rgba(255,255,255,0.5)` | Labels, captions, secondary info |
| **Dim** | `--text-dim` | `rgba(255,255,255,0.3)` | Disclaimers, tertiary info, placeholders |

```css
/* Usage Examples */
.headline { color: var(--text-primary); }      /* White, full contrast */
.description { color: var(--text-secondary); } /* Slightly softer */
.label { color: var(--text-muted); }           /* De-emphasized */
.disclaimer { color: var(--text-dim); }        /* Background information */
```

#### Brand Accent — The Cyan

| Name | Variable | Hex/RGBA | Usage |
|------|----------|----------|-------|
| **Cyan Primary** | `--brand-primary` | `#00FFD1` | Primary CTAs, accent text, success states, key highlights |
| **Cyan Hover** | `--brand-hover` | `rgba(0,255,209,0.15)` | Background on hover, subtle emphasis |
| **Cyan Active** | `--brand-active` | `#00e6bc` | Active/pressed states |
| **Cyan Glow** | `--brand-glow` | `rgba(0,255,209,0.3)` | Glow effects, hover halos |

```css
/* Usage Examples */
.btn-primary { background: var(--brand-primary); color: #000000; }
.accent-text { color: var(--brand-primary); }
.card:hover { border-color: var(--brand-primary); }
.glow-effect { box-shadow: 0 0 20px var(--brand-glow); }
```

#### Borders — Subtle Containment

| Name | Variable | Hex/RGBA | Usage |
|------|----------|----------|-------|
| **Subtle** | `--border-subtle` | `rgba(255,255,255,0.1)` | Default borders, separators |
| **Medium** | `--border-medium` | `rgba(255,255,255,0.2)` | Secondary buttons, emphasized borders |

```css
/* Usage Examples */
.card { border: 1px solid var(--border-subtle); }
.btn-secondary { border: 1px solid var(--border-medium); }
```

#### Status Colors — Semantic Meaning

| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| **Success** | `--success` | `#00FFD1` | Success states (same as brand cyan) |
| **Warning** | `--warning` | `#FFB800` | Warning states, caution |
| **Danger** | `--danger` | `#FF4757` | Error states, destructive actions, losses |

```css
/* Usage Examples */
.success-message { color: var(--success); }
.warning-badge { background: rgba(255,184,0,0.1); color: var(--warning); }
.error-state { color: var(--danger); }
```

#### Financial Colors — Trading Context

| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| **Profit Green** | `--profit-green` | `#00897b` | Profit displays, positive P&L |
| **Loss Red** | `--loss-red` | `#b5323d` | Loss displays, negative P&L |

> **Important:** The bright cyan (#00FFD1) is for UI accents and success states. For actual P&L numbers and financial data, use the more muted financial colors (#00897b / #b5323d) for a professional, dashboard-appropriate appearance.

```css
/* Usage Examples */
.profit { color: var(--profit-green); }
.loss { color: var(--loss-red); }
```

### Dashboard-Specific Colors

For the dashboard (post-login), slightly different tones are used for improved readability in data-heavy contexts:

| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| **Dashboard Cyan** | `--accent-cyan` | `#00bbd4` | Dashboard accent, charts |
| **Dashboard Purple** | `--accent-purple` | `#8b5cf6` | Secondary accent, categories |
| **Dashboard Blue** | `--accent-blue` | `#3b82f6` | Links, info states |

---

## 4. Typography

### Font Stack

| Role | Font | Fallbacks | Purpose |
|------|------|-----------|---------|
| **Display** | Space Mono | IBM Plex Mono, Courier New, monospace | Marketing headlines (rarely used) |
| **UI / Headlines** | JetBrains Mono | Courier New, monospace | All headlines, buttons, navigation, wordmark |
| **Body** | Inter | system-ui, -apple-system, sans-serif | Body text, descriptions, long-form |
| **Data** | JetBrains Mono | Fira Code, SF Mono, monospace | Numbers, P&L, terminal output, prices |

### Font Weights

```css
/* Inter */
@import '@fontsource/inter/400.css';  /* Regular — Body text */
@import '@fontsource/inter/500.css';  /* Medium — Emphasized body */
@import '@fontsource/inter/600.css';  /* SemiBold — Subheadings */
@import '@fontsource/inter/700.css';  /* Bold — Rarely used */

/* JetBrains Mono */
@import '@fontsource/jetbrains-mono/400.css';  /* Regular — Data, terminal */
@import '@fontsource/jetbrains-mono/500.css';  /* Medium — Navigation links */
@import '@fontsource/jetbrains-mono/700.css';  /* Bold — Headlines, buttons */

/* Space Mono */
@import '@fontsource/space-mono/400.css';  /* Regular — Display option */
@import '@fontsource/space-mono/700.css';  /* Bold — Display headlines */
```

### Type Scale

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| `text-xs` | 0.75rem (12px) | 1.4 | Labels, badges, disclaimers |
| `text-sm` | 0.875rem (14px) | 1.5 | Body small, buttons, navigation |
| `text-base` | 1rem (16px) | 1.6 | Body default, descriptions |
| `text-lg` | 1.125rem (18px) | 1.7 | Body large, subheadlines |
| `text-xl` | 1.25rem (20px) | 1.5 | Section titles |
| `text-2xl` | 1.5rem (24px) | 1.3 | Section headlines |
| `text-3xl` | 2rem (32px) | 1.2 | Page headlines |
| `text-4xl` | 2.5rem (40px) | 1.1 | Hero headlines |

### Headline Styling

```css
/* Hero Headline — Landing Page */
.hero-headline {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(40px, 5vw, 66px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -2px;
  color: var(--text-primary);
}

/* Accent Line — Brand Cyan */
.headline-accent {
  display: block;
  color: var(--brand-primary);  /* #00FFD1 */
}

/* Section Headlines */
.section-headline {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -1px;
}
```

### Body Text Styling

```css
/* Body Default */
.body-text {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* Body Large (Subheadlines) */
.subheadline {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  line-height: 1.7;
  color: var(--text-secondary);
}
```

### Data/Number Styling

```css
/* Financial Numbers */
.number-display {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 400;
}

/* Large Stats */
.stat-large {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(80px, 12vw, 140px);
  font-weight: 700;
  letter-spacing: -4px;
  line-height: 1;
}
```

---

## 5. Spacing & Grid

### Spacing Scale

Based on 4px base unit:

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Micro gaps, icon padding |
| `space-2` | 8px | Tight spacing, badge padding |
| `space-3` | 12px | Small gaps |
| `space-4` | 16px | Default padding, small margins |
| `space-5` | 20px | Medium spacing |
| `space-6` | 24px | Section padding (mobile) |
| `space-8` | 32px | Large spacing, desktop padding |
| `space-10` | 40px | Section margins |
| `space-12` | 48px | Large section padding |
| `space-16` | 64px | Section gaps |
| `space-20` | 80px | Major section separation |
| `space-30` | 120px | Section vertical padding (desktop) |

### Container Widths

```css
.container-max { max-width: 1400px; margin: 0 auto; }
.container-narrow { max-width: 1000px; margin: 0 auto; }
.container-content { max-width: 640px; }  /* Readable line length */
```

### Section Padding

```css
/* Desktop */
.section { padding: 120px 40px; }

/* Tablet (≤1024px) */
.section { padding: 100px 30px; }

/* Mobile (≤768px) */
.section { padding: 80px 20px; }
```

### Grid System

Hero section uses a **two-column grid** on desktop:

```css
.hero-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

/* Tablet/Mobile: Stack */
@media (max-width: 1024px) {
  .hero-container {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}
```

Feature cards use a **2-column grid**:

```css
.solution-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

@media (max-width: 768px) {
  .solution-grid { grid-template-columns: 1fr; }
}
```

### Background Grid Overlay

The hero section uses a subtle grid pattern for the "Terminal Luxe" effect:

```css
.hero-grid-overlay {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}
```

---

## 6. Component Patterns

### Buttons

#### Primary Button (CTA)

```css
.btn-primary {
  background: var(--brand-primary);           /* #00FFD1 */
  color: #000000;
  border: none;
  border-radius: 0;                           /* Sharp corners */
  padding: 14px 28px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.4s ease, color 0.4s ease;
}

.btn-primary:hover {
  background: transparent;
  color: var(--brand-primary);
  box-shadow: inset 0 0 0 2px var(--brand-primary);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

**Visual Specs:**
- Background: Cyan (#00FFD1)
- Text: Black (#000000)
- Corners: Square (0 radius)
- Height: ~48px with padding
- Hover: Inverts to outline with cyan border

#### Secondary Button

```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-medium);     /* rgba(255,255,255,0.2) */
  border-radius: 0;
  padding: 14px 28px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.4s ease;
}

.btn-secondary:hover {
  background: var(--text-primary);
  color: var(--bg-primary);
  border-color: var(--text-primary);
}
```

### Cards

#### Feature Card

```css
.feature-card {
  background: var(--bg-secondary);            /* #0a0a0a */
  border: 1px solid var(--border-subtle);     /* rgba(255,255,255,0.1) */
  padding: 40px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s ease, transform 0.3s ease;
}

.feature-card:hover {
  border-color: var(--brand-primary);         /* #00FFD1 */
  transform: translateY(-4px);
}

/* Top glow line on hover */
.feature-card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--brand-primary), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.feature-card:hover .feature-card-glow {
  opacity: 1;
}
```

**Visual Specs:**
- Background: Off-black (#0a0a0a)
- Border: 1px subtle white (10% opacity)
- Corners: Square (no radius on landing page)
- Hover: Cyan border + glow line + subtle lift

#### Problem Card (Danger Variant)

```css
.problem-card {
  background: var(--bg-primary);              /* #000000 */
  border: 1px solid var(--border-subtle);
  padding: 32px;
  transition: border-color 0.3s ease, transform 0.3s ease;
}

.problem-card:hover {
  border-color: var(--danger);                /* #FF4757 */
  transform: translateY(-4px);
}

.problem-card-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 71, 87, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.problem-card-icon svg {
  color: var(--danger);
}
```

### Form Inputs

#### Hero Email Input

```css
.form-input-wrapper {
  display: flex;
  gap: 0;
  background: var(--bg-tertiary);             /* #121212 */
  border: 1px solid var(--border-subtle);
  padding: 6px;
}

.hero-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  padding: 14px 16px;
}

.hero-input::placeholder {
  color: var(--text-muted);
}

.hero-input:focus {
  outline: none;
}
```

**Visual Specs:**
- Wrapper: Dark gray background with subtle border
- Input: Transparent, monospace text
- Button: Attached directly (no gap)
- Mobile: Stack vertically

### Badges

```css
.hero-badge {
  background: var(--bg-overlay);              /* rgba(255,255,255,0.05) */
  border: 1px solid var(--border-subtle);
  color: var(--brand-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  padding: 8px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
```

### Terminal Window

The terminal window component represents the product visually:

```css
.terminal-window {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.terminal-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.terminal-dot.red { background: #ff5f56; }
.terminal-dot.yellow { background: #ffbd2e; }
.terminal-dot.green { background: #27c93f; }

.terminal-title {
  margin-left: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-muted);
}

.terminal-body {
  padding: 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  line-height: 2;
}

.terminal-prompt {
  color: var(--brand-primary);
  margin-right: 8px;
}

.terminal-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: var(--brand-primary);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
```

### Icon Containers

```css
.feature-icon {
  width: 48px;
  height: 48px;
  background: var(--brand-hover);             /* rgba(0,255,209,0.15) */
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-icon svg {
  color: var(--brand-primary);
}
```

---

## 7. Visual Effects & Treatments

### Glow Effects

Used sparingly to indicate intelligence, activity, or emphasis:

```css
/* Box Shadow Glows */
.glow-cyan { box-shadow: 0 0 20px rgba(0, 255, 209, 0.3); }
.glow-blue { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
.glow-green { box-shadow: 0 0 20px rgba(0, 137, 123, 0.3); }
.glow-red { box-shadow: 0 0 20px rgba(181, 50, 61, 0.3); }
.glow-purple { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
```

### Text Gradient

For special emphasis (use rarely):

```css
.text-gradient {
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  background-image: linear-gradient(to right, var(--accent-cyan), var(--accent-purple));
}
```

### Backdrop Blur

For headers and overlays:

```css
.header {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
}

.header-scrolled {
  background: rgba(0, 0, 0, 0.95);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
}
```

### Spline 3D Integration

The hero section features an embedded Spline 3D scene for visual interest:

```tsx
import Spline from '@splinetool/react-spline';

<Spline scene="https://prod.spline.design/NbVmy6DPLhY-5Lvg/scene.splinecode" />
```

**Guidelines for 3D elements:**
- Keep loading graceful (show fallback)
- 3D should complement, not distract
- Match the dark theme (pure black background in Spline)
- Subtle motion preferred over dramatic

### Grid Overlay Pattern

The signature "Terminal Luxe" grid:

```css
.hero-grid-overlay {
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}
```

---

## 8. Animation Principles

### Core Philosophy

Animations should feel **precise and intentional**, like a well-oiled machine. Never playful, bouncy, or excessive.

| ✅ Do | ❌ Don't |
|-------|---------|
| Subtle fades and transitions | Bouncing, wobbling |
| Smooth easing | Spring physics |
| Purpose-driven motion | Decorative animations |
| Quick response | Slow, labored motion |

### Timing Defaults

```css
/* Standard transition */
transition: all 0.3s ease;

/* Faster for micro-interactions */
transition: opacity 0.2s ease;

/* Slower for deliberate reveals */
transition: all 0.4s ease;
```

### Standard Easing

```css
/* Default ease — smooth and professional */
transition-timing-function: ease;

/* For exits — slightly quicker */
transition-timing-function: ease-out;

/* For entries — builds naturally */
transition-timing-function: ease-in-out;
```

### Hover State Patterns

```css
/* Card lift */
.card:hover {
  transform: translateY(-4px);
  transition: transform 0.3s ease;
}

/* Button scale (subtle) */
.btn:active {
  transform: scale(0.98);
}

/* Border color change */
.card:hover {
  border-color: var(--brand-primary);
  transition: border-color 0.3s ease;
}
```

### Loading States

```css
/* Spinner */
.spinner {
  border: 2px solid var(--border-subtle);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Cursor blink (terminal) */
@keyframes blink {
  50% { opacity: 0; }
}

.terminal-cursor {
  animation: blink 1s step-end infinite;
}
```

### Shimmer Effect (for skeletons)

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 0%,
    var(--bg-tertiary) 50%,
    var(--bg-secondary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
}
```

### Scroll Behavior

```css
html {
  scroll-behavior: smooth;
}
```

---

## 9. Brand Application Guidelines

### Marketing Materials

#### General Principles

| Element | Guideline |
|---------|-----------|
| **Primary Background** | Always pure black (#000000) |
| **Hero Images** | Dark, terminal-inspired, or abstract 3D |
| **Photography** | Avoid stock photos of traders. If used, desaturated/dark. |
| **Icons** | Line icons, 24px default, cyan accent color |
| **Illustrations** | Abstract, geometric, minimal. No cartoon style. |

#### Print Materials

| Context | Background | Accent |
|---------|------------|--------|
| Business cards | Black | White text, cyan accent |
| Letterhead | White | Black logo, cyan accent |
| Presentations | Dark slides | White/cyan text |

#### Digital Ads

- **Background:** Pure black
- **CTA Button:** Cyan on black
- **Copy:** JetBrains Mono for headlines, Inter for body
- **Animation:** Subtle, cursor blink or terminal typing effects acceptable

### Social Media

#### Profile Images

- Use wordmark or a simplified "P" in JetBrains Mono
- White on black, or cyan on black for emphasis
- No effects, clean and flat

#### Content Principles

| Platform | Style | Format |
|----------|-------|--------|
| **Twitter/X** | Direct, terminal-like | Dark cards with cyan accents |
| **LinkedIn** | Professional, data-focused | Clean stats, subtle design |
| **Discord** | Technical, community | Terminal aesthetic |

#### Image Dimensions (Reference Only — Platforms Change)

Focus on maintaining the aesthetic at any size:
- Square crops for profile images
- 16:9 or 2:1 for banners
- Always test on mobile

### Email Design

```
Background: #000000 or #0a0a0a
Text: White and muted white
CTA: Cyan button with black text
Borders: Subtle (rgba(255,255,255,0.1))
Font: System fonts (web-safe) with monospace for emphasis
```

### Co-Branding

When PropTraderAI appears alongside partners:
- Maintain minimum clear space
- Logo should be same visual weight as partner
- Never alter colors to match partner brand
- Black background preferred, white acceptable

### What NOT to Do

- ❌ Use bright backgrounds (white, colors)
- ❌ Use rounded, playful shapes for core brand
- ❌ Add drop shadows to logo
- ❌ Use emoji in brand contexts (OK in casual social)
- ❌ Use script or decorative fonts
- ❌ Mix multiple accent colors in single composition
- ❌ Use low-contrast combinations

---

## Quick Reference: Copy/Paste Values

### CSS Variables

```css
/* Backgrounds */
--bg-primary: #000000;
--bg-secondary: #0a0a0a;
--bg-tertiary: #121212;
--bg-overlay: rgba(255, 255, 255, 0.05);

/* Text */
--text-primary: #FFFFFF;
--text-secondary: rgba(255, 255, 255, 0.85);
--text-muted: rgba(255, 255, 255, 0.5);
--text-dim: rgba(255, 255, 255, 0.3);

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.1);
--border-medium: rgba(255, 255, 255, 0.2);

/* Brand Accent */
--brand-primary: #00FFD1;
--brand-hover: rgba(0, 255, 209, 0.15);
--brand-active: #00e6bc;
--brand-glow: rgba(0, 255, 209, 0.3);

/* Status */
--success: #00FFD1;
--warning: #FFB800;
--danger: #FF4757;

/* Financial */
--profit-green: #00897b;
--loss-red: #b5323d;
```

### Tailwind Classes (Common)

```tsx
// Backgrounds
className="bg-[#000000]"
className="bg-[#0a0a0a]"

// Text
className="text-white"
className="text-white/85"
className="text-white/50"

// Brand
className="text-[#00FFD1]"
className="bg-[#00FFD1] text-black"

// Borders
className="border border-white/10"

// Typography
className="font-mono"  // JetBrains Mono (data)
className="font-sans"  // Inter (body)
```

### Figma/Design Tool Values

| Token | Hex | RGB |
|-------|-----|-----|
| Black | #000000 | 0, 0, 0 |
| Off Black | #0A0A0A | 10, 10, 10 |
| Dark Gray | #121212 | 18, 18, 18 |
| Cyan | #00FFD1 | 0, 255, 209 |
| Warning | #FFB800 | 255, 184, 0 |
| Danger | #FF4757 | 255, 71, 87 |
| Profit | #00897B | 0, 137, 123 |
| Loss | #B5323D | 181, 50, 61 |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial visual brand guide |

---

**For UX philosophy, voice, and product strategy, see companion documents:**
- [PropTraderAI_UX_Philosophy_Roadmap.md](PropTraderAI_UX_Philosophy_Roadmap.md)
- [UI_UX_approach_for_traders.md](UI_UX_approach_for_traders.md)
