import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ChatInterface from './ChatInterface';
import { UserProvider } from '@/contexts/UserContext';

export default async function ChatPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/auth/login');
  }

  // Get user's strategy count for soft cap logic
  const { count: strategyCount } = await supabase
    .from('strategies')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Get user profile with firm info for validation
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_name, account_size, account_type, timezone')
    .eq('id', user.id)
    .single();

  // Check for existing in-progress conversation to resume
  const { data: activeConversation } = await supabase
    .from('strategy_conversations')
    .select('id, messages, last_activity')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .order('last_activity', { ascending: false })
    .limit(1)
    .single();

  return (
    <UserProvider userId={user.id}>
      <ChatInterface 
        userId={user.id}
        userStrategyCount={strategyCount || 0}
        userProfile={profile}
        existingConversation={activeConversation ? {
          id: activeConversation.id,
          messages: activeConversation.messages || [],
        } : null}
      />
    </UserProvider>
  );
}
