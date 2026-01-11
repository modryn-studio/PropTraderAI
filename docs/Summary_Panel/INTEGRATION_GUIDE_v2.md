/**
 * INTEGRATION GUIDE: Enhanced Rule Extraction V2
 * 
 * How to integrate the new extraction system into ChatInterface.tsx
 */

// ============================================================================
// STEP 1: Update Imports
// ============================================================================

// OLD (in ChatInterface.tsx):
import { 
  extractRulesFromStream, 
  mapParsedRulesToStrategyRules, 
  mergeRules 
} from '@/lib/utils/ruleExtractor';

// NEW:
import { 
  extractFromMessage,
  accumulateRules,
  isConfirmation,
} from '@/lib/utils/ruleExtractor_v2';
// Keep the old one for final parsed rules:
import { mapParsedRulesToStrategyRules } from '@/lib/utils/ruleExtractor';
import type { StrategyRule } from '@/lib/utils/ruleExtractor';

// ============================================================================
// STEP 2: Update State Management
// ============================================================================

// OLD:
const [streamedRules, setStreamedRules] = useState<StrategyRule[]>([]);
const [strategyRules, setStrategyRules] = useState<StrategyRule[]>([]);

// NEW (combine into single accumulating state):
const [accumulatedRules, setAccumulatedRules] = useState<StrategyRule[]>([]);

// ============================================================================
// STEP 3: Extract from User Messages
// ============================================================================

// In handleSendMessage() - when user sends a message
const handleSendMessage = useCallback(async (message: string) => {
  // ... existing code ...
  
  // NEW: Extract rules from user's message IMMEDIATELY
  setAccumulatedRules(prev => 
    extractFromMessage(message, 'user', prev)
  );
  
  // ... rest of streaming logic ...
}, [/* deps */]);

// ============================================================================
// STEP 4: Extract from Claude's Responses (Streaming)
// ============================================================================

// In the streaming handler - replace OLD extraction logic:

// OLD (REMOVE THIS):
/*
const newStreamedRules = extractRulesFromStream(displayText);
if (newStreamedRules.length > 0) {
  setStreamedRules(newStreamedRules);
}
*/

// NEW (ADD THIS):
// Only extract from complete sentences during streaming
// (Optional: can wait for full response to avoid partial extractions)
if (data.type === 'text') {
  streamedContent += data.content;
  
  // Extract animation config
  const extracted = tryExtractFromStream(streamedContent);
  const displayText = extracted.cleanText;
  
  // ... animation logic ...
  
  // NEW: Check if we have a complete sentence to extract from
  const sentences = displayText.split(/[.!?]\s+/);
  const lastCompleteSentence = sentences[sentences.length - 2]; // -2 because -1 might be incomplete
  
  if (lastCompleteSentence && lastCompleteSentence.length > 20) {
    // Extract from Claude's response (will auto-detect confirmation)
    setAccumulatedRules(prev => 
      extractFromMessage(lastCompleteSentence, 'assistant', prev)
    );
  }
  
  // ... rest of streaming ...
}

// ============================================================================
// STEP 5: Final Extraction (After Streaming Complete)
// ============================================================================

// When streaming completes and you have parsedRules from API:

if (data.type === 'strategy_parsed') {
  const parsed = data.parsedRules;
  
  // Map parsed rules to StrategyRule format
  const finalRules = mapParsedRulesToStrategyRules(
    parsed,
    strategyName,
    instrument
  );
  
  // NEW: Accumulate final rules (merge with what we've extracted)
  setAccumulatedRules(prev => 
    accumulateRules(prev, finalRules)
  );
}

// ============================================================================
// STEP 6: Update Summary Panel Props
// ============================================================================

// OLD:
<StrategySummaryPanel
  strategyName={strategyName || strategyData?.strategyName}
  rules={strategyRules.length > 0 ? strategyRules : streamedRules}
  isVisible={streamedRules.length > 0 || strategyRules.length > 0}
  // ...
/>

// NEW (simpler - single source of truth):
<StrategySummaryPanel
  strategyName={strategyName || strategyData?.strategyName}
  rules={accumulatedRules}
  isVisible={accumulatedRules.length > 0}
  animationConfig={animationConfig}
  isAnimationExpanded={isAnimationExpanded}
  onToggleAnimation={handleToggleAnimation}
/>

