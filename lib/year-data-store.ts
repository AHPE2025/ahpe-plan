import type { MonthlyInput } from "@/lib/calculate"
import type { CorporateSettings } from "@/lib/corporate"
import type { CostItemTemplate } from "@/lib/cost-details"
import { isSupabaseConfigured, supabaseFetch } from "@/lib/supabase/client"

export type YearKey = "year1" | "year2"

export type YearStoredData = {
  plan: MonthlyInput[]
  costItemTemplates: CostItemTemplate[]
  corporateSettings?: CorporateSettings
  honneContractPeopleTarget?: number | null
}

const LOCAL_STORAGE_PREFIX = "ahpe-year-data-"

function localStorageKey(yearKey: YearKey): string {
  return `${LOCAL_STORAGE_PREFIX}${yearKey}`
}

export async function loadYearData(yearKey: YearKey): Promise<YearStoredData | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseFetch<Array<{ data: YearStoredData }>>(
      `year_data?year_key=eq.${yearKey}&select=data`,
      { method: "GET" }
    )
    if (!error && data?.[0]?.data) {
      return data[0].data
    }
  }

  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(localStorageKey(yearKey))
    if (raw) {
      try {
        return JSON.parse(raw) as YearStoredData
      } catch {
        return null
      }
    }
  }

  return null
}

export async function saveYearData(
  yearKey: YearKey,
  payload: YearStoredData
): Promise<{ ok: boolean; via: "supabase" | "localStorage" | "none" }> {
  if (isSupabaseConfigured()) {
    const { error } = await supabaseFetch<unknown>("year_data?on_conflict=year_key", {
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
    if (!error) {
      if (typeof window !== "undefined") {
        localStorage.setItem(localStorageKey(yearKey), JSON.stringify(payload))
      }
      return { ok: true, via: "supabase" }
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(localStorageKey(yearKey), JSON.stringify(payload))
    return { ok: true, via: isSupabaseConfigured() ? "localStorage" : "localStorage" }
  }

  return { ok: false, via: "none" }
}
