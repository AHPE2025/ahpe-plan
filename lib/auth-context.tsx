"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import {
  getCurrentSession,
  signInWithPassword,
  signOut as authSignOut,
} from "@/lib/supabase/auth"
import type { StoredSession } from "@/lib/supabase/session"

type AuthContextValue = {
  user: StoredSession["user"] | null
  loading: boolean
  isEditable: boolean
  canViewApp: boolean
  isGuestView: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  enterGuestView: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const GUEST_VIEW_KEY = "ahpe-guest-view"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredSession["user"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuestView, setIsGuestView] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (!isSupabaseConfigured()) {
        const guest =
          typeof window !== "undefined" &&
          sessionStorage.getItem(GUEST_VIEW_KEY) === "1"
        if (!cancelled) {
          setIsGuestView(guest)
          setLoading(false)
        }
        return
      }

      try {
        const session = await getCurrentSession()
        if (!cancelled) {
          setUser(session?.user ?? null)
        }
      } catch (e) {
        console.error("[auth] session restore failed:", e)
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { session, error } = await signInWithPassword(email, password)
    if (error) return { error }
    setUser(session?.user ?? null)
    setIsGuestView(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(GUEST_VIEW_KEY)
    }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await authSignOut()
    setUser(null)
    setIsGuestView(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(GUEST_VIEW_KEY)
    }
  }, [])

  const enterGuestView = useCallback(() => {
    setIsGuestView(true)
    if (typeof window !== "undefined") {
      sessionStorage.setItem(GUEST_VIEW_KEY, "1")
    }
  }, [])

  const isLoggedIn = Boolean(user)
  const supabaseReady = isSupabaseConfigured()
  const canViewApp = supabaseReady ? isLoggedIn : isLoggedIn || isGuestView
  const isEditable = isLoggedIn

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isEditable,
        canViewApp,
        isGuestView,
        signIn,
        signOut,
        enterGuestView,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