// ============================================================================
// STEP 7: Handle Strategy Name Extraction
// ============================================================================

// NEW: Extract strategy name from conversation
useEffect(() => {
  if (!strategyName && accumulatedRules.length > 0) {
    // Find pattern rule
    const patternRule = accumulatedRules.find(
      r => r.category === 'setup' && r.label === 'Pattern'
    );
    if (patternRule) {
      setStrategyName(patternRule.value);
    }
  }
}, [accumulatedRules, strategyName]);

// ============================================================================
// STEP 8: Reset Handler
// ============================================================================

// Update handleStartOver to clear accumulated rules:

const handleStartOver = useCallback(() => {
  setMessages([]);
  setAccumulatedRules([]); // NEW: Clear accumulated rules
  setStrategyName('');
  // ... rest of reset logic ...
}, []);

// ============================================================================
// COMPLETE EXAMPLE: Updated Streaming Handler
// ============================================================================

// Here's what the full streaming section should look like:

for (const line of lines) {
  if (line.startsWith('data: ')) {
    const jsonStr = line.slice(6);
    try {
      const data = JSON.parse(jsonStr);

      if (data.type === 'text') {
        // Update streamed content
        streamedContent += data.content;
        
        // Extract and clean animation markers
        const extracted = tryExtractFromStream(streamedContent);
        const displayText = extracted.cleanText;
        
        // Set animation config
        if (expectAnimation && extracted.extractedSuccessfully && extracted.config && !animationConfig) {
          setAnimationConfig(extracted.config);
          const sessionTime = Date.now() - sessionStartRef.current;
          logAnimationGenerated(userId, extracted.config, sessionTime).catch(console.error);
          
          // Check for animation auto-expand
          const triggerResult = detectAnimationTrigger(streamedContent);
          if (triggerResult.shouldExpand) {
            handleAnimationAutoExpand(true);
          }
        }
        
        // NEW: Extract rules from Claude's response (real-time)
        // Only if this looks like a complete thought
        const sentences = displayText.split(/[.!?]\s+/);
        if (sentences.length > 1) {
          const latestSentence = sentences[sentences.length - 2]; // Last complete sentence
          if (latestSentence && latestSentence.length > 15) {
            setAccumulatedRules(prev => 
              extractFromMessage(displayText, 'assistant', prev)
            );
          }
        }
        
        // Update message display
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMsgId 
            ? { ...msg, content: displayText }
            : msg
        ));
      }
      
      // Handle final parsed rules
      else if (data.type === 'strategy_parsed') {
        const finalRules = mapParsedRulesToStrategyRules(
          data.parsedRules,
          data.strategyName,
          data.instrument
        );
        
        // Accumulate final rules
        setAccumulatedRules(prev => 
          accumulateRules(prev, finalRules)
        );
        
        // Set strategy data
        setStrategyData({
          strategyName: data.strategyName,
          summary: data.summary,
          parsedRules: data.parsedRules,
          instrument: data.instrument,
        });
        setStrategyComplete(true);
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  }
}

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

/*
Test scenarios to verify:

1. ✅ User says "I trade ORB" → Sidebar shows Pattern immediately
2. ✅ User says "I trade NQ" → Sidebar shows Instrument
3. ✅ User says "first 15 min" → Sidebar shows Range Period
4. ✅ Claude asks "Do you enter immediately or wait?" → Sidebar DOESN'T change
5. ✅ Claude confirms "Perfect — 15-min gives solid range" → Sidebar MAY extract timeframe
6. ✅ User changes mind "actually 30 min" → Sidebar UPDATES Range Period (15min → 30min)
7. ✅ Same rule mentioned twice → No duplicates
8. ✅ Rules accumulate across conversation → Sidebar grows
9. ✅ Start over → Sidebar clears completely

Console logs to add for debugging:
*/

// In handleSendMessage (after extraction):
console.log('Rules after user message:', accumulatedRules);

// In streaming handler (after extraction):
console.log('Rules after Claude response:', accumulatedRules);

// ============================================================================
// MIGRATION NOTES
// ============================================================================

/*
1. Can keep old ruleExtractor.ts for backward compatibility
2. Only mapParsedRulesToStrategyRules is still needed from old file
3. All streaming extraction uses new ruleExtractor_v2.ts
4. Single state management: accumulatedRules (no more streamedRules + strategyRules split)
5. Cleaner, more predictable behavior
*/
