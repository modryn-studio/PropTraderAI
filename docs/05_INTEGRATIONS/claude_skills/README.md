# Claude Skills Integration

> **Last Updated:** January 16, 2026

## Overview

Claude Skills provides the AI backbone for PropTraderAI's natural language strategy parsing. We use Anthropic's Claude 3.5 Sonnet for parsing trader strategies into executable rule sets.

## Quick Start

The integration is already set up. To use Claude for strategy parsing:

```typescript
import { parseStrategy } from '@/lib/claude/client';

const result = await parseStrategy(userInput, conversationHistory);
// Returns: { parsedRules, clarificationQuestions, validationWarnings }
```

## Architecture

```
Natural Language Input
    ↓
Claude API (claude-3.5-sonnet)
    ↓
Socratic Questioning Loop
    ↓
Parsed Rules (JSONB)
    ↓
Firm Rules Validation
    ↓
Final Strategy Object
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/claude/client.ts` | Main Claude API client |
| `src/lib/firm-rules/loader.ts` | Prop firm rules for validation |
| `data/integrations/claude-skills/` | Firm rules JSON data |

## Documents in This Folder

- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) — Detailed implementation guide
- [SKILL_BUNDLE_SUMMARY.md](SKILL_BUNDLE_SUMMARY.md) — Claude Skills bundle overview
- [skill_file_research.md](skill_file_research.md) — Research on Claude Skills API
- [proptraderai-strategy-builder/](proptraderai-strategy-builder/) — Skill bundle files

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Related

- [Strategy Validation Layer](../../04_FEATURES/strategy_validation_layer/) — Uses Claude for parsing
- [Firm Rules Data](../../../data/integrations/claude-skills/) — JSON data for validation
