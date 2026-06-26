import type {
  LoadedYearData,
  YearKey,
  YearStoredData,
} from "@/lib/reward-management-storage"
import {
  readYearData as readFromStorage,
  writeYearData as writeToStorage,
} from "@/lib/reward-management-storage"

export type {
  LoadedYearData,
  YearKey,
  YearStoredData,
} from "@/lib/reward-management-storage"

export async function loadYearData(yearKey: YearKey): Promise<LoadedYearData | null> {
  return readFromStorage(yearKey)
}

export async function saveYearData(
  yearKey: YearKey,
  payload: YearStoredData
): Promise<{ ok: boolean; via: "localStorage" | "none"; error?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, via: "none", error: "Storage unavailable" }
  }

  writeToStorage(yearKey, payload)
  return { ok: true, via: "localStorage" }
}
