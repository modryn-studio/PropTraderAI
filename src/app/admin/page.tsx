import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

// List of admin emails - add your email here
const ADMIN_EMAILS = [
  'luke@modrynstudio.com',
];

export const metadata = {
  title: 'Admin Dashboard | PropTrader.AI',
  description: 'Admin dashboard for monitoring anonymization and system health.',
};

export default async function AdminPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }
  
  // Check if user is admin
  if (!ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/dashboard');
  }

  // Fetch anonymization stats using RPC function (secure)
  const { data: anonymizationStats, error: statsError } = await supabase
    .rpc('get_anonymization_stats');

  // Fetch recent user counts
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalStrategies } = await supabase
    .from('strategies')
    .select('*', { count: 'exact', head: true });

  const { count: totalTrades } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true });

  // Get prop firms count
  const { count: totalPropFirms } = await supabase
    .from('prop_firms')
    .select('*', { count: 'exact', head: true });

  // Get conversation counts by status
  const { count: totalConversations } = await supabase
    .from('strategy_conversations')
    .select('*', { count: 'exact', head: true });

  const { count: inProgressConversations } = await supabase
    .from('strategy_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_progress');

  const { count: completedConversations } = await supabase
    .from('strategy_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: abandonedConversations } = await supabase
    .from('strategy_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'abandoned');

  // Get recent conversations
  const { data: recentConversations } = await supabase
    .from('strategy_conversations')
    .select('id, user_id, status, messages, last_activity, strategy_id')
    .order('last_activity', { ascending: false })
    .limit(10);

  return (
    <AdminDashboardClient
      userEmail={user.email || ''}
      anonymizationStats={anonymizationStats || []}
      statsError={statsError?.message}
      counts={{
        users: totalUsers || 0,
        strategies: totalStrategies || 0,
        trades: totalTrades || 0,
        propFirms: totalPropFirms || 0,
        conversations: totalConversations || 0,
        conversationsInProgress: inProgressConversations || 0,
        conversationsCompleted: completedConversations || 0,
        conversationsAbandoned: abandonedConversations || 0,
      }}
      recentConversations={recentConversations || []}
    />
  );
}
