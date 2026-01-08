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
    <div className="min-h-screen bg-bg-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-xl border-b border-line-subtle">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="p-2 -ml-2 text-content-tertiary hover:text-content-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="font-display font-bold text-lg">Trade History</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-accent-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-accent-cyan" />
          </div>
          <h3 className="font-display font-bold text-xl mb-2">Coming Soon</h3>
          <p className="text-content-tertiary text-sm max-w-sm mx-auto mb-6">
            Your complete trade history will appear here. See what happened, 
            how much we protected, and your path to getting funded.
          </p>
          <p className="text-xs text-content-tertiary">
            This feature is in development.
          </p>
        </div>
      </main>
    </div>
  );
}
