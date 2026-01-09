import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return getCookie(name)
        },
        set(name: string, value: string, options: any) {
          setCookie(name, value, options)
        },
        remove(name: string, options: any) {
          setCookie(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
}

function setCookie(name: string, value: string, options: any) {
  if (typeof document === 'undefined') return
  
  let cookie = `${name}=${value}`
  
  if (options?.maxAge) {
    cookie += `; max-age=${options.maxAge}`
  }
  if (options?.path) {
    cookie += `; path=${options.path}`
  }
  if (options?.domain) {
    cookie += `; domain=${options.domain}`
  }
  if (options?.sameSite) {
    cookie += `; samesite=${options.sameSite}`
  }
  if (options?.secure) {
    cookie += '; secure'
  }
  
  document.cookie = cookie
}
