import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { feedback, feedbackType, page, email } = await request.json();

    if (!feedback || typeof feedback !== 'string') {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();

    // Use logged-in user's email, or the optional email from anonymous users
    const userEmail = user?.email || email || null;

    // Insert feedback into database
    const { error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: user?.id || null,
        feedback_type: feedbackType || 'general',
        message: feedback.trim(),
        context: page || null,
        user_email: userEmail,
      });

    if (insertError) {
      console.error('Failed to insert feedback:', insertError);
      
      // If table doesn't exist yet, log to console and still return success
      // This allows the feature to work before migrations are run
      if (insertError.code === '42P01') {
        console.log('Feedback table not yet created. Feedback received:', {
          feedback: feedback.trim(),
          feedbackType,
          page,
          userId: user?.id,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({ success: true, note: 'logged_to_console' });
      }
      
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    // Optional: Send to Discord webhook for real-time notifications
    const discordWebhook = process.env.DISCORD_FEEDBACK_WEBHOOK;
    if (discordWebhook) {
      try {
        await fetch(discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `📬 New Feedback: ${feedbackType}`,
              description: feedback.slice(0, 2000),
              color: feedbackType === 'bug' ? 0xef4444 : feedbackType === 'feature' ? 0x8b5cf6 : 0x00bbd4,
              fields: [
                { name: 'Page', value: page || 'Unknown', inline: true },
                { name: 'User', value: userEmail || 'Anonymous (no email)', inline: true },
              ],
              timestamp: new Date().toISOString(),
            }]
          }),
        });
      } catch (webhookError) {
        // Don't fail the request if Discord webhook fails
        console.error('Discord webhook error:', webhookError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
