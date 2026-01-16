# Features: Implementation & Specs

> **Last Updated:** January 16, 2026

## Overview

This folder contains feature specifications, implementation guides, and technical documentation for PropTraderAI features.

## Quick Reference

### Active Features

| Feature | Status | Description |
|---------|--------|-------------|
| [strategy_validation_layer/](strategy_validation_layer/) | 🟢 Active | Natural language strategy parsing and validation |
| [smart_tools/](smart_tools/) | 🟡 In Progress | Smart trading tools (position sizing, session timing, etc.) |
| [timezone_conversion.md](timezone_conversion.md) | ✅ Complete | Timezone handling for trading hours |
| [anonymized_analytics.md](anonymized_analytics.md) | ✅ Complete | Privacy-preserving analytics |
| [mobile_swipeable_cards_research.md](mobile_swipeable_cards_research.md) | 📋 Research | Mobile UX patterns research |

### Feature Documentation Pattern

Each feature folder should contain:
```
feature_name/
├── README.md       # Overview, current state, quick start
├── decisions.md    # Architecture Decision Records (why we built it this way)
├── implementation/ # Current implementation docs
└── archive/        # Deprecated/legacy approaches (timestamped)
```

## How to Add a New Feature

1. Create folder: `docs/04_FEATURES/feature_name/`
2. Add `README.md` with Overview → Quick Start → Deep Dive structure
3. Add `decisions.md` documenting key architectural choices
4. Reference in this README's feature table

## Documents in This Folder

- [strategy_validation_layer/](strategy_validation_layer/) — Core strategy parsing system
- [smart_tools/](smart_tools/) — Trading intelligence tools
- [timezone_conversion.md](timezone_conversion.md) — Timezone handling
- [anonymized_analytics.md](anonymized_analytics.md) — Privacy-preserving analytics
- [mobile_swipeable_cards_research.md](mobile_swipeable_cards_research.md) — Mobile UX research
