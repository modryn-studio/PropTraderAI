'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Target, TrendingUp, Zap, Check } from 'lucide-react';
import Link from 'next/link';
import { ORBCustomizeModal } from '@/components/strategy/templates/ORBCustomizeModal';
import { EMAPullbackCustomizeModal } from '@/components/strategy/templates/EMAPullbackCustomizeModal';
import { BreakoutCustomizeModal } from '@/components/strategy/templates/BreakoutCustomizeModal';

// ============================================================================
// PATTERN DATA
// ============================================================================

interface PatternTemplate {
  id: 'opening_range_breakout' | 'ema_pullback' | 'breakout';
  name: string;
  shortName: string;
  description: string;
  icon: typeof Target;
  color: string;
  bgColor: string;
  highlights: string[];
  bestFor: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
}

const PATTERN_TEMPLATES: PatternTemplate[] = [
  {
    id: 'opening_range_breakout',
    name: 'Opening Range Breakout',
    shortName: 'ORB',
    description: 'Trade breakouts from the first 15-30 minutes of market open. High probability setups with clear entries.',
    icon: Target,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    highlights: [
      'Clear entry rules at range break',
      'Built-in stop at range middle',
      'Best for morning sessions',
    ],
    bestFor: 'Morning traders who want clear, rule-based entries',
    complexity: 'Beginner',
  },
  {
    id: 'ema_pullback',
    name: 'EMA Pullback',
    shortName: 'Pullback',
    description: 'Enter on pullbacks to the 20 EMA in trending markets. Classic trend-following approach.',
    icon: TrendingUp,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    highlights: [
      'Trade with the trend',
      'Multiple entries per day',
      'Flexible timeframes',
    ],
    bestFor: 'Trend followers who wait for better prices',
    complexity: 'Intermediate',
  },
  {
    id: 'breakout',
    name: 'Breakout',
    shortName: 'Breakout',
    description: 'Trade breaks of key support and resistance levels. Momentum-based entries.',
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    highlights: [
      'Trade key levels',
      'Volume confirmation',
      'Works on any timeframe',
    ],
    bestFor: 'Momentum traders who chase big moves',
    complexity: 'Intermediate',
  },
];

// ============================================================================
// PATTERN CARD COMPONENT
// ============================================================================

interface PatternCardProps {
  pattern: PatternTemplate;
  onSelect: () => void;
}

function PatternCard({ pattern, onSelect }: PatternCardProps) {
  const Icon = pattern.icon;
  
  return (
    <div 
      className={`relative border p-5 sm:p-6 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 active:scale-[0.98] ${pattern.bgColor}`}
      onClick={onSelect}
    >
      {/* Complexity Badge */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
        <span className={`text-xs px-2 py-1 ${
          pattern.complexity === 'Beginner' 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {pattern.complexity}
        </span>
      </div>

      {/* Icon & Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 bg-white/5 ${pattern.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-base sm:text-lg">{pattern.name}</h3>
          <p className="text-xs text-zinc-500">{pattern.shortName}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
        {pattern.description}
      </p>

      {/* Highlights */}
      <ul className="space-y-2 mb-4">
        {pattern.highlights.map((highlight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className={`w-4 h-4 mt-0.5 ${pattern.color} flex-shrink-0`} />
            <span className="text-zinc-300">{highlight}</span>
          </li>
        ))}
      </ul>

      {/* Best For */}
      <div className="pt-4 border-t border-white/5">
        <p className="text-xs text-zinc-500">
          Best for: <span className="text-zinc-400">{pattern.bestFor}</span>
        </p>
      </div>

      {/* Select Button */}
      <button 
        className={`w-full mt-4 py-3 sm:py-2.5 font-medium transition-colors text-sm sm:text-base ${pattern.color} bg-white/5 hover:bg-white/10 active:bg-white/15`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        Select Pattern
      </button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function NewStrategyPage() {
  const router = useRouter();
  const [selectedPattern, setSelectedPattern] = useState<PatternTemplate['id'] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePatternSelect = (patternId: PatternTemplate['id']) => {
    setSelectedPattern(patternId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPattern(null);
  };

  const handleStrategySaved = (strategyId: string) => {
    setIsModalOpen(false);
    // Note: Strategy is now activated on Railway automatically (if feature flag enabled)
    router.push(`/dashboard?strategy=${strategyId}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-[#0a0e14]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className="p-2 hover:bg-zinc-800/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white">New Strategy</h1>
            <p className="text-sm text-zinc-500">Choose a pattern to get started</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Professional Strategy Library
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto">
            Battle-tested patterns used by funded traders. Select one and customize it to your style in under 2 minutes.
          </p>
        </div>

        {/* Pattern Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PATTERN_TEMPLATES.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              onSelect={() => handlePatternSelect(pattern.id)}
            />
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-12 text-center px-4">
          <p className="text-xs sm:text-sm text-zinc-500">
            All strategies include smart defaults based on professional trading standards.
            <br className="hidden sm:block" />
            <span className="block sm:inline"> You can customize everything after selecting a pattern.</span>
          </p>
        </div>
      </main>

      {/* Modals */}
      {selectedPattern === 'opening_range_breakout' && (
        <ORBCustomizeModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleStrategySaved}
        />
      )}
      {selectedPattern === 'ema_pullback' && (
        <EMAPullbackCustomizeModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleStrategySaved}
        />
      )}
      {selectedPattern === 'breakout' && (
        <BreakoutCustomizeModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleStrategySaved}
        />
      )}
    </div>
  );
}
