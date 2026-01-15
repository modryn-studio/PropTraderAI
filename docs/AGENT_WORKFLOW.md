# Agent-to-Agent Dialectic Workflow

## Overview
This workflow uses GitHub Issues as a coordination layer between two AI agents to develop features through structured critique and iteration.

## Why This Works
- **Different Perspectives**: Two separate agents provide genuinely different approaches
- **Blind Spot Detection**: Agent 2 catches issues Agent 1 misses
- **Trackable History**: All reasoning preserved in GitHub
- **Interruption Recovery**: Easy to pick up where you left off
- **Reduced Copy-Paste**: Agents share a single source of truth

## The 5-Phase Workflow

### Phase 1: Initial Spec (Agent 1)
**Agent:** VS Code Copilot or Claude Desktop

**Steps:**
1. Create new issue using "Agent Dialectic Spec" template
2. Fill Problem Statement, Proposed Solution, Architecture sections
3. Update status tracker at top

**Agent 1 Prompt:**
```
Create a spec for [FEATURE] following the GitHub issue template.
Include: problem statement, proposed solution, architecture, 
technical decisions, and trade-offs.
```

### Phase 2: Critical Review (Agent 2)  
**Agent:** The OTHER agent (switch agents)

**Steps:**
1. Read issue #[NUMBER] from GitHub
2. Fill "Critical Review" section with 0.1% thinking
3. Post as comment or edit issue directly

**Agent 2 Prompt:**
```
Review issue #[NUMBER] in modryn-studio/PropTraderAI as a top 0.1% developer.
Focus on: edge cases, scalability, security, performance, better alternatives.
```

### Phase 3: Iteration
**Agents:** Back and forth 2-4 cycles

- Agent 1 responds to critique
- Agent 2 reviews response  
- Repeat until consensus
- Update iteration number each cycle

### Phase 4: Finalize
**Both Agents:**
- Fill "Final Decisions" section
- Document "Open Questions"
- Agent 1 creates implementation plan
- Set status to "Implementation"

### Phase 5: Implementation & Review
**Agent 1:** Implement → Push to GitHub  
**Agent 2:** Review code via GitHub MCP → Comment on issue

---

## Quick Reference Commands

**For You (Human):**
```
# Create issue from template on GitHub
# Give issue number to agents

# Agent 1: "Fill issue #X with initial spec for [FEATURE]"
# Agent 2: "Review issue #X with 0.1% thinking"  
# Agent 1: "Update issue #X responding to Agent 2's critique"
# Continue until done
# Agent 1: "Implement issue #X"
# Agent 2: "Review the code changes for issue #X"
```

**Interruption Recovery:**
```
Check status tracker at top of issue to see:
- Current phase
- Which agent's turn
- Iteration number
```

## Tips
- Keep issue # handy - agents need it to read/write
- Agents can add comments OR edit issue body directly
- Close issue when implementation is reviewed and merged
- Use labels: 'agent-spec', 'in-progress', 'needs-review'
