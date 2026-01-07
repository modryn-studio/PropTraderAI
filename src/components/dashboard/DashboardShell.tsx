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

  // Mock data removed - showing clean new user experience
  // const mockChallenge = {
  //   firm: 'Tradeify',
  //   accountSize: 50000,
  //   dailyPnl: 340,
  //   totalPnl: 1247,
  //   drawdownUsed: 24,
  //   maxDrawdown: 4,
  //   dailyLimitRemaining: 200,
  // };

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

        {/* No Challenge Yet - Clean State */}
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-accent-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-accent-cyan" />
          </div>
          <h3 className="font-display font-bold text-lg mb-2">No Active Challenge</h3>
          <p className="text-content-tertiary text-sm mb-6 max-w-md mx-auto">
            Connect your prop firm account to start tracking your challenge progress.
          </p>
          <button className="btn-primary">
            Connect Broker
          </button>
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
