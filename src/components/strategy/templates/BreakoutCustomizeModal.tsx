'use client';

import { useState } from 'react';
import { X, ChevronDown, Loader2, Zap, Info } from 'lucide-react';
import { INSTRUMENT_DEFAULTS } from '@/lib/execution/canonical-schema';
import { FEATURES } from '@/config/features';

// ============================================================================
// TYPES
// ============================================================================

interface BreakoutCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategyId: string) => void;
}

interface BreakoutFormData {
  name: string;
  instrument: string;
  direction: 'long' | 'short' | 'both';
  lookbackPeriod: number;
  levelType: 'resistance' | 'support' | 'both';
  confirmation: 'close' | 'volume' | 'none';
  stopLossTicks: number;
  targetRatio: number;
  riskPercent: number;
  maxContracts: number;
  session: 'ny' | 'london' | 'asia' | 'all';
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_FORM: BreakoutFormData = {
  name: 'ES Breakout',
  instrument: 'ES',
  direction: 'both',
  lookbackPeriod: 20,
  levelType: 'both',
  confirmation: 'close',
  stopLossTicks: 20,
  targetRatio: 2,
  riskPercent: 1,
  maxContracts: 10,
  session: 'ny',
};

// ============================================================================
// OPTIONS
// ============================================================================

const INSTRUMENTS = Object.keys(INSTRUMENT_DEFAULTS);
const LOOKBACK_PERIODS = [10, 15, 20, 30, 50, 100];
const SESSIONS = [
  { value: 'ny', label: 'New York (9:30 AM - 4:00 PM ET)' },
  { value: 'london', label: 'London (3:00 AM - 12:00 PM ET)' },
  { value: 'asia', label: 'Asia (8:00 PM - 4:00 AM ET)' },
  { value: 'all', label: 'All Day (24 Hours)' },
];

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface SelectProps {
  label: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
  hint?: string;
}

function Select({ label, value, options, onChange, hint }: SelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
      {hint && <p className="text-xs text-zinc-500 flex items-center gap-1"><Info className="w-3 h-3" /> {hint}</p>}
    </div>
  );
}

interface InputProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  onChange: (value: string) => void;
  suffix?: string;
  min?: number;
  max?: number;
  hint?: string;
}

function Input({ label, value, type = 'text', onChange, suffix, min, max, hint }: InputProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-zinc-500 flex items-center gap-1"><Info className="w-3 h-3" /> {hint}</p>}
    </div>
  );
}

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

export function BreakoutCustomizeModal({ isOpen, onClose, onSave }: BreakoutCustomizeModalProps) {
  const [formData, setFormData] = useState<BreakoutFormData>(DEFAULT_FORM);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof BreakoutFormData>(key: K, value: BreakoutFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (key === 'instrument') {
      setFormData(prev => ({ ...prev, name: `${value} Breakout`, [key]: value }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/strategy/create-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: 'breakout', formData }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create strategy');

      // Activate strategy on execution server (if enabled)
      if (FEATURES.strategy_activation_enabled) {
        try {
          await fetch('/api/strategy/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strategyId: data.strategy.id }),
          });
        } catch (activationError) {
          console.warn('[Breakout] Activation pending:', activationError);
        }
      }

      onSave(data.strategy.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#12171f] border border-zinc-800/50 rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Breakout</h2>
              <p className="text-xs text-zinc-500">Customize your strategy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <Input label="Strategy Name" value={formData.name} onChange={(v) => updateField('name', v)} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Instrument"
              value={formData.instrument}
              options={INSTRUMENTS.map(i => ({ value: i, label: i }))}
              onChange={(v) => updateField('instrument', v)}
            />
            <Select
              label="Direction"
              value={formData.direction}
              options={[
                { value: 'both', label: 'Both' },
                { value: 'long', label: 'Long Only' },
                { value: 'short', label: 'Short Only' },
              ]}
              onChange={(v) => updateField('direction', v as 'long' | 'short' | 'both')}
            />
          </div>

          {/* Breakout Settings */}
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-4">
            <h3 className="text-sm font-medium text-zinc-300">Breakout Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Lookback Period"
                value={formData.lookbackPeriod}
                options={LOOKBACK_PERIODS.map(p => ({ value: p, label: `${p} bars` }))}
                onChange={(v) => updateField('lookbackPeriod', parseInt(v))}
                hint="How many bars to find high/low"
              />
              <Select
                label="Level Type"
                value={formData.levelType}
                options={[
                  { value: 'both', label: 'Both Levels' },
                  { value: 'resistance', label: 'Resistance Only' },
                  { value: 'support', label: 'Support Only' },
                ]}
                onChange={(v) => updateField('levelType', v as 'resistance' | 'support' | 'both')}
              />
            </div>
            <Select
              label="Confirmation"
              value={formData.confirmation}
              options={[
                { value: 'close', label: 'Close Above/Below Level' },
                { value: 'volume', label: 'Volume Spike' },
                { value: 'none', label: 'No Confirmation' },
              ]}
              onChange={(v) => updateField('confirmation', v as 'close' | 'volume' | 'none')}
              hint="Reduces false breakouts"
            />
          </div>

          {/* Stop & Target */}
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-4">
            <h3 className="text-sm font-medium text-zinc-300">Exit Rules</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Stop Loss"
                type="number"
                value={formData.stopLossTicks}
                onChange={(v) => updateField('stopLossTicks', parseInt(v) || 20)}
                suffix="ticks"
                min={5}
                max={100}
              />
              <Input
                label="Target Ratio"
                type="number"
                value={formData.targetRatio}
                onChange={(v) => updateField('targetRatio', parseFloat(v) || 2)}
                suffix=":1"
                min={1}
                max={10}
                hint="2 = risk $100, target $200"
              />
            </div>
          </div>

          <button
            onClick={() => setIsAdvanced(!isAdvanced)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isAdvanced ? 'rotate-180' : ''}`} />
            {isAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </button>

          {isAdvanced && (
            <>
              <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-4">
                <h3 className="text-sm font-medium text-zinc-300">Risk Management</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Risk Per Trade"
                    type="number"
                    value={formData.riskPercent}
                    onChange={(v) => updateField('riskPercent', parseFloat(v) || 1)}
                    suffix="%"
                    min={0.1}
                    max={5}
                  />
                  <Input
                    label="Max Contracts"
                    type="number"
                    value={formData.maxContracts}
                    onChange={(v) => updateField('maxContracts', parseInt(v) || 10)}
                    suffix="contracts"
                    min={1}
                    max={20}
                  />
                </div>
              </div>

              <Select
                label="Trading Session"
                value={formData.session}
                options={SESSIONS.map(s => ({ value: s.value, label: s.label }))}
                onChange={(v) => updateField('session', v as 'ny' | 'london' | 'asia' | 'all')}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50">
          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 px-4 rounded-lg border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (<><Loader2 className="w-4 h-4 animate-spin" />Creating...</>) : 'Create Strategy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
