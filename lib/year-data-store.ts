import type { MonthlyInput } from "@/lib/calculate"
import type { CorporateSettings } from "@/lib/corporate"
import type { CostItemTemplate } from "@/lib/cost-details"
import { isSupabaseConfigured, supabaseFetch } from "@/lib/supabase/client"

export type YearKey = "year1" | "year2"

/** Supabase ahpe_plan_data.data に保存するペイロード */
export type YearStoredData = {
  plan: MonthlyInput[]
  honneContractPeopleTarget?: number | null
}

/** 旧データ互換用 */
type LegacyYearStoredData = YearStoredData & {
  costItemTemplates?: CostItemTemplate[]
  corporateSettings?: CorporateSettings
}

export type LoadedYearData = YearStoredData & {
  legacyCostItemTemplates?: CostItemTemplate[]
  legacyCorporateSettings?: CorporateSettings
}

const LOCAL_STORAGE_PREFIX = "ahpe-year-data-"

function localStorageKey(yearKey: YearKey): string {
  return `${LOCAL_STORAGE_PREFIX}${yearKey}`
}

function stripLegacyFields(data: LegacyYearStoredData): LoadedYearData {
  const { costItemTemplates, corporateSettings, ...payload } = data
  return {
    ...payload,
    legacyCostItemTemplates: costItemTemplates,
    legacyCorporateSettings: corporateSettings,
  }
}

function readLocalStorage(yearKey: YearKey): LoadedYearData | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(localStorageKey(yearKey))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as LegacyYearStoredData
    return stripLegacyFields(parsed)
  } catch (e) {
    console.error("[loadYearData] localStorage parse error:", e)
    return null
  }
}

function writeLocalStorage(yearKey: YearKey, payload: YearStoredData): void {
  if (typeof window === "undefined") return
  localStorage.setItem(localStorageKey(yearKey), JSON.stringify(payload))
}

export async function loadYearData(yearKey: YearKey): Promise<LoadedYearData | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseFetch<Array<{ data: LegacyYearStoredData }>>(
        `ahpe_plan_data?year_key=eq.${yearKey}&select=data`,
        { method: "GET" }
      )

      if (error) {
        console.error(`[loadYearData] Supabase load failed (${yearKey}):`, error)
      } else if (data?.[0]?.data) {
        const loaded = stripLegacyFields(data[0].data)
        writeLocalStorage(yearKey, {
          plan: loaded.plan,
          honneContractPeopleTarget: loaded.honneContractPeopleTarget,
        })
        return loaded
      } else {
        return null
      }
    } catch (e) {
      console.error(`[loadYearData] Supabase connection error (${yearKey}):`, e)
    }

    return null
  }

  return readLocalStorage(yearKey)
}

export async function saveYearData(
  yearKey: YearKey,
  payload: YearStoredData
): Promise<{ ok: boolean; via: "supabase" | "localStorage" | "none"; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseFetch<unknown>("ahpe_plan_data?on_conflict=year_key", {
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
        console.error(`[saveYearData] Supabase save failed (${yearKey}):`, error)
        return { ok: false, via: "none", error }
      }

      writeLocalStorage(yearKey, payload)
      return { ok: true, via: "supabase" }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error"
      console.error(`[saveYearData] Supabase connection error (${yearKey}):`, e)
      return { ok: false, via: "none", error: message }
    }
  }

  if (typeof window !== "undefined") {
    writeLocalStorage(yearKey, payload)
    return { ok: true, via: "localStorage" }
  }

  return { ok: false, via: "none", error: "Storage unavailable" }
}
