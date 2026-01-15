# GitHub Issues Workflow - Setup Complete! ✅

## What's Been Set Up

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

### Quick Start (5 Steps)

**Step 1: Create Issue (You)**
1. Go to: https://github.com/modryn-studio/PropTraderAI/issues/new/choose
2. Select "Agent Dialectic Spec" template
3. Create the issue (you can leave it mostly empty)

**Step 2: Agent 1 Initial Spec (VS Code Copilot or Claude Desktop)**
```
Prompt: "Read GitHub issue #[NUMBER] from modryn-studio/PropTraderAI 
and fill in the initial spec sections for [FEATURE/TASK]."
```

**Step 3: Agent 2 Review (The OTHER Agent)**
```
Prompt: "Review GitHub issue #[NUMBER] from modryn-studio/PropTraderAI 
with top 0.1% developer thinking. Add your critical review as a comment."
```

**Step 4: Iterate (Both Agents)**
- Agent 1 responds to Agent 2's questions (via comment or editing issue)
- Agent 2 reviews response
- Repeat 2-4 times until consensus

**Step 5: Implement**
- Agent 1 implements from the finalized spec
- Push to GitHub
- Agent 2 reviews code changes via GitHub MCP

---

## Agent Prompts

### For Agent 1 (Initial Spec)
```
I need you to create a technical specification for [FEATURE] in GitHub issue format.

Read issue #[NUMBER] in modryn-studio/PropTraderAI and fill in these sections:
- Problem Statement: What are we solving and why?
- Proposed Solution: Your recommended technical approach
- Architecture/Design: How components interact
- Key Technical Decisions: Why this approach over alternatives?
- Trade-offs: What are we giving up?

Be specific about implementation details but don't write the code yet.
Update the status tracker to show you're Agent 1, Phase: Spec, Iteration: 1
```

### For Agent 2 (Critical Review)  
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

Update the status to Phase: Review, Agent: Agent 2, Iteration: 2
```

### For Agent 1 (Response to Critique)
```
Read the critique on GitHub issue #[NUMBER] from Agent 2.

Respond to their concerns by:
1. Answering all questions directly
2. Addressing each edge case (accept, mitigate, or explain why it's not a concern)
3. Updating the proposed solution if necessary
4. Adding new technical decisions based on feedback

Add your response as a comment or edit the issue body.
Update iteration number.
```

---

## Benefits You'll See

✅ **Less Copy-Paste**: Agents read/write directly to GitHub  
✅ **Better Context**: Full history in one place  
✅ **Interruption Recovery**: Status tracker shows where you are  
✅ **Audit Trail**: All decisions documented  
✅ **Code Review Integration**: Agent 2 can review actual commits  

---

## Tips

**For Smoother Workflow:**
- Keep issue numbers handy (e.g., #2, #3, #4)
- Agents can EDIT the issue body OR add comments (either works)
- Close issues when implementation is reviewed and merged
- Use labels to track status: 'in-progress', 'needs-review', 'ready-to-implement'

**If You Get Interrupted:**
- Just check the status tracker at top of issue
- See which agent's turn it is
- Continue from there

**Both Agents Have Access:**
- I (Claude Desktop with GitHub MCP) can read/write issues
- VS Code Copilot can access GitHub issues via GitHub extension
- No more manual copy-paste between windows!

---

## Next Steps

1. **Try it out** with issue #2 (the example)
2. **Create your first real feature issue** using the template
3. **Run through the workflow** with both agents
4. **Iterate and improve** - adjust the template if needed

You can always refer back to `docs/AGENT_WORKFLOW.md` for the complete guide.

---

**Check out the example:** https://github.com/modryn-studio/PropTraderAI/issues/2
