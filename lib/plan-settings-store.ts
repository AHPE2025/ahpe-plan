import {
  COST_CATEGORY_OPTIONS,
  type CostItemTemplate,
} from "@/lib/cost-details"
import type { PlanSettings } from "@/lib/reward-management-storage"
import {
  readPlanSettingsFromStorage,
  writePlanSettingsToStorage,
} from "@/lib/reward-management-storage"

export type PlanSettingKey =
  | "cost_item_templates"
  | "cost_categories"
  | "cost_item_names"

export type { PlanSettings } from "@/lib/reward-management-storage"

const SETTING_KEY_MAP: Record<PlanSettingKey, keyof PlanSettings> = {
  cost_item_templates: "costItemTemplates",
  cost_categories: "costCategories",
  cost_item_names: "costItemNames",
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
  const settings = readPlanSettingsFromStorage()
  const field = SETTING_KEY_MAP[settingKey]
  const value = settings[field]
  return (value as T) ?? null
}

export async function savePlanSetting<T>(
  settingKey: PlanSettingKey,
  data: T
): Promise<{ ok: boolean; via: "localStorage" | "none"; error?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, via: "none", error: "Storage unavailable" }
  }

  const settings = readPlanSettingsFromStorage()
  const field = SETTING_KEY_MAP[settingKey]
  writePlanSettingsToStorage({ ...settings, [field]: data })
  return { ok: true, via: "localStorage" }
}

export async function loadAllPlanSettings(): Promise<PlanSettings> {
  const defaults = defaultPlanSettings()
  const settings = readPlanSettingsFromStorage()

  return {
    costItemTemplates: settings.costItemTemplates ?? defaults.costItemTemplates,
    costCategories:
      settings.costCategories?.length > 0
        ? settings.costCategories
        : defaults.costCategories,
    costItemNames: settings.costItemNames ?? defaults.costItemNames,
  }
}

export async function saveAllPlanSettings(
  settings: PlanSettings
): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Storage unavailable" }
  }

  writePlanSettingsToStorage(settings)
  return { ok: true }
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
