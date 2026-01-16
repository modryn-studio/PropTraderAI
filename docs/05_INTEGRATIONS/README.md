# Integrations: Third-Party Services

> **Last Updated:** January 16, 2026

## Overview

This folder documents integrations with external services and APIs that PropTraderAI depends on.

## Quick Reference

| Integration | Status | Purpose |
|-------------|--------|---------|
| [claude_skills/](claude_skills/) | ✅ Active | AI strategy parsing via Anthropic Claude |
| Tradovate | 🟡 In Progress | Broker integration for trade execution |
| Supabase | ✅ Active | Database, auth, and real-time subscriptions |

## Integration Architecture

```
User Input
    ↓
Strategy Parser (Claude Skills)
    ↓
Parsed Rules (JSONB)
    ↓
Execution Engine
    ↓
Tradovate API → Trade Execution
    ↓
Supabase → Storage & Behavioral Logging
```

## Adding New Integrations

1. Create folder: `docs/05_INTEGRATIONS/integration_name/`
2. Add `README.md` with setup instructions
3. Add `INTEGRATION_GUIDE.md` for implementation details
4. Document API keys/secrets needed in `.env.example`

## Documents in This Folder

- [claude_skills/](claude_skills/) — Anthropic Claude integration for strategy parsing
