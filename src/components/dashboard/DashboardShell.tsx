'use client';

import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Activity,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface DashboardShellProps {
  user: User;
}

export default function DashboardShell({ user }: DashboardShellProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Check if user has connected broker (placeholder - will be from DB)
  const hasBrokerConnected = false;
  const hasActiveChallenge = false;

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-xl border-b border-line-subtle">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="font-display font-bold text-lg">
            PropTrader<span className="text-accent-cyan">.AI</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-content-tertiary hover:text-content-primary transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content - ONE THING AT A TIME */}
      <main className="px-4 py-6 space-y-6">
        {/* New User Flow - No Broker Connected */}
        {!hasBrokerConnected && (
          <>
            {/* HERO CARD: Primary action - Connect to start */}
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-accent-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-accent-cyan" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">
                Ready to pass your challenge?
              </h3>
              <p className="text-content-tertiary text-sm mb-6 max-w-sm mx-auto">
                94% fail their first challenge. Connect Tradovate and we&apos;ll make sure you&apos;re not one of them.
              </p>
              <button className="btn-primary mb-4">
                Connect Tradovate
              </button>
              <p className="text-xs text-content-tertiary">
                Or <button className="text-accent-cyan underline">describe your strategy first</button>
              </p>
            </div>

            {/* SECONDARY: What we protect against (Day 1 messaging) - Scroll to see */}
            <div className="card border-l-4 border-l-warning">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-display font-bold mb-2">How We Protect You</h3>
                  <p className="text-content-secondary text-sm mb-3">
                    Most traders blow their first challenge in hours. Here&apos;s what we stop:
                  </p>
                  <ul className="space-y-2 text-sm text-content-secondary">
                    <li className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      <span><strong>Daily loss limit</strong> — We stop you before you hit it</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      <span><strong>Revenge trades</strong> — After a loss, emotions take over</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      <span><strong>Oversized positions</strong> — Going too big after wins or losses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      <span><strong>Bad setups</strong> — Trading when your strategy says don&apos;t</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Connected User Flow - Has broker but no active challenge */}
        {hasBrokerConnected && !hasActiveChallenge && (
          <>
            {/* HERO CARD: Next step - Create strategy */}
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-accent-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-accent-purple" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">
                Tradovate Connected
              </h3>
              <p className="text-content-tertiary text-sm mb-6 max-w-sm mx-auto">
                Now describe your strategy in plain English. We&apos;ll handle the execution.
              </p>
              <button className="btn-primary">
                Describe Your Strategy
              </button>
            </div>

            {/* SECONDARY: Protection status - Scroll to see */}
            <div className="card border-l-4 border-l-profit">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-profit flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-display font-bold mb-2">Protection Active</h3>
                  <p className="text-content-secondary text-sm mb-3">
                    Your account is connected. Once you create a strategy, we&apos;ll start monitoring:
                  </p>
                  <ul className="space-y-2 text-sm text-content-secondary">
                    <li className="flex items-start gap-2">
                      <span className="text-profit">✓</span>
                      <span>Challenge rule compliance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-profit">✓</span>
                      <span>Emotional trading patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-profit">✓</span>
                      <span>Position sizing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Active Challenge Flow - ONE metric at a time */}
        {hasActiveChallenge && (
          <>
            {/* HERO CARD: Today's P&L - The main thing */}
            <div className="card text-center py-12">
              <p className="text-sm text-content-tertiary mb-2">Today&apos;s Performance</p>
              <p className="font-data text-5xl text-profit mb-2">+$340</p>
              <p className="text-sm text-content-tertiary">3 trades • 67% win rate</p>
            </div>

            {/* SECONDARY: Challenge status - Simple, scroll to see */}
            <div className="card">
              <h3 className="font-display font-bold text-sm text-content-tertiary mb-4">
                Challenge Status • Day 5 of 30
              </h3>
              
              {/* Daily Limit - One metric */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-content-secondary">Daily Loss Limit</span>
                  <span className="font-data text-content-primary">23% used</span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-profit rounded-full transition-all" style={{ width: '23%' }} />
                </div>
                <p className="text-xs text-content-tertiary mt-1">$385 remaining today</p>
              </div>

              {/* Drawdown - One metric */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-content-secondary">Max Drawdown</span>
                  <span className="font-data text-content-primary">12% used</span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-profit rounded-full transition-all" style={{ width: '12%' }} />
                </div>
                <p className="text-xs text-content-tertiary mt-1">$4,400 remaining</p>
              </div>
            </div>

            {/* TERTIARY: Account Protection - Results (scroll to see) */}
            <div className="card border-l-4 border-l-profit">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-profit flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-display font-bold mb-1">Account Protected</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-content-secondary">This week we caught</p>
                      <p className="font-data text-2xl text-profit">$1,840</p>
                      <p className="text-xs text-content-tertiary">4 bad setups stopped before they cost you</p>
                    </div>
                    <div className="pt-3 border-t border-line-subtle">
                      <p className="text-xs text-content-tertiary">
                        Most recent: Prevented oversized position 23 minutes ago
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-bg-secondary/80 backdrop-blur-xl border-t border-line-subtle pb-safe">
        <div className="flex justify-around items-center h-16">
          {[
            { icon: Activity, label: 'Dashboard', href: '/dashboard', active: true },
            { icon: MessageSquare, label: 'AI Chat', href: '/chat', active: false },
            { icon: BarChart3, label: 'History', href: '/history', active: false },
            { icon: Settings, label: 'Settings', href: '/settings', active: false },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                item.active
                  ? 'text-accent-cyan'
                  : 'text-content-tertiary hover:text-content-secondary'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'drop-shadow-[0_0_8px_rgba(0,187,212,0.5)]' : ''}`} />
              <span className="text-xs">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
