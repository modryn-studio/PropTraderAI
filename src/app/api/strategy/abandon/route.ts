import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface AbandonRequest {
  conversationId: string;
  reason?: string;
}

export async function POST(request: Request) {
  try {
    const body: AbandonRequest = await request.json();
    const { conversationId, reason = 'user_restarted' } = body;

    // Validate input
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the abandon_conversation function
    const { error: abandonError } = await supabase.rpc('abandon_conversation', {
      p_conversation_id: conversationId,
      p_abandoned_reason: reason,
    });

    if (abandonError) {
      console.error('Failed to abandon conversation:', abandonError);
      // Don't throw - this shouldn't block user experience
      return NextResponse.json(
        { success: false, error: abandonError.message },
        { status: 200 } // Return 200 to prevent retry
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Conversation archived',
    });

  } catch (error) {
    console.error('Error in abandon endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 200 } // Return 200 to prevent blocking user
    );
  }
}
