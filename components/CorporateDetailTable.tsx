"use client"

import React from "react"
import type { CalculatedMonthRowWithCorporate, CorporateSettings } from "@/lib/corporate"
import { formatManDecimalYen, formatManYen, formatYen } from "@/lib/utils"

type RowDef = {
  key: keyof CalculatedMonthRowWithCorporate | "group"
  label: string
  format?: "man" | "manDecimal" | "yen" | "text" | "flag"
  indent?: boolean
  bold?: boolean
}

type GroupDef = {
  id: string
  title: string
  bgHeader: string
  bgRow: string
  rows: RowDef[]
}

const GROUPS: GroupDef[] = [
  {
    id: "revenue",
    title: "A. 売上",
    bgHeader: "bg-blue-100/80 text-blue-800",
    bgRow: "bg-blue-50/40",
    rows: [
      { key: "honne", label: "HONNE", format: "man" },
      { key: "training", label: "AI研修", format: "man" },
      { key: "kaetai", label: "KAETAI", format: "man" },
      { key: "stock", label: "ストック", format: "man" },
      { key: "totalRevenue", label: "総売上", format: "man", bold: true },
    ],
  },
  {
    id: "cost",
    title: "B. 通常コスト",
    bgHeader: "bg-red-50/80 text-red-800",
    bgRow: "bg-red-50/20",
    rows: [
      { key: "cost", label: "既存事業コスト", format: "man" },
    ],
  },
  {
    id: "corporate",
    title: "C. 法人化後コスト",
    bgHeader: "bg-violet-100/80 text-violet-800",
    bgRow: "bg-violet-50/30",
    rows: [
      { key: "incorporationLabel", label: "法人化フラグ", format: "flag" },
      { key: "companySocialInsurance", label: "社会保険会社負担", format: "manDecimal" },
      { key: "bonusCompanySocialInsurance", label: "賞与社会保険会社負担", format: "manDecimal" },
      { key: "corporateFixedCost", label: "法人固定費", format: "manDecimal" },
      { key: "incorporationOneTimeCostMonth", label: "法人設立一時費用", format: "manDecimal" },
      {
        key: "corporateAdditionalCostTotal",
        label: "法人化後追加コスト合計",
        format: "manDecimal",
        bold: true,
      },
      { key: "revisedCostTotal", label: "修正後コスト合計", format: "manDecimal", bold: true },
    ],
  },
  {
    id: "compensation",
    title: "D. 報酬",
    bgHeader: "bg-indigo-100/80 text-indigo-800",
    bgRow: "bg-indigo-50/30",
    rows: [
      { key: "officerSalaryTotal", label: "役員報酬額面合計", format: "manDecimal" },
      {
        key: "personalSocialInsuranceTotal",
        label: "社会保険本人負担（3人合計）",
        format: "manDecimal",
      },
      {
        key: "afterSocialInsuranceTotal",
        label: "社会保険控除後金額（3人合計）",
        format: "manDecimal",
      },
      { key: "estimatedTakeHomePerPerson", label: "概算手取り（1人）", format: "manDecimal" },
      { key: "bonusPersonal", label: "ボーナス総額", format: "manDecimal" },
      { key: "companyRealPersonnelCost", label: "会社実質人件費", format: "manDecimal", bold: true },
    ],
  },
  {
    id: "profit",
    title: "E. 利益・内部留保",
    bgHeader: "bg-emerald-100/80 text-emerald-800",
    bgRow: "bg-emerald-50/30",
    rows: [
      { key: "totalExpense", label: "総支出", format: "manDecimal", bold: true },
      { key: "profitBeforeTax", label: "税引前利益", format: "manDecimal", bold: true },
      { key: "estimatedTax", label: "税金見込", format: "manDecimal" },
      { key: "profitAfterTax", label: "税引後利益", format: "manDecimal" },
      { key: "reserveBeforeTax", label: "税引前内部留保（当月）", format: "manDecimal" },
      { key: "reserveBeforeTaxCumulative", label: "税引前内部留保累計", format: "manDecimal" },
      {
        key: "reserveAfterTaxCumulative",
        label: "税引後内部留保累計",
        format: "manDecimal",
        bold: true,
      },
    ],
  },
  {
    id: "investment",
    title: "F. 資金運用",
    bgHeader: "bg-amber-100/80 text-amber-800",
    bgRow: "bg-amber-50/30",
    rows: [
      { key: "investmentAvailableAmount", label: "運用可能額", format: "manDecimal" },
      { key: "plannedStockInvestment", label: "株式運用予定額", format: "manDecimal" },
      { key: "companyCashBalanceEstimate", label: "会社現金残高目安", format: "manDecimal", bold: true },
    ],
  },
]

