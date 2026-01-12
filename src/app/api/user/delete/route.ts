import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify request body contains confirmation
    const body = await request.json();
    if (body.confirmEmail !== user.email) {
      return NextResponse.json(
        { error: 'Email confirmation does not match' },
        { status: 400 }
      );
    }

    // Create service role client for admin operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Step 1: Call database function to anonymize MOAT data
    // This sets user_id = NULL and redacts PII from data tables
    const { error: anonymizeError } = await serviceSupabase.rpc('anonymize_user_data', {
      target_user_id: user.id
    });

    if (anonymizeError) {
      console.error('Error anonymizing user data:', anonymizeError);
      return NextResponse.json(
        { error: 'Failed to anonymize account data' },
        { status: 500 }
      );
    }

    // Step 2: Delete auth user (this will CASCADE to profiles and hard-delete PII tables)
    const { error: deleteAuthError } = await serviceSupabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return NextResponse.json(
        { error: 'Failed to delete authentication account' },
        { status: 500 }
      );
    }

    // Sign out the user from current session
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
