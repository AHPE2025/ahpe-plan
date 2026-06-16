/** KAETAI: 1社100万円・2分割（契約月50万 + 翌月50万） */
export const KAETAI_CONTRACT_AMOUNT = 1_000_000
export const KAETAI_PAYMENT_PER_INSTALLMENT = 500_000

/** 給与率 */
export const SALARY_RATE_PER_PERSON = 0.2
export const SALARY_FIXED_FROM_MONTH_INDEX = 3 // 2年目7月以降（インデックス3〜）
export const SALARY_FIXED_AMOUNT = 500_000

/** 3月通常ボーナス配分比率 */
export const MARCH_BONUS_RATES = {
  company: 0.5,
  daihyo: 0.25,
  punk: 0.14,
  canary: 0.11,
} as const

export type MonthlyInput = {
  month: string
  honne: number
  training: number
  kaetaiContracts: number
  cost: number
  /** 10月特別ボーナス（3人合計） */
  octoberBonusTotal?: number
}

export type CalculatedMonthRow = {
  month: string
  honne: number
  training: number
  kaetai: number
  kaetaiPeriodCumulative: number
  companyCumulativeContracts: number
  stock: number
  cost: number
  totalRevenue: number
  profitBeforeSalary: number
  bonusPersonal: number
  salaryPerPerson: number
  netReceivePerPerson: number
  salaryCumulativePerPerson: number
  internalReserve: number
  reserveCumulative: number
  /** 3月通常ボーナス個人別（3月のみ） */
  marchBonusBreakdown?: MarchBonusBreakdown
}

export type MarchBonusBreakdown = {
  reserveBeforeBonus: number
  companyKeep: number
  pool: number
  company: number
  daihyo: number
  punk: number
  canary: number
  personalTotal: number
}

export type YearCalculationResult = {
  rows: CalculatedMonthRow[]
  totals: {
    honne: number
    training: number
    kaetai: number
    kaetaiPeriodCumulative: number
    companyCumulativeContracts: number
    stock: number
    cost: number
    totalRevenue: number
    profitBeforeSalary: number
    bonusPersonal: number
    salaryPerPerson: number
    salaryTotal3: number
    internalReserve: number
  }
  reserveBeforeMarchBonus: number
  marchBonus: MarchBonusBreakdown | null
  annualIncome: {
    daihyo: number
    punk: number
    canary: number
  } | null
}

export type YearCalcOptions = {
  priorCompanyContracts: number
  /** 期首直前月の新規契約数（翌月入金分の計上用） */
  priorMonthContracts?: number
  isYear2: boolean
  octoberBonusPerPerson?: number
}

/** ストック = 1万 + (会社累計契約数 - 1) × 3万（0社の場合は0） */
export function calculateStock(companyCumulativeContracts: number): number {
  if (companyCumulativeContracts <= 0) return 0
  return 10_000 + (companyCumulativeContracts - 1) * 30_000
}

/** KAETAI月次入金 = 当月新規×50万 + 前月新規×50万 */
export function calculateKaetaiRevenue(
  currentMonthContracts: number,
  previousMonthContracts: number
): number {
  return (
    currentMonthContracts * KAETAI_PAYMENT_PER_INSTALLMENT +
    previousMonthContracts * KAETAI_PAYMENT_PER_INSTALLMENT
  )
}

export function getSalaryPerPerson(
  profitBeforeSalary: number,
  monthIndex: number,
  isYear2: boolean
): number {
  if (isYear2 && monthIndex >= SALARY_FIXED_FROM_MONTH_INDEX) {
    return SALARY_FIXED_AMOUNT
  }
  return Math.max(0, Math.round(profitBeforeSalary * SALARY_RATE_PER_PERSON))
}

export function calculateMarchBonus(reserveBeforeBonus: number): MarchBonusBreakdown {
  const companyKeep = Math.round(reserveBeforeBonus * 0.5)
  const pool = reserveBeforeBonus - companyKeep
  const company = Math.round(pool * MARCH_BONUS_RATES.company)
  const daihyo = Math.round(pool * MARCH_BONUS_RATES.daihyo)
  const punk = Math.round(pool * MARCH_BONUS_RATES.punk)
  const canary = Math.round(pool * MARCH_BONUS_RATES.canary)
  const personalTotal = daihyo + punk + canary

  return {
    reserveBeforeBonus,
    companyKeep,
    pool,
    company,
    daihyo,
    punk,
    canary,
    personalTotal,
  }
}

