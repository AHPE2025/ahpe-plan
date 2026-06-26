"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { MonthlyInput } from "@/lib/calculate"
import { getDefaultActualRows } from "@/data/actual-defaults"
import { loadActualData, saveActualData, type ActualYearKey } from "@/lib/actual-data-store"
import {
  normalizeActualRows,
  type CostDetailMonth,
  type CostItemTemplate,
} from "@/lib/cost-details"
import {
  applyCostDetailMonthsToRows,
  monthRowsToCostDetailMonths,
  type MonthRow,
} from "@/lib/data-context"
import { loadYearData } from "@/lib/year-data-store"
import {
  loadAllPlanSettings,
  migrateLegacyCostItemTemplates,
  saveAllPlanSettings,
  defaultPlanSettings,
  type PlanSettings,
} from "@/lib/plan-settings-store"

type UseActualDataOptions = {
  yearKey: ActualYearKey
  editable?: boolean
}

function migratePlanCostDetailsToActualRows(
  plan: MonthlyInput[],
  defaultRows: MonthRow[]
): MonthRow[] {
  return defaultRows.map((row) => {
    const planMonth = plan.find((p) => p.month === row.month)
    if (planMonth?.costDetails?.length) {
      return {
        ...row,
        costDetails: planMonth.costDetails.map((d) => ({ ...d })),
      }
    }
    return row
  })
}

export function useActualData({ yearKey, editable = true }: UseActualDataOptions) {
  const [rows, setRows] = useState<MonthRow[]>(() =>
    normalizeActualRows(getDefaultActualRows(yearKey))
  )
  const [planSettings, setPlanSettings] = useState<PlanSettings>(() => defaultPlanSettings())
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstSaveRef = useRef(true)

  useEffect(() => {
    let cancelled = false
    isFirstSaveRef.current = true

    ;(async () => {
      const [storedActual, storedPlan, settings] = await Promise.all([
        loadActualData(yearKey),
        yearKey === "year3" ? Promise.resolve(null) : loadYearData(yearKey as "year1" | "year2"),
        loadAllPlanSettings(),
      ])
      if (cancelled) return

      const defaults = getDefaultActualRows(yearKey)

      if (storedActual?.rows?.length) {
        setRows(normalizeActualRows(storedActual.rows))
      } else if (storedPlan?.plan?.some((p) => p.costDetails?.length)) {
        const migrated = migratePlanCostDetailsToActualRows(storedPlan.plan, defaults)
        setRows(normalizeActualRows(migrated))
      } else {
        setRows(normalizeActualRows(defaults))
      }

      await migrateLegacyCostItemTemplates(storedPlan?.legacyCostItemTemplates)
      const refreshedSettings = storedPlan?.legacyCostItemTemplates?.length
        ? await loadAllPlanSettings()
        : settings

      setPlanSettings(refreshedSettings)
      setLoaded(true)
    })()

    return () => {
      cancelled = true
    }
  }, [yearKey])

  const persist = useCallback(
    async (nextRows: MonthRow[], settings: PlanSettings) => {
      setSaveStatus("saving")
      const [actualResult, settingsResult] = await Promise.all([
        saveActualData(yearKey, { rows: nextRows }),
        saveAllPlanSettings(settings),
      ])
      setSaveStatus(actualResult.ok && settingsResult.ok ? "saved" : "error")
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
      void persist(rows, planSettings)
    }, 800)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [rows, planSettings, loaded, persist, editable])

  const updateRow = useCallback((id: number, field: keyof MonthRow, value: number) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }, [])

  const handleCostSave = useCallback(
    (
      costMonths: CostDetailMonth[],
      templates: CostItemTemplate[],
      categories: string[],
      names: string[]
    ) => {
      setRows((prev) => applyCostDetailMonthsToRows(prev, costMonths))
      setPlanSettings({
        costItemTemplates: templates,
        costCategories: categories,
        costItemNames: names,
      })
    },
    []
  )

  const costDetailMonths = monthRowsToCostDetailMonths(rows)

  return {
    rows,
    setRows,
    updateRow,
    costDetailMonths,
    handleCostSave,
    costItemTemplates: planSettings.costItemTemplates,
    costCategories: planSettings.costCategories,
    costItemNames: planSettings.costItemNames,
    loaded,
    saveStatus,
  }
}

export type { ActualYearKey }
