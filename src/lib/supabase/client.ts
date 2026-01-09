import { createBrowserClient } from '@supabase/ssr'

type CookieOptions = {
  name: string
  value: string
  options: {
    maxAge?: number
    path?: string
    domain?: string
    sameSite?: 'strict' | 'lax' | 'none'
    secure?: boolean
  }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookies()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, options)
          })
        },
      },
    }
  )
}

function parseCookies() {
  if (typeof document === 'undefined') return []
  
  return document.cookie.split(';').reduce((cookies: Array<{ name: string; value: string }>, cookie) => {
    const [name, value] = cookie.split('=').map(c => c.trim())
    if (name && value) {
      cookies.push({ name, value })
    }
    return cookies
  }, [])
}

function setCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number
    path?: string
    domain?: string
    sameSite?: 'strict' | 'lax' | 'none'
    secure?: boolean
  }
) {
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