export function calculateYearPlan(
  months: MonthlyInput[],
  options: YearCalcOptions
): YearCalculationResult {
  const {
    priorCompanyContracts,
    priorMonthContracts = 0,
    isYear2,
    octoberBonusPerPerson = 0,
  } = options

  let kaetaiPeriodCumulative = 0
  let companyCumulative = priorCompanyContracts
  let salaryCumulativePerPerson = 0
  let prevMonthContracts = priorMonthContracts

  const rows: CalculatedMonthRow[] = months.map((input, monthIndex) => {
    kaetaiPeriodCumulative += input.kaetaiContracts
    companyCumulative += input.kaetaiContracts

    const kaetai = calculateKaetaiRevenue(input.kaetaiContracts, prevMonthContracts)
    const stock = calculateStock(companyCumulative)
    const totalRevenue = input.honne + input.training + kaetai + stock
    const profitBeforeSalary = totalRevenue - input.cost
    const salaryPerPerson = getSalaryPerPerson(profitBeforeSalary, monthIndex, isYear2)
    salaryCumulativePerPerson += salaryPerPerson

    const octoberBonusTotal = input.octoberBonusTotal ?? 0
    const octoberBonusPerPersonAmount = octoberBonusTotal > 0 ? octoberBonusTotal / 3 : 0
    const netReceivePerPerson = salaryPerPerson + octoberBonusPerPersonAmount

    prevMonthContracts = input.kaetaiContracts

    return {
      month: input.month,
      honne: input.honne,
      training: input.training,
      kaetai,
      kaetaiPeriodCumulative,
      companyCumulativeContracts: companyCumulative,
      stock,
      cost: input.cost,
      totalRevenue,
      profitBeforeSalary,
      bonusPersonal: octoberBonusTotal,
      salaryPerPerson,
      netReceivePerPerson,
      salaryCumulativePerPerson,
      internalReserve: profitBeforeSalary - salaryPerPerson * 3 - octoberBonusTotal,
      reserveCumulative: 0,
    }
  })

  // 累計内部留保（3月ボーナス前）
  let reserveCumulative = 0
  rows.forEach((row) => {
    reserveCumulative += row.internalReserve
    row.reserveCumulative = reserveCumulative
  })

  let marchBonus: MarchBonusBreakdown | null = null
  let annualIncome: YearCalculationResult["annualIncome"] = null

  if (isYear2 && rows.length > 0) {
    const totalProfit = rows.reduce((s, r) => s + r.profitBeforeSalary, 0)
    const totalSalary3 = rows.reduce((s, r) => s + r.salaryPerPerson * 3, 0)
    const octoberBonusTotal = months.reduce((s, m) => s + (m.octoberBonusTotal ?? 0), 0)
    const reserveBeforeMarchBonus = totalProfit - totalSalary3 - octoberBonusTotal

    marchBonus = calculateMarchBonus(reserveBeforeMarchBonus)

    const lastIndex = rows.length - 1
    const lastRow = rows[lastIndex]
    lastRow.marchBonusBreakdown = marchBonus
    lastRow.bonusPersonal = marchBonus.personalTotal
    lastRow.internalReserve =
      lastRow.profitBeforeSalary - lastRow.salaryPerPerson * 3 - marchBonus.personalTotal

    // 3月行の累計を再計算
    reserveCumulative = 0
    rows.forEach((row) => {
      reserveCumulative += row.internalReserve
      row.reserveCumulative = reserveCumulative
    })

    const totalSalaryPerPerson = rows.reduce((s, r) => s + r.salaryPerPerson, 0)
    annualIncome = {
      daihyo: totalSalaryPerPerson + octoberBonusPerPerson + marchBonus.daihyo,
      punk: totalSalaryPerPerson + octoberBonusPerPerson + marchBonus.punk,
      canary: totalSalaryPerPerson + octoberBonusPerPerson + marchBonus.canary,
    }
  }

  const octoberBonusTotal = months.reduce((s, m) => s + (m.octoberBonusTotal ?? 0), 0)
  const bonusPersonalTotal =
    isYear2 && marchBonus ? octoberBonusTotal + marchBonus.personalTotal : 0

  const totals = {
    honne: rows.reduce((s, r) => s + r.honne, 0),
    training: rows.reduce((s, r) => s + r.training, 0),
    kaetai: rows.reduce((s, r) => s + r.kaetai, 0),
    kaetaiPeriodCumulative,
    companyCumulativeContracts: companyCumulative,
    stock: rows.reduce((s, r) => s + r.stock, 0),
    cost: rows.reduce((s, r) => s + r.cost, 0),
    totalRevenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
    profitBeforeSalary: rows.reduce((s, r) => s + r.profitBeforeSalary, 0),
    bonusPersonal: bonusPersonalTotal,
    salaryPerPerson: rows.reduce((s, r) => s + r.salaryPerPerson, 0),
    salaryTotal3: rows.reduce((s, r) => s + r.salaryPerPerson * 3, 0),
    internalReserve: rows.reduce((s, r) => s + r.internalReserve, 0),
  }

  return {
    rows,
    totals,
    reserveBeforeMarchBonus: marchBonus?.reserveBeforeBonus ?? 0,
    marchBonus,
    annualIncome,
  }
}
