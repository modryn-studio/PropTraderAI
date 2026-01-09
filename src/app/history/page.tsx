import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, ArrowLeft } from 'lucide-react';

export default async function HistoryPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      {/* Header */}
      <header className="app-header">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="p-2 -ml-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="font-mono font-bold text-lg text-white">Trade History</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-[rgba(0,255,209,0.1)] flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-[#00FFD1]" />
          </div>
          <h3 className="font-mono font-bold text-xl mb-2 text-white">Coming Soon</h3>
          <p className="text-[rgba(255,255,255,0.5)] text-sm max-w-sm mx-auto mb-6">
            Your complete trade history will appear here. See what happened, 
            how much we protected, and your path to getting funded.
          </p>
          <p className="text-xs text-[rgba(255,255,255,0.5)]">
            This feature is in development.
          </p>
        </div>
      </main>
    </div>
  );
}
