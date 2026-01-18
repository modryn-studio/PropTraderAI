'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, MessageSquare, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CONSTRAINED INPUT COMPONENTS
 * 
 * Smart inputs for strategy parameter editing.
 * NO FREE TEXT - all inputs use buttons, dropdowns, or sliders.
 * 
 * Components:
 * - InstrumentInput: Dropdown for futures instruments
 * - PatternInput: Button grid for trading patterns
 * - RangePeriodInput: Dropdown for time periods
 * - EntryTriggerInput: Button list for entry triggers
 * - DirectionInput: 3 buttons (Long/Short/Both)
 * - StopLossInput: Options + slider for ticks
 * - ProfitTargetInput: R:R buttons + slider
 * - PositionSizingInput: Risk % slider
 * - MaxContractsInput: Slider for max contracts
 * - SessionInput: Session presets
 * 
 * Design: Terminal Luxe - cyan accents, sharp corners, monospace
 */

interface BaseInputProps {
  label: string;
  currentValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  onChatExplain?: () => void;
}

// ============================================================================
// INSTRUMENT INPUT (Dropdown)
// ============================================================================

const INSTRUMENTS = [
  { value: 'ES', label: 'ES - E-mini S&P 500' },
  { value: 'MES', label: 'MES - Micro E-mini S&P 500' },
  { value: 'NQ', label: 'NQ - E-mini Nasdaq-100' },
  { value: 'MNQ', label: 'MNQ - Micro E-mini Nasdaq-100' },
  { value: 'YM', label: 'YM - E-mini Dow' },
  { value: 'MYM', label: 'MYM - Micro E-mini Dow' },
  { value: 'RTY', label: 'RTY - E-mini Russell 2000' },
  { value: 'M2K', label: 'M2K - Micro E-mini Russell 2000' },
  { value: 'CL', label: 'CL - Crude Oil' },
  { value: 'MCL', label: 'MCL - Micro Crude Oil' },
  { value: 'GC', label: 'GC - Gold' },
  { value: 'MGC', label: 'MGC - Micro Gold' },
];

