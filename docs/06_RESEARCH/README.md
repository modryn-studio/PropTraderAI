# Research: Explorations & Analysis

> **Last Updated:** January 16, 2026

## Overview

This folder contains research documents, explorations, and analysis that inform feature development. Research is **temporary** — once a feature is built, key decisions should be extracted to `{feature}/decisions.md` and the original research archived.

## Research Lifecycle

```
1. Active Research (lives here)
    ↓
2. Feature Gets Built
    ↓
3. Key Decisions → feature/decisions.md
    ↓
4. Original Research → feature/archive/YYYY-MM-research/
```

## Current Research

| Research | Status | Informs |
|----------|--------|---------|
| [architecture_research.md](architecture_research.md) | 📋 Reference | Overall system architecture |
| [business_validation.md](business_validation.md) | ✅ Complete | Market validation, pricing |
| [compliance_research.md](compliance_research.md) | 📋 Reference | Regulatory considerations |
| [cost_comparison.md](cost_comparison.md) | ✅ Complete | Infrastructure cost analysis |
| [strategy_builder_ux/](strategy_builder_ux/) | ✅ Archived | Strategy builder UX patterns |

## Completed Research (Extract Decisions)

When research leads to a shipped feature:

1. **Extract decisions** to `04_FEATURES/{feature}/decisions.md`
2. **Archive original** to `04_FEATURES/{feature}/archive/YYYY-MM-research/`
3. **Update this table** to show "Archived → {feature}"

## Documents in This Folder

- [architecture_research.md](architecture_research.md) — System architecture exploration
- [business_validation.md](business_validation.md) — Market research and validation
- [compliance_research.md](compliance_research.md) — Regulatory and compliance research
- [cost_comparison.md](cost_comparison.md) — Infrastructure and API cost analysis
- [strategy_builder_ux/](strategy_builder_ux/) — UX research for strategy builder
