import type { ActualStoredData, ActualYearKey } from "@/lib/reward-management-storage"
import {
  readActualData as readFromStorage,
  writeActualData as writeToStorage,
} from "@/lib/reward-management-storage"

export type { ActualStoredData, ActualYearKey } from "@/lib/reward-management-storage"

export async function loadActualData(
  yearKey: ActualYearKey
): Promise<ActualStoredData | null> {
  return readFromStorage(yearKey)
}

export async function saveActualData(
  yearKey: ActualYearKey,
  payload: ActualStoredData
): Promise<{ ok: boolean; via: "localStorage" | "none"; error?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, via: "none", error: "Storage unavailable" }
  }

  writeToStorage(yearKey, payload)
  return { ok: true, via: "localStorage" }
}
