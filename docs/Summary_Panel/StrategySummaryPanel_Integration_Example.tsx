/**
 * INTEGRATION EXAMPLE: Strategy Summary Panel
 * 
 * This file shows how to integrate the StrategySummaryPanel into your ChatInterface.
 * The panel extracts strategy rules from Claude's responses and displays them in real-time.
 */

import { useState, useEffect } from 'react';
import StrategySummaryPanel, { StrategyRule } from '@/components/strategy/StrategySummaryPanel';

// ============================================================================
// EXAMPLE 1: Basic Integration in ChatInterface.tsx
// ============================================================================

export function ChatInterfaceWithSummary() {
  const [strategyRules, setStrategyRules] = useState<StrategyRule[]>([]);
  const [strategyName, setStrategyName] = useState<string>('');
  
  // Parse rules from Claude's response
  const extractRulesFromResponse = (response: string): StrategyRule[] => {
    const rules: StrategyRule[] = [];
    
    // Pattern: Look for key-value patterns in Claude's responses
    // "Stop: 50% of range" → { label: "Stop Loss", value: "50% of range", category: "risk" }
    // "Entry: Break above high" → { label: "Entry Trigger", value: "Break above high", category: "entry" }
    
    const patterns = [
      // Entry patterns
      { regex: /entry(?:\s+trigger)?:\s*(.+?)(?:\n|$)/gi, category: 'entry' as const, label: 'Entry Trigger' },
      { regex: /break(?:out)?\s+(?:above|below)\s+(.+?)(?:\n|$)/gi, category: 'entry' as const, label: 'Entry Trigger' },
      
      // Stop loss patterns
      { regex: /stop(?:\s+loss)?:\s*(.+?)(?:\n|$)/gi, category: 'risk' as const, label: 'Stop Loss' },
      { regex: /stop\s+(?:is|=|at)\s+(.+?)(?:\n|$)/gi, category: 'risk' as const, label: 'Stop Loss' },
      
      // Target patterns
      { regex: /target:\s*(.+?)(?:\n|$)/gi, category: 'exit' as const, label: 'Target' },
      { regex: /profit\s+target:\s*(.+?)(?:\n|$)/gi, category: 'exit' as const, label: 'Profit Target' },
      { regex: /(\d+:\d+)\s+(?:rr|r:r|risk.reward)/gi, category: 'risk' as const, label: 'Risk:Reward' },
      
      // Setup patterns
      { regex: /opening\s+range(?:\s+breakout)?/gi, category: 'setup' as const, label: 'Pattern', value: 'Opening Range Breakout' },
      { regex: /(\d+)(?:-|\s+)min(?:ute)?\s+range/gi, category: 'timeframe' as const, label: 'Range Period' },
      
      // Filter patterns
      { regex: /(\d+)(?:\s+)?(?:ema|ma)/gi, category: 'filters' as const, label: 'Moving Average Filter' },
      { regex: /vwap/gi, category: 'filters' as const, label: 'VWAP Filter', value: 'VWAP confirmation required' },
      
      // Session patterns
      { regex: /(?:rth|regular\s+trading\s+hours)/gi, category: 'timeframe' as const, label: 'Session', value: 'RTH (9:30 AM - 4:00 PM ET)' },
      { regex: /globex/gi, category: 'timeframe' as const, label: 'Session', value: 'Globex (6:00 PM ET reopen)' },
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(response)) !== null) {
        const value = pattern.value || match[1]?.trim();
        if (value) {
          rules.push({
            label: pattern.label,
            value: value,
            category: pattern.category,
          });
        }
      }
    }
    
    return rules;
  };
  
  // Update rules when Claude responds
  const handleClaudeResponse = (response: string) => {
    // Extract strategy name if present
    if (response.toLowerCase().includes('opening range breakout')) {
      setStrategyName('Opening Range Breakout (ORB)');
    }
    
    // Extract and append new rules
    const newRules = extractRulesFromResponse(response);
    if (newRules.length > 0) {
      setStrategyRules(prev => {
        // Avoid duplicates by checking if rule already exists
        const existing = new Set(prev.map(r => `${r.label}:${r.value}`));
        const filtered = newRules.filter(r => !existing.has(`${r.label}:${r.value}`));
        return [...prev, ...filtered];
      });
    }
  };
  
  return (
    <div className="relative flex h-screen">
      {/* Main Chat Area */}
      <div className="flex-1">
        {/* Your existing chat interface */}
      </div>
      
      {/* Strategy Summary Panel */}
      <StrategySummaryPanel
        strategyName={strategyName}
        rules={strategyRules}
        isVisible={strategyRules.length > 0}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: More Sophisticated Rule Extraction
// ============================================================================

/**
 * Enhanced parser that handles more complex patterns and conversations
 */
export class StrategyRuleParser {
  private rules: Map<string, StrategyRule> = new Map();
  
  /**
   * Parse a message and extract strategy rules
   */
  parse(message: string, role: 'user' | 'assistant'): StrategyRule[] {
    const newRules: StrategyRule[] = [];
    
    if (role === 'user') {
      // User messages: Direct statements
      newRules.push(...this.parseUserMessage(message));
    } else {
      // Claude messages: Confirmations and summaries
      newRules.push(...this.parseAssistantMessage(message));
    }
    
    // Deduplicate and store
    newRules.forEach(rule => {
      const key = `${rule.category}:${rule.label}`;
      this.rules.set(key, rule);
    });
    
    return Array.from(this.rules.values());
  }
  
  private parseUserMessage(message: string): StrategyRule[] {
    const rules: StrategyRule[] = [];
    const lower = message.toLowerCase();
    
    // Opening Range Breakout
    if (lower.includes('opening range') || lower.includes('orb')) {
      rules.push({
        label: 'Pattern Type',
        value: 'Opening Range Breakout',
        category: 'setup',
      });
      
      // Extract timeframe
      const timeMatch = message.match(/(\d+)(?:-|\s+)min/i);
      if (timeMatch) {
        rules.push({
          label: 'Range Period',
          value: `${timeMatch[1]} minutes`,
          category: 'timeframe',
        });
      }
    }
    
    // Direction
    if (lower.includes('buy') || lower.includes('long')) {
      rules.push({
        label: 'Direction',
        value: 'Long only',
        category: 'setup',
      });
    } else if (lower.includes('sell') || lower.includes('short')) {
      rules.push({
        label: 'Direction',
        value: 'Short only',
        category: 'setup',
      });
    } else if (lower.includes('both') || lower.includes('bidirectional')) {
      rules.push({
        label: 'Direction',
        value: 'Long & Short',
        category: 'setup',
      });
    }
    
    // Session timing
    if (lower.includes('rth') || lower.includes('regular')) {
      rules.push({
        label: 'Session',
        value: 'RTH (9:30 AM - 4:00 PM ET)',
        category: 'timeframe',
      });
    } else if (lower.includes('globex')) {
      rules.push({
        label: 'Session',
        value: 'Globex (6:00 PM ET)',
        category: 'timeframe',
      });
    }
    
    return rules;
  }
  
  private parseAssistantMessage(message: string): StrategyRule[] {
    const rules: StrategyRule[] = [];
    
    // Look for Claude's confirmations
    // "So if the opening range is 40 ticks, your stop is 20 ticks from entry, and target is 40 ticks (1:2)."
    
    const rrMatch = message.match(/(\d+):(\d+)(?:\s+rr)?/i);
    if (rrMatch) {
      rules.push({
        label: 'Risk:Reward',
        value: `${rrMatch[1]}:${rrMatch[2]}`,
        category: 'risk',
      });
    }
    
    // Stop loss mentions
    const stopMatches = [
      /stop(?:\s+is)?\s+(\d+%?\s+(?:of|below|above).+?)(?:\.|,|\n)/gi,
      /stop.+?(?:is|=|at)\s+(.+?)(?:\.|,|\n)/gi,
    ];
    
    for (const pattern of stopMatches) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const value = match[1]?.trim();
        if (value && value.length < 50) { // Reasonable length
          rules.push({
            label: 'Stop Loss',
            value: value,
            category: 'risk',
          });
          break; // Only take first match
        }
      }
    }
    
    return rules;
  }
  
  getRules(): StrategyRule[] {
    return Array.from(this.rules.values());
  }
  
  clear() {
    this.rules.clear();
  }
}

