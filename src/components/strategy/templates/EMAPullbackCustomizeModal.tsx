'use client';

import { useState } from 'react';
import { X, ChevronDown, Loader2, TrendingUp, Info } from 'lucide-react';
import { INSTRUMENT_DEFAULTS } from '@/lib/execution/canonical-schema';

// ============================================================================
// TYPES
// ============================================================================

interface EMAPullbackCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategyId: string) => void;
}

interface EMAPullbackFormData {
  name: string;
  instrument: string;
  direction: 'long' | 'short' | 'both';
  emaPeriod: number;
  pullbackConfirmation: 'touch' | 'close_above' | 'bounce';
  useRsiFilter: boolean;
  rsiPeriod: number;
  rsiThreshold: number;
  rsiDirection: 'above' | 'below';
  stopLossTicks: number;
  targetRatio: number;
  riskPercent: number;
  maxContracts: number;
  session: 'ny' | 'london' | 'asia' | 'all';
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_FORM: EMAPullbackFormData = {
  name: 'ES EMA Pullback',
  instrument: 'ES',
  direction: 'both',
  emaPeriod: 20,
  pullbackConfirmation: 'touch',
  useRsiFilter: false,
  rsiPeriod: 14,
  rsiThreshold: 50,
  rsiDirection: 'above',
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
const EMA_PERIODS = [9, 10, 20, 21, 50, 100, 200];
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
          className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
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
          className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
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

export function EMAPullbackCustomizeModal({ isOpen, onClose, onSave }: EMAPullbackCustomizeModalProps) {
  const [formData, setFormData] = useState<EMAPullbackFormData>(DEFAULT_FORM);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof EMAPullbackFormData>(key: K, value: EMAPullbackFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (key === 'instrument') {
      setFormData(prev => ({ ...prev, name: `${value} EMA Pullback`, [key]: value }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/strategy/create-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: 'ema_pullback', formData }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create strategy');
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
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">EMA Pullback</h2>
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

          {/* EMA Settings */}
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-4">
            <h3 className="text-sm font-medium text-zinc-300">EMA Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="EMA Period"
                value={formData.emaPeriod}
                options={EMA_PERIODS.map(p => ({ value: p, label: `${p} EMA` }))}
                onChange={(v) => updateField('emaPeriod', parseInt(v))}
                hint="Standard: 20 EMA"
              />
              <Select
                label="Pullback Confirmation"
                value={formData.pullbackConfirmation}
                options={[
                  { value: 'touch', label: 'Price Touches EMA' },
                  { value: 'close_above', label: 'Close Above EMA' },
                  { value: 'bounce', label: 'Bounce Candle' },
                ]}
                onChange={(v) => updateField('pullbackConfirmation', v as 'touch' | 'close_above' | 'bounce')}
              />
            </div>
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
              {/* RSI Filter */}
              <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-300">RSI Filter</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useRsiFilter}
                      onChange={(e) => updateField('useRsiFilter', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
                {formData.useRsiFilter && (
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Period"
                      type="number"
                      value={formData.rsiPeriod}
                      onChange={(v) => updateField('rsiPeriod', parseInt(v) || 14)}
                      min={2}
                      max={50}
                    />
                    <Select
                      label="Direction"
                      value={formData.rsiDirection}
                      options={[
                        { value: 'above', label: 'Above' },
                        { value: 'below', label: 'Below' },
                      ]}
                      onChange={(v) => updateField('rsiDirection', v as 'above' | 'below')}
                    />
                    <Input
                      label="Threshold"
                      type="number"
                      value={formData.rsiThreshold}
                      onChange={(v) => updateField('rsiThreshold', parseInt(v) || 50)}
                      min={0}
                      max={100}
                    />
                  </div>
                )}
              </div>

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
              className="flex-1 py-2.5 px-4 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (<><Loader2 className="w-4 h-4 animate-spin" />Creating...</>) : 'Create Strategy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
