"use client"

import React, { type ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"
import LoginScreen from "@/components/login-screen"

export default function AuthGate({ children }: { children: ReactNode }) {
  const { loading, canViewApp } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (!canViewApp) {
    return <LoginScreen />
  }

  return <>{children}</>
}
