import type { CalculatedMonthRow } from "./calculate"

/** 法人化後コスト設定（すべて画面上で編集可能） */
export type CorporateSettings = {
  incorporationMonth: string
  officerSalaryStartMonth: string
  officerCount: number
  officerMonthlySalary: number
  companySocialInsuranceRate: number
  personalSocialInsuranceRate: number
  estimatedTaxRate: number
  annualCorporateResidentTax: number
  incorporationOneTimeCost: number
  accountingTaxAiCost: number
  taxConsultingReserve: number
  legalConsultingReserve: number
  insuranceCost: number
  corporateMiscCost: number
  minimumCashReserve: number
  investmentRate: number
}

export const DEFAULT_CORPORATE_SETTINGS: CorporateSettings = {
  incorporationMonth: "2027-04",
  officerSalaryStartMonth: "2027-07",
  officerCount: 3,
  officerMonthlySalary: 500_000,
  companySocialInsuranceRate: 0.1455,
  personalSocialInsuranceRate: 0.1419,
  estimatedTaxRate: 0.3,
  annualCorporateResidentTax: 70_000,
  incorporationOneTimeCost: 250_000,
  accountingTaxAiCost: 10_000,
  taxConsultingReserve: 30_000,
  legalConsultingReserve: 30_000,
  insuranceCost: 50_000,
  corporateMiscCost: 10_000,
  minimumCashReserve: 12_000_000,
  investmentRate: 0.5,
}

export type CorporateMonthFields = {
  isIncorporated: boolean
  incorporationLabel: string
  officerSalaryTotal: number
  personalSocialInsurancePerPerson: number
  personalSocialInsuranceTotal: number
  afterSocialInsurancePerPerson: number
  afterSocialInsuranceTotal: number
  estimatedTakeHomePerPerson: number
  companySocialInsurance: number
  bonusCompanySocialInsurance: number
  corporateFixedCost: number
  incorporationOneTimeCostMonth: number
  corporateAdditionalCostTotal: number
  revisedCostTotal: number
  totalExpense: number
  profitBeforeTax: number
  estimatedTax: number
  profitAfterTax: number
  reserveBeforeTax: number
  reserveBeforeTaxCumulative: number
  reserveAfterTaxCumulative: number
  investmentAvailableAmount: number
  plannedStockInvestment: number
  companyCashBalanceEstimate: number
  companyRealPersonnelCost: number
}

export type CalculatedMonthRowWithCorporate = CalculatedMonthRow & CorporateMonthFields

/** 「2027年4月」→「2027-04」 */
export function monthToKey(month: string): string {
  const jpMatch = month.match(/(\d{4})年(\d{1,2})月/)
  if (jpMatch) {
    return `${jpMatch[1]}-${jpMatch[2].padStart(2, "0")}`
  }
  return month
}

/** 「2027-04」→「2027年4月」 */
export function monthKeyToLabel(key: string): string {
  const [year, month] = key.split("-")
  return `${year}年${Number(month)}月`
}

export function isMonthOnOrAfter(month: string, thresholdKey: string): boolean {
  return monthToKey(month) >= thresholdKey
}

export function isIncorporatedMonth(month: string, settings: CorporateSettings): boolean {
  return isMonthOnOrAfter(month, settings.incorporationMonth)
}

export function isOfficerSalaryMonth(month: string, settings: CorporateSettings): boolean {
  return isMonthOnOrAfter(month, settings.officerSalaryStartMonth)
}

/** 法人住民税均等割の月割 */
export function monthlyCorporateResidentTax(settings: CorporateSettings): number {
  return Math.round(settings.annualCorporateResidentTax / 12)
}

/** 役員報酬・社会保険（本人・会社） */
export function calculateOfficerCompensation(
  month: string,
  bonusTotal: number,
  settings: CorporateSettings
): Pick<
  CorporateMonthFields,
  | "officerSalaryTotal"
  | "personalSocialInsurancePerPerson"
  | "personalSocialInsuranceTotal"
  | "afterSocialInsurancePerPerson"
  | "afterSocialInsuranceTotal"
  | "estimatedTakeHomePerPerson"
  | "companySocialInsurance"
  | "companyRealPersonnelCost"
