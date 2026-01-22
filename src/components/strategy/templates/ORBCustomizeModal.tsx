'use client';

import { useState } from 'react';
import { X, ChevronDown, Loader2, Target, Info } from 'lucide-react';
import { INSTRUMENT_DEFAULTS } from '@/lib/execution/canonical-schema';
import { FEATURES } from '@/config/features';

// ============================================================================
// TYPES
// ============================================================================

interface ORBCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategyId: string) => void;
}

interface ORBFormData {
  name: string;
  instrument: string;
  direction: 'long' | 'short' | 'both';
  rangePeriodMinutes: number;
  entryOn: 'break_high' | 'break_low' | 'both';
  stopLossType: 'fixed_ticks' | 'opposite_range';
  stopLossTicks: number;
  targetType: 'rr_ratio' | 'fixed_ticks' | 'opposite_range';
  targetValue: number;
  riskPercent: number;
  maxContracts: number;
  session: 'ny' | 'london' | 'asia' | 'all';
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_ORB_FORM: ORBFormData = {
  name: 'ES Opening Range Breakout',
  instrument: 'ES',
  direction: 'both',
  rangePeriodMinutes: 15,
  entryOn: 'both',
  stopLossType: 'fixed_ticks',
  stopLossTicks: 20,
  targetType: 'rr_ratio',
  targetValue: 2,
  riskPercent: 1,
  maxContracts: 10,
  session: 'ny',
};

// ============================================================================
// OPTIONS
// ============================================================================

const INSTRUMENTS = Object.keys(INSTRUMENT_DEFAULTS);
const RANGE_PERIODS = [5, 10, 15, 30, 60];
const SESSIONS = [
  { value: 'ny', label: 'New York (9:30 AM - 4:00 PM ET)' },
  { value: 'london', label: 'London (3:00 AM - 12:00 PM ET)' },
  { value: 'asia', label: 'Asia (8:00 PM - 4:00 AM ET)' },
  { value: 'all', label: 'All Day (24 Hours)' },
];

// ============================================================================
// SELECT COMPONENT
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
      <label className="block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
      {hint && (
        <p className="text-xs text-zinc-500 flex items-center gap-1">
          <Info className="w-3 h-3" /> {hint}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// INPUT COMPONENT
// ============================================================================

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
      <label className="block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-xs text-zinc-500 flex items-center gap-1">
          <Info className="w-3 h-3" /> {hint}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

export function ORBCustomizeModal({ isOpen, onClose, onSave }: ORBCustomizeModalProps) {
  const [formData, setFormData] = useState<ORBFormData>(DEFAULT_ORB_FORM);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof ORBFormData>(key: K, value: ORBFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Auto-update name when instrument changes
    if (key === 'instrument') {
      setFormData(prev => ({ 
        ...prev, 
        name: `${value} Opening Range Breakout`,
        [key]: value,
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/strategy/create-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: 'opening_range_breakout',
          formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create strategy');
      }

      // Activate strategy on execution server (if enabled)
      if (FEATURES.strategy_activation_enabled) {
        try {
          await fetch('/api/strategy/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strategyId: data.strategy.id }),
          });
        } catch (activationError) {
          // Don't fail save if activation fails - it will retry on server restart
          console.warn('[ORB] Activation pending:', activationError);
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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#12171f] border border-zinc-800/50 rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Opening Range Breakout</h2>
              <p className="text-xs text-zinc-500">Customize your strategy</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Strategy Name */}
          <Input
            label="Strategy Name"
            value={formData.name}
            onChange={(v) => updateField('name', v)}
          />

          {/* Basic Settings */}
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

          {/* Opening Range Settings */}
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-4">
            <h3 className="text-sm font-medium text-zinc-300">Opening Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Range Period"
                value={formData.rangePeriodMinutes}
                options={RANGE_PERIODS.map(p => ({ value: p, label: `${p} minutes` }))}
                onChange={(v) => updateField('rangePeriodMinutes', parseInt(v))}
                hint="First N minutes define the range"
              />
              <Select
                label="Entry On"
                value={formData.entryOn}
                options={[
                  { value: 'both', label: 'Both Breakouts' },
                  { value: 'break_high', label: 'Break High Only' },
                  { value: 'break_low', label: 'Break Low Only' },
                ]}
                onChange={(v) => updateField('entryOn', v as 'break_high' | 'break_low' | 'both')}
              />
            </div>
          </div>

          {/* Stop Loss */}
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-4">
            <h3 className="text-sm font-medium text-zinc-300">Stop Loss</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Stop Type"
                value={formData.stopLossType}
                options={[
                  { value: 'fixed_ticks', label: 'Fixed Ticks' },
                  { value: 'opposite_range', label: 'Opposite of Range' },
                ]}
                onChange={(v) => updateField('stopLossType', v as 'fixed_ticks' | 'opposite_range')}
              />
              {formData.stopLossType === 'fixed_ticks' && (
                <Input
                  label="Stop Distance"
                  type="number"
                  value={formData.stopLossTicks}
                  onChange={(v) => updateField('stopLossTicks', parseInt(v) || 20)}
                  suffix="ticks"
                  min={5}
                  max={100}
                />
              )}
            </div>
          </div>

          {/* Target */}
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-4">
            <h3 className="text-sm font-medium text-zinc-300">Profit Target</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Target Type"
                value={formData.targetType}
                options={[
                  { value: 'rr_ratio', label: 'Risk:Reward Ratio' },
                  { value: 'fixed_ticks', label: 'Fixed Ticks' },
                  { value: 'opposite_range', label: 'Opposite of Range' },
                ]}
                onChange={(v) => updateField('targetType', v as 'rr_ratio' | 'fixed_ticks' | 'opposite_range')}
              />
              {formData.targetType !== 'opposite_range' && (
                <Input
                  label={formData.targetType === 'rr_ratio' ? 'R:R Ratio' : 'Target Distance'}
                  type="number"
                  value={formData.targetValue}
                  onChange={(v) => updateField('targetValue', parseFloat(v) || 2)}
                  suffix={formData.targetType === 'rr_ratio' ? ':1' : 'ticks'}
                  min={1}
                  max={formData.targetType === 'rr_ratio' ? 10 : 200}
                  hint={formData.targetType === 'rr_ratio' ? '2 = risk $100, target $200' : undefined}
                />
              )}
            </div>
          </div>

          {/* Advanced Toggle */}
          <button
            onClick={() => setIsAdvanced(!isAdvanced)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isAdvanced ? 'rotate-180' : ''}`} />
            {isAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </button>

          {/* Advanced Settings */}
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
                    hint="Percentage of account per trade"
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
                hint="When the strategy will monitor for setups"
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50">
          {error && (
            <p className="text-sm text-red-400 mb-3">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Strategy'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
