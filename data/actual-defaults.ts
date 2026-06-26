import { calculateStock } from "@/lib/calculate"
import type { MonthRow } from "@/lib/data-context"
import type { ActualYearKey } from "@/lib/actual-data-store"

function baseRow(
  id: number,
  month: string,
  overrides: Partial<Omit<MonthRow, "id" | "month">> = {}
): MonthRow {
  return {
    id,
    month,
    honnePersonCount: 0,
    trainingContractCount: 0,
    trainingActiveCount: 0,
    trainingAmount: 0,
    kaetaiContractCount: 0,
    kaetaiAmount: 0,
    stockRevenue: calculateStock(0),
    costDetails: [],
    ...overrides,
  }
}

/** 1年目 実績月次（2026/6〜2027/3） */
export const year1DefaultActualRows: MonthRow[] = [
  baseRow(1, "2026年6月"),
  baseRow(2, "2026年7月"),
  baseRow(3, "2026年8月", { foodCost: 120000 }),
  baseRow(4, "2026年9月", { kaetaiContractCount: 1, kaetaiAmount: 500000, stockRevenue: calculateStock(1) }),
  baseRow(5, "2026年10月", { kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(2) }),
  baseRow(6, "2026年11月", { kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(3) }),
  baseRow(7, "2026年12月", { kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(4) }),
  baseRow(8, "2027年1月", { kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(5) }),
  baseRow(9, "2027年2月", { kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(6) }),
  baseRow(10, "2027年3月", { kaetaiContractCount: 1, kaetaiAmount: 1000000, stockRevenue: calculateStock(7) }),
].map((row) => ({
  ...row,
  aiCost: row.aiCost ?? 20000,
  travelCost: row.travelCost ?? 20000,
  foodCost: row.foodCost ?? 20000,
  personnelCostOther: row.personnelCostOther ?? 0,
  miscCost: row.miscCost ?? 0,
}))

/** 2年目 実績月次（2027/4〜2028/3） */
export const year2DefaultActualRows: MonthRow[] = [
  "2027年4月",
  "2027年5月",
  "2027年6月",
  "2027年7月",
  "2027年8月",
  "2027年9月",
  "2027年10月",
  "2027年11月",
  "2027年12月",
  "2028年1月",
  "2028年2月",
  "2028年3月",
].map((month, i) =>
  baseRow(i + 1, month, {
    aiCost: 20000,
    travelCost: 20000,
    foodCost: 120000,
    personnelCostOther: 0,
    miscCost: 0,
  })
)

/** 3年目 実績月次（2028/4〜2029/3） */
export const year3DefaultActualRows: MonthRow[] = [
  "2028年4月",
  "2028年5月",
  "2028年6月",
  "2028年7月",
  "2028年8月",
  "2028年9月",
  "2028年10月",
  "2028年11月",
  "2028年12月",
  "2029年1月",
  "2029年2月",
  "2029年3月",
].map((month, i) => baseRow(i + 1, month))

export function getDefaultActualRows(yearKey: ActualYearKey): MonthRow[] {
  switch (yearKey) {
    case "year1":
      return year1DefaultActualRows.map((r) => ({ ...r }))
    case "year2":
      return year2DefaultActualRows.map((r) => ({ ...r }))
    case "year3":
      return year3DefaultActualRows.map((r) => ({ ...r }))
  }
}
