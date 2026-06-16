import {
  calculateYearPlan,
  MARCH_BONUS_RATES,
  type MonthlyInput,
  type YearCalculationResult,
} from "@/lib/calculate"

export const year2Meta = {
  period: "2027/4/1〜2028/3/31（12ヶ月）",
  theme: "再現性の拡大",
  /** 1年目終了時点の会社累計契約数 */
  priorCompanyContracts: 7,
  /** 2027年2月の新規契約（KAETAI入金計算用・2年目期首前） */
  priorTwoMonthContracts: 0,
  /** 2027年3月の新規契約（KAETAI入金計算用・2年目期首前） */
  priorMonthContracts: 0,
  octoberBonusPerPerson: 500_000,
  octoberBonusTotal: 1_500_000,
}

/** 2年目 月次入力（円） */
export const year2Months: MonthlyInput[] = [
  { month: "2027年4月", honne: 400_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 1, cost: 260_000 },
  { month: "2027年5月", honne: 600_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 1, cost: 310_000 },
  { month: "2027年6月", honne: 800_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 1, cost: 360_000 },
  { month: "2027年7月", honne: 1_000_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 1, cost: 410_000 },
  { month: "2027年8月", honne: 1_000_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 1, cost: 460_000 },
  { month: "2027年9月", honne: 1_000_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 1, cost: 510_000 },
  {
    month: "2027年10月",
    honne: 1_400_000,
    honneContractPeople: 20,
    training: 50_000,
    kaetaiContracts: 2,
    cost: 560_000,
    octoberBonusTotal: year2Meta.octoberBonusTotal,
  },
  { month: "2027年11月", honne: 1_400_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 2, cost: 610_000 },
  { month: "2027年12月", honne: 1_400_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 2, cost: 660_000 },
  { month: "2028年1月", honne: 1_400_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 2, cost: 710_000 },
  { month: "2028年2月", honne: 1_400_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 2, cost: 760_000 },
  { month: "2028年3月", honne: 1_400_000, honneContractPeople: 20, training: 50_000, kaetaiContracts: 2, cost: 810_000 },
]

export const year2Computed: YearCalculationResult = calculateYearPlan(year2Months, {
  priorCompanyContracts: year2Meta.priorCompanyContracts,
  priorTwoMonthContracts: year2Meta.priorTwoMonthContracts,
  priorMonthContracts: year2Meta.priorMonthContracts,
  isYear2: true,
  octoberBonusPerPerson: year2Meta.octoberBonusPerPerson,
})

const marchBonus = year2Computed.marchBonus!

export const year2Targets = {
  period: year2Meta.period,
  theme: year2Meta.theme,
  targets: {
    honneSales: year2Computed.totals.honne,
    training: year2Computed.totals.training,
    kaetai: year2Computed.totals.kaetai,
    stock: year2Computed.totals.stock,
  },
  sales: {
    honne: year2Computed.totals.honne,
    honneContractPeople: year2Computed.totals.honneContractPeople,
    training: year2Computed.totals.training,
    kaetai: year2Computed.totals.kaetai,
    kaetaiContracts: year2Computed.totals.kaetaiPeriodCumulative,
    stock: year2Computed.totals.stock,
    total: year2Computed.totals.totalRevenue,
  },
  costs: {
    referral: 720_000,
    outsource: 2_400_000,
    aiAndOther: 3_300_000,
    total: year2Computed.totals.cost,
  },
  operatingProfit: year2Computed.totals.profitBeforeSalary,
  salaryTotal: year2Computed.totals.salaryTotal3,
  salaryPerPerson: year2Computed.totals.salaryPerPerson,
  reserveBeforeBonus: marchBonus.reserveBeforeBonus,
  marchBonusPool: marchBonus.pool,
  marchBonusPersonal: marchBonus.personalTotal,
  finalProfit: year2Computed.totals.internalReserve,
  monthlyPlan: year2Computed.rows,
  bonus: {
    october: { perPerson: year2Meta.octoberBonusPerPerson, total: year2Meta.octoberBonusTotal },
    march: {
      reserveBeforeBonus: marchBonus.reserveBeforeBonus,
      companyKeep: marchBonus.companyKeep,
      pool: marchBonus.pool,
      company: marchBonus.company,
      daihyo: marchBonus.daihyo,
      punk: marchBonus.punk,
      canary: marchBonus.canary,
      personal: marchBonus.personalTotal,
    },
    rates: MARCH_BONUS_RATES,
  },
  annualIncome: year2Computed.annualIncome!,
  keyKPIs: [
    "HONNE 4月40万→7月以降100万→10月以降140万（年間1,320万）",
    "AI研修 月5万（年間60万）",
    "KAETAI 100万円2分割・4-9月月1社→10月から月2社（年間2,400万）",
    "ストック 1社目1万/月、2社目以降3万/月（3月時点73万、年間525万）",
    "コスト 642万（紹介料72万+業務委託240万+その他330万）",
    "総売上 4,305万 / 総利益 3,663万",
    "給与累計（1人） 545.4万（4-6月: 利益×20%、7月以降: 固定50万）",
    "10月特別ボーナス 50万×3人＝150万",
    "通常ボーナス前の当期内部留保 1,876.8万",
    "個人への3月通常ボーナス合計 469.2万 / 最終内部留保 1,407.6万",
  ],
}
