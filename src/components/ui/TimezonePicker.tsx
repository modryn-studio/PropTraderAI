'use client';

import { useState } from 'react';
import { Check, Globe, ChevronDown } from 'lucide-react';
import { TRADER_TIMEZONES } from '@/lib/utils/timezone';

interface TimezonePickerProps {
  value: string | null;
  onChange: (timezone: keyof typeof TRADER_TIMEZONES | null) => void;
  disabled?: boolean;
  showAutoDetect?: boolean;
}

export default function TimezonePicker({
  value,
  onChange,
  disabled = false,
  showAutoDetect = true,
}: TimezonePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const timezones = Object.entries(TRADER_TIMEZONES);

  const selectedLabel = value 
    ? TRADER_TIMEZONES[value as keyof typeof TRADER_TIMEZONES]
    : 'Auto-detect from conversation';

  return (
    <div className="relative">
      {/* Selected Value Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#12171f] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.85)] hover:border-[rgba(255,255,255,0.2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
          <span className="text-sm">{selectedLabel}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[rgba(255,255,255,0.5)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Options List */}
          <div className="absolute z-50 w-full mt-2 bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-2xl overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {/* Auto-detect option */}
              {showAutoDetect && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] transition-colors ${
                    !value ? 'bg-[rgba(99,102,241,0.1)]' : ''
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm text-[rgba(255,255,255,0.85)] font-medium">
                      Auto-detect
                    </span>
                    <span className="text-xs text-[rgba(255,255,255,0.5)]">
                      Detect from conversation context
                    </span>
                  </div>
                  {!value && (
                    <Check className="w-4 h-4 text-[#6366f1]" />
                  )}
                </button>
              )}

              {/* Divider */}
              {showAutoDetect && (
                <div className="h-px bg-[rgba(255,255,255,0.05)] my-1" />
              )}

              {/* Timezone options */}
              {timezones.map(([tz, label]) => {
                const isSelected = value === tz;
                
                return (
                  <button
                    key={tz}
                    type="button"
                    onClick={() => {
                      onChange(tz as keyof typeof TRADER_TIMEZONES);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] transition-colors ${
                      isSelected ? 'bg-[rgba(99,102,241,0.1)]' : ''
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-sm text-[rgba(255,255,255,0.85)] font-medium">
                        {label}
                      </span>
                      <span className="text-xs text-[rgba(255,255,255,0.5)] font-mono">
                        {tz}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#6366f1]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
