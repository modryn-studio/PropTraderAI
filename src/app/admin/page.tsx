import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

// List of admin emails - add your email here
const ADMIN_EMAILS = [
  'hannerluke@gmail.com',
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

  // Fetch anonymization stats
  const { data: anonymizationStats, error: statsError } = await supabase
    .from('data_anonymization_stats')
    .select('*');

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
      }}
    />
  );
}
