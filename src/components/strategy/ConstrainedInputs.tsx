'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CONSTRAINED INPUT COMPONENTS
 * 
 * Smart inputs for strategy parameter editing.
 * Instead of free text, provide structured options:
 * - StopLossInput: Options + slider for ticks
 * - ProfitTargetInput: R:R buttons + slider
 * - PositionSizingInput: Risk % slider
 * - SessionInput: Session presets
 * - GenericInput: Fallback text input
 * 
 * Design: All inputs include "Explain more in chat" option
 */

interface BaseInputProps {
  label: string;
  currentValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  onChatExplain?: () => void;
}

// ============================================================================
// STOP LOSS INPUT
// ============================================================================

const STOP_LOSS_OPTIONS = [
  { value: 'structure', label: 'Below recent structure' },
  { value: '10 ticks', label: '10 ticks' },
  { value: '15 ticks', label: '15 ticks' },
  { value: '20 ticks', label: '20 ticks' },
  { value: '1 ATR', label: '1 ATR from entry' },
];

export function StopLossInput({ label, currentValue, onSave, onCancel, onChatExplain }: BaseInputProps) {
  const [selected, setSelected] = useState(currentValue);
  const [customTicks, setCustomTicks] = useState(20);
  const [mode, setMode] = useState<'options' | 'slider'>('options');
  
  const handleSave = () => {
    if (mode === 'slider') {
      onSave(`${customTicks} ticks`);
    } else {
      onSave(selected);
    }
  };
  
  return (
    <InputContainer label={label} onSave={handleSave} onCancel={onCancel}>
      <div className="space-y-3">
        {/* Quick Options */}
        <div className="flex flex-wrap gap-2">
          {STOP_LOSS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setSelected(opt.value); setMode('options'); }}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md border transition-colors',
                selected === opt.value && mode === 'options'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        {/* Custom Ticks Slider */}
        <div className="pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Custom ticks</span>
            <span className={cn(
              'text-xs font-mono',
              mode === 'slider' ? 'text-emerald-400' : 'text-zinc-500'
            )}>
              {customTicks} ticks
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={customTicks}
            onChange={(e) => { 
              setCustomTicks(parseInt(e.target.value)); 
              setMode('slider'); 
              setSelected(`${e.target.value} ticks`);
            }}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>5</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>
        
        {/* Chat Option */}
        {onChatExplain && (
          <button
            onClick={onChatExplain}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            Explain more in chat
          </button>
        )}
      </div>
    </InputContainer>
  );
}

// ============================================================================
// PROFIT TARGET INPUT
// ============================================================================

const RR_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '1:1.5', label: '1:1.5' },
  { value: '1:2', label: '1:2' },
  { value: '1:3', label: '1:3' },
];

export function ProfitTargetInput({ label, currentValue, onSave, onCancel, onChatExplain }: BaseInputProps) {
  const [selected, setSelected] = useState(currentValue);
  const [customTicks, setCustomTicks] = useState(30);
  const [mode, setMode] = useState<'rr' | 'ticks'>('rr');
  
  const handleSave = () => {
    if (mode === 'ticks') {
      onSave(`${customTicks} ticks`);
    } else {
      onSave(`${selected} R:R`);
    }
  };
  
  return (
    <InputContainer label={label} onSave={handleSave} onCancel={onCancel}>
      <div className="space-y-3">
        {/* R:R Buttons */}
        <div>
          <span className="text-xs text-zinc-500 block mb-2">Risk:Reward Ratio</span>
          <div className="flex gap-2">
            {RR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSelected(opt.value); setMode('rr'); }}
                className={cn(
                  'px-4 py-2 text-sm rounded-md border transition-colors flex-1',
                  selected === opt.value && mode === 'rr'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Fixed Ticks Slider */}
        <div className="pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Or fixed ticks</span>
            <span className={cn(
              'text-xs font-mono',
              mode === 'ticks' ? 'text-emerald-400' : 'text-zinc-500'
            )}>
              {customTicks} ticks
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={customTicks}
            onChange={(e) => { 
              setCustomTicks(parseInt(e.target.value)); 
              setMode('ticks'); 
            }}
            className="w-full accent-emerald-500"
          />
        </div>
        
        {onChatExplain && (
          <button
            onClick={onChatExplain}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            Explain more in chat
          </button>
        )}
      </div>
    </InputContainer>
  );
}

// ============================================================================
// POSITION SIZING INPUT
// ============================================================================

