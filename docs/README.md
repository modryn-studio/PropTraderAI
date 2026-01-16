# PropTraderAI Documentation

> **Last Updated:** January 16, 2026

## Overview

This is the documentation hub for PropTraderAI — a natural language trading automation platform for prop traders that executes strategies perfectly, learns behavioral patterns, and prevents self-sabotage.

**Mission:** Build the "Cursor for traders" — transforming plain English into flawless execution.

## Quick Navigation

**I want to...**

| Goal | Go Here |
|------|---------|
| 📘 Understand the project vision | [Build Specification](00_OVERVIEW/build_specification.md) |
| 🚀 See what's being built | [Roadmap](00_OVERVIEW/roadmap.md) |
| 🎯 Understand the three paths | [01_STRATEGY/](01_STRATEGY/) |
| 🎨 Understand UX philosophy | [UX Philosophy](02_DESIGN/ux_philosophy.md) |
| 🔧 Work on a feature | [04_FEATURES/](04_FEATURES/) |
| 🔌 Integrate with APIs | [05_INTEGRATIONS/](05_INTEGRATIONS/) |
| 🔬 See research & exploration | [06_RESEARCH/](06_RESEARCH/) |
| 🤖 Configure Copilot context | [.github/copilot-instructions.md](../.github/copilot-instructions.md) |

## Folder Structure

```
docs/
├── 00_OVERVIEW/       # Project vision, strategy, roadmap
├── 01_STRATEGY/       # The Three Paths (Execution, Behavioral, Platform)
├── 02_DESIGN/         # Brand, UX philosophy, trader psychology
├── 03_MARKETING/      # Marketing strategy, content, emails
├── 04_FEATURES/       # Feature specs and implementation docs
├── 05_INTEGRATIONS/   # Third-party integrations (Tradovate, Claude, etc.)
├── 06_RESEARCH/       # Active research and explorations
└── 07_REFERENCES/     # External knowledge and reference material
```

## For LLMs (Copilot, Claude, etc.)

When gathering context, prioritize in this order:

1. **Always read first:** [.github/copilot-instructions.md](../.github/copilot-instructions.md)
2. **For feature work:** Start with `04_FEATURES/{feature}/README.md`, then `decisions.md`
3. **For architecture questions:** `01_STRATEGY/` documents
4. **For UX questions:** `02_DESIGN/ux_philosophy.md` and `02_DESIGN/trader_psychology.md`
5. **For research:** Only if feature is in planning stage

## Key Documents

| Document | Purpose |
|----------|---------|
| [copilot-instructions.md](../.github/copilot-instructions.md) | Master context for AI assistants |
| [build_specification.md](00_OVERVIEW/build_specification.md) | Complete project specification |
| [roadmap.md](00_OVERVIEW/roadmap.md) | Implementation phases and timeline |
| [ux_philosophy.md](02_DESIGN/ux_philosophy.md) | "Vibe-first" design principles |

## Conventions

- **README.md** in each folder = entry point (read this first)
- **decisions.md** = Architecture Decision Records (why we built it this way)
- **archive/** subfolder = deprecated/legacy content (timestamped)
- Use kebab-case for folder names, snake_case for files