> {
  const active = isOfficerSalaryMonth(month, settings)

  if (!active) {
    return {
      officerSalaryTotal: 0,
      personalSocialInsurancePerPerson: 0,
      personalSocialInsuranceTotal: 0,
      afterSocialInsurancePerPerson: 0,
      afterSocialInsuranceTotal: 0,
      estimatedTakeHomePerPerson: 0,
      companySocialInsurance: 0,
      companyRealPersonnelCost: 0,
    }
  }

  const personalSocialInsurancePerPerson = Math.round(
    settings.officerMonthlySalary * settings.personalSocialInsuranceRate
  )
  const personalSocialInsuranceTotal = personalSocialInsurancePerPerson * settings.officerCount
  const afterSocialInsurancePerPerson =
    settings.officerMonthlySalary - personalSocialInsurancePerPerson
  const afterSocialInsuranceTotal = afterSocialInsurancePerPerson * settings.officerCount
  const officerSalaryTotal = settings.officerMonthlySalary * settings.officerCount
  const companySocialInsurance = Math.round(
    officerSalaryTotal * settings.companySocialInsuranceRate
  )
  const companyRealPersonnelCost = officerSalaryTotal + companySocialInsurance

  const bonusPerPerson = bonusTotal > 0 ? bonusTotal / settings.officerCount : 0
  const bonusPersonalSiPerPerson =
    bonusPerPerson > 0
      ? Math.round(bonusPerPerson * settings.personalSocialInsuranceRate)
      : 0
  const afterSiWithBonus = afterSocialInsurancePerPerson + bonusPerPerson - bonusPersonalSiPerPerson
  const estimatedTakeHomePerPerson = Math.max(
    0,
    Math.round(afterSiWithBonus * (1 - settings.estimatedTaxRate))
  )

  return {
    officerSalaryTotal,
    personalSocialInsurancePerPerson,
    personalSocialInsuranceTotal,
    afterSocialInsurancePerPerson,
    afterSocialInsuranceTotal,
    estimatedTakeHomePerPerson,
    companySocialInsurance,
    companyRealPersonnelCost,
  }
}

/** 法人化後の固定費・一時費・賞与社会保険 */
export function calculateCorporateCosts(
  month: string,
  bonusTotal: number,
  settings: CorporateSettings
): Pick<
  CorporateMonthFields,
  | "isIncorporated"
  | "incorporationLabel"
  | "bonusCompanySocialInsurance"
  | "corporateFixedCost"
  | "incorporationOneTimeCostMonth"
  | "corporateAdditionalCostTotal"
> & { companySocialInsurance: number } {
  const incorporated = isIncorporatedMonth(month, settings)

  if (!incorporated) {
    return {
      isIncorporated: false,
      incorporationLabel: "未法人",
      bonusCompanySocialInsurance: 0,
      corporateFixedCost: 0,
      incorporationOneTimeCostMonth: 0,
      corporateAdditionalCostTotal: 0,
      companySocialInsurance: 0,
    }
  }

  const officerActive = isOfficerSalaryMonth(month, settings)
  const officerSalaryTotal = officerActive
    ? settings.officerMonthlySalary * settings.officerCount
    : 0
  const companySocialInsurance = officerActive
    ? Math.round(officerSalaryTotal * settings.companySocialInsuranceRate)
    : 0

  const bonusCompanySocialInsurance =
    bonusTotal > 0 ? Math.round(bonusTotal * settings.companySocialInsuranceRate) : 0

  const corporateFixedCost =
    monthlyCorporateResidentTax(settings) +
    settings.accountingTaxAiCost +
    settings.taxConsultingReserve +
    settings.legalConsultingReserve +
    settings.insuranceCost +
    settings.corporateMiscCost

  const incorporationOneTimeCostMonth =
    monthToKey(month) === settings.incorporationMonth
      ? settings.incorporationOneTimeCost
      : 0

  const corporateAdditionalCostTotal =
    companySocialInsurance +
    bonusCompanySocialInsurance +
    corporateFixedCost +
    incorporationOneTimeCostMonth

  return {
    isIncorporated: true,
    incorporationLabel: "法人化後",
    bonusCompanySocialInsurance,
    corporateFixedCost,
    incorporationOneTimeCostMonth,
    corporateAdditionalCostTotal,
    companySocialInsurance,
  }
}

