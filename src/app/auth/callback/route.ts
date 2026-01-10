import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                // Ensure cookies persist across browser sessions
                maxAge: 60 * 60 * 24 * 365, // 1 year
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              })
            )
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && user) {
      // Check if user has pending firm selection from onboarding
      const pendingSelection = searchParams.get('firm_selection');
      
      if (pendingSelection) {
        try {
          const { firmId, accountType } = JSON.parse(decodeURIComponent(pendingSelection));
          
          // TODO: Fetch account details from Tradovate API
          // For now, we'll set a default and update later when Tradovate integration is complete
          const accountSize = 50000; // Default, will be replaced by Tradovate API
          
          // Update user profile with firm selection and broker connection
          await supabase
            .from('profiles')
            .update({
              firm_name: firmId === 'personal' ? null : firmId,
              account_type: accountType,
              account_size: firmId === 'personal' ? null : accountSize,
              broker_connected: true,
              broker_connected_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        } catch (err) {
          console.error('Failed to save firm selection:', err);
        }
      }
      
      const response = NextResponse.redirect(`${origin}${next}`)
      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}
