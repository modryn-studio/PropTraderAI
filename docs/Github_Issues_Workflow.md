# GitHub Issues Workflow

### 1. Issue Template
**Location:** `.github/ISSUE_TEMPLATE/agent-dialectic-spec.md`

When you create a new issue on GitHub, you'll see "Agent Dialectic Spec" as a template option. This template includes:
- Status tracker (phase, current agent, iteration)
- Problem statement
- Proposed solution
- Critical review section
- Response section
- Final decisions
- Implementation plan

### 2. Workflow Documentation
**Location:** `docs/AGENT_WORKFLOW.md`

Complete guide on how to use the workflow with both agents.

### 3. Example Issue
**Issue #2:** "[EXAMPLE] User Authentication System"

Live demonstration showing:
- Agent 1's initial spec
- Agent 2's detailed critique (see the comment)
- How the workflow operates in practice

---

## How to Use This Workflow

### Complete Workflow (Spec → Code → Review)

**Phase 1: Specification (GitHub Only)**

1. **Create issue on GitHub** — method depends on which agent you start with:
   
   **Option A: Starting with VS Code Copilot (Agent 2)**
   ```bash
   gh issue create --title "Feature: X" --body "What needs to happen..."
   ```
   
   **Option B: Starting with Claude Desktop (Agent 1 with GitHub MCP)**
   ```
   "Create a GitHub issue in modryn-studio/PropTraderAI titled 'Feature: X' 
   with [describe the task]"
   ```
   
   **Option C: Web UI (manual)**
   - Go to: https://github.com/modryn-studio/PropTraderAI/issues/new/choose
   - Select "Agent Task" template (optional, just sets label)

2. **Claude Desktop (Agent 1)** or **VS Code Copilot (Agent 2)**: 
   - Reads issue from GitHub via MCP/API
   - Fills spec directly in the issue (no code yet)
   - Updates status tracker

3. **The other agent** reviews:
   - **Claude Desktop**: Reads via GitHub MCP, adds critique as comment
   - **VS Code Copilot**: Reads via GitHub extension, adds critique via CLI comment
   - Questions, edge cases, security concerns

4. **Original agent** responds via GitHub issue comments
   - Addresses concerns
   - Updates spec if needed

5. **Iterate** all within GitHub issues (2-4 rounds typical)
   - Keep iterating until both agents agree
   - Mark status as "Ready to Implement"

**Phase 2: Implementation (Local + GitHub)**

6. **When ready to implement:**
   ```bash
   # Pull latest code
   git pull origin main
   
   # Write the code (either agent can implement in VS Code)
   # Test locally
   
   # Commit and push
   git add .
   git commit -m "Implement feature from issue #X"
   git push origin main
   ```

7. **Code review:**
   - **Claude Desktop**: Reads commits from GitHub via MCP (no local pull needed)
   - **VS Code Copilot**: Reviews via GitHub extension or git commands
   - Comments on the issue with code review feedback
   - Checks if implementation matches the spec
   - Verifies security, performance, edge cases

8. **Iterate on code** if needed:
   - Make changes locally
   - Push again
   - Review
   - Close issue when complete

### Quick Reference (5 Steps)

**Step 1: Create Issue (You or Agent)**

**Via VS Code Copilot (CLI):**
```bash
gh issue create --title "Task description" --body "Details..."
```

**Via Claude Desktop (MCP):**
```
"Create a GitHub issue for [task]"
```

**Via Web UI:**
- https://github.com/modryn-studio/PropTraderAI/issues/new/choose
First Agent - Initial Spec**

**Via VS Code Copilot (Agent 2):**
```
Prompt: "Read GitHub issue #[NUMBER] from modryn-studio/PropTraderAI 
and fill in the initial spec sections for [FEATURE/TASK]."
```

**Via Claude Desktop (Agent 1):**
```
Prompt: "Read GitHub issue #[NUMBER] from modryn-studio/PropTraderAI 
and create initial spec for [FEATURE/TASK]."
```

**Step 3: Second Agent - Critical Review**
```
Prompt: "Review GitHub issue #[NUMBER] from modryn-studio/PropTraderAI 
with top 0.1% developer thinking. Add your critical review as a comment."
```

**Step 4: Iterate (Both Agents)**
- Original agent responds via comments
- Reviewing agent reviews response
- Repeat 2-4 times until consensus

**Step 5: Implement & Review**
- Either agent codes (in VS Code)
- Push to GitHub
- Other agent reviews commits
- Agent 2 reviews commits via MCP

---

## Agent Prompts

### For Initial Spec (Either Agent)
```
I need you to create a technical specification for [FEATURE] in GitHub issue format.

Read issue #[NUMBER] in modryn-studio/PropTraderAI and fill in these sections:
- Problem Statement: What are we solving and why?
- Proposed Solution: Your recommended technical approach
- Architecture/Design: How components interact
- Key Technical Decisions: Why this approach over alternatives?
- Trade-offs: What are we giving up?

Be specific about implementation details but don't write the code yet.
Update the status tracker to show current agent (Claude Desktop or VS Code Copilot), Phase: Spec, Iteration: 1
```