/** 税引後内部留保・株式運用 */
export function calculateRetainedEarnings(
  totalRevenue: number,
  revisedCostTotal: number,
  officerSalaryTotal: number,
  bonusTotal: number,
  settings: CorporateSettings,
  previousReserveAfterTax: number
): Pick<
  CorporateMonthFields,
  | "totalExpense"
  | "profitBeforeTax"
  | "estimatedTax"
  | "profitAfterTax"
  | "reserveAfterTaxCumulative"
> {
  const totalExpense = revisedCostTotal + officerSalaryTotal + bonusTotal
  const profitBeforeTax = totalRevenue - totalExpense
  const estimatedTax =
    profitBeforeTax > 0 ? Math.round(profitBeforeTax * settings.estimatedTaxRate) : 0
  const profitAfterTax = profitBeforeTax - estimatedTax
  const reserveAfterTaxCumulative = previousReserveAfterTax + profitAfterTax

  return {
    totalExpense,
    profitBeforeTax,
    estimatedTax,
    profitAfterTax,
    reserveAfterTaxCumulative,
  }
}

export function calculateInvestmentPlan(
  reserveAfterTaxCumulative: number,
  settings: CorporateSettings
): Pick<
  CorporateMonthFields,
  "investmentAvailableAmount" | "plannedStockInvestment" | "companyCashBalanceEstimate"
> {
  const investmentAvailableAmount = reserveAfterTaxCumulative - settings.minimumCashReserve
  const plannedStockInvestment =
    investmentAvailableAmount > 0
      ? Math.round(investmentAvailableAmount * settings.investmentRate)
      : 0
  const companyCashBalanceEstimate =
    plannedStockInvestment > 0
      ? reserveAfterTaxCumulative - plannedStockInvestment
      : reserveAfterTaxCumulative

  return {
    investmentAvailableAmount: Math.max(0, investmentAvailableAmount),
    plannedStockInvestment,
    companyCashBalanceEstimate,
  }
}

/** 計画行に法人化コストを付与 */
export function enrichRowsWithCorporate(
  rows: CalculatedMonthRow[],
  settings: CorporateSettings | null | undefined
): CalculatedMonthRowWithCorporate[] {
  if (!settings) {
    return rows.map((row) => emptyCorporateFields(row))
  }

  let reserveAfterTaxCumulative = 0

  return rows.map((row) => {
    const bonusTotal = row.bonusPersonal
    const officer = calculateOfficerCompensation(row.month, bonusTotal, settings)
    const corporate = calculateCorporateCosts(row.month, bonusTotal, settings)

    const companySocialInsurance = officer.companySocialInsurance
    const revisedCostTotal = row.cost + corporate.corporateAdditionalCostTotal

    const earnings = calculateRetainedEarnings(
      row.totalRevenue,
      revisedCostTotal,
      officer.officerSalaryTotal,
      bonusTotal,
      settings,
      reserveAfterTaxCumulative
    )
    reserveAfterTaxCumulative = earnings.reserveAfterTaxCumulative

    const investment = calculateInvestmentPlan(
      earnings.reserveAfterTaxCumulative,
      settings
    )

    return {
      ...row,
      ...officer,
      ...corporate,
      companySocialInsurance,
      revisedCostTotal,
      reserveBeforeTax: row.internalReserve,
      reserveBeforeTaxCumulative: row.reserveCumulative,
      ...earnings,
      ...investment,
    }
  })
}

