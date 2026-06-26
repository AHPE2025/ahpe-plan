const SESSION_STORAGE_KEY = "ahpe-supabase-auth"

export type StoredSession = {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email?: string
  }
}

let memorySession: StoredSession | null = null

export function getStoredSession(): StoredSession | null {
  if (memorySession) return memorySession
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    memorySession = JSON.parse(raw) as StoredSession
    return memorySession
  } catch {
    return null
  }
}

export function setStoredSession(session: StoredSession | null): void {
  memorySession = session
  if (typeof window === "undefined") return
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }
}

export function getAccessToken(): string | null {
  const session = getStoredSession()
  if (!session) return null
  if (session.expires_at * 1000 < Date.now() + 60_000) {
    return session.access_token
  }
  return session.access_token
}
