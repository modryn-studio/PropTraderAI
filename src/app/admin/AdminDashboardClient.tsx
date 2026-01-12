'use client';

import Link from 'next/link';
import { ArrowLeft, Users, Database, TrendingUp, Building2, Shield, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AnonymizationStat {
  table_name: string;
  active_records: number;
  anonymized_records: number;
}

interface AdminDashboardProps {
  userEmail: string;
  anonymizationStats: AnonymizationStat[];
  statsError?: string;
  counts: {
    users: number;
    strategies: number;
    trades: number;
    propFirms: number;
  };
}

export default function AdminDashboardClient({
  userEmail,
  anonymizationStats,
  statsError,
  counts,
}: AdminDashboardProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  // Calculate totals from anonymization stats
  const totalActive = anonymizationStats.reduce((sum, stat) => sum + (stat.active_records || 0), 0);
  const totalAnonymized = anonymizationStats.reduce((sum, stat) => sum + (stat.anonymized_records || 0), 0);
  const totalRecords = totalActive + totalAnonymized;
  const anonymizationRate = totalRecords > 0 ? ((totalAnonymized / totalRecords) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      {/* Header */}
      <header className="app-header border-b border-[rgba(255,255,255,0.1)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="p-2 -ml-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="font-mono font-bold text-lg text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#8b5cf6]" />
                Admin Dashboard
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.5)]">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#00FFD1]" />
              <span className="text-xs text-[rgba(255,255,255,0.5)]">Users</span>
            </div>
            <p className="font-mono text-2xl text-white">{counts.users}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-xs text-[rgba(255,255,255,0.5)]">Strategies</span>
            </div>
            <p className="font-mono text-2xl text-white">{counts.strategies}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[#10b981]" />
              <span className="text-xs text-[rgba(255,255,255,0.5)]">Trades</span>
            </div>
            <p className="font-mono text-2xl text-white">{counts.trades}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-xs text-[rgba(255,255,255,0.5)]">Prop Firms</span>
            </div>
            <p className="font-mono text-2xl text-white">{counts.propFirms}</p>
          </div>
        </div>

        {/* Anonymization Overview */}
        <div className="card border border-[rgba(139,92,246,0.3)]">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-[#8b5cf6]" />
            <h2 className="font-mono font-bold text-white">MOAT Data Anonymization</h2>
          </div>

          {statsError ? (
            <div className="bg-[rgba(181,50,61,0.1)] border border-[rgba(181,50,61,0.3)] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[#b5323d]">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Error loading stats: {statsError}</span>
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.5)] mt-2">
                Make sure migration 010_account_deletion_system.sql has been run.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[#121212] rounded-lg p-4">
                  <p className="text-xs text-[rgba(255,255,255,0.5)] mb-1">Active Records</p>
                  <p className="font-mono text-xl text-[#10b981]">{totalActive.toLocaleString()}</p>
                </div>
                <div className="bg-[#121212] rounded-lg p-4">
                  <p className="text-xs text-[rgba(255,255,255,0.5)] mb-1">Anonymized Records</p>
                  <p className="font-mono text-xl text-[#8b5cf6]">{totalAnonymized.toLocaleString()}</p>
                </div>
                <div className="bg-[#121212] rounded-lg p-4">
                  <p className="text-xs text-[rgba(255,255,255,0.5)] mb-1">Anonymization Rate</p>
                  <p className="font-mono text-xl text-white">{anonymizationRate}%</p>
                </div>
              </div>

              {/* Table Breakdown */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.1)]">
                      <th className="text-left text-xs text-[rgba(255,255,255,0.5)] font-medium py-2">Table</th>
                      <th className="text-right text-xs text-[rgba(255,255,255,0.5)] font-medium py-2">Active</th>
                      <th className="text-right text-xs text-[rgba(255,255,255,0.5)] font-medium py-2">Anonymized</th>
                      <th className="text-right text-xs text-[rgba(255,255,255,0.5)] font-medium py-2">Total</th>
                      <th className="text-right text-xs text-[rgba(255,255,255,0.5)] font-medium py-2">% Anon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anonymizationStats.map((stat) => {
                      const total = (stat.active_records || 0) + (stat.anonymized_records || 0);
                      const pct = total > 0 ? ((stat.anonymized_records || 0) / total * 100).toFixed(1) : '0';
                      return (
                        <tr key={stat.table_name} className="border-b border-[rgba(255,255,255,0.05)]">
                          <td className="py-3">
                            <code className="text-sm text-white bg-[#121212] px-2 py-1 rounded">
                              {stat.table_name}
                            </code>
                          </td>
                          <td className="text-right font-mono text-sm text-[#10b981]">
                            {(stat.active_records || 0).toLocaleString()}
                          </td>
                          <td className="text-right font-mono text-sm text-[#8b5cf6]">
                            {(stat.anonymized_records || 0).toLocaleString()}
                          </td>
                          <td className="text-right font-mono text-sm text-white">
                            {total.toLocaleString()}
                          </td>
                          <td className="text-right font-mono text-sm text-[rgba(255,255,255,0.5)]">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {anonymizationStats.length === 0 && (
                <p className="text-center text-[rgba(255,255,255,0.5)] py-8">
                  No data in MOAT tables yet.
                </p>
              )}
            </>
          )}
        </div>

        {/* Info Card */}
        <div className="card bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)]">
          <h3 className="font-semibold text-white mb-2">About MOAT Data</h3>
          <p className="text-sm text-[rgba(255,255,255,0.7)] mb-3">
            When users delete accounts, their data is anonymized (user_id = NULL) rather than deleted. 
            This preserves valuable behavioral patterns for ML training while respecting privacy.
          </p>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
              <span className="text-[rgba(255,255,255,0.5)]">Active = linked to user</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#8b5cf6]"></span>
              <span className="text-[rgba(255,255,255,0.5)]">Anonymized = user_id NULL</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <h3 className="font-mono font-bold text-sm text-[rgba(255,255,255,0.5)] mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link 
              href="/dashboard" 
              className="bg-[#121212] rounded-lg p-3 text-center hover:bg-[#1a1a1a] transition-colors"
            >
              <span className="text-sm text-white">Dashboard</span>
            </Link>
            <Link 
              href="/settings" 
              className="bg-[#121212] rounded-lg p-3 text-center hover:bg-[#1a1a1a] transition-colors"
            >
              <span className="text-sm text-white">Settings</span>
            </Link>
            <Link 
              href="/privacy" 
              className="bg-[#121212] rounded-lg p-3 text-center hover:bg-[#1a1a1a] transition-colors"
            >
              <span className="text-sm text-white">Privacy Policy</span>
            </Link>
            <Link 
              href="/terms" 
              className="bg-[#121212] rounded-lg p-3 text-center hover:bg-[#1a1a1a] transition-colors"
            >
              <span className="text-sm text-white">Terms</span>
            </Link>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-[rgba(255,255,255,0.5)]">
          PropTrader.AI Admin v0.1.0
        </p>
      </main>
    </div>
  );
}
