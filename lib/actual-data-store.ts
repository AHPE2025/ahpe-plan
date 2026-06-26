import type { MonthRow } from "@/lib/data-context"
import { isSupabaseConfigured, supabaseFetch } from "@/lib/supabase/client"

export type ActualYearKey = "year1" | "year2" | "year3"

export type ActualStoredData = {
  rows: MonthRow[]
}

const LOCAL_STORAGE_PREFIX = "ahpe-actual-data-"

function localStorageKey(yearKey: ActualYearKey): string {
  return `${LOCAL_STORAGE_PREFIX}${yearKey}`
}

function readLocalStorage(yearKey: ActualYearKey): ActualStoredData | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(localStorageKey(yearKey))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ActualStoredData
  } catch (e) {
    console.error("[loadActualData] localStorage parse error:", e)
    return null
  }
}

function writeLocalStorage(yearKey: ActualYearKey, payload: ActualStoredData): void {
  if (typeof window === "undefined") return
  localStorage.setItem(localStorageKey(yearKey), JSON.stringify(payload))
}

export async function loadActualData(
  yearKey: ActualYearKey
): Promise<ActualStoredData | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseFetch<Array<{ data: ActualStoredData }>>(
        `ahpe_actual_data?year_key=eq.${yearKey}&select=data`,
        { method: "GET" }
      )

      if (error) {
        console.error(`[loadActualData] Supabase load failed (${yearKey}):`, error)
      } else if (data?.[0]?.data) {
        writeLocalStorage(yearKey, data[0].data)
        return data[0].data
      } else {
        return null
      }
    } catch (e) {
      console.error(`[loadActualData] Supabase connection error (${yearKey}):`, e)
    }

    return null
  }

  return readLocalStorage(yearKey)
}

export async function saveActualData(
  yearKey: ActualYearKey,
  payload: ActualStoredData
): Promise<{ ok: boolean; via: "supabase" | "localStorage" | "none"; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseFetch<unknown>("ahpe_actual_data?on_conflict=year_key", {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          year_key: yearKey,
          data: payload,
          updated_at: new Date().toISOString(),
        }),
      })

      if (error) {
        console.error(`[saveActualData] Supabase save failed (${yearKey}):`, error)
        return { ok: false, via: "none", error }
      }

      writeLocalStorage(yearKey, payload)
      return { ok: true, via: "supabase" }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error"
      console.error(`[saveActualData] Supabase connection error (${yearKey}):`, e)
      return { ok: false, via: "none", error: message }
    }
  }

  if (typeof window !== "undefined") {
    writeLocalStorage(yearKey, payload)
    return { ok: true, via: "localStorage" }
  }

  return { ok: false, via: "none", error: "Storage unavailable" }
}
