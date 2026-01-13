# Strategy Builder Documentation Index

**Complete documentation for the Strategy Builder chat system, summary panel, and animations**

---

## 📚 Documentation Structure

### 01_Chat_System/ - Conversational Strategy Building

The natural language interface where users describe strategies and Claude helps them articulate details.

| Document | Purpose |
|----------|---------|
| **README_TwoPass_Architecture.md** | Architecture for separating conversation from rule extraction (fixes >30% failure rate) |
| **README_RuleStreaming_V3.md** | Claude's `update_rule` tool for real-time rule extraction (replaces regex) |
| **STRATEGY_BUILDER_TEST_GUIDE.md** | Testing guide and behavioral logging for the chat system |

**Key Concepts:**
- **Two-Pass System**: Pass 1 streams conversation (no tools), Pass 2 extracts rules (tools only)
- **Tool-Based Extraction**: Claude calls `update_rule` when confirming rules (99%+ accuracy)
- **Socratic Questioning**: Multiple choice A/B/C/D format for faster clarification

---

### 02_Summary_Panel/ - Real-Time Strategy Display

The sidebar that displays strategy rules as they're confirmed during conversation.

| Document | Purpose |
|----------|---------|
| **README_StrategySummaryPanel.md** | Complete guide to the summary panel UI component |

**Key Features:**
- Real-time rule updates via `rule_update` SSE events
- Smart categorization (Setup, Entry, Exit, Risk, etc.)
- Terminal Luxe aesthetic (pure black, cyan accents)
- Responsive: Desktop sidebar + mobile bottom sheet
- Collapsible categories

---

### 03_Animations/ - Strategy Visualization

Intelligent animation system that visualizes strategies in real-time as users describe them.

| Document | Purpose |
|----------|---------|
| **README_Animation_System.md** | Overview of the universal animation system (15+ strategies) |
| **README_Parameter_Based.md** | Intelligent parameter extraction for accurate visualizations |

**Key Concepts:**
- **Universal System**: One component renders any strategy type (breakouts, pullbacks, ICT, VWAP, etc.)
- **Claude-Generated Configs**: Claude analyzes conversation and generates animation parameters
- **Parameter-Based Rendering**: Exact positions calculated from user specs ("stop at 50% of range")
- **Auto-Updating**: Animations update as conversation evolves

**Supported Strategy Types:**
- Price Action: ORB, Pullbacks, Failed Breakouts, Trend Continuation
- Indicators: EMA, RSI, MACD strategies
- VWAP: Bounce, Breakout, Pullback
- ICT/Smart Money: Order Blocks, FVG, Liquidity Sweeps, Breaker Blocks, Silver Bullet

---

## 🔄 How They Work Together

```
┌────────────────────────────────────────────────────────────────┐
│                    USER: "I want to trade                      │
│                    opening range breakout"                     │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 01_CHAT_SYSTEM                                                 │
│ ────────────────────────────────────────────────────────       │
│ • Pass 1: Claude asks clarifying questions (streaming)        │
│ • Pass 2: Extracts rules via update_rule tool                 │
│ • Emits rule_update events                                    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 02_SUMMARY_PANEL                                               │
│ ────────────────────────────────────────────────────────       │
│ • Receives rule_update events                                 │
│ • Updates sidebar with confirmed rules                        │
│ • Displays: Entry, Stop, Target, Sizing, etc.                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 03_ANIMATIONS                                                  │
│ ────────────────────────────────────────────────────────       │
│ • Claude detects strategy type (after 4+ messages)            │
│ • Generates animation config with exact parameters            │
│ • Renders visual: chart + price levels + stop/target         │
│ • Updates as user refines details                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Navigation

**Working on the chat system?**
→ Start with [Two-Pass Architecture](01_Chat_System/README_TwoPass_Architecture.md)

**Debugging rule extraction?**
→ See [Rule Streaming V3](01_Chat_System/README_RuleStreaming_V3.md)

**Styling the summary panel?**
→ Check [Summary Panel Guide](02_Summary_Panel/README_StrategySummaryPanel.md)

**Animation not matching user's specs?**
→ Read [Parameter-Based System](03_Animations/README_Parameter_Based.md)

**Testing the full system?**
→ Use [Test Guide](01_Chat_System/STRATEGY_BUILDER_TEST_GUIDE.md)

---

## 📊 Key Metrics & Success Criteria

### Chat System
- **Text Response Rate**: 100% (was ~70% before two-pass)
- **Rule Extraction Accuracy**: 99%+ (was 70-85% with regex)
- **Question Format**: A/B/C/D multiple choice for faster flow

### Summary Panel
- **Update Latency**: ~300-500ms after text completes
- **Mobile Performance**: Smooth 60fps swipe gestures
- **Rule Organization**: Smart categorization by type

### Animations
- **Trigger Threshold**: After 4+ messages (enough clarity)
- **Supported Strategies**: 15+ types (ORB, pullback, ICT, VWAP, etc.)
- **Accuracy**: Exact positioning from user specs (not templates)

---

## 🔧 Technical Stack

- **AI**: Claude Sonnet 4.5 (tool_use, streaming)
- **Framework**: Next.js 14 (App Router, SSE streaming)
- **UI**: React + Tailwind CSS (Terminal Luxe aesthetic)
- **Animation**: Framer Motion + custom SVG charts
- **State**: React hooks + SSE event handling

---

## 📝 Recent Changes

**January 12, 2026:**
- Implemented two-pass architecture (100% text guarantee)
- Fixed tool instruction leak in Pass 1 prompt
- Organized documentation into clear structure

**Previous Updates:**
- Migrated from regex to tool-based rule extraction
- Added parameter-based animation system
- Built responsive summary panel with mobile support

---

**Last Updated:** January 12, 2026
