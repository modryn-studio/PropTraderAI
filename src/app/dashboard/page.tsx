import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/auth/login');
  }

  // Fetch user profile with firm info
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, firm_name, account_size, broker_connected')
    .eq('id', user.id)
    .single();

  // Check if user has an active strategy
  const { data: strategies } = await supabase
    .from('strategies')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1);

  // Check if user has an active challenge
  const { data: challenges } = await supabase
    .from('challenges')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1);

  return (
    <DashboardShell 
      user={user} 
      profile={profile}
      hasActiveStrategy={!!strategies && strategies.length > 0}
      hasActiveChallenge={!!challenges && challenges.length > 0}
    />
  );
}
