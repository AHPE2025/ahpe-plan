import {
  COST_CATEGORY_OPTIONS,
  type CostItemTemplate,
} from "@/lib/cost-details"
import { isSupabaseConfigured, supabaseFetch } from "@/lib/supabase/client"

export type PlanSettingKey =
  | "cost_item_templates"
  | "cost_categories"
  | "cost_item_names"

export type PlanSettings = {
  costItemTemplates: CostItemTemplate[]
  costCategories: string[]
  costItemNames: string[]
}

const LOCAL_STORAGE_PREFIX = "ahpe-plan-setting-"

function localStorageKey(settingKey: PlanSettingKey): string {
  return `${LOCAL_STORAGE_PREFIX}${settingKey}`
}

function readLocalSetting<T>(settingKey: PlanSettingKey): T | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(localStorageKey(settingKey))
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch (e) {
    console.error(`[loadPlanSetting] localStorage parse error (${settingKey}):`, e)
    return null
  }
}

function writeLocalSetting<T>(settingKey: PlanSettingKey, data: T): void {
  if (typeof window === "undefined") return
  localStorage.setItem(localStorageKey(settingKey), JSON.stringify(data))
}

export function defaultCostCategories(): string[] {
  return [...COST_CATEGORY_OPTIONS]
}

export function defaultPlanSettings(): PlanSettings {
  return {
    costItemTemplates: [],
    costCategories: defaultCostCategories(),
    costItemNames: [],
  }
}

export async function loadPlanSetting<T>(
  settingKey: PlanSettingKey
): Promise<T | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseFetch<Array<{ data: T }>>(
        `ahpe_plan_settings?setting_key=eq.${settingKey}&select=data`,
        { method: "GET" }
      )

      if (error) {
        console.error(`[loadPlanSetting] Supabase load failed (${settingKey}):`, error)
      } else if (data?.[0]?.data !== undefined) {
        writeLocalSetting(settingKey, data[0].data)
        return data[0].data
      } else {
        return null
      }
    } catch (e) {
      console.error(`[loadPlanSetting] Supabase connection error (${settingKey}):`, e)
    }

    return null
  }

  return readLocalSetting<T>(settingKey)
}

export async function savePlanSetting<T>(
  settingKey: PlanSettingKey,
  data: T
): Promise<{ ok: boolean; via: "supabase" | "localStorage" | "none"; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseFetch<unknown>(
        "ahpe_plan_settings?on_conflict=setting_key",
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            setting_key: settingKey,
            data,
            updated_at: new Date().toISOString(),
          }),
        }
      )

      if (error) {
        console.error(`[savePlanSetting] Supabase save failed (${settingKey}):`, error)
        return { ok: false, via: "none", error }
      }

      writeLocalSetting(settingKey, data)
      return { ok: true, via: "supabase" }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error"
      console.error(`[savePlanSetting] Supabase connection error (${settingKey}):`, e)
      return { ok: false, via: "none", error: message }
    }
  }

  if (typeof window !== "undefined") {
    writeLocalSetting(settingKey, data)
    return { ok: true, via: "localStorage" }
  }

  return { ok: false, via: "none", error: "Storage unavailable" }
}

export async function loadAllPlanSettings(): Promise<PlanSettings> {
  const defaults = defaultPlanSettings()
  const [templates, categories, names] = await Promise.all([
    loadPlanSetting<CostItemTemplate[]>("cost_item_templates"),
    loadPlanSetting<string[]>("cost_categories"),
    loadPlanSetting<string[]>("cost_item_names"),
  ])

  return {
    costItemTemplates: templates ?? defaults.costItemTemplates,
    costCategories:
      categories && categories.length > 0 ? categories : defaults.costCategories,
    costItemNames: names ?? defaults.costItemNames,
  }
}

export async function saveAllPlanSettings(
  settings: PlanSettings
): Promise<{ ok: boolean; error?: string }> {
  const results = await Promise.all([
    savePlanSetting("cost_item_templates", settings.costItemTemplates),
    savePlanSetting("cost_categories", settings.costCategories),
    savePlanSetting("cost_item_names", settings.costItemNames),
  ])

  const failed = results.find((r) => !r.ok)
  return failed ? { ok: false, error: failed.error } : { ok: true }
}

/** 旧 year_data JSONB に含まれていたテンプレートを settings へ移行 */
export async function migrateLegacyCostItemTemplates(
  legacyTemplates: CostItemTemplate[] | undefined
): Promise<void> {
  if (!legacyTemplates?.length) return

  const current = await loadPlanSetting<CostItemTemplate[]>("cost_item_templates")
  if (current && current.length > 0) return

  await savePlanSetting("cost_item_templates", legacyTemplates)
}
