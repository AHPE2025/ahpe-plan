import type { MonthlyInput } from "./calculate"

export type CostDetail = {
  id: string
  category: string
  name: string
  /** 金額（万円） */
  amount: number
  isRecurring: boolean
  memo?: string
  recurringKey?: string
}

export type CostItemTemplate = {
  category: string
  name: string
  defaultAmount: number
  isRecurring: boolean
}

export const COST_CATEGORY_OPTIONS = [
  "AIサブスク",
  "DB",
  "サーバー",
  "開発ツール",
  "営業費",
  "交通費",
  "食費",
  "業務委託",
  "紹介料",
  "雑費",
  "その他",
] as const

export function generateCostDetailId(): string {
  return `cost-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function generateRecurringKey(): string {
  return `recurring-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** costDetails の合計（万円） */
export function sumCostDetailsMan(details: CostDetail[]): number {
  return details.reduce((sum, item) => sum + item.amount, 0)
}

/** costDetails から円単位の cost を計算 */
export function costDetailsToYen(details: CostDetail[]): number {
  return sumCostDetailsMan(details) * 10_000
}

export function createEmptyCostDetail(): CostDetail {
  return {
    id: generateCostDetailId(),
    category: "その他",
    name: "",
    amount: 0,
    isRecurring: false,
    memo: "",
  }
}

/** 既存 cost のみの月を costDetails に変換 */
export function migrateCostToDetails(month: MonthlyInput): MonthlyInput {
  if (month.costDetails && month.costDetails.length > 0) {
    const cost = costDetailsToYen(month.costDetails)
    return { ...month, cost }
  }

  if (month.cost > 0) {
    const amountMan = Math.round(month.cost / 10_000)
    const costDetails: CostDetail[] = [
      {
        id: `initial-cost-${month.month}`,
        category: "その他",
        name: "その他費用",
        amount: amountMan,
        isRecurring: false,
        memo: "",
      },
    ]
    return { ...month, costDetails, cost: costDetailsToYen(costDetails) }
  }

  return { ...month, costDetails: [], cost: 0 }
}

function copyRecurringItems(items: CostDetail[]): CostDetail[] {
  return items.map((item) => ({
    ...item,
    id: generateCostDetailId(),
  }))
}

/** 前月の継続費用を、翌月が空の場合に自動コピー */
export function applyAutoRecurringCarryOver(plan: MonthlyInput[]): MonthlyInput[] {
  const result = plan.map((m) => ({
    ...m,
    costDetails: [...(m.costDetails ?? [])],
  }))

  for (let i = 1; i < result.length; i++) {
    const currentDetails = result[i].costDetails ?? []
    if (currentDetails.length > 0) continue

    const prevRecurring = (result[i - 1].costDetails ?? []).filter((d) => d.isRecurring)
    if (prevRecurring.length === 0) continue

    const copied = copyRecurringItems(prevRecurring)
    result[i] = {
      ...result[i],
      costDetails: copied,
      cost: costDetailsToYen(copied),
    }
  }

  return result
}

/** 計画データ全体を正規化（マイグレーション + 自動引き継ぎ） */
export function normalizePlan(plan: MonthlyInput[]): MonthlyInput[] {
  const migrated = plan.map(migrateCostToDetails)
  return applyAutoRecurringCarryOver(migrated)
}

/** 前月の継続費用を手動コピー（空なら全件、既存ありなら recurringKey 未登録分を追加） */
export function copyRecurringFromPreviousMonth(
  plan: MonthlyInput[],
  monthIndex: number
): MonthlyInput[] {
  if (monthIndex <= 0) return plan

  const prevRecurring = (plan[monthIndex - 1].costDetails ?? []).filter((d) => d.isRecurring)
  if (prevRecurring.length === 0) return plan

  const result = plan.map((m) => ({
    ...m,
    costDetails: [...(m.costDetails ?? [])],
  }))
  const current = result[monthIndex]
  const currentDetails = current.costDetails ?? []

  let newDetails: CostDetail[]
  if (currentDetails.length === 0) {
    newDetails = copyRecurringItems(prevRecurring)
  } else {
    const existingKeys = new Set(
      currentDetails.filter((d) => d.recurringKey).map((d) => d.recurringKey)
    )
    const toAdd = prevRecurring.filter(
      (d) => d.recurringKey && !existingKeys.has(d.recurringKey)
    )
    newDetails = [...currentDetails, ...copyRecurringItems(toAdd)]
  }

  result[monthIndex] = {
    ...current,
    costDetails: newDetails,
    cost: costDetailsToYen(newDetails),
  }

  return result
}

/** 保存時：直近月の継続費用を翌月へ反映（空なら全件コピー、既存は recurringKey で更新） */
export function propagateRecurringToNextMonth(
  plan: MonthlyInput[],
  monthIndex: number
): MonthlyInput[] {
  if (monthIndex >= plan.length - 1) return plan

  const result = plan.map((m) => ({
    ...m,
    costDetails: [...(m.costDetails ?? [])],
  }))

  const currentRecurring = (result[monthIndex].costDetails ?? []).filter((d) => d.isRecurring)
  const nextIndex = monthIndex + 1
  const nextMonth = result[nextIndex]
  const nextDetails = [...(nextMonth.costDetails ?? [])]

  if (nextDetails.length === 0 && currentRecurring.length > 0) {
    result[nextIndex] = {
      ...nextMonth,
      costDetails: copyRecurringItems(currentRecurring),
      cost: costDetailsToYen(copyRecurringItems(currentRecurring)),
    }
    return result
  }

  if (nextDetails.length > 0 && currentRecurring.length > 0) {
    for (const item of currentRecurring) {
      if (!item.recurringKey) continue
      const idx = nextDetails.findIndex((d) => d.recurringKey === item.recurringKey)
      if (idx >= 0) {
        nextDetails[idx] = {
          ...nextDetails[idx],
          category: item.category,
          name: item.name,
          amount: item.amount,
          isRecurring: item.isRecurring,
          memo: item.memo,
        }
      }
    }
    result[nextIndex] = {
      ...nextMonth,
      costDetails: nextDetails,
      cost: costDetailsToYen(nextDetails),
    }
  }

  return result
}

/** 費用詳細保存前の正規化（継続ON時に recurringKey を付与） */
export function finalizeCostDetails(details: CostDetail[]): CostDetail[] {
  return details.map((d) => {
    if (d.isRecurring && !d.recurringKey) {
      return { ...d, recurringKey: generateRecurringKey() }
    }
    if (!d.isRecurring) {
      const { recurringKey: _, ...rest } = d
      return rest
    }
    return d
  })
}

export function updateCostItemTemplates(
  templates: CostItemTemplate[],
  details: CostDetail[]
): CostItemTemplate[] {
  const map = new Map(templates.map((t) => [`${t.category}::${t.name}`, t]))
  for (const d of details) {
    if (!d.name.trim()) continue
    const key = `${d.category}::${d.name}`
    map.set(key, {
      category: d.category,
      name: d.name,
      defaultAmount: d.amount,
      isRecurring: d.isRecurring,
    })
  }
  return Array.from(map.values())
}

export function formatCostDetailBreakdown(details: CostDetail[]): string {
  return details
    .filter((d) => d.amount > 0 || d.name.trim())
    .map((d) => `${d.category} / ${d.name || "（未入力）"}：${d.amount}万円`)
    .join("\n")
}
