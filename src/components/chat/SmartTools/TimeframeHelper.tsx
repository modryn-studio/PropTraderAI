'use client';

/**
 * Timeframe Helper - Smart Tool
 * 
 * Help users define trading session times with timezone awareness
 * and visual timeline representation.
 * 
 * Created: January 13, 2026
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, Keyboard, AlertTriangle, Info } from 'lucide-react';
import type { TimeframeHelperProps, TimeframeValues } from './types';
import { MARKET_SESSIONS, TIMEZONES } from './types';

// Days of week
const DAYS = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' },
  { key: 'Sun', label: 'Sun' },
];

// Time options for dropdowns (5 min increments)
const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, i) => {
  const hours = Math.floor(i / 12);
  const minutes = (i % 12) * 5;
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? 'AM' : 'PM';
  const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const label = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  return { value, label };
});

// Key market hours (ET) - reference for future enhancements
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MARKET_HOURS = {
  preMarket: { start: '04:00', end: '09:30', label: 'Pre-Market' },
  regularSession: { start: '09:30', end: '16:00', label: 'Regular Session' },
  afterHours: { start: '16:00', end: '20:00', label: 'After Hours' },
  futuresOpen: { start: '18:00', end: '17:00', label: 'Futures (23hr)' },
};

export default function TimeframeHelper({
  prefilledData,
  userTimezone,
  onComplete,
  onDismiss,
  isCollapsed = false,
  onToggleCollapse,
}: TimeframeHelperProps) {
  // Form state
  const [timezone, setTimezone] = useState<string>(
    userTimezone || prefilledData.timezone || 'ET'
  );
  const [selectedPreset, setSelectedPreset] = useState<string | null>('Morning Session');
  const [startTime, setStartTime] = useState<string>('09:30');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  
  // Completed state
  const [completedValues, setCompletedValues] = useState<TimeframeValues | null>(null);

  // ========================================================================
  // TIME CONVERSIONS
  // ========================================================================
  
  const convertToET = useCallback((time: string, fromTz: string): string => {
    if (fromTz === 'ET') return time;
    
    const offset = TIMEZONES[fromTz as keyof typeof TIMEZONES]?.offset || 0;
    const [hours, minutes] = time.split(':').map(Number);
    let etHours = hours - offset; // Subtract offset to get to ET
    
    if (etHours < 0) etHours += 24;
    if (etHours >= 24) etHours -= 24;
    
    return `${etHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

  const convertFromET = useCallback((time: string, toTz: string): string => {
    if (toTz === 'ET') return time;
    
    const offset = TIMEZONES[toTz as keyof typeof TIMEZONES]?.offset || 0;
    const [hours, minutes] = time.split(':').map(Number);
    let localHours = hours + offset; // Add offset to convert from ET
    
    if (localHours < 0) localHours += 24;
    if (localHours >= 24) localHours -= 24;
    
    return `${localHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

  const formatTime12h = useCallback((time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }, []);

  // ========================================================================
  // CALCULATIONS
  // ========================================================================
  
  const sessionAnalysis = useMemo(() => {
    const startET = convertToET(startTime, timezone);
    const endET = convertToET(endTime, timezone);
    
    const insights: string[] = [];
    const warnings: string[] = [];
    
    // Check overlap with market hours
    const startHour = parseInt(startET.split(':')[0]);
    const endHour = parseInt(endET.split(':')[0]);
    
    // Regular session overlap
    if (startHour >= 9 && startHour < 16) {
      if (startHour < 10) {
        insights.push('✓ Covers NYSE/NASDAQ open (9:30-10:30 ET)');
      }
      if (startHour >= 9 && endHour >= 12) {
        insights.push('✓ Includes morning session (highest volume)');
      }
    }
    
    // Afternoon trading
    if (endHour > 14 && endHour <= 16) {
      insights.push('✓ Covers afternoon reversal period');
    }
    
    // Warning for low liquidity periods
    if (startHour < 6 || endHour > 18) {
      warnings.push('Includes overnight hours (lower liquidity)');
    }
    
    // Weekend trading
    if (selectedDays.includes('Sat') || selectedDays.includes('Sun')) {
      warnings.push('Weekend - limited futures trading');
    }
    
    // Calculate session duration
    let durationMinutes = 0;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (durationMinutes < 0) durationMinutes += 24 * 60; // Overnight session
    
    const durationHours = Math.floor(durationMinutes / 60);
    const durationMins = durationMinutes % 60;
    
    return {
      startET,
      endET,
      insights,
      warnings,
      duration: `${durationHours}h ${durationMins}m`,
    };
  }, [startTime, endTime, timezone, selectedDays, convertToET]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  
  const handlePresetSelect = useCallback((presetName: string | null) => {
    setSelectedPreset(presetName);
    if (presetName && MARKET_SESSIONS[presetName as keyof typeof MARKET_SESSIONS]) {
      const preset = MARKET_SESSIONS[presetName as keyof typeof MARKET_SESSIONS];
      // Convert from ET to user's timezone
      setStartTime(convertFromET(preset.startET, timezone));
      setEndTime(convertFromET(preset.endET, timezone));
    }
  }, [timezone, convertFromET]);

  const handleTimezoneChange = useCallback((newTz: string) => {
    // Convert current times to new timezone
    const startET = convertToET(startTime, timezone);
    const endET = convertToET(endTime, timezone);
    setTimezone(newTz);
    setStartTime(convertFromET(startET, newTz));
    setEndTime(convertFromET(endET, newTz));
  }, [startTime, endTime, timezone, convertToET, convertFromET]);

  const toggleDay = useCallback((day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  }, []);

  const handleComplete = useCallback(() => {
    const values: TimeframeValues = {
      startTime,
      endTime,
      timezone,
      days: selectedDays,
    };
    
    setCompletedValues(values);
    onComplete(values as unknown as Record<string, unknown>);
  }, [startTime, endTime, timezone, selectedDays, onComplete]);

  // ========================================================================
  // TIMELINE VISUALIZATION
  // ========================================================================
  
  const TimelineBar = () => {
    // Convert times to percentage of 24h for positioning
    const timeToPercent = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return ((hours * 60 + minutes) / (24 * 60)) * 100;
    };
    
    const startPercent = timeToPercent(sessionAnalysis.startET);
    const endPercent = timeToPercent(sessionAnalysis.endET);
    const width = endPercent > startPercent 
      ? endPercent - startPercent 
      : (100 - startPercent) + endPercent; // Overnight
    
    return (
      <div className="relative h-8 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
        {/* Market session backgrounds */}
        <div 
          className="absolute h-full bg-[rgba(255,255,255,0.1)]"
          style={{ 
            left: `${timeToPercent('09:30')}%`, 
            width: `${timeToPercent('16:00') - timeToPercent('09:30')}%` 
          }}
        />
        
        {/* User's selected session */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          className="absolute h-full bg-[#00ff41] opacity-30"
          style={{ left: `${startPercent}%` }}
        />
        
        {/* Start/end markers */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-[#00ff41]"
          style={{ left: `${startPercent}%` }}
        />
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-[#00ff41]"
          style={{ left: `${endPercent}%` }}
        />
        
        {/* Time labels */}
        <div className="absolute inset-x-0 top-full mt-1 flex justify-between text-xs text-[rgba(255,255,255,0.4)]">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>12am</span>
        </div>
      </div>
    );
  };

  // ========================================================================
  // COLLAPSED VIEW
  // ========================================================================
  
  if (isCollapsed && completedValues) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="my-3"
      >
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between px-4 py-3 
                     bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg
                     hover:border-[rgba(255,255,255,0.2)] transition-colors
                     text-left"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[#00ff41]" />
            <span className="text-sm text-white font-mono">
              {formatTime12h(completedValues.startTime)} - {formatTime12h(completedValues.endTime)} {completedValues.timezone}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
        </button>
      </motion.div>
    );
  }

  // ========================================================================
  // FULL VIEW
  // ========================================================================
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="my-4"
    >
      <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00ff41]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[rgba(255,255,255,0.5)]">
              Timeframe Helper
            </span>
          </div>
          {onToggleCollapse && completedValues && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.5)]" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Timezone Selector */}
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
              Your Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                         py-2.5 px-3 text-white text-sm
                         focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                         transition-colors appearance-none cursor-pointer"
            >
              {Object.entries(TIMEZONES).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          {/* Session Presets */}
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MARKET_SESSIONS).map(([name, session]) => (
                <button
                  key={name}
                  onClick={() => handlePresetSelect(name)}
                  className={`py-2 px-3 text-sm rounded-md border transition-colors ${
                    selectedPreset === name
                      ? 'border-[#00ff41] bg-[rgba(0,255,65,0.1)] text-[#00ff41]'
                      : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.2)]'
                  }`}
                >
                  <div className="font-medium">{name}</div>
                  <div className="text-xs opacity-70">
                    {session.startET} - {session.endET} ET
                  </div>
                </button>
              ))}
              <button
                onClick={() => setSelectedPreset(null)}
                className={`py-2 px-3 text-sm rounded-md border transition-colors ${
                  selectedPreset === null
                    ? 'border-[#00ff41] bg-[rgba(0,255,65,0.1)] text-[#00ff41]'
                    : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.2)]'
                }`}
              >
                <div className="font-medium">Custom</div>
                <div className="text-xs opacity-70">Set your own</div>
              </button>
            </div>
          </div>

          {/* Custom Time Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
                Start Time ({timezone})
              </label>
              <select
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setSelectedPreset(null);
                }}
                className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                           py-2.5 px-3 text-white text-sm font-mono
                           focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                           transition-colors appearance-none cursor-pointer"
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
                End Time ({timezone})
              </label>
              <select
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setSelectedPreset(null);
                }}
                className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-md
                           py-2.5 px-3 text-white text-sm font-mono
                           focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41]
                           transition-colors appearance-none cursor-pointer"
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Visual Timeline */}
          <div className="pt-2 pb-6">
            <TimelineBar />
          </div>

          {/* Trading Days */}
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">
              Trading Days
            </label>
            <div className="flex gap-1">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${
                    selectedDays.includes(day.key)
                      ? 'bg-[#00ff41] text-black'
                      : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Session Analysis */}
          <div className="bg-[rgba(0,255,65,0.05)] border border-[rgba(0,255,65,0.2)] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-[#00ff41]" />
              <span className="text-white">Session: {sessionAnalysis.duration}</span>
            </div>
            
            {sessionAnalysis.insights.map((insight, i) => (
              <p key={i} className="text-xs text-[#00ff41]">{insight}</p>
            ))}
            
            {timezone !== 'ET' && (
              <p className="text-xs text-[rgba(255,255,255,0.5)] pt-2 border-t border-[rgba(255,255,255,0.1)]">
                ET equivalent: {formatTime12h(sessionAnalysis.startET)} - {formatTime12h(sessionAnalysis.endET)}
              </p>
            )}
          </div>

          {/* Warnings */}
          <AnimatePresence>
            {sessionAnalysis.warnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.2)] rounded-lg p-3"
              >
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#ffd700] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {sessionAnalysis.warnings.map((warning, i) => (
                      <p key={i} className="text-xs text-[#ffd700]">{warning}</p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleComplete}
              className="flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all
                         bg-[#00ff41] text-black hover:bg-[#00cc33] active:scale-[0.98]"
            >
              Use these times
            </button>
            <button
              onClick={onDismiss}
              className="py-2.5 px-4 rounded-md text-sm text-[rgba(255,255,255,0.7)]
                         bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]
                         transition-colors flex items-center gap-2"
            >
              <Keyboard className="w-4 h-4" />
              <span className="hidden sm:inline">Type instead</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
