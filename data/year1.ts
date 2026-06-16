import {
  calculateYearPlan,
  calculateStock,
  type MonthlyInput,
  type YearCalculationResult,
} from "@/lib/calculate"

export const year1Meta = {
  period: "2026/6/1〜2027/3/31（10ヶ月）",
  theme: "型作り",
  priorCompanyContracts: 0,
  priorMonthContracts: 0,
  loan: 7_000_000,
}

/** 1年目 月次入力（円） */
export const year1Months: MonthlyInput[] = [
  { month: "2026年6月", honne: 200_000, training: 50_000, kaetaiContracts: 0, cost: 60_000 },
  { month: "2026年7月", honne: 200_000, training: 50_000, kaetaiContracts: 0, cost: 60_000 },
  { month: "2026年8月", honne: 200_000, training: 50_000, kaetaiContracts: 0, cost: 160_000 },
  { month: "2026年9月", honne: 200_000, training: 50_000, kaetaiContracts: 1, cost: 160_000 },
  { month: "2026年10月", honne: 200_000, training: 50_000, kaetaiContracts: 1, cost: 160_000 },
  { month: "2026年11月", honne: 400_000, training: 50_000, kaetaiContracts: 1, cost: 160_000 },
  { month: "2026年12月", honne: 400_000, training: 50_000, kaetaiContracts: 1, cost: 160_000 },
  { month: "2027年1月", honne: 400_000, training: 50_000, kaetaiContracts: 1, cost: 160_000 },
  { month: "2027年2月", honne: 400_000, training: 50_000, kaetaiContracts: 1, cost: 160_000 },
  { month: "2027年3月", honne: 400_000, training: 50_000, kaetaiContracts: 1, cost: 160_000 },
]

export const year1Computed: YearCalculationResult = calculateYearPlan(year1Months, {
  priorCompanyContracts: year1Meta.priorCompanyContracts,
  priorMonthContracts: year1Meta.priorMonthContracts,
  isYear2: false,
})

export const year1Targets = {
  period: year1Meta.period,
  theme: year1Meta.theme,
  loan: year1Meta.loan,
  bonus: 0,
  sales: {
    honne: year1Computed.totals.honne,
    training: year1Computed.totals.training,
    kaetai: year1Computed.totals.kaetai,
    stock: year1Computed.totals.stock,
    total: year1Computed.totals.totalRevenue,
  },
  costs: {
    referral: 435_000,
    aiAndOther: 965_000,
    total: year1Computed.totals.cost,
  },
  operatingProfit: year1Computed.totals.profitBeforeSalary,
  salaryTotal: year1Computed.totals.salaryTotal3,
  salaryPerPerson: year1Computed.totals.salaryPerPerson,
  finalProfit: year1Computed.totals.internalReserve,
  monthlyPlan: year1Computed.rows,
  keyKPIs: [
    "HONNE 前半月20万、後半月40万（年間300万）",
    "AI研修 月5万（年間50万）",
    "KAETAI 9月から月1社・100万円2分割（年間650万）",
    "ストック 1社目1万/月、2社目以降3万/月（3月時点19万、年間70万）",
    "総売上 1,070万 / 総利益 930万",
    "給与総額（3人） 558万（総利益の60%）",
    "内部留保 372万（総利益の40%）",
    "1年目はボーナスなし",
  ],
}

export { calculateStock }
