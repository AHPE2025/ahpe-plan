import type { MonthRow } from "@/lib/data-context"
import type { MonthlyInput } from "@/lib/calculate"
import type { CorporateSettings } from "@/lib/corporate"
import { COST_CATEGORY_OPTIONS, type CostItemTemplate } from "@/lib/cost-details"

export type PlanSettings = {
  costItemTemplates: CostItemTemplate[]
  costCategories: string[]
  costItemNames: string[]
}

function defaultPlanSettings(): PlanSettings {
  return {
    costItemTemplates: [],
    costCategories: [...COST_CATEGORY_OPTIONS],
    costItemNames: [],
  }
}

export const REWARD_STORAGE_KEY = "ahpe_reward_management_data"
export const CORPORATE_STORAGE_KEY = "ahpe_corporate_settings"

export type ActualYearKey = "year1" | "year2" | "year3"
export type YearKey = "year1" | "year2"

export type ActualStoredData = {
  rows: MonthRow[]
}

export type YearStoredData = {
  plan: MonthlyInput[]
  honneContractPeopleTarget?: number | null
}

type LegacyYearStoredData = YearStoredData & {
  costItemTemplates?: CostItemTemplate[]
  corporateSettings?: CorporateSettings
}

export type LoadedYearData = YearStoredData & {
  legacyCostItemTemplates?: CostItemTemplate[]
  legacyCorporateSettings?: CorporateSettings
}

export type RewardManagementStorage = {
  actualData: Partial<Record<ActualYearKey, ActualStoredData>>
  yearData: Partial<Record<YearKey, LoadedYearData>>
  planSettings: PlanSettings
}

function stripLegacyFields(data: LegacyYearStoredData): LoadedYearData {
  const { costItemTemplates, corporateSettings, ...payload } = data
  return {
    ...payload,
    legacyCostItemTemplates: costItemTemplates,
    legacyCorporateSettings: corporateSettings,
  }
}

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch (e) {
    console.error("[reward-management-storage] parse error:", e)
    return null
  }
}

function readLegacyActualData(): Partial<Record<ActualYearKey, ActualStoredData>> {
  if (typeof window === "undefined") return {}
  const result: Partial<Record<ActualYearKey, ActualStoredData>> = {}
  for (const yearKey of ["year1", "year2", "year3"] as ActualYearKey[]) {
    const data = readJson<ActualStoredData>(
      localStorage.getItem(`ahpe-actual-data-${yearKey}`)
    )
    if (data) result[yearKey] = data
  }
  return result
}

function readLegacyYearData(): Partial<Record<YearKey, LoadedYearData>> {
  if (typeof window === "undefined") return {}
  const result: Partial<Record<YearKey, LoadedYearData>> = {}
  for (const yearKey of ["year1", "year2"] as YearKey[]) {
    const data = readJson<LegacyYearStoredData>(
      localStorage.getItem(`ahpe-year-data-${yearKey}`)
    )
    if (data) result[yearKey] = stripLegacyFields(data)
  }
  return result
}

function readLegacyPlanSettings(): PlanSettings | null {
  if (typeof window === "undefined") return null
  const defaults = defaultPlanSettings()
  const templates = readJson<CostItemTemplate[]>(
    localStorage.getItem("ahpe-plan-setting-cost_item_templates")
  )
  const categories = readJson<string[]>(
    localStorage.getItem("ahpe-plan-setting-cost_categories")
  )
  const names = readJson<string[]>(
    localStorage.getItem("ahpe-plan-setting-cost_item_names")
  )
  if (!templates && !categories && !names) return null
  return {
    costItemTemplates: templates ?? defaults.costItemTemplates,
    costCategories:
      categories && categories.length > 0 ? categories : defaults.costCategories,
    costItemNames: names ?? defaults.costItemNames,
  }
}

function migrateFromLegacyKeys(): RewardManagementStorage {
  const legacyActual = readLegacyActualData()
  const legacyYear = readLegacyYearData()
  const legacyPlan = readLegacyPlanSettings()

  return {
    actualData: legacyActual,
    yearData: legacyYear,
    planSettings: legacyPlan ?? defaultPlanSettings(),
  }
}

export function readRewardStorage(): RewardManagementStorage {
  if (typeof window === "undefined") {
    return {
      actualData: {},
      yearData: {},
      planSettings: defaultPlanSettings(),
    }
  }

  const stored = readJson<RewardManagementStorage>(
    localStorage.getItem(REWARD_STORAGE_KEY)
  )
  if (stored) {
    return {
      actualData: stored.actualData ?? {},
      yearData: stored.yearData ?? {},
      planSettings: stored.planSettings ?? defaultPlanSettings(),
    }
  }

  const migrated = migrateFromLegacyKeys()
  writeRewardStorage(migrated)
  return migrated
}

export function writeRewardStorage(data: RewardManagementStorage): void {
  if (typeof window === "undefined") return
  localStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(data))
}

export function readActualData(yearKey: ActualYearKey): ActualStoredData | null {
  const storage = readRewardStorage()
  return storage.actualData[yearKey] ?? null
}

export function writeActualData(
  yearKey: ActualYearKey,
  payload: ActualStoredData
): void {
  const storage = readRewardStorage()
  storage.actualData[yearKey] = payload
  writeRewardStorage(storage)
}

export function readYearData(yearKey: YearKey): LoadedYearData | null {
  const storage = readRewardStorage()
  return storage.yearData[yearKey] ?? null
}

export function writeYearData(yearKey: YearKey, payload: YearStoredData): void {
  const storage = readRewardStorage()
  const existing = storage.yearData[yearKey]
  storage.yearData[yearKey] = {
    ...payload,
    legacyCostItemTemplates: existing?.legacyCostItemTemplates,
    legacyCorporateSettings: existing?.legacyCorporateSettings,
  }
  writeRewardStorage(storage)
}

export function readPlanSettingsFromStorage(): PlanSettings {
  return readRewardStorage().planSettings
}

export function writePlanSettingsToStorage(settings: PlanSettings): void {
  const storage = readRewardStorage()
  storage.planSettings = settings
  writeRewardStorage(storage)
}
