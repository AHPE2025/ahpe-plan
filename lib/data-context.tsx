"use client"

import React, { createContext, useContext, ReactNode } from "react"
import type { CostDetail } from "@/lib/cost-details"
import { costDetailsToYen } from "@/lib/cost-details"

// 月次実績データの型
export type MonthRow = {
  id: number
  month: string
  // HONNE（人数ベース：売上は自動計算）
  honnePersonCount: number
  // AI研修
  trainingContractCount: number
  trainingActiveCount: number
  trainingAmount: number
  // KAETAI
  kaetaiContractCount: number
  kaetaiAmount: number
  // その他
  stockRevenue: number
  /** 費用内訳（amount は万円単位） */
  costDetails?: CostDetail[]
  /** レガシー項目（マイグレーション用） */
  aiCost?: number
  travelCost?: number
  foodCost?: number
  personnelCostOther?: number
  miscCost?: number
}

/** 月次行のコスト合計（円） */
export function getMonthRowCost(row: MonthRow): number {
  if (row.costDetails && row.costDetails.length > 0) {
    return costDetailsToYen(row.costDetails)
  }
  return (
    (row.aiCost ?? 0) +
    (row.travelCost ?? 0) +
    (row.foodCost ?? 0) +
    (row.personnelCostOther ?? 0) +
    (row.miscCost ?? 0)
  )
}

// Context型（後方互換のため残す）
type DataContextType = {
  rows: MonthRow[]
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData is deprecated. Use useActualData instead.")
  }
  return context
}

// HONNE売上計算（人数 × 1万円）
export function calculateHonneAmount(personCount: number): number {
  return personCount * 10000
}

// 計算ヘルパー
export function calculateActuals(rows: MonthRow[]) {
  const totalHonnePersons = rows.reduce((sum, r) => sum + r.honnePersonCount, 0)
  const totalHonne = totalHonnePersons * 10000
  const totalTraining = rows.reduce((sum, r) => sum + r.trainingAmount, 0)
  const totalKaetai = rows.reduce((sum, r) => sum + r.kaetaiAmount, 0)
  const totalStock = rows.reduce((sum, r) => sum + r.stockRevenue, 0)
  const totalRevenue = totalHonne + totalTraining + totalKaetai + totalStock

  const totalCosts = rows.reduce((sum, r) => sum + getMonthRowCost(r), 0)
  const totalProfit = totalRevenue - totalCosts

  const trainingContracts = rows.reduce((sum, r) => sum + r.trainingContractCount, 0)
  const kaetaiContracts = rows.reduce((sum, r) => sum + r.kaetaiContractCount, 0)

  return {
    totalHonnePersons,
    totalHonne,
    totalTraining,
    totalKaetai,
    totalStock,
    totalRevenue,
    totalCosts,
    totalProfit,
    trainingContracts,
    kaetaiContracts,
  }
}

/** MonthRow[] を CostDetailDialog 用の形式に変換 */
export function monthRowsToCostDetailMonths(rows: MonthRow[]) {
  return rows.map((r) => ({
    month: r.month,
    cost: getMonthRowCost(r),
    costDetails: r.costDetails ?? [],
  }))
}

/** CostDetailDialog 保存結果を MonthRow[] に反映 */
export function applyCostDetailMonthsToRows(
  rows: MonthRow[],
  costMonths: { month: string; costDetails?: CostDetail[] }[]
): MonthRow[] {
  return rows.map((row, i) => ({
    ...row,
    costDetails: costMonths[i]?.costDetails ?? [],
    aiCost: 0,
    travelCost: 0,
    foodCost: 0,
    personnelCostOther: 0,
    miscCost: 0,
  }))
}
