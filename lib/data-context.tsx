"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { calculateStock } from "@/lib/calculate"

// 月次データの型
export type MonthRow = {
  id: number
  month: string
  // HONNE（人数ベース：売上は自動計算）
  honnePersonCount: number // 面談人数（当月入力）
  // AI研修
  trainingContractCount: number
  trainingActiveCount: number
  trainingAmount: number
  // KAETAI
  kaetaiContractCount: number
  kaetaiAmount: number
  // その他
  stockRevenue: number
  aiCost: number
  travelCost: number
  foodCost: number
  personnelCostOther: number
  miscCost: number
}

// 初期データ（10ヶ月分）- 1年目計画に基づく
const defaultRows: MonthRow[] = [
  { id: 1, month: "2026年6月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: calculateStock(0), aiCost: 20000, travelCost: 20000, foodCost: 20000, personnelCostOther: 0, miscCost: 0 },
  { id: 2, month: "2026年7月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: calculateStock(0), aiCost: 20000, travelCost: 20000, foodCost: 20000, personnelCostOther: 0, miscCost: 0 },
  { id: 3, month: "2026年8月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: calculateStock(0), aiCost: 20000, travelCost: 20000, foodCost: 120000, personnelCostOther: 0, miscCost: 0 },
  { id: 4, month: "2026年9月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 1, kaetaiAmount: 500000, stockRevenue: calculateStock(1), aiCost: 20000, travelCost: 20000, foodCost: 120000, personnelCostOther: 0, miscCost: 0 },
  { id: 5, month: "2026年10月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(2), aiCost: 20000, travelCost: 20000, foodCost: 120000, personnelCostOther: 0, miscCost: 0 },
  { id: 6, month: "2026年11月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(3), aiCost: 20000, travelCost: 20000, foodCost: 120000, personnelCostOther: 0, miscCost: 0 },
  { id: 7, month: "2026年12月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(4), aiCost: 20000, travelCost: 20000, foodCost: 120000, personnelCostOther: 0, miscCost: 0 },
  { id: 8, month: "2027年1月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(5), aiCost: 20000, travelCost: 20000, foodCost: 120000, personnelCostOther: 0, miscCost: 0 },
  { id: 9, month: "2027年2月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(6), aiCost: 20000, travelCost: 20000, foodCost: 120000, personnelCostOther: 0, miscCost: 0 },
  { id: 10, month: "2027年3月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(7), aiCost: 20000, travelCost: 20000, foodCost: 120000, personnelCostOther: 0, miscCost: 0 },
]

// Context型
type DataContextType = {
  rows: MonthRow[]
  setRows: React.Dispatch<React.SetStateAction<MonthRow[]>>
  updateRow: (id: number, field: keyof MonthRow, value: number) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

// Provider
export function DataProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<MonthRow[]>(defaultRows)

  const updateRow = (id: number, field: keyof MonthRow, value: number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  return (
    <DataContext.Provider value={{ rows, setRows, updateRow }}>
      {children}
    </DataContext.Provider>
  )
}

// Hook
export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

// HONNE売上計算（人数 × 1万円）
export function calculateHonneAmount(personCount: number): number {
  return personCount * 10000
}

// 計算ヘルパー
export function calculateActuals(rows: MonthRow[]) {
  // HONNE売上は人数から自動計算
  const totalHonnePersons = rows.reduce((sum, r) => sum + r.honnePersonCount, 0)
  const totalHonne = totalHonnePersons * 10000 // 1人1万円
  const totalTraining = rows.reduce((sum, r) => sum + r.trainingAmount, 0)
  const totalKaetai = rows.reduce((sum, r) => sum + r.kaetaiAmount, 0)
  const totalStock = rows.reduce((sum, r) => sum + r.stockRevenue, 0)
  const totalRevenue = totalHonne + totalTraining + totalKaetai + totalStock
  
  const totalCosts = rows.reduce((sum, r) => 
    sum + r.aiCost + r.travelCost + r.foodCost + r.personnelCostOther + r.miscCost, 0
  )
  
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
    trainingContracts,
    kaetaiContracts,
  }
}