### For Critical Review (The Other Agent)  
```
Review GitHub issue #[NUMBER] in modryn-studio/PropTraderAI with top 0.1% developer critical thinking.

Your job is to find problems, not to be nice. Ask yourself:
- What edge cases will break this?
- What happens at 10x scale?
- What security vulnerabilities exist?
- Are there better architectural patterns?
- What's missing from the spec?
- What assumptions are dangerous?

Add a comment to the issue with your critique organized by:
- Questions (need answers)
- Edge Cases & Concerns
- Performance/Scalability
- Security
- Better Alternatives

Update the status to Phase: Review, current agent, Iteration: 2
```

### For Response to Critique (Original Agent)
```
Read the critique on GitHub issue #[NUMBER].

Respond to their concerns by:
1. Answering all questions directly
2. Addressing each edge case (accept, mitigate, or explain why it's not a concern)
3. Updating the proposed solution if necessary
4. Adding new technical decisions based on feedback

Add your response as a comment or edit the issue body.
Update iteration number.
```Claude Desktop (Agent 1)**: Uses GitHub MCP server — can create issues, read/write comments, review commits
- **VS Code Copilot (Agent 2)**: Uses GitHub extension (read) + CLI (write) — can read issues, comment via CLI
---

## Why This Workflow Works

### The MCP Advantage
**Both agents work directly with GitHub:**
- **Agent 1** (VS Code Copilot): Uses GitHub extension to read/write issues
- **Agent 2** (Claude Desktop): Uses GitHub MCP server to read/write issues & review commits
- **You**: Only interact with GitHub when creating issues or pushing code

**No more:**
- ❌ Copy-pasting specs between windows
- ❌ Losing context when switching agents
- ❌ Manual syncing between local files and GitHub
- ❌ Wondering "where were we?"

### Key Benefits

✅ **Single Source of Truth**: Everything lives on GitHub  
✅ **Interruption Recovery**: Status tracker shows exactly where you are  
✅ **Audit Trail**: All decisions documented with timestamps  
✅ **Code Review Integration**: Agent 2 reviews actual commits, not copy-pasted diffs  
✅ **Async Collaboration**: Agents don't need to be "online" simultaneously  
✅ **Better Context**: Full issue history available to both agents

---

## Tips & Best Practices

### For Smoother Workflow

**During Spec Phase:**
- Keep issue numbers handy (e.g., #2, #3, #4)
- Agents can EDIT the issue body OR add comments (either works)
- Use labels: `spec-in-progress`, `ready-for-critique`, `ready-to-implement`
- 2-4 iterations is typical—don't rush to code

**During Implementation Phase:**
- Only pull code when spec is finalized
- Test locally before pushing
- RefereCapabilities:**

| Agent | Create Issues | Read Issues | Comment | Review Commits |
|-------|--------------|-------------|---------|----------------|
| **Claude Desktop (Agent 1)** | ✅ Via MCP | ✅ Via MCP | ✅ Via MCP | ✅ Via MCP (diffs, history) |
| **VS Code Copilot (Agent 2)** | ✅ Via CLI | ✅ Via extension | ✅ Via CLI | ✅ Via extension/git |

**Key Differences:**
- **Claude Desktop**: Full write access via MCP (can create issues directly)
- **VS Code Copilot**: Uses CLI for writes (`gh issue create`, `gh issue comment`)
- **Both**: Can read each other's work directly from GitHub

**Choose starting agent based on where you are:**
- In VS Code → Start with Copilot (use CLI)
- In Claude Desktop app → Start with Claude Desktop (use MCP)
- **Claude Desktop**: Full GitHub MCP access (create issues, read/write comments, review commits, read diffs)
- **VS Code Copilot**: GitHub extension (read issues) + CLI (create issues, write comments)
- **Both agents**: Can read each other's work directly from GitHub

**Key Difference:**
- Claude Desktop can CREATE issues via MCP  
- VS Code Copilot uses CLI (`gh issue create`) to create issues
- Choose starting agent based on what's convenient for you

---

## Example Commands

### Creating an Issue (Optional - can use web UI)
```bash
# If you have GitHub CLI installed
gh issue create --title "[FEATURE] User Authentication" \
  --template agent-dialectic-spec.md \
  --label "agent-spec,needs-review"
```

### Implementation Workflow
```bash
# After spec is finalized, pull latest
git pull origin main

# Create feature branch (optional but recommended)
git checkout -b feature/issue-X

# Agent 1 helps you code the feature in VS Code
# Test thoroughly

# Commit with issue reference
git add .
git commit -m "Implement user authentication from issue #X

- Add login/logout routes
- Integrate Supabase auth
- Add protected route middleware
- Tests passing"

# Push to main (or create PR for larger features)
git push origin main

# Agent 2 automatically reviews via GitHub MCP
# Check issue comments for feedback
```

### Checking Status
```bash
# View open issues
gh issue list --label "agent-spec"

# View specific issue
gh issue view X

# Add comment to issue (or use web UI)
gh issue comment X --body "Implementation complete, ready for review"
```

---

## Next Steps

1. **Try it out** with issue #2 (the example)
2. **Create your first real feature issue** using the template
3. **Run through the workflow** with both agents
4. **Iterate and improve** - adjust the template if needed

You can always refer back to `docs/AGENT_WORKFLOW.md` for the complete guide.

---

**Check out the example:** https://github.com/modryn-studio/PropTraderAI/issues/2
