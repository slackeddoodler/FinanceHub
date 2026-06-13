import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Return fresh instances purely on the server to prevent cross-request leakage
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // Guarantee a single instance in the browser, surviving Next.js Fast Refresh
  const win = window as any
  if (!win.__supabaseSingletonClient) {
    win.__supabaseSingletonClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return win.__supabaseSingletonClient
}