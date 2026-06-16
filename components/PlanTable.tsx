"use client"

import React, { useState, useMemo, useCallback } from "react"
import {
  calculateYearPlan,
  type MonthlyInput,
  type YearCalculationResult,
  type YearCalcOptions,
} from "@/lib/calculate"

function formatMan(value: number) {
  const man = Math.round(value / 10000)
  return `${man}万円`
}

function formatManDecimal(value: number) {
  const man = Math.round(value / 1000) / 10
  return `${man}万円`
}

function EditableCell({
  value,
  onChange,
  className = "",
}: {
  value: number
  onChange: (v: number) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const startEdit = () => {
    setDraft(String(value))
    setEditing(true)
  }

  const commit = () => {
    const parsed = parseInt(draft.replace(/,/g, ""), 10)
    if (!isNaN(parsed) && parsed >= 0) onChange(parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        className={`w-20 rounded border border-blue-400 bg-blue-50 px-1 py-0.5 text-right text-sm focus:outline-none ${className}`}
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      title="クリックして編集"
      className={`cursor-pointer rounded px-1 py-0.5 text-right text-sm hover:bg-blue-50 hover:ring-1 hover:ring-blue-300 ${className}`}
    >
      {formatMan(value)}
    </button>
  )
}

export type PlanTableProps = {
  initialMonths: MonthlyInput[]
  calcOptions: YearCalcOptions
  isYear2: boolean
}

export default function PlanTable({ initialMonths, calcOptions, isYear2 }: PlanTableProps) {
  const [plan, setPlan] = useState<MonthlyInput[]>(
    initialMonths.map((m) => ({ ...m }))
  )

  const updateCell = useCallback(
    (index: number, field: keyof Omit<MonthlyInput, "month" | "octoberBonusTotal">, value: number) => {
      setPlan((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
    },
    []
  )

  const computed: YearCalculationResult = useMemo(
    () => calculateYearPlan(plan, calcOptions),
    [plan, calcOptions]
  )

  const lastIndex = plan.length - 1

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">月次計画表</h3>
        <span className="text-xs text-gray-400">青色の数値はクリックして編集できます</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1800px] border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="border-b border-gray-200 pb-3 font-medium">月</th>
              <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">HONNE</th>
              <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">AI研修</th>
              <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">KAETAI</th>
              <th className="border-b border-orange-100 bg-orange-50/60 px-2 pb-3 text-right font-medium text-orange-600">当月契約</th>
              <th className="border-b border-orange-100 bg-orange-50/60 px-2 pb-3 text-right font-medium text-orange-600">当期累計</th>
              <th className="border-b border-orange-100 bg-orange-50/60 px-2 pb-3 text-right font-medium text-orange-600">会社累計契約数</th>
              <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">ストック</th>
              <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">コスト</th>
              <th className="border-b border-gray-200 px-2 pb-3 text-right font-medium">総売上</th>
              <th className="border-b border-gray-200 px-2 pb-3 text-right font-medium">総利益</th>
              <th className="border-b border-amber-100 bg-amber-50/60 px-2 pb-3 text-right font-medium text-amber-600">ボーナス（個人支給）</th>
              <th className="border-b border-indigo-100 bg-indigo-50/60 px-2 pb-3 text-right font-medium text-indigo-600">給与（1人）</th>
              <th className="border-b border-indigo-100 bg-indigo-50/60 px-2 pb-3 text-right font-medium text-indigo-600">実受取額（1人）</th>
              <th className="border-b border-indigo-200 bg-indigo-100/60 px-2 pb-3 text-right font-medium text-indigo-700">給与累計（1人）</th>
              <th className="border-b border-emerald-100 bg-emerald-50/60 px-2 pb-3 text-right font-medium text-emerald-600">内部留保</th>
              <th className="border-b border-emerald-100 bg-emerald-50/60 px-2 pb-3 text-right font-medium text-emerald-600">内部留保累計</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {plan.map((row, i) => {
              const c = computed.rows[i]
              const isOctober = isYear2 && (row.octoberBonusTotal ?? 0) > 0
              const isMarch = isYear2 && i === lastIndex && c.marchBonusBreakdown
              const highlight = isOctober || isMarch

              return (
                <React.Fragment key={i}>
                  <tr className={highlight ? "bg-amber-50/40" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="border-b border-gray-100 py-2.5 pr-3 font-medium text-gray-700">
                      {row.month}
                      {isOctober && (
                        <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700">特別ボーナス</span>
                      )}
                      {isMarch && (
                        <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700">通常ボーナス</span>
                      )}
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/30 px-2 py-2.5 text-right">
                      <EditableCell value={row.honne} onChange={(v) => updateCell(i, "honne", v)} className="text-blue-700" />
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/30 px-2 py-2.5 text-right">
                      <EditableCell value={row.training} onChange={(v) => updateCell(i, "training", v)} className="text-blue-700" />
                    </td>
                    <td className="border-b border-gray-100 px-2 py-2.5 text-right font-medium text-gray-800">
                      {formatMan(c.kaetai)}
                    </td>
                    <td className="border-b border-gray-100 bg-orange-50/30 px-2 py-2.5 text-right">
                      <EditableCell
                        value={row.kaetaiContracts}
                        onChange={(v) => updateCell(i, "kaetaiContracts", v)}
                        className="text-orange-700"
                      />
                      <span className="ml-0.5 text-xs text-gray-400">社</span>
                    </td>
                    <td className="border-b border-gray-100 bg-orange-50/30 px-2 py-2.5 text-right font-medium text-orange-700">
                      {c.kaetaiPeriodCumulative}社
                    </td>
                    <td className="border-b border-gray-100 bg-orange-50/30 px-2 py-2.5 text-right font-medium text-orange-700">
                      {c.companyCumulativeContracts}社
                    </td>
                    <td className="border-b border-gray-100 px-2 py-2.5 text-right font-medium text-gray-800">
                      {formatMan(c.stock)}
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/30 px-2 py-2.5 text-right">
                      <EditableCell value={row.cost} onChange={(v) => updateCell(i, "cost", v)} className="text-red-600" />
                    </td>
                    <td className="border-b border-gray-100 px-2 py-2.5 text-right font-medium text-gray-800">
                      {formatMan(c.totalRevenue)}
                    </td>
                    <td className="border-b border-gray-100 px-2 py-2.5 text-right font-semibold text-gray-900">
                      {formatMan(c.profitBeforeSalary)}
                    </td>
                    <td className="border-b border-gray-100 bg-amber-50/30 px-2 py-2.5 text-right font-medium text-amber-700">
                      {c.bonusPersonal > 0 ? formatManDecimal(c.bonusPersonal) : "—"}
                    </td>
                    <td className="border-b border-gray-100 bg-indigo-50/30 px-2 py-2.5 text-right font-medium text-indigo-600">
                      {formatMan(c.salaryPerPerson)}
                    </td>
                    <td className="border-b border-gray-100 bg-indigo-50/30 px-2 py-2.5 text-right font-semibold text-indigo-700">
                      {isMarch ? (
                        <span className="text-xs text-gray-500">人別↓</span>
                      ) : (
                        formatMan(c.netReceivePerPerson)
                      )}
                    </td>
                    <td className="border-b border-gray-100 bg-indigo-100/40 px-2 py-2.5 text-right font-bold text-indigo-800">
                      {formatMan(c.salaryCumulativePerPerson)}
                    </td>
                    <td className={`border-b border-gray-100 bg-emerald-50/30 px-2 py-2.5 text-right font-medium ${c.internalReserve < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatManDecimal(c.internalReserve)}
                    </td>
                    <td className="border-b border-gray-100 bg-emerald-50/30 px-2 py-2.5 text-right font-semibold text-emerald-700">
                      {formatManDecimal(c.reserveCumulative)}
                    </td>
                  </tr>
                  {isMarch && c.marchBonusBreakdown && (
                    <tr className="bg-amber-50/20">
                      <td colSpan={17} className="border-b border-gray-100 px-4 py-2 text-xs text-gray-600">
                        <span className="font-medium text-amber-800">3月通常ボーナス内訳（1人あたり）：</span>
                        {" "}ゾノ {formatManDecimal(c.marchBonusBreakdown.daihyo)}
                        {" / "}パンク {formatManDecimal(c.marchBonusBreakdown.punk)}
                        {" / "}カナリア {formatManDecimal(c.marchBonusBreakdown.canary)}
                        {" "}｜実受取額 = 給与{formatMan(c.salaryPerPerson)} + 通常ボーナス（人別）
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            <tr className="bg-gray-900 text-white">
              <td className="px-0 py-3 font-bold">合計</td>
              <td className="px-2 py-3 text-right font-medium">{formatMan(computed.totals.honne)}</td>
              <td className="px-2 py-3 text-right font-medium">{formatMan(computed.totals.training)}</td>
              <td className="px-2 py-3 text-right font-medium">{formatMan(computed.totals.kaetai)}</td>
              <td className="px-2 py-3 text-right font-medium">—</td>
              <td className="px-2 py-3 text-right font-medium">{computed.totals.kaetaiPeriodCumulative}社</td>
              <td className="px-2 py-3 text-right font-medium">{computed.totals.companyCumulativeContracts}社</td>
              <td className="px-2 py-3 text-right font-medium">{formatMan(computed.totals.stock)}</td>
              <td className="px-2 py-3 text-right font-medium text-red-300">{formatMan(computed.totals.cost)}</td>
              <td className="px-2 py-3 text-right font-bold">{formatMan(computed.totals.totalRevenue)}</td>
              <td className="px-2 py-3 text-right font-bold">{formatMan(computed.totals.profitBeforeSalary)}</td>
              <td className="px-2 py-3 text-right font-bold text-amber-300">
                {computed.totals.bonusPersonal > 0 ? formatManDecimal(computed.totals.bonusPersonal) : "0円"}
              </td>
              <td className="px-2 py-3 text-right font-bold text-indigo-300">{formatMan(computed.totals.salaryPerPerson)}</td>
              <td className="px-2 py-3 text-right text-indigo-400">—</td>
              <td className="px-2 py-3 text-right font-bold text-indigo-100">{formatMan(computed.totals.salaryPerPerson)}</td>
              <td className="px-2 py-3 text-right font-bold text-emerald-300">{formatManDecimal(computed.totals.internalReserve)}</td>
              <td className="px-2 py-3 text-right font-bold text-emerald-200">{formatManDecimal(computed.totals.internalReserve)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export type { YearCalculationResult }
