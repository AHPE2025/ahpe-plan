export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, ""),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  }
}

export async function supabaseFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: "Supabase not configured" }
  }

  const { url, anonKey } = getSupabaseConfig()
  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  }

  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers,
    })

    if (!res.ok) {
      const text = await res.text()
      return { data: null, error: text || res.statusText }
    }

    const text = await res.text()
    if (!text) return { data: null, error: null }
    return { data: JSON.parse(text) as T, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