function emptyCorporateFields(row: CalculatedMonthRow): CalculatedMonthRowWithCorporate {
  return {
    ...row,
    isIncorporated: false,
    incorporationLabel: "未法人",
    officerSalaryTotal: 0,
    personalSocialInsurancePerPerson: 0,
    personalSocialInsuranceTotal: 0,
    afterSocialInsurancePerPerson: 0,
    afterSocialInsuranceTotal: 0,
    estimatedTakeHomePerPerson: row.netReceivePerPerson,
    companySocialInsurance: 0,
    bonusCompanySocialInsurance: 0,
    corporateFixedCost: 0,
    incorporationOneTimeCostMonth: 0,
    corporateAdditionalCostTotal: 0,
    revisedCostTotal: row.cost,
    totalExpense: row.cost + row.salaryPerPerson * 3 + row.bonusPersonal,
    profitBeforeTax: row.totalRevenue - row.cost - row.salaryPerPerson * 3 - row.bonusPersonal,
    estimatedTax: 0,
    profitAfterTax: 0,
    reserveBeforeTax: row.internalReserve,
    reserveBeforeTaxCumulative: row.reserveCumulative,
    reserveAfterTaxCumulative: 0,
    investmentAvailableAmount: 0,
    plannedStockInvestment: 0,
    companyCashBalanceEstimate: 0,
    companyRealPersonnelCost: row.salaryPerPerson * 3,
  }
}

export type CorporateSettingsFieldMeta = {
  key: keyof CorporateSettings
  label: string
  description: string
  type: "month" | "number" | "percent" | "yen"
}

export const CORPORATE_SETTINGS_FIELDS: CorporateSettingsFieldMeta[] = [
  {
    key: "incorporationMonth",
    label: "法人化予定月",
    description: "法人として活動を開始する月です。この月から法人固定費が発生します。",
    type: "month",
  },
  {
    key: "officerSalaryStartMonth",
    label: "役員報酬開始月",
    description: "役員報酬と社会保険負担を計上し始める月です。",
    type: "month",
  },
  {
    key: "officerCount",
    label: "役員人数",
    description: "役員報酬を支払う人数です。初期値は3人です。",
    type: "number",
  },
  {
    key: "officerMonthlySalary",
    label: "役員報酬額面（1人あたり）",
    description: "1人あたりの月額役員報酬（額面）です。社会保険料はこの金額を基準に計算します。",
    type: "yen",
  },
  {
    key: "companySocialInsuranceRate",
    label: "社会保険会社負担率",
    description:
      "役員報酬や賞与に対して会社が追加で負担する社会保険料の概算率です。初期値は14.55%です。",
    type: "percent",
  },
  {
    key: "personalSocialInsuranceRate",
    label: "社会保険本人負担率",
    description: "役員報酬から控除される社会保険料（本人負担）の概算率です。初期値は14.19%です。",
    type: "percent",
  },
  {
    key: "annualCorporateResidentTax",
    label: "法人住民税均等割（年額）",
    description: "法人住民税均等割の年額です。月割で按分して計上します（70,000円÷12≒5,834円/月）。",
    type: "yen",
  },
  {
    key: "incorporationOneTimeCost",
    label: "法人設立一時費用",
    description: "法人化予定月のみ計上する設立時の一時費用です。",
    type: "yen",
  },
  {
    key: "accountingTaxAiCost",
    label: "会計・税務AI管理費",
    description: "法人化後の月次会計・税務管理費用です。",
    type: "yen",
  },
  {
    key: "taxConsultingReserve",
    label: "税務スポット相談積立",
    description: "税務相談用に毎月積み立てる予算です。",
    type: "yen",
  },
  {
    key: "legalConsultingReserve",
    label: "法務スポット相談積立",
    description: "法務相談用に毎月積み立てる予算です。",
    type: "yen",
  },
  {
    key: "insuranceCost",
    label: "保険料",
    description: "法人向け保険（賠償責任・火災等）の月額です。",
    type: "yen",
  },
  {
    key: "corporateMiscCost",
    label: "法人管理雑費",
    description: "法人運営に伴うその他の固定雑費です。",
    type: "yen",
  },
  {
    key: "estimatedTaxRate",
    label: "税金見込率",
    description: "税引前利益に対する法人税等の概算率です。初期値は30%です。",
    type: "percent",
  },
  {
    key: "minimumCashReserve",
    label: "最低現金残高",
    description:
      "会社に最低限残しておく現金の目安です。この金額を超えた内部留保のうち、指定割合を株式運用予定額として計算します。",
    type: "yen",
  },
  {
    key: "investmentRate",
    label: "株式運用割合",
    description: "運用可能額のうち株式運用に回す割合です。初期値は50%です。",
    type: "percent",
  },
]
