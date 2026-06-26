import { isSupabaseConfigured } from "@/lib/supabase/client"
import {
  getStoredSession,
  setStoredSession,
  type StoredSession,
} from "@/lib/supabase/session"

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, ""),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  }
}

type AuthTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  user: {
    id: string
    email?: string
  }
}

function buildSession(data: AuthTokenResponse): StoredSession {
  const expiresAt =
    data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600)
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    user: { id: data.user.id, email: data.user.email },
  }
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ session: StoredSession | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { session: null, error: "Supabase が設定されていません" }
  }

  const { url, anonKey } = getSupabaseConfig()

  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[auth] signIn failed:", text || res.statusText)
      return { session: null, error: "ログインに失敗しました" }
    }

    const data = (await res.json()) as AuthTokenResponse
    const session = buildSession(data)
    setStoredSession(session)
    return { session, error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    console.error("[auth] signIn error:", message)
    return { session: null, error: "Supabase に接続できません" }
  }
}

export async function refreshSession(): Promise<StoredSession | null> {
  const current = getStoredSession()
  if (!current?.refresh_token || !isSupabaseConfigured()) return null

  const { url, anonKey } = getSupabaseConfig()

  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    })

    if (!res.ok) {
      console.error("[auth] refresh failed:", await res.text())
      setStoredSession(null)
      return null
    }

    const data = (await res.json()) as AuthTokenResponse
    const session = buildSession(data)
    setStoredSession(session)
    return session
  } catch (e) {
    console.error("[auth] refresh error:", e)
    setStoredSession(null)
    return null
  }
}

export async function getCurrentSession(): Promise<StoredSession | null> {
  const current = getStoredSession()
  if (!current || !isSupabaseConfigured()) return null

  const expiresSoon = current.expires_at * 1000 < Date.now() + 60_000
  if (expiresSoon) {
    return refreshSession()
  }

  const { url, anonKey } = getSupabaseConfig()

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${current.access_token}`,
      },
    })

    if (!res.ok) {
      return refreshSession()
    }

    return current
  } catch (e) {
    console.error("[auth] getCurrentSession error:", e)
    return null
  }
}

export async function signOut(): Promise<void> {
  const current = getStoredSession()
  if (current && isSupabaseConfigured()) {
    const { url, anonKey } = getSupabaseConfig()
    try {
      await fetch(`${url}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${current.access_token}`,
        },
      })
    } catch (e) {
      console.error("[auth] signOut error:", e)
    }
  }
  setStoredSession(null)
}
