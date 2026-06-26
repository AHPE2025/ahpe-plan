import {
  DEFAULT_CORPORATE_SETTINGS,
  type CorporateSettings,
} from "@/lib/corporate"
import { CORPORATE_STORAGE_KEY } from "@/lib/reward-management-storage"

const LEGACY_STORAGE_KEY = "ahpe-corporate-settings"

export function loadCorporateSettings(): CorporateSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_CORPORATE_SETTINGS }
  }

  let raw = localStorage.getItem(CORPORATE_STORAGE_KEY)
  if (!raw) {
    raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (raw) {
      localStorage.setItem(CORPORATE_STORAGE_KEY, raw)
    }
  }

  if (!raw) {
    return { ...DEFAULT_CORPORATE_SETTINGS }
  }

  try {
    return { ...DEFAULT_CORPORATE_SETTINGS, ...JSON.parse(raw) } as CorporateSettings
  } catch {
    return { ...DEFAULT_CORPORATE_SETTINGS }
  }
}

export function saveCorporateSettings(settings: CorporateSettings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CORPORATE_STORAGE_KEY, JSON.stringify(settings))
}

/** 旧 year_data JSONB に埋め込まれていた設定を localStorage へ移行 */
export function migrateCorporateSettingsFromYearData(
  legacy: CorporateSettings | undefined
): void {
  if (!legacy || typeof window === "undefined") return
  if (localStorage.getItem(CORPORATE_STORAGE_KEY)) return
  saveCorporateSettings({ ...DEFAULT_CORPORATE_SETTINGS, ...legacy })
}
