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

/** 費用詳細を持つ月次行（計画・実績共通） */
export type CostDetailMonth = {
  month: string
  cost: number
  costDetails?: CostDetail[]
}

/** 既存 cost のみの月を costDetails に変換 */
export function migrateCostToDetails(month: CostDetailMonth): CostDetailMonth {
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

/** 実績行のレガシー5項目コストを costDetails に変換 */
export function migrateMonthRowCosts<T extends {
  month: string
  costDetails?: CostDetail[]
  aiCost?: number
  travelCost?: number
  foodCost?: number
  personnelCostOther?: number
  miscCost?: number
}>(row: T): T & { costDetails: CostDetail[] } {
  if (row.costDetails && row.costDetails.length > 0) {
    return { ...row, costDetails: row.costDetails }
  }

  const legacyTotal =
    (row.aiCost ?? 0) +
    (row.travelCost ?? 0) +
    (row.foodCost ?? 0) +
    (row.personnelCostOther ?? 0) +
    (row.miscCost ?? 0)

  const details: CostDetail[] = []
  const addIfPositive = (amount: number, category: string, name: string) => {
    if (amount > 0) {
      details.push({
        id: generateCostDetailId(),
        category,
        name,
        amount: Math.round(amount / 10_000),
        isRecurring: false,
        memo: "",
      })
    }
  }

  addIfPositive(row.aiCost ?? 0, "AIサブスク", "AI費用")
  addIfPositive(row.travelCost ?? 0, "交通費", "交通費")
  addIfPositive(row.foodCost ?? 0, "食費", "食費")
  addIfPositive(row.personnelCostOther ?? 0, "業務委託", "業務委託費")
  addIfPositive(row.miscCost ?? 0, "雑費", "雑費")

  if (details.length === 0 && legacyTotal > 0) {
    return {
      ...row,
      costDetails: [
        {
          id: `initial-cost-${row.month}`,
          category: "その他",
          name: "その他費用",
          amount: Math.round(legacyTotal / 10_000),
          isRecurring: false,
          memo: "",
        },
      ],
    }
  }

  return { ...row, costDetails: details }
}

/** 前月の継続費用を、翌月が空の場合に自動コピー */
export function applyAutoRecurringCarryOver(plan: CostDetailMonth[]): CostDetailMonth[] {
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
export function normalizePlan<T extends CostDetailMonth>(plan: T[]): T[] {
  const migrated = plan.map((m) => migrateCostToDetails(m) as T)
  return applyAutoRecurringCarryOver(migrated) as T[]
}

/** 実績データ全体を正規化（マイグレーション + 自動引き継ぎ） */
export function normalizeActualRows<T extends {
  month: string
  costDetails?: CostDetail[]
  aiCost?: number
  travelCost?: number
  foodCost?: number
  personnelCostOther?: number
  miscCost?: number
}>(rows: T[]): (T & { costDetails: CostDetail[] })[] {
  const migrated = rows.map(migrateMonthRowCosts)
  const asCostMonths: CostDetailMonth[] = migrated.map((r) => ({
    month: r.month,
    cost: costDetailsToYen(r.costDetails),
    costDetails: r.costDetails,
  }))
  const carried = applyAutoRecurringCarryOver(asCostMonths)
  return migrated.map((r, i) => ({
    ...r,
    costDetails: carried[i].costDetails ?? [],
  }))
}

/** 前月の継続費用を手動コピー（空なら全件、既存ありなら recurringKey 未登録分を追加） */
export function copyRecurringFromPreviousMonth(
  plan: CostDetailMonth[],
  monthIndex: number
): CostDetailMonth[] {
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
  plan: CostDetailMonth[],
  monthIndex: number
): CostDetailMonth[] {
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

export function updateCostItemNames(names: string[], details: CostDetail[]): string[] {
  const set = new Set(names)
  for (const d of details) {
    const trimmed = d.name.trim()
    if (trimmed) set.add(trimmed)
  }
  return Array.from(set)
}

export function mergeCostCategories(
  categories: string[],
  details: CostDetail[]
): string[] {
  const set = new Set(categories)
  for (const d of details) {
    const trimmed = d.category.trim()
    if (trimmed) set.add(trimmed)
  }
  return Array.from(set)
}

export function formatCostDetailBreakdown(details: CostDetail[]): string {
  return details
    .filter((d) => d.amount > 0 || d.name.trim())
    .map((d) => `${d.category} / ${d.name || "（未入力）"}：${d.amount}万円`)
    .join("\n")
}
