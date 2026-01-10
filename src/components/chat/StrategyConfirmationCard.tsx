'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target,
  Shield,
  Edit3,
  Loader2,
  Plus
} from 'lucide-react';
import { ParsedRules } from '@/lib/claude/client';

interface StrategyConfirmationCardProps {
  strategyName: string;
  summary: string;
  parsedRules: ParsedRules;
  instrument: string;
  onSave: (name: string) => Promise<void>;
  onRefine: () => void;
  userStrategyCount: number;
  onAddAnother?: () => void;
  timezoneConversionSummary?: string;
}

export default function StrategyConfirmationCard({
  strategyName,
  summary,
  parsedRules,
  instrument,
  onSave,
  onRefine,
  userStrategyCount,
  onAddAnother,
  timezoneConversionSummary,
}: StrategyConfirmationCardProps) {
  const [editedName, setEditedName] = useState(strategyName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!editedName.trim()) {
      setError('Strategy name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editedName.trim());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save strategy');
    } finally {
      setIsSaving(false);
    }
  };

  // Post-save success state
  if (saved) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="border-t border-[rgba(255,255,255,0.1)] bg-[rgba(10,10,10,0.5)] p-6 mt-4 rounded-lg"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[rgba(0,137,123,0.1)] flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[#00897b]" />
          </div>
          <div>
            <h3 className="text-lg font-mono font-bold text-white mb-1">
              Strategy saved!
            </h3>
            <p className="text-[rgba(255,255,255,0.85)] text-sm">
              &quot;{editedName}&quot; is ready to monitor.
            </p>
          </div>
        </div>

        {/* Soft cap at 3 strategies */}
        {userStrategyCount < 3 && onAddAnother ? (
          <div className="space-y-3">
            <p className="text-[rgba(255,255,255,0.5)] text-sm">
              {getPostSaveMessage(userStrategyCount)}
            </p>
            <button
              onClick={onAddAnother}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Describe another strategy
            </button>
          </div>
        ) : (
          <div className="text-[rgba(255,255,255,0.5)] text-sm">
            Focus on executing your strategies. More isn&apos;t always better.
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-[rgba(255,255,255,0.1)] bg-[rgba(10,10,10,0.5)] p-6 mt-4 rounded-lg space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-[#00FFD1] font-mono uppercase tracking-wider mb-1">
            Strategy Complete
          </div>
          
          {/* Editable name */}
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              autoFocus
              className="input-terminal text-lg font-mono font-bold"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 text-lg font-mono font-bold text-white hover:text-[#00FFD1] transition-colors group"
            >
              {editedName}
              <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        
        <div className="px-3 py-1 bg-[rgba(139,92,246,0.1)] text-[#8b5cf6] text-xs font-mono rounded-full">
          {instrument}
        </div>
      </div>

      {/* Summary */}
      <p className="text-[rgba(255,255,255,0.85)] text-sm leading-relaxed">
        {summary}
      </p>

      {/* Timezone Conversion Info (if any) */}
      {timezoneConversionSummary && (
        <div className="bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.2)] rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
            <div className="text-xs space-y-1">
              <div className="text-[#3b82f6] font-mono uppercase tracking-wider mb-2">
                Times Converted
              </div>
              <div className="text-[rgba(255,255,255,0.7)] whitespace-pre-line leading-relaxed">
                {timezoneConversionSummary}
              </div>
              <div className="text-[rgba(255,255,255,0.5)] italic mt-2">
                All times stored in Exchange Time (America/Chicago)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parsed Rules - Human Readable */}
      <div className="grid gap-4">
        {/* Entry Conditions */}
        {parsedRules.entry_conditions && parsedRules.entry_conditions.length > 0 && (
          <RuleCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Entry"
            color="text-[#00897b]"
            bgColor="bg-[rgba(0,137,123,0.1)]"
          >
            <ul className="space-y-1">
              {parsedRules.entry_conditions.map((condition, i) => (
                <li key={i} className="text-[rgba(255,255,255,0.85)] text-sm">
                  {condition.description || formatEntryCondition(condition)}
                </li>
              ))}
            </ul>
          </RuleCard>
        )}

        {/* Exit Conditions */}
        {parsedRules.exit_conditions && parsedRules.exit_conditions.length > 0 && (
          <RuleCard
            icon={<TrendingDown className="w-4 h-4" />}
            label="Exit"
            color="text-[#b5323d]"
            bgColor="bg-[rgba(181,50,61,0.1)]"
          >
            <ul className="space-y-1">
              {parsedRules.exit_conditions.map((condition, i) => (
                <li key={i} className="text-[rgba(255,255,255,0.85)] text-sm">
                  {condition.description || formatExitCondition(condition)}
                </li>
              ))}
            </ul>
          </RuleCard>
        )}

        {/* Filters */}
        {parsedRules.filters && parsedRules.filters.length > 0 && (
          <RuleCard
            icon={<Clock className="w-4 h-4" />}
            label="Filters"
            color="text-[#3b82f6]"
            bgColor="bg-[rgba(59,130,246,0.1)]"
          >
            <ul className="space-y-1">
              {parsedRules.filters.map((filter, i) => (
                <li key={i} className="text-[rgba(255,255,255,0.85)] text-sm">
                  {filter.description || formatFilter(filter)}
                </li>
              ))}
            </ul>
          </RuleCard>
        )}

        {/* Position Sizing */}
        {parsedRules.position_sizing && (
          <RuleCard
            icon={<Target className="w-4 h-4" />}
            label="Risk"
            color="text-[#FFB800]"
            bgColor="bg-[rgba(255,184,0,0.1)]"
          >
            <p className="text-[rgba(255,255,255,0.85)] text-sm">
              {formatPositionSizing(parsedRules.position_sizing)}
            </p>
          </RuleCard>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-[#b5323d] text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onRefine}
          disabled={isSaving}
          className="btn-secondary flex-1 py-3"
        >
          Keep Refining
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save Strategy
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// Rule card component
function RuleCard({ 
  icon, 
  label, 
  color, 
  bgColor, 
  children 
}: { 
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="flex-1">
        <div className={`text-xs font-data uppercase tracking-wider ${color} mb-1`}>
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}

// Helper functions to format rules
function formatEntryCondition(condition: ParsedRules['entry_conditions'][0]): string {
  const indicator = condition.indicator.toUpperCase();
  const period = condition.period ? `(${condition.period})` : '';
  const relation = condition.relation.replace(/_/g, ' ');
  const value = condition.value !== undefined ? ` ${condition.value}` : '';
  return `${indicator}${period} ${relation}${value}`;
}

function formatExitCondition(condition: ParsedRules['exit_conditions'][0]): string {
  const type = condition.type.replace(/_/g, ' ');
  return `${type}: ${condition.value} ${condition.unit}`;
}

function formatFilter(filter: ParsedRules['filters'][0]): string {
  if (filter.type === 'time_window' && filter.start && filter.end) {
    return `Trading hours: ${filter.start} - ${filter.end}`;
  }
  if (filter.indicator) {
    return `${filter.indicator.toUpperCase()}${filter.period ? `(${filter.period})` : ''} ${filter.condition || ''} ${filter.value || ''}`;
  }
  return filter.type.replace(/_/g, ' ');
}

function formatPositionSizing(sizing: ParsedRules['position_sizing']): string {
  switch (sizing.method) {
    case 'risk_percent':
      return `Risk ${sizing.value}% per trade${sizing.max_contracts ? `, max ${sizing.max_contracts} contracts` : ''}`;
    case 'fixed':
      return `Fixed ${sizing.value} contracts`;
    case 'kelly':
      return `Kelly criterion (${sizing.value}x)`;
    default:
      return `${sizing.method}: ${sizing.value}`;
  }
}

// Dynamic post-save messaging based on strategy count
function getPostSaveMessage(strategyCount: number): string {
  if (strategyCount === 1) {
    return "Great first strategy! Many successful traders use 2-3 strategies: trending markets, ranging markets, and high volatility.";
  }
  if (strategyCount === 2) {
    return "You have good coverage. Most traders stop at 3 strategies and focus on execution.";
  }
  return "Ready to add another?";
}
