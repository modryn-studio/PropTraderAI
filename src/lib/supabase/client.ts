import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Use the default browser client which handles cookies properly
  // This uses localStorage + cookies with proper persistence
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
