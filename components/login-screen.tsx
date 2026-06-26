"use client"

import React, { useState } from "react"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginScreen() {
  const { signIn, enterGuestView } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const supabaseReady = isSupabaseConfigured()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await signIn(email.trim(), password)
      if (result.error) {
        setError(result.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">AHPE 報酬管理</h1>
        <p className="mt-2 text-sm text-gray-600">
          ログイン後にデータの編集・保存ができます。
        </p>

        {!supabaseReady && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Supabase が未設定のため、ログインできません。初期データを閲覧のみで表示できます。
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!supabaseReady || submitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!supabaseReady || submitting}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!supabaseReady || submitting}
          >
            {submitting ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        {!supabaseReady && (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={enterGuestView}
          >
            初期データを閲覧（編集不可）
          </Button>
        )}
      </div>
    </div>
  )
}