export function PositionSizingInput({ label, currentValue, onSave, onCancel, onChatExplain }: BaseInputProps) {
  // Parse current value (e.g., "1% risk per trade" -> 1)
  const currentPercent = parseFloat(currentValue) || 1;
  const [riskPercent, setRiskPercent] = useState(currentPercent);
  
  const handleSave = () => {
    onSave(`${riskPercent}% risk per trade`);
  };
  
  return (
    <InputContainer label={label} onSave={handleSave} onCancel={onCancel}>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Risk per trade</span>
            <span className="text-sm font-mono text-emerald-400">{riskPercent}%</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={riskPercent}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>0.5% (Conservative)</span>
            <span>5% (Aggressive)</span>
          </div>
        </div>
        
        <p className="text-[10px] text-zinc-600">
          {riskPercent <= 1 ? '✓ Recommended for prop firm challenges' : 
           riskPercent <= 2 ? '⚠️ Moderate risk level' : 
           '⚠️ High risk - not recommended for challenges'}
        </p>
        
        {onChatExplain && (
          <button
            onClick={onChatExplain}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            Explain more in chat
          </button>
        )}
      </div>
    </InputContainer>
  );
}

// ============================================================================
// SESSION INPUT
// ============================================================================

const SESSION_OPTIONS = [
  { value: 'NY Session (9:30 AM - 4:00 PM ET)', label: 'NY Session', time: '9:30 AM - 4:00 PM ET' },
  { value: 'NY Morning (9:30 AM - 12:00 PM ET)', label: 'NY Morning', time: '9:30 AM - 12:00 PM ET' },
  { value: 'London/NY Overlap (8:00 AM - 11:00 AM ET)', label: 'LDN/NY Overlap', time: '8:00 AM - 11:00 AM ET' },
  { value: 'Full RTH (9:30 AM - 4:00 PM ET)', label: 'Full RTH', time: '9:30 AM - 4:00 PM ET' },
];

export function SessionInput({ label, currentValue, onSave, onCancel, onChatExplain }: BaseInputProps) {
  const [selected, setSelected] = useState(currentValue);
  
  return (
    <InputContainer label={label} onSave={() => onSave(selected)} onCancel={onCancel}>
      <div className="space-y-2">
        {SESSION_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors text-left',
              selected === opt.value
                ? 'bg-emerald-600/20 border-emerald-500'
                : 'border-zinc-700 hover:border-zinc-600'
            )}
          >
            <span className={cn(
              'text-sm',
              selected === opt.value ? 'text-emerald-400' : 'text-zinc-400'
            )}>
              {opt.label}
            </span>
            <span className="text-xs text-zinc-500">{opt.time}</span>
          </button>
        ))}
        
        {onChatExplain && (
          <button
            onClick={onChatExplain}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors mt-2"
          >
            <MessageSquare className="w-3 h-3" />
            Custom session hours
          </button>
        )}
      </div>
    </InputContainer>
  );
}

// ============================================================================
// GENERIC TEXT INPUT (Fallback)
// ============================================================================

export function GenericInput({ label, currentValue, onSave, onCancel }: BaseInputProps) {
  const [value, setValue] = useState(currentValue);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  return (
    <InputContainer label={label} onSave={() => onSave(value)} onCancel={onCancel}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(value);
          if (e.key === 'Escape') onCancel();
        }}
        className={cn(
          'w-full px-3 py-2 rounded-md text-sm',
          'bg-zinc-900 border border-zinc-700',
          'text-zinc-100 placeholder:text-zinc-500',
          'focus:outline-none focus:ring-1 focus:ring-emerald-500'
        )}
      />
    </InputContainer>
  );
}

// ============================================================================
// SHARED CONTAINER
// ============================================================================

interface InputContainerProps {
  label: string;
  children: React.ReactNode;
  onSave: () => void;
  onCancel: () => void;
}

function InputContainer({ label, children, onSave, onCancel }: InputContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);
  
  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-600 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-300">{label}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            className="p-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ============================================================================
// SMART INPUT SELECTOR
// ============================================================================

export function getConstrainedInput(label: string): typeof StopLossInput {
  const labelLower = label.toLowerCase();
  
  if (labelLower.includes('stop') || labelLower.includes('loss')) {
    return StopLossInput;
  }
  if (labelLower.includes('target') || labelLower.includes('profit') || labelLower.includes('reward')) {
    return ProfitTargetInput;
  }
  if (labelLower.includes('position') || labelLower.includes('sizing') || labelLower.includes('risk')) {
    return PositionSizingInput;
  }
  if (labelLower.includes('session') || labelLower.includes('time') || labelLower.includes('hours')) {
    return SessionInput;
  }
  
  return GenericInput;
}
