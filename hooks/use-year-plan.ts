"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { MonthlyInput } from "@/lib/calculate"
import type { CorporateSettings } from "@/lib/corporate"
import { DEFAULT_CORPORATE_SETTINGS } from "@/lib/corporate"
import {
  loadCorporateSettings,
  migrateCorporateSettingsFromYearData,
  saveCorporateSettings,
} from "@/lib/corporate-settings-store"
import { normalizePlan } from "@/lib/cost-details"
import { migrateLegacyCostItemTemplates } from "@/lib/plan-settings-store"
import {
  loadYearData,
  saveYearData,
  type YearKey,
  type YearStoredData,
} from "@/lib/year-data-store"

type UseYearPlanOptions = {
  yearKey: YearKey
  initialMonths: MonthlyInput[]
  initialCorporateSettings?: CorporateSettings
  editable?: boolean
}

export function useYearPlan({
  yearKey,
  initialMonths,
  initialCorporateSettings,
  editable = true,
}: UseYearPlanOptions) {
  const [plan, setPlan] = useState<MonthlyInput[]>(() =>
    normalizePlan(initialMonths.map((m) => ({ ...m })))
  )
  const [corporateSettings, setCorporateSettings] = useState<CorporateSettings>(
    () => initialCorporateSettings ?? { ...DEFAULT_CORPORATE_SETTINGS }
  )
  const [honneContractPeopleTarget, setHonneContractPeopleTarget] = useState<number | null>(
    null
  )
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstSaveRef = useRef(true)
  const isFirstCorporateSaveRef = useRef(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = await loadYearData(yearKey)
      if (cancelled) return

      if (stored?.plan?.length) {
        setPlan(normalizePlan(stored.plan))
        if (stored.honneContractPeopleTarget !== undefined) {
          setHonneContractPeopleTarget(stored.honneContractPeopleTarget)
        }
      }

      await migrateLegacyCostItemTemplates(stored?.legacyCostItemTemplates)

      if (yearKey === "year2") {
        migrateCorporateSettingsFromYearData(stored?.legacyCorporateSettings)
        setCorporateSettings(loadCorporateSettings())
      }

      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [yearKey])

  const persist = useCallback(
    async (payload: YearStoredData) => {
      setSaveStatus("saving")
      const result = await saveYearData(yearKey, payload)
      setSaveStatus(result.ok ? "saved" : "error")
    },
    [yearKey]
  )

  useEffect(() => {
    if (!loaded || !editable) return
    if (isFirstSaveRef.current) {
      isFirstSaveRef.current = false
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persist({
        plan,
        honneContractPeopleTarget,
      })
    }, 800)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [plan, honneContractPeopleTarget, loaded, persist, editable])

  useEffect(() => {
    if (!loaded || yearKey !== "year2" || !editable) return
    if (isFirstCorporateSaveRef.current) {
      isFirstCorporateSaveRef.current = false
      return
    }

    saveCorporateSettings(corporateSettings)
  }, [corporateSettings, loaded, yearKey, editable])

  const handlePlanChange = useCallback((newPlan: MonthlyInput[]) => {
    setPlan(newPlan)
  }, [])

  return {
    plan,
    setPlan,
    handlePlanChange,
    corporateSettings,
    setCorporateSettings,
    honneContractPeopleTarget,
    setHonneContractPeopleTarget,
    loaded,
    saveStatus,
  }
}
