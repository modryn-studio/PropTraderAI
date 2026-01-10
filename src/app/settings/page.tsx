import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsPageClient from './SettingsPageClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/auth/login');
  }

  // Fetch user profile with timezone
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .single();

  return (
    <SettingsPageClient 
      userEmail={user.email || 'Unknown'}
      initialProfile={{ timezone: profile?.timezone || null }}
    />
  );
}
