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
  TrendingUp,
  TrendingDown,
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

  // Mock data for now
  const mockChallenge = {
    firm: 'Tradeify',
    accountSize: 50000,
    dailyPnl: 340,
    totalPnl: 1247,
    drawdownUsed: 24,
    maxDrawdown: 4,
    dailyLimitRemaining: 200,
  };

  const isProfitable = mockChallenge.dailyPnl >= 0;

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

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="text-content-secondary text-sm">
          Welcome back, <span className="text-content-primary">{user.email}</span>
        </div>

        {/* Challenge Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-content-tertiary text-sm">Challenge</div>
              <div className="font-display font-bold text-lg">
                {mockChallenge.firm} ${(mockChallenge.accountSize / 1000)}K
              </div>
            </div>
            <div className="px-3 py-1 bg-profit/10 text-profit text-xs font-medium rounded-full">
              Active
            </div>
          </div>

          {/* Daily P&L */}
          <div className="mb-6">
            <div className="text-content-tertiary text-sm mb-1">Today</div>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-data text-4xl font-bold ${
                  isProfitable ? 'text-profit' : 'text-loss'
                }`}
              >
                {isProfitable ? '+' : ''}${mockChallenge.dailyPnl.toLocaleString()}
              </span>
              <span className="text-content-tertiary flex items-center gap-1">
                {isProfitable ? (
                  <TrendingUp className="w-4 h-4 text-profit" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-loss" />
                )}
                {((mockChallenge.dailyPnl / mockChallenge.accountSize) * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Drawdown Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-content-tertiary">Drawdown</span>
              <span className="font-data text-content-secondary">
                {mockChallenge.drawdownUsed}% / {mockChallenge.maxDrawdown}%
              </span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-profit to-warning rounded-full transition-all duration-500"
                style={{
                  width: `${(mockChallenge.drawdownUsed / mockChallenge.maxDrawdown) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Daily Limit Warning */}
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <span className="text-sm text-warning">
              ${mockChallenge.dailyLimitRemaining} remaining on daily limit
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-content-tertiary text-xs mb-1">Win Rate</div>
            <div className="font-data text-xl font-bold">67%</div>
          </div>
          <div className="card text-center">
            <div className="text-content-tertiary text-xs mb-1">Avg Win</div>
            <div className="font-data text-xl font-bold text-profit">$85</div>
          </div>
          <div className="card text-center">
            <div className="text-content-tertiary text-xs mb-1">Trades</div>
            <div className="font-data text-xl font-bold">23</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-display font-bold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full btn-secondary text-left flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-accent-purple" />
              <span>Create new strategy</span>
            </button>
            <button className="w-full btn-secondary text-left flex items-center gap-3">
              <Activity className="w-5 h-5 text-accent-cyan" />
              <span>Connect Tradovate</span>
            </button>
          </div>
        </div>

        {/* Active Strategies */}
        <div className="card">
          <h3 className="font-display font-bold mb-4">Active Strategies</h3>
          <div className="text-center py-8">
            <p className="text-content-tertiary text-sm mb-4">
              No strategies yet. Create your first one to get started.
            </p>
            <button className="btn-primary">
              Create Strategy
            </button>
          </div>
        </div>
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
