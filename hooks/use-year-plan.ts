"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { MonthlyInput } from "@/lib/calculate"
import type { CorporateSettings } from "@/lib/corporate"
import { normalizePlan } from "@/lib/cost-details"
import type { CostItemTemplate } from "@/lib/cost-details"
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
}

export function useYearPlan({
  yearKey,
  initialMonths,
  initialCorporateSettings,
}: UseYearPlanOptions) {
  const [plan, setPlan] = useState<MonthlyInput[]>(() =>
    normalizePlan(initialMonths.map((m) => ({ ...m })))
  )
  const [costItemTemplates, setCostItemTemplates] = useState<CostItemTemplate[]>([])
  const [corporateSettings, setCorporateSettings] = useState<CorporateSettings | undefined>(
    initialCorporateSettings
  )
  const [honneContractPeopleTarget, setHonneContractPeopleTarget] = useState<number | null>(
    null
  )
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstSaveRef = useRef(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = await loadYearData(yearKey)
      if (cancelled) return
      if (stored?.plan?.length) {
        setPlan(normalizePlan(stored.plan))
        setCostItemTemplates(stored.costItemTemplates ?? [])
        if (stored.corporateSettings) setCorporateSettings(stored.corporateSettings)
        if (stored.honneContractPeopleTarget !== undefined) {
          setHonneContractPeopleTarget(stored.honneContractPeopleTarget)
        }
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
    if (!loaded) return
    if (isFirstSaveRef.current) {
      isFirstSaveRef.current = false
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persist({
        plan,
        costItemTemplates,
        corporateSettings,
        honneContractPeopleTarget,
      })
    }, 800)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [plan, costItemTemplates, corporateSettings, honneContractPeopleTarget, loaded, persist])

  const handlePlanChange = useCallback((newPlan: MonthlyInput[]) => {
    setPlan(newPlan)
  }, [])

  return {
    plan,
    setPlan,
    handlePlanChange,
    costItemTemplates,
    setCostItemTemplates,
    corporateSettings,
    setCorporateSettings,
    honneContractPeopleTarget,
    setHonneContractPeopleTarget,
    loaded,
    saveStatus,
  }
}
