'use client';

import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  TrendingUp,
} from 'lucide-react';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import { PropFirmGrid } from '@/components/dashboard/PropFirmCard';

interface DashboardShellProps {
  user: User;
  profile?: {
    account_type?: string | null;
    firm_name?: string | null;
    broker_connected?: boolean;
  } | null;
  hasActiveStrategy?: boolean;
  hasActiveChallenge?: boolean;
}

export default function DashboardShell({ 
  user, 
  profile,
  hasActiveStrategy = false,
  hasActiveChallenge = false,
}: DashboardShellProps) {
  const router = useRouter();
  const supabase = createClient();

  // Get user's first name or email prefix for greeting
  const displayName = user.user_metadata?.full_name?.split(' ')[0] 
    || user.email?.split('@')[0] 
    || 'Trader';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Determine user state from profile
  const hasBrokerConnected = profile?.broker_connected ?? false;

  // Handle firm selection - store and redirect to OAuth
  const handleFirmSelect = async (firmId: string) => {
    const firmSelection = {
      firmId,
      accountType: firmId === 'personal' ? 'personal' : 'prop_firm',
    };
    
    // Encode firm selection for OAuth callback
    const firmSelectionParam = encodeURIComponent(JSON.stringify(firmSelection));
    
    // TODO: Implement actual Tradovate OAuth redirect
    // For Phase 1A, we'll simulate the flow
    // const oauthUrl = `/auth/tradovate?firm_selection=${firmSelectionParam}`;
    
    // For now, just show alert and update profile directly (placeholder)
    console.log('Selected firm:', firmId, 'Selection:', firmSelectionParam);
    alert(`Connecting to Tradovate for ${firmId}...\n\nOAuth flow placeholder. In production, this will redirect to Tradovate.`);
    
    // Simulate successful connection for development
    if (confirm('Simulate successful Tradovate connection?')) {
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({
          firm_name: firmId === 'personal' ? null : firmId,
          account_type: firmId === 'personal' ? 'personal' : 'prop_firm',
          account_size: firmId === 'personal' ? null : 50000, // Default for dev
          broker_connected: true,
          broker_connected_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      // Reload page to reflect changes
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      {/* Header - Terminal Luxe */}
      <header className="app-header">
        <div className="px-4 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
          <div>
            <div className="app-logo">
              PropTrader<span className="app-logo-accent">.AI</span>
            </div>
            <p className="text-xs text-[rgba(255,255,255,0.5)] font-mono">Welcome back, {displayName}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
            aria-label="Sign out"
            title="Sign out of your account"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content - ONE THING AT A TIME */}
      <main className="px-4 py-6 space-y-6 max-w-[1400px] mx-auto">
        
        {/* ========================================
            STEP 1: New User - Connect Prop Firm
            Shows when: No broker connected
        ======================================== */}
        {!hasBrokerConnected && (
          <>
            {/* HERO: Prop Firm Selection Grid */}
            <div className="card py-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[rgba(0,255,209,0.15)] flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-[#00FFD1]" />
                </div>
                <h2 className="font-mono font-bold text-xl mb-2 text-white">
                  Ready to pass your challenge?
                </h2>
                <p className="text-[rgba(255,255,255,0.5)] text-sm max-w-md mx-auto">
                  94% fail their first challenge. Connect your prop firm and we&apos;ll make sure you&apos;re not one of them.
                </p>
              </div>
              
              {/* Firm Cards Grid */}
              <PropFirmGrid onSelectFirm={handleFirmSelect} />
              
              {/* Secondary link */}
              <p className="text-xs text-[rgba(255,255,255,0.5)] text-center mt-6">
                Or <Link href="/chat" className="text-[#00FFD1] underline hover:text-[#00FFD1]/80 transition-colors">describe your strategy first</Link>
              </p>
            </div>

            {/* SECONDARY: What we protect against (Day 1 messaging) */}
            <div className="card border-l-4 border-l-[#FFB800]">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-[#FFB800] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-mono font-bold mb-2 text-white">How We Protect You</h3>
                  <p className="text-[rgba(255,255,255,0.85)] text-sm mb-3">
                    Most traders blow their first challenge in hours. Here&apos;s what we stop:
                  </p>
                  <ul className="space-y-2 text-sm text-[rgba(255,255,255,0.85)]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#FFB800]">•</span>
                      <span><strong className="text-white">Daily loss limit</strong> — We stop you before you hit it</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FFB800]">•</span>
                      <span><strong className="text-white">Revenge trades</strong> — After a loss, emotions take over</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FFB800]">•</span>
                      <span><strong className="text-white">Oversized positions</strong> — Going too big after wins or losses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FFB800]">•</span>
                      <span><strong className="text-white">Bad setups</strong> — Trading when your strategy says don&apos;t</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================
            STEP 2: Connected User - Describe Strategy
            Shows when: Broker connected, no active strategy
        ======================================== */}
        {hasBrokerConnected && !hasActiveStrategy && (
          <>
            {/* HERO: Create strategy prompt */}
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-[rgba(139,92,246,0.15)] flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-[#8b5cf6]" />
              </div>
              <h3 className="font-mono font-bold text-xl mb-2 text-white">
                {profile?.firm_name ? `Connected to ${profile.firm_name}` : 'Tradovate Connected'}
              </h3>
              <p className="text-[rgba(255,255,255,0.5)] text-sm mb-6 max-w-sm mx-auto">
                Now describe your strategy in plain English. We&apos;ll handle the execution.
              </p>
              <Link href="/chat" className="btn-primary inline-block">
                Describe Your Strategy
              </Link>
            </div>

            {/* SECONDARY: Protection status */}
            <div className="card border-l-4 border-l-[#00897b]">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-[#00897b] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-mono font-bold mb-2 text-white">Protection Active</h3>
                  <p className="text-[rgba(255,255,255,0.85)] text-sm mb-3">
                    Your account is connected. Once you create a strategy, we&apos;ll start monitoring:
                  </p>
                  <ul className="space-y-2 text-sm text-[rgba(255,255,255,0.85)]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#00897b]">✓</span>
                      <span>Challenge rule compliance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#00897b]">✓</span>
                      <span>Emotional trading patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#00897b]">✓</span>
                      <span>Position sizing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================
            STEP 3: Active Challenge - Today's P&L
            Shows when: Has active strategy/challenge
        ======================================== */}
        {hasActiveChallenge && (
          <>
            {/* HERO CARD: Today's P&L - The main thing */}
            <div className="card text-center py-12">
              <p className="text-sm text-[rgba(255,255,255,0.5)] mb-2">Today&apos;s Performance</p>
              <p className="font-mono text-5xl text-[#00897b] mb-2">+$340</p>
              <p className="text-sm text-[rgba(255,255,255,0.5)]">3 trades • 67% win rate</p>
            </div>

            {/* SECONDARY: Challenge status - Simple, scroll to see */}
            <div className="card">
              <h3 className="font-mono font-bold text-sm text-[rgba(255,255,255,0.5)] mb-4">
                Challenge Status • Day 5 of 30
              </h3>
              
              {/* Daily Limit - One metric */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[rgba(255,255,255,0.85)]">Daily Loss Limit</span>
                  <span className="font-mono text-white">23% used</span>
                </div>
                <div className="h-2 bg-[#121212] overflow-hidden">
                  <div className="h-full bg-[#00897b] transition-all" style={{ width: '23%' }} />
                </div>
                <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">$385 remaining today</p>
              </div>

              {/* Drawdown - One metric */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[rgba(255,255,255,0.85)]">Max Drawdown</span>
                  <span className="font-mono text-white">12% used</span>
                </div>
                <div className="h-2 bg-[#121212] overflow-hidden">
                  <div className="h-full bg-[#00897b] transition-all" style={{ width: '12%' }} />
                </div>
                <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">$4,400 remaining</p>
              </div>
            </div>

            {/* TERTIARY: Account Protection - Results (scroll to see) */}
            <div className="card border-l-4 border-l-[#00897b]">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#00897b] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-mono font-bold mb-1 text-white">Account Protected</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-[rgba(255,255,255,0.85)]">This week we caught</p>
                      <p className="font-mono text-2xl text-[#00897b]">$1,840</p>
                      <p className="text-xs text-[rgba(255,255,255,0.5)]">4 bad setups stopped before they cost you</p>
                    </div>
                    <div className="pt-3 border-t border-[rgba(255,255,255,0.1)]">
                      <p className="text-xs text-[rgba(255,255,255,0.5)]">
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

      {/* Bottom Navigation - Terminal Luxe */}
      <nav className="app-bottom-nav">
        <div className="flex justify-around items-center h-16 max-w-[600px] mx-auto">
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
                  ? 'text-[#00FFD1]'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.85)]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'icon-glow' : ''}`} />
              <span className="text-xs font-mono">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* Feedback Button - Dashboard position (high, above bottom nav) */}
      <FeedbackButton mobilePosition="high" />
    </div>
  );
}