function formatCell(value: unknown, format: RowDef["format"]): React.ReactNode {
  if (format === "flag") {
    const label = String(value)
    return (
      <span
        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
          label === "法人化後"
            ? "bg-violet-100 text-violet-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {label}
      </span>
    )
  }
  if (format === "text") return String(value)
  const num = Number(value)
  if (num === 0 && format !== "manDecimal") return "—"
  if (format === "yen") return formatYen(num)
  if (format === "manDecimal") return formatManDecimalYen(num)
  return formatManYen(num)
}

type CorporateDetailTableProps = {
  rows: CalculatedMonthRowWithCorporate[]
  settings?: CorporateSettings
  highlightMonth?: string
}

export default function CorporateDetailTable({
  rows,
  settings,
  highlightMonth = "2027年7月",
}: CorporateDetailTableProps) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-gray-900">法人化・利益詳細（月次）</h3>
        <span className="text-xs text-gray-400">
          行=項目、列=月。金額は万円表示（小数第1位まで）
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="sticky left-0 z-20 min-w-[200px] border-b border-r border-gray-200 bg-white px-3 py-2 text-left font-medium shadow-sm">
                項目
              </th>
              {rows.map((row) => (
                <th
                  key={row.month}
                  className={`min-w-[88px] border-b border-gray-200 px-2 py-2 text-right font-medium ${
                    row.month === highlightMonth ? "bg-amber-50 text-amber-800" : "bg-gray-50"
                  }`}
                >
                  {row.month.replace(/(\d{4})年(\d{1,2})月/, "$2月")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <React.Fragment key={group.id}>
                <tr>
                  <td
                    colSpan={rows.length + 1}
                    className={`sticky left-0 z-10 px-3 py-2 text-xs font-bold ${group.bgHeader}`}
                  >
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((rowDef) => (
                  <tr key={`${group.id}-${rowDef.key}`} className={group.bgRow}>
                    <td
                      className={`sticky left-0 z-10 border-r border-gray-100 bg-inherit px-3 py-2 font-medium text-gray-700 shadow-sm ${
                        rowDef.bold ? "font-semibold text-gray-900" : ""
                      } ${rowDef.indent ? "pl-6" : ""}`}
                    >
                      {rowDef.label}
                    </td>
                    {rows.map((monthRow) => {
                      const value = monthRow[rowDef.key as keyof CalculatedMonthRowWithCorporate]
                      const isHighlight = monthRow.month === highlightMonth
                      const isNegative =
                        typeof value === "number" && value < 0 && rowDef.format !== "flag"
                      return (
                        <td
                          key={monthRow.month}
                          className={`px-2 py-2 text-right ${
                            isHighlight ? "bg-amber-50/60" : ""
                          } ${rowDef.bold ? "font-semibold" : ""} ${
                            isNegative ? "text-red-600" : "text-gray-800"
                          }`}
                        >
                          {formatCell(value, rowDef.format ?? "manDecimal")}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {group.id === "investment" && settings && (
                  <tr className={group.bgRow}>
                    <td className="sticky left-0 z-10 border-r border-gray-100 bg-inherit px-3 py-2 font-medium text-gray-500 shadow-sm">
                      最低現金残高（設定値）
                    </td>
                    {rows.map((monthRow) => (
                      <td
                        key={`min-${monthRow.month}`}
                        className={`px-2 py-2 text-right text-gray-500 ${
                          monthRow.month === highlightMonth ? "bg-amber-50/60" : ""
                        }`}
                      >
                        {formatManDecimalYen(settings.minimumCashReserve)}
                      </td>
                    ))}
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800">
        <p className="font-medium">2027年7月 検算</p>
        {rows
          .filter((r) => r.month === "2027年7月")
          .map((r) => (
            <ul key={r.month} className="mt-2 space-y-1 text-xs text-indigo-700">
              <li>役員報酬額面合計: {formatYen(r.officerSalaryTotal)}</li>
              <li>社会保険本人負担（3人）: {formatYen(r.personalSocialInsuranceTotal)}</li>
              <li>社会保険控除後（3人）: {formatYen(r.afterSocialInsuranceTotal)}</li>
              <li>社会保険会社負担: {formatYen(r.companySocialInsurance)}</li>
              <li>会社実質人件費: {formatYen(r.companyRealPersonnelCost)}</li>
            </ul>
          ))}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">2027年10月 検算（特別ボーナス）</p>
        {rows
          .filter((r) => r.month === "2027年10月")
          .map((r) => (
            <ul key={r.month} className="mt-2 space-y-1 text-xs text-amber-700">
              <li>ボーナス総額: {formatYen(r.bonusPersonal)}</li>
              <li>賞与社会保険会社負担: {formatYen(r.bonusCompanySocialInsurance)}</li>
              <li>通常社会保険会社負担: {formatYen(r.companySocialInsurance)}</li>
              <li>法人化後追加コスト合計: {formatYen(r.corporateAdditionalCostTotal)}</li>
            </ul>
          ))}
      </div>
    </div>
  )
}
