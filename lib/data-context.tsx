"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

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

// 初期データ（10ヶ月分）- ストック収益は1年目計画に基づく
const defaultRows: MonthRow[] = [
  { id: 1, month: "2026年6月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 10000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
  { id: 2, month: "2026年7月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 10000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
  { id: 3, month: "2026年8月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 30000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
  { id: 4, month: "2026年9月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 50000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
  { id: 5, month: "2026年10月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 70000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
  { id: 6, month: "2026年11月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 90000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
  { id: 7, month: "2026年12月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 110000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
  { id: 8, month: "2027年1月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 130000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
  { id: 9, month: "2027年2月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 150000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
  { id: 10, month: "2027年3月", honnePersonCount: 0, trainingContractCount: 0, trainingActiveCount: 0, trainingAmount: 0, kaetaiContractCount: 0, kaetaiAmount: 0, stockRevenue: 170000, aiCost: 20000, travelCost: 20000, foodCost: 40000, personnelCostOther: 0, miscCost: 0 },
]

// 1年目の目標データ（2026/6/1〜2027/3/31）
export const year1Targets = {
  period: "2026/6/1〜2027/3/31（10ヶ月）",
  theme: "型作り",
  targets: { honneSales: 3000000, training: 500000, kaetai: 14500000, stock: 820000 },
  sales: { honne: 3000000, training: 500000, kaetai: 14500000, stock: 820000, total: 18820000 },
  costs: { referral: 435000, aiAndOther: 965000, total: 1400000 },
  operatingProfit: 17420000, // 売上 - コスト（給与前）
  salaryTotal: 10452000, // 給与総額（3人合計）= 営業利益の60%
  salaryPerPerson: 3484000, // 1人あたり年間給与
  finalProfit: 6968000, // 内部留保（営業利益の40%）
  monthlyPlan: [
    { month: "2026年6月", honne: 200000, training: 50000, kaetai: 0, stock: 10000, cost: 60000, profitBeforeSalary: 200000, salaryPerPerson: 40000, internalReserve: 80000 },
    { month: "2026年7月", honne: 200000, training: 50000, kaetai: 0, stock: 10000, cost: 60000, profitBeforeSalary: 200000, salaryPerPerson: 40000, internalReserve: 80000 },
    { month: "2026年8月", honne: 200000, training: 50000, kaetai: 1000000, stock: 30000, cost: 160000, profitBeforeSalary: 1120000, salaryPerPerson: 224000, internalReserve: 448000 },
    { month: "2026年9月", honne: 200000, training: 50000, kaetai: 1500000, stock: 50000, cost: 160000, profitBeforeSalary: 1640000, salaryPerPerson: 328000, internalReserve: 656000 },
    { month: "2026年10月", honne: 200000, training: 50000, kaetai: 2000000, stock: 70000, cost: 160000, profitBeforeSalary: 2160000, salaryPerPerson: 432000, internalReserve: 864000 },
    { month: "2026年11月", honne: 400000, training: 50000, kaetai: 2000000, stock: 90000, cost: 160000, profitBeforeSalary: 2380000, salaryPerPerson: 476000, internalReserve: 952000 },
    { month: "2026年12月", honne: 400000, training: 50000, kaetai: 2000000, stock: 110000, cost: 160000, profitBeforeSalary: 2400000, salaryPerPerson: 480000, internalReserve: 960000 },
    { month: "2027年1月", honne: 400000, training: 50000, kaetai: 2000000, stock: 130000, cost: 160000, profitBeforeSalary: 2420000, salaryPerPerson: 484000, internalReserve: 968000 },
    { month: "2027年2月", honne: 400000, training: 50000, kaetai: 2000000, stock: 150000, cost: 160000, profitBeforeSalary: 2440000, salaryPerPerson: 488000, internalReserve: 976000 },
    { month: "2027年3月", honne: 400000, training: 50000, kaetai: 2000000, stock: 170000, cost: 160000, profitBeforeSalary: 2460000, salaryPerPerson: 492000, internalReserve: 984000 },
  ],
  keyKPIs: [
    "HONNE 前半月20万、後半月40万（年間300万）",
    "AI研修 月5万（年間50万）",
    "KAETAI 8月から立ち上げ、10月以降月200万（年間1,450万）",
    "ストック 3月時点で月17万（年間82万）",
    "営業利益（給与前） 1,742万",
    "給与総額（3人） 1,045.2万",
    "内部留保 696.8万",
  ],
  loan: 7000000, // 借入700万
  bonus: 0, // 1年目はボーナスなし
}

// 2年目の目標データ（2027/4/1〜2028/3/31）
// 給与ルール: 4-6月は総利益×20%/人、7月以降は固定50万/人
// KAETAI: 1社150万・3分割入金（50万/月）
// ストック: 会社累計KAETAI数 × 3万円/月
// 契約数: 4-9月は月1社、10-3月は月2社 → 当期18社、累計25社（1年目7社）
export const year2Targets = {
  period: "2027/4/1〜2028/3/31（12ヶ月）",
  theme: "再現性の拡大",
  targets: { honneSales: 13200000, training: 600000, kaetai: 24000000, stock: 5490000 },
  sales: { honne: 13200000, training: 600000, kaetai: 24000000, stock: 5490000, total: 43290000 },
  costs: { referral: 720000, outsource: 2400000, aiAndOther: 3300000, total: 6420000 },
  operatingProfit: 36870000, // 総売上 - コスト（給与前）= 4,329万 - 642万
  salaryTotal: 16398000,     // 給与総額（3人合計）= 546.6万 × 3人
  salaryPerPerson: 5466000,  // 1人あたり年間給与累計
  // 通常ボーナス前の当期内部留保 = 36,870,000 - 16,398,000 - 1,500,000 = 18,972,000
  reserveBeforeBonus: 18972000,
  // 3月通常ボーナス原資 = 18,972,000 × 50% = 9,486,000
  marchBonusPool: 9486000,
  // 個人分配 = 9,486,000 × 50% = 4,743,000
  marchBonusPersonal: 4743000,
  // 会社最終内部留保 = 18,972,000 - 4,743,000 = 14,229,000
  finalProfit: 14229000,
  monthlyPlan: [
    // 4月: HONNE40万, AI研修5万, KAETAI50万(8社→1社×50万), ストック24万(8社×3万), コスト26万 → 総売上119万, 総利益93万
    { month: "2027年4月",  honne: 400000,  training: 50000, kaetai:  500000, stock: 240000, cost: 260000 },
    // 5月: HONNE60万, KAETAI100万(2社×50万), ストック27万(9社×3万), コスト31万 → 総売上192万, 総利益161万
    { month: "2027年5月",  honne: 600000,  training: 50000, kaetai: 1000000, stock: 270000, cost: 310000 },
    // 6月: HONNE80万, KAETAI150万, ストック30万(10社×3万), コスト36万 → 総売上265万, 総利益229万
    { month: "2027年6月",  honne: 800000,  training: 50000, kaetai: 1500000, stock: 300000, cost: 360000 },
    // 7月以降: 給与固定50万/人。HONNE100万, KAETAI150万, ストック33万(11社×3万), コスト41万 → 総売上288万, 総利益247万
    { month: "2027年7月",  honne: 1000000, training: 50000, kaetai: 1500000, stock: 330000, cost: 410000 },
    // 8月: HONNE100万, KAETAI150万, ストック36万(12社×3万), コスト46万 → 総売上291万, 総利益245万
    { month: "2027年8月",  honne: 1000000, training: 50000, kaetai: 1500000, stock: 360000, cost: 460000 },
    // 9月: HONNE100万, KAETAI150万, ストック39万(13社×3万), コスト51万 → 総売上294万, 総利益243万
    { month: "2027年9月",  honne: 1000000, training: 50000, kaetai: 1500000, stock: 390000, cost: 510000 },
    // 10月: HONNE140万, KAETAI200万(2社目に入る), ストック45万(15社×3万), コスト56万 → 総売上390万, 総利益334万, 10月ボーナス150万
    { month: "2027年10月", honne: 1400000, training: 50000, kaetai: 2000000, stock: 450000, cost: 560000, bonus: 1500000 },
    // 11月: HONNE140万, KAETAI250万, ストック51万(17社×3万), コスト61万 → 総売上446万, 総利益385万
    { month: "2027年11月", honne: 1400000, training: 50000, kaetai: 2500000, stock: 510000, cost: 610000 },
    // 12月: HONNE140万, KAETAI300万, ストック57万(19社×3万), コスト66万 → 総売上502万, 総利益436万
    { month: "2027年12月", honne: 1400000, training: 50000, kaetai: 3000000, stock: 570000, cost: 660000 },
    // 1月: HONNE140万, KAETAI300万, ストック63万(21社×3万), コスト71万 → 総売上508万, 総利益437万
    { month: "2028年1月",  honne: 1400000, training: 50000, kaetai: 3000000, stock: 630000, cost: 710000 },
    // 2月: HONNE140万, KAETAI300万, ストック69万(23社×3万), コスト76万 → 総売上514万, 総利益438万
    { month: "2028年2月",  honne: 1400000, training: 50000, kaetai: 3000000, stock: 690000, cost: 760000 },
    // 3月: HONNE140万, KAETAI300万, ストック75万(25社×3万), コスト81万 → 総売上520万, 総利益439万, 3月通常ボーナス474.3万個人分
    { month: "2028年3月",  honne: 1400000, training: 50000, kaetai: 3000000, stock: 750000, cost: 810000, marchBonus: 4743000 },
  ],
  bonus: {
    october: { perPerson: 500000, total: 1500000 },
    // 3月通常ボーナス: 内部留保1,897.2万の50%を分配原資(948.6万)
    // 分配原資のうち会社50%/ゾノ25%/パンク14%/カナリア11%
    march: {
      reserveBeforeBonus: 18972000,
      companyKeep: 9486000,      // 50%を会社に残す
      pool: 9486000,             // 分配原資50%
      company: 4743000,          // 分配原資のうち会社50%
      daihyo: 2372000,           // 分配原資のうちゾノ25%
      punk: 1328000,             // 分配原資のうちパンク14%
      canary: 1043000,           // 分配原資のうちカナリア11%
      personal: 4743000,         // 個人合計 = ゾノ+パンク+カナリア
    },
    rates: { daihyo: 0.25, punk: 0.14, canary: 0.11, company: 0.50 },
  },
  // 給与546.6万 + 10月ボーナス50万 + 3月賞与
  annualIncome: { daihyo: 8338000, punk: 7294000, canary: 7009000 },
  keyKPIs: [
    "HONNE 4月40万→7月以降100万→10月以降140万（年間1,320万）",
    "AI研修 月5万（年間60万）",
    "KAETAI 月1社×50万/月入金→10月から月2社（年間2,400万）",
    "ストック 会社累計KAETAI数×3万円（3月時点75万、年間549万）",
    "コスト 642万（紹介料72万+業務委託240万+その他330万）",
    "総売上 4,329万 / 総利益 3,687万",
    "給与累計（1人） 546.6万（4-6月: 利益×20%、7月以降: 固定50万）",
    "10月特別ボーナス 50万×3人＝150万",
    "通常ボーナス前の当期内部留保 1,897.2万",
    "個人への3月賞与合計 474.3万 / 会社最終内部留保 1,422.9万",
  ],
}

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
  const KAETAI_BASE = 1500000 // 既存150万円
  
  // HONNE売上は人数から自動計算
  const totalHonnePersons = rows.reduce((sum, r) => sum + r.honnePersonCount, 0)
  const totalHonne = totalHonnePersons * 10000 // 1人1万円
  const totalTraining = rows.reduce((sum, r) => sum + r.trainingAmount, 0)
  const totalKaetai = rows.reduce((sum, r) => sum + r.kaetaiAmount, 0) + KAETAI_BASE
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