export function InstrumentInput({ label, currentValue, onSave, onCancel }: BaseInputProps) {
  const [selected, setSelected] = useState(currentValue);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  
  // Mobile: Use native select
  if (isMobile) {
    return (
      <InputContainer label={label} onSave={() => onSave(selected)} onCancel={onCancel}>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-3 py-2 border border-white/10 bg-[#000000] text-white font-mono text-sm focus:border-[#00FFD1] focus:outline-none"
        >
          {INSTRUMENTS.map(inst => (
            <option key={inst.value} value={inst.value}>
              {inst.label}
            </option>
          ))}
        </select>
      </InputContainer>
    );
  }
  
  // Desktop: Custom dropdown
  return (
    <InputContainer label={label} onSave={() => onSave(selected)} onCancel={onCancel}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-white/10 bg-[#000000] text-white font-mono text-sm hover:border-white/20 transition-colors"
        >
          <span>{INSTRUMENTS.find(i => i.value === selected)?.label || selected}</span>
          <ChevronDown className={cn('w-4 h-4 text-white/50 transition-transform', isOpen && 'rotate-180')} />
        </button>
        
        {isOpen && (
          <div className="absolute z-20 w-full mt-1 bg-[#0a0a0a] border border-white/10 max-h-60 overflow-y-auto">
            {INSTRUMENTS.map(inst => (
              <button
                key={inst.value}
                onClick={() => { setSelected(inst.value); setIsOpen(false); }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm font-mono transition-colors',
                  selected === inst.value 
                    ? 'bg-[#00FFD1]/10 text-[#00FFD1]' 
                    : 'text-white/70 hover:bg-white/5'
                )}
              >
                {inst.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </InputContainer>
  );
}

// ============================================================================
// PATTERN INPUT (Button Grid)
// ============================================================================

const PATTERNS = [
  { value: 'Opening Range Breakout', shortLabel: 'ORB' },
  { value: 'Pullback', shortLabel: 'Pullback' },
  { value: 'Breakout', shortLabel: 'Breakout' },
  { value: 'VWAP Cross', shortLabel: 'VWAP' },
  { value: 'Momentum', shortLabel: 'Momentum' },
  { value: 'Reversal', shortLabel: 'Reversal' },
  { value: 'Range Bound', shortLabel: 'Range' },
];

export function PatternInput({ label, currentValue, onSave, onCancel }: BaseInputProps) {
  const [selected, setSelected] = useState(currentValue);
  
  return (
    <InputContainer label={label} onSave={() => onSave(selected)} onCancel={onCancel}>
      <div className="grid grid-cols-3 gap-2">
        {PATTERNS.map(p => (
          <button
            key={p.value}
            onClick={() => setSelected(p.value)}
            className={cn(
              'px-3 py-2 text-xs border transition-colors font-mono',
              selected === p.value
                ? 'bg-[#00FFD1]/10 border-[#00FFD1] text-[#00FFD1]'
                : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
            )}
          >
            {p.shortLabel}
          </button>
        ))}
      </div>
    </InputContainer>
  );
}

// ============================================================================
// RANGE PERIOD INPUT (Dropdown)
// ============================================================================

const RANGE_PERIODS = [
  { value: '1 minute', label: '1 min' },
  { value: '5 minutes', label: '5 min' },
  { value: '15 minutes', label: '15 min' },
  { value: '30 minutes', label: '30 min' },
  { value: '60 minutes', label: '60 min' },
  { value: '90 minutes', label: '90 min' },
];

export function RangePeriodInput({ label, currentValue, onSave, onCancel }: BaseInputProps) {
  const [selected, setSelected] = useState(currentValue);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  
  // Mobile: Use native select
  if (isMobile) {
    return (
      <InputContainer label={label} onSave={() => onSave(selected)} onCancel={onCancel}>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-3 py-2 border border-white/10 bg-[#000000] text-white font-mono text-sm focus:border-[#00FFD1] focus:outline-none"
        >
          {RANGE_PERIODS.map(period => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>
      </InputContainer>
    );
  }
  
  // Desktop: Custom dropdown
  return (
    <InputContainer label={label} onSave={() => onSave(selected)} onCancel={onCancel}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-white/10 bg-[#000000] text-white font-mono text-sm hover:border-white/20 transition-colors"
        >
          <span>{RANGE_PERIODS.find(r => r.value === selected)?.label || selected}</span>
          <ChevronDown className={cn('w-4 h-4 text-white/50 transition-transform', isOpen && 'rotate-180')} />
        </button>
        
        {isOpen && (
          <div className="absolute z-20 w-full mt-1 bg-[#0a0a0a] border border-white/10">
            {RANGE_PERIODS.map(period => (
              <button
                key={period.value}
                onClick={() => { setSelected(period.value); setIsOpen(false); }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm font-mono transition-colors',
                  selected === period.value 
                    ? 'bg-[#00FFD1]/10 text-[#00FFD1]' 
                    : 'text-white/70 hover:bg-white/5'
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </InputContainer>
  );
}

// ============================================================================
// ENTRY TRIGGER INPUT (Button List)
// ============================================================================

const ENTRY_TRIGGERS = [
  'Break above opening range',
  'Break below opening range',
  'Pullback to support/resistance',
  'VWAP cross',
  'Moving average cross',
  'Breakout of consolidation',
  'Momentum continuation',
];

export function EntryTriggerInput({ label, currentValue, onSave, onCancel }: BaseInputProps) {
  const [selected, setSelected] = useState(currentValue);
  
  return (
    <InputContainer label={label} onSave={() => onSave(selected)} onCancel={onCancel}>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {ENTRY_TRIGGERS.map(trigger => (
          <button
            key={trigger}
            onClick={() => setSelected(trigger)}
            className={cn(
              'w-full px-3 py-2 text-left text-sm border transition-colors font-mono',
              selected === trigger
                ? 'bg-[#00FFD1]/10 border-[#00FFD1] text-[#00FFD1]'
                : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
            )}
          >
            {trigger}
          </button>
        ))}
      </div>
    </InputContainer>
  );
}

// ============================================================================
// DIRECTION INPUT (3 Buttons)
// ============================================================================

const DIRECTIONS = [
  { value: 'Long only', icon: '↑', label: 'Long' },
  { value: 'Short only', icon: '↓', label: 'Short' },
  { value: 'Both long and short', icon: '↕', label: 'Both' },
];

export function DirectionInput({ label, currentValue, onSave, onCancel }: BaseInputProps) {
  const [selected, setSelected] = useState(currentValue);
  
  return (
    <InputContainer label={label} onSave={() => onSave(selected)} onCancel={onCancel}>
      <div className="grid grid-cols-3 gap-2">
        {DIRECTIONS.map(dir => (
          <button
            key={dir.value}
            onClick={() => setSelected(dir.value)}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-3 border transition-colors font-mono',
              selected === dir.value
                ? 'bg-[#00FFD1]/10 border-[#00FFD1] text-[#00FFD1]'
                : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
            )}
          >
            <span className="text-2xl">{dir.icon}</span>
            <span className="text-xs">{dir.label}</span>
          </button>
        ))}
      </div>
    </InputContainer>
  );
}

// ============================================================================
// MAX CONTRACTS INPUT (Slider)
// ============================================================================

export function MaxContractsInput({ label, currentValue, onSave, onCancel }: BaseInputProps) {
  const currentNum = parseInt(currentValue) || 1;
  const [contracts, setContracts] = useState(currentNum);
  
  return (
    <InputContainer label={label} onSave={() => onSave(`${contracts} contract${contracts !== 1 ? 's' : ''}`)} onCancel={onCancel}>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/40">Max contracts per trade</span>
          <span className="text-sm font-mono text-[#00FFD1]">{contracts}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={contracts}
          onChange={(e) => setContracts(parseInt(e.target.value))}
          className="w-full accent-[#00FFD1]"
        />
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>1</span>
          <span>10</span>
          <span>20</span>
        </div>
      </div>
    </InputContainer>
  );
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
                'px-3 py-1.5 text-xs border transition-colors font-mono',
                selected === opt.value && mode === 'options'
                  ? 'bg-[#00FFD1]/10 border-[#00FFD1] text-[#00FFD1]'
                  : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        {/* Custom Ticks Slider */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40">Custom ticks</span>
            <span className={cn(
              'text-xs font-mono',
              mode === 'slider' ? 'text-[#00FFD1]' : 'text-white/40'
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
            className="w-full accent-[#00FFD1]"
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>5</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>
        
        {/* Chat Option */}
        {onChatExplain && (
          <button
            onClick={onChatExplain}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors"
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
          <span className="text-xs text-white/40 block mb-2">Risk:Reward Ratio</span>
          <div className="flex gap-2">
            {RR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSelected(opt.value); setMode('rr'); }}
                className={cn(
                  'px-4 py-2 text-sm border transition-colors flex-1 font-mono',
                  selected === opt.value && mode === 'rr'
                    ? 'bg-[#00FFD1]/10 border-[#00FFD1] text-[#00FFD1]'
                    : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Fixed Ticks Slider */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40">Or fixed ticks</span>
            <span className={cn(
              'text-xs font-mono',
              mode === 'ticks' ? 'text-[#00FFD1]' : 'text-white/40'
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
            className="w-full accent-[#00FFD1]"
          />
        </div>
        
        {onChatExplain && (
          <button
            onClick={onChatExplain}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors"
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
            <span className="text-xs text-white/40">Risk per trade</span>
            <span className="text-sm font-mono text-[#00FFD1]">{riskPercent}%</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={riskPercent}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
            className="w-full accent-[#00FFD1]"
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>0.5% (Conservative)</span>
            <span>5% (Aggressive)</span>
          </div>
        </div>
        
        <p className="text-[10px] text-white/40">
          {riskPercent <= 1 ? '✓ Recommended for prop firm challenges' : 
           riskPercent <= 2 ? '⚠️ Moderate risk level' : 
           '⚠️ High risk - not recommended for challenges'}
        </p>
        
        {onChatExplain && (
          <button
            onClick={onChatExplain}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors"
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
  { value: 'NY Afternoon (12:00 PM - 4:00 PM ET)', label: 'NY Afternoon', time: '12:00 PM - 4:00 PM ET' },
  { value: 'Opening Hour (9:30 AM - 10:30 AM ET)', label: 'Opening Hour', time: '9:30 AM - 10:30 AM ET' },
  { value: 'Power Hour (3:00 PM - 4:00 PM ET)', label: 'Power Hour', time: '3:00 PM - 4:00 PM ET' },
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
              'w-full flex items-center justify-between px-3 py-2 border transition-colors text-left font-mono',
              selected === opt.value
                ? 'bg-[#00FFD1]/10 border-[#00FFD1]'
                : 'border-white/10 hover:border-white/20'
            )}
          >
            <span className={cn(
              'text-sm',
              selected === opt.value ? 'text-[#00FFD1]' : 'text-white/50'
            )}>
              {opt.label}
            </span>
            <span className="text-xs text-white/30">{opt.time}</span>
          </button>
        ))}
        
        {onChatExplain && (
          <button
            onClick={onChatExplain}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors mt-2"
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
      className="p-3 bg-[#0a0a0a] border border-[#00FFD1] font-mono"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-white">{label}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            className="p-1.5 bg-[#00FFD1]/10 hover:bg-[#00FFD1]/20 text-[#00FFD1] transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-white/10 text-white/50 transition-colors"
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
  
  // Instrument
  if (labelLower.includes('instrument') || labelLower.includes('symbol') || labelLower.includes('contract')) {
    return InstrumentInput;
  }
  
  // Pattern
  if (labelLower.includes('pattern') || labelLower.includes('setup') || labelLower.includes('strategy type')) {
    return PatternInput;
  }
  
  // Range period
  if (labelLower.includes('range') && labelLower.includes('period')) {
    return RangePeriodInput;
  }
  
  // Entry trigger
  if (labelLower.includes('entry') && (labelLower.includes('trigger') || labelLower.includes('condition'))) {
    return EntryTriggerInput;
  }
  
  // Direction
  if (labelLower.includes('direction') || labelLower.includes('long') || labelLower.includes('short')) {
    return DirectionInput;
  }
  
  // Max contracts
  if (labelLower.includes('max') && labelLower.includes('contract')) {
    return MaxContractsInput;
  }
  
  // Stop loss
  if (labelLower.includes('stop') || labelLower.includes('loss')) {
    return StopLossInput;
  }
  
  // Profit target
  if (labelLower.includes('target') || labelLower.includes('profit') || labelLower.includes('reward')) {
    return ProfitTargetInput;
  }
  
  // Position sizing / risk
  if (labelLower.includes('position') || labelLower.includes('sizing') || labelLower.includes('risk')) {
    return PositionSizingInput;
  }
  
  // Session / time
  if (labelLower.includes('session') || labelLower.includes('time') || labelLower.includes('hours')) {
    return SessionInput;
  }
  
  // NO FALLBACK - all parameters MUST have constrained inputs
  // If you see this error, create a proper constrained input for this label
  console.error(`❌ NO CONSTRAINED INPUT FOR: "${label}"`);
  console.error('Available inputs: Instrument, Pattern, RangePeriod, EntryTrigger, Direction, MaxContracts, StopLoss, ProfitTarget, PositionSizing, Session');
  
  // Return a placeholder that shows the error to the user
  return ({ currentValue, onCancel }: BaseInputProps) => (
    <div className="p-4 border border-red-500/50 bg-red-500/10">
      <p className="text-red-400 font-mono text-sm mb-2">
        ❌ No constrained input for: "{label}"
      </p>
      <p className="text-white/50 text-xs mb-3">
        Current value: {currentValue}
      </p>
      <button 
        onClick={onCancel}
        className="px-3 py-1 bg-white/10 text-white text-sm hover:bg-white/20"
      >
        Cancel
      </button>
    </div>
  );
}