// ============================================================================
// EXAMPLE 3: Usage in Actual Chat Component
// ============================================================================

export function IntegratedChatExample() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const parser = new StrategyRuleParser();
  const [strategyRules, setStrategyRules] = useState<StrategyRule[]>([]);
  
  const handleNewMessage = (role: 'user' | 'assistant', content: string) => {
    // Add to messages
    setMessages(prev => [...prev, { role, content }]);
    
    // Parse for strategy rules
    const allRules = parser.parse(content, role);
    setStrategyRules(allRules);
  };
  
  return (
    <div className="relative flex h-screen bg-[#000000]">
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              {msg.content}
            </div>
          ))}
        </div>
        
        {/* Input */}
        <input
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value) {
              handleNewMessage('user', e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>
      
      {/* Strategy Summary Panel - appears when rules exist */}
      <StrategySummaryPanel
        strategyName="Opening Range Breakout"
        rules={strategyRules}
        isVisible={strategyRules.length > 0}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Sample Rules Data (for testing)
// ============================================================================

export const SAMPLE_STRATEGY_RULES: StrategyRule[] = [
  // Setup
  {
    label: 'Pattern Type',
    value: 'Opening Range Breakout',
    category: 'setup',
  },
  {
    label: 'Direction',
    value: 'Long & Short',
    category: 'setup',
  },
  
  // Entry
  {
    label: 'Entry Trigger',
    value: 'Break above/below 15-min high/low',
    category: 'entry',
  },
  
  // Exit
  {
    label: 'Profit Target',
    value: '1:2 Risk:Reward',
    category: 'exit',
  },
  
  // Risk
  {
    label: 'Stop Loss',
    value: '50% of range size',
    category: 'risk',
  },
  {
    label: 'Risk:Reward',
    value: '1:2',
    category: 'risk',
  },
  
  // Timeframe
  {
    label: 'Range Period',
    value: '15 minutes',
    category: 'timeframe',
  },
  {
    label: 'Session',
    value: 'RTH (9:30 AM - 4:00 PM ET)',
    category: 'timeframe',
  },
];
