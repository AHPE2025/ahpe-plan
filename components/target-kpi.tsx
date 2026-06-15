"use client"

import React, { useState, useMemo, useCallback } from "react"
import Navigation from "./navigation"
import { useData, year1Targets, year2Targets, calculateActuals } from "@/lib/data-context"

function formatYen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`
}

function formatMan(value: number) {
  const man = Math.round(value / 10000)
  return `${man}万円`
}

// 編集可能な数値セル
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
        className={`w-24 rounded border border-blue-400 bg-blue-50 px-1 py-0.5 text-right text-sm focus:outline-none ${className}`}
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

function ProgressBar({ current, target, color = "emerald" }: { current: number; target: number; color?: string }) {
  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const bgColor = color === "emerald" ? "bg-emerald-500" : color === "blue" ? "bg-blue-500" : "bg-orange-500"
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-gray-100">
        <div className={`h-2 rounded-full ${bgColor}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-600">{percentage}%</span>
    </div>
  )
}

export default function TargetKPI() {
  const [activeTab, setActiveTab] = useState<"year1" | "year2" | "compare">("year1")
  const { rows } = useData()
  
  // 実績データを計算
  const actuals = useMemo(() => calculateActuals(rows), [rows])
  
  const targets = activeTab === "year2" ? year2Targets : year1Targets

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 md:p-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          {/* ヘッダー */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              目標KPIダッシュボード
            </h1>
            <p className="mt-2 text-sm leading-7 text-gray-600 md:text-base">
              1年目・2年目の目標KPIと実績の比較。月次入力データがリアルタイムで反映されます。
            </p>
            
            {/* タブ */}
            <div className="mt-6 flex gap-2">
              {[
                { key: "year1", label: "1年目" },
                { key: "year2", label: "2年目" },
                { key: "compare", label: "目標vs実績" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "compare" ? (
            <CompareView actuals={actuals} />
          ) : (
            <YearView targets={targets} isYear2={activeTab === "year2"} />
          )}
        </div>
      </div>
    </div>
  )
}

// 月次計画の行型
type PlanRow = {
  month: string
  honne: number
  training: number
  kaetai: number
  stock: number
  cost: number
  bonus?: number       // 10月特別ボーナス
  marchBonus?: number  // 3月通常ボーナス個人支給額
}

// 2年目: 月インデックス0-2(4-6月)は利益×20%、3以降は固定50万
function getSalaryPerPerson(profitBeforeSalary: number, monthIndex: number, isYear2: boolean): number {
  if (isYear2 && monthIndex >= 3) return 500000 // 7月以降固定50万
  return Math.max(0, Math.round(profitBeforeSalary * 0.2))
}

// 年度別ビュー
function YearView({ targets, isYear2 }: { targets: typeof year1Targets | typeof year2Targets; isYear2: boolean }) {
  const [bonusOpen, setBonusOpen] = useState(false)

  // 月次計画を編集可能なローカルステートで管理
  const [plan, setPlan] = useState<PlanRow[]>(
    targets.monthlyPlan.map((r) => ({
      month: r.month,
      honne: r.honne,
      training: r.training,
      kaetai: r.kaetai,
      stock: r.stock,
      cost: r.cost,
      bonus: (r as { bonus?: number }).bonus,
      marchBonus: (r as { marchBonus?: number }).marchBonus,
    }))
  )

  // セルの値を更新するヘルパー
  const updateCell = useCallback((index: number, field: keyof Omit<PlanRow, "month">, value: number) => {
    setPlan((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }, [])

  // 全計算値を導出
  const computed = useMemo(() => {
    let salaryCumPerPerson = 0
    let salaryCum3 = 0
    let reserveCum = 0

    const rows = plan.map((r, i) => {
      const totalRevenue = r.honne + r.training + r.kaetai + r.stock
      const profitBeforeSalary = totalRevenue - r.cost
      const salaryPerPerson = getSalaryPerPerson(profitBeforeSalary, i, isYear2)
      const salary3 = salaryPerPerson * 3
      // 内部留保: 総利益 - 給与3人 - 当月ボーナス - 3月個人賞与
      const bonusDeduct = (r.bonus ?? 0) + (r.marchBonus ?? 0)
      const internalReserve = profitBeforeSalary - salary3 - bonusDeduct
      salaryCumPerPerson += salaryPerPerson
      salaryCum3 += salary3
      reserveCum += internalReserve
      return {
        totalRevenue,
        profitBeforeSalary,
        salaryPerPerson,
        salary3,
        bonusDeduct,
        internalReserve,
        salaryCumPerPerson,
        salaryCum3,
        reserveCum,
        hasBonus: !!r.bonus,
        hasMarchBonus: !!r.marchBonus,
      }
    })

    const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0)
    const totalCost = plan.reduce((s, r) => s + r.cost, 0)
    const totalProfitBeforeSalary = rows.reduce((s, r) => s + r.profitBeforeSalary, 0)
    const totalSalaryPerPerson = rows.reduce((s, r) => s + r.salaryPerPerson, 0)
    const totalSalary3 = rows.reduce((s, r) => s + r.salary3, 0)
    const totalReserve = rows.reduce((s, r) => s + r.internalReserve, 0)
    const totalBonus = plan.reduce((s, r) => s + (r.bonus ?? 0) + (r.marchBonus ?? 0), 0)

    return { rows, totalRevenue, totalCost, totalProfitBeforeSalary, totalSalaryPerPerson, totalSalary3, totalReserve, totalBonus }
  }, [plan, isYear2])

  return (
    <>
      {/* 全体方針 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gray-900 px-3 py-1 text-sm font-medium text-white">
            {isYear2 ? "2年目" : "1年目"}
          </span>
          <span className="text-sm text-gray-500">{targets.period}</span>
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">テーマ：{targets.theme}</h2>
        <p className="mt-2 text-gray-600">
          {isYear2 
            ? "1か年目で作った導線をスケールさせ、再現性を収益化へつなげ、さらに組織として成立させる年"
            : "「売上最大化の年」ではなく、「再現性のある勝ちパターンを作る年」"}
        </p>
      </div>

      {/* サマリーカード（月次計画表の入力値から自動計算） */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">総売上</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{formatMan(computed.totalRevenue)}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">コスト</div>
          <div className="mt-1 text-lg font-bold text-red-600">{formatMan(computed.totalCost)}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">総利益（給与前）</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{formatMan(computed.totalProfitBeforeSalary)}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">給与累計（1人）</div>
          <div className="mt-1 text-lg font-bold text-blue-600">{formatMan(computed.totalSalaryPerPerson)}</div>
          {isYear2 && <div className="mt-0.5 text-xs text-gray-400">4-6月:利益×20%、7月〜:固定50万</div>}
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">給与総額（3人）</div>
          <div className="mt-1 text-lg font-bold text-blue-600">{formatMan(computed.totalSalary3)}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">会社最終内部留保</div>
          <div className="mt-1 text-lg font-bold text-emerald-600">{formatMan(computed.totalReserve)}</div>
        </div>
      </div>

      {/* 売上目標 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-lg font-bold text-gray-900">売上内訳</h3>
          <table className="mt-4 w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="pb-3 font-medium">サービス</th>
                <th className="pb-3 text-right font-medium">売上</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-gray-100">
                <td className="py-3">HONNE</td>
                <td className="py-3 text-right font-medium">{formatMan(targets.sales.honne)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">AI研修</td>
                <td className="py-3 text-right font-medium">{formatMan(targets.sales.training)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">KAETAI</td>
                <td className="py-3 text-right font-medium">{formatMan(targets.sales.kaetai)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">ストック</td>
                <td className="py-3 text-right font-medium">{formatMan(targets.sales.stock)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 font-medium">合計</td>
                <td className="py-3 text-right font-bold text-emerald-600">{formatMan(targets.sales.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-lg font-bold text-gray-900">コスト内訳</h3>
          <table className="mt-4 w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="pb-3 font-medium">項目</th>
                <th className="pb-3 text-right font-medium">金額</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-gray-100">
                <td className="py-3">紹介料（3%）</td>
                <td className="py-3 text-right font-medium">{formatMan(targets.costs.referral)}</td>
              </tr>
              {isYear2 && (
                <tr className="border-b border-gray-100">
                  <td className="py-3">業務委託（2人×20万×6ヶ月）</td>
                  <td className="py-3 text-right font-medium">{formatMan((targets.costs as typeof year2Targets.costs).outsource)}</td>
                </tr>
              )}
              <tr className="border-b border-gray-100">
                <td className="py-3">AI/営業/雑費</td>
                <td className="py-3 text-right font-medium">{formatMan(targets.costs.aiAndOther)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 font-medium">合計</td>
                <td className="py-3 text-right font-bold text-red-600">{formatMan(targets.costs.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 利益計算 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-lg font-bold text-gray-900">利益計算</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">総売上</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{formatMan(computed.totalRevenue)}</div>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">コスト</div>
            <div className="mt-1 text-xl font-bold text-red-600">-{formatMan(computed.totalCost)}</div>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="text-sm text-gray-500">営業利益（給与前）</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{formatMan(computed.totalProfitBeforeSalary)}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <div className="text-sm text-gray-500">内部留保</div>
            <div className="mt-1 text-xl font-bold text-emerald-600">{formatMan(computed.totalReserve)}</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          {isYear2
            ? `給与: 4-6月は総利益×20%/人、7月以降固定50万/人 → 給与総額（3人）= ${formatMan(computed.totalSalary3)}`
            : `給与は営業利益の60%（1人20%）= ${formatMan(computed.totalSalary3)}、内部留保は40% = ${formatMan(computed.totalReserve)}`}
        </p>
      </div>

      {/* 月次計画表 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">月次計画表</h3>
          <span className="text-xs text-gray-400">青色の数値はクリックして編集できます</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1400px] border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="border-b border-gray-200 pb-3 font-medium">月</th>
                <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">HONNE</th>
                <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">AI研修</th>
                <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">KAETAI</th>
                <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">ストック</th>
                <th className="border-b border-blue-100 bg-blue-50/60 px-2 pb-3 text-right font-medium text-blue-600">コスト</th>
                <th className="border-b border-gray-200 px-2 pb-3 text-right font-medium">総売上</th>
                <th className="border-b border-gray-200 px-2 pb-3 text-right font-medium">総利益</th>
                {isYear2 && <th className="border-b border-amber-100 bg-amber-50/60 px-2 pb-3 text-right font-medium text-amber-600">ボーナス</th>}
                <th className="border-b border-indigo-100 bg-indigo-50/60 px-2 pb-3 text-right font-medium text-indigo-600">給与（1人）</th>
                <th className="border-b border-indigo-100 bg-indigo-50/60 px-2 pb-3 text-right font-medium text-indigo-600">給与（3人）</th>
                <th className="border-b border-indigo-200 bg-indigo-100/60 px-2 pb-3 text-right font-medium text-indigo-700">給与累計（1人）</th>
                <th className="border-b border-emerald-100 bg-emerald-50/60 px-2 pb-3 text-right font-medium text-emerald-600">内部留保</th>
                <th className="border-b border-emerald-100 bg-emerald-50/60 px-2 pb-3 text-right font-medium text-emerald-600">内部留保累計</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {plan.map((row, i) => {
                const c = computed.rows[i]
                const isOctober = isYear2 && !!row.bonus
                const isMarch = isYear2 && !!row.marchBonus
                return (
                  <tr key={i} className={isOctober || isMarch ? "bg-amber-50/40" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="border-b border-gray-100 py-2.5 pr-3 font-medium text-gray-700">
                      {row.month}
                      {isOctober && <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700">ボーナス</span>}
                      {isMarch && <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700">賞与</span>}
                    </td>
                    {/* 入力セル */}
                    <td className="border-b border-gray-100 bg-blue-50/30 px-2 py-2.5 text-right">
                      <EditableCell value={row.honne} onChange={(v) => updateCell(i, "honne", v)} className="text-blue-700" />
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/30 px-2 py-2.5 text-right">
                      <EditableCell value={row.training} onChange={(v) => updateCell(i, "training", v)} className="text-blue-700" />
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/30 px-2 py-2.5 text-right">
                      <EditableCell value={row.kaetai} onChange={(v) => updateCell(i, "kaetai", v)} className="text-blue-700" />
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/30 px-2 py-2.5 text-right">
                      <EditableCell value={row.stock} onChange={(v) => updateCell(i, "stock", v)} className="text-blue-700" />
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/30 px-2 py-2.5 text-right">
                      <EditableCell value={row.cost} onChange={(v) => updateCell(i, "cost", v)} className="text-red-600" />
                    </td>
                    {/* 自動計算セル */}
                    <td className="border-b border-gray-100 px-2 py-2.5 text-right font-medium text-gray-800">
                      {formatMan(c.totalRevenue)}
                    </td>
                    <td className="border-b border-gray-100 px-2 py-2.5 text-right font-semibold text-gray-900">
                      {formatMan(c.profitBeforeSalary)}
                    </td>
                    {isYear2 && (
                      <td className="border-b border-gray-100 bg-amber-50/30 px-2 py-2.5 text-right font-medium text-amber-700">
                        {c.bonusDeduct > 0 ? formatMan(c.bonusDeduct) : "—"}
                      </td>
                    )}
                    <td className="border-b border-gray-100 bg-indigo-50/30 px-2 py-2.5 text-right font-medium text-indigo-600">
                      {formatMan(c.salaryPerPerson)}
                    </td>
                    <td className="border-b border-gray-100 bg-indigo-50/30 px-2 py-2.5 text-right font-semibold text-indigo-700">
                      {formatMan(c.salary3)}
                    </td>
                    <td className="border-b border-gray-100 bg-indigo-100/40 px-2 py-2.5 text-right font-bold text-indigo-800">
                      {formatMan(c.salaryCumPerPerson)}
                    </td>
                    <td className={`border-b border-gray-100 bg-emerald-50/30 px-2 py-2.5 text-right font-medium ${c.internalReserve < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatMan(c.internalReserve)}
                    </td>
                    <td className="border-b border-gray-100 bg-emerald-50/30 px-2 py-2.5 text-right font-semibold text-emerald-700">
                      {formatMan(c.reserveCum)}
                    </td>
                  </tr>
                )
              })}
              {/* 合計行 */}
              <tr className="bg-gray-900 text-white">
                <td className="px-0 py-3 font-bold">合計</td>
                <td className="px-2 py-3 text-right font-medium">{formatMan(plan.reduce((s,r)=>s+r.honne,0))}</td>
                <td className="px-2 py-3 text-right font-medium">{formatMan(plan.reduce((s,r)=>s+r.training,0))}</td>
                <td className="px-2 py-3 text-right font-medium">{formatMan(plan.reduce((s,r)=>s+r.kaetai,0))}</td>
                <td className="px-2 py-3 text-right font-medium">{formatMan(plan.reduce((s,r)=>s+r.stock,0))}</td>
                <td className="px-2 py-3 text-right font-medium text-red-300">{formatMan(computed.totalCost)}</td>
                <td className="px-2 py-3 text-right font-bold">{formatMan(computed.totalRevenue)}</td>
                <td className="px-2 py-3 text-right font-bold">{formatMan(computed.totalProfitBeforeSalary)}</td>
                {isYear2 && <td className="px-2 py-3 text-right font-bold text-amber-300">{formatMan(computed.totalBonus)}</td>}
                <td className="px-2 py-3 text-right font-bold text-indigo-300">{formatMan(computed.totalSalaryPerPerson)}</td>
                <td className="px-2 py-3 text-right font-bold text-indigo-200">{formatMan(computed.totalSalary3)}</td>
                <td className="px-2 py-3 text-right font-bold text-indigo-100">{formatMan(computed.totalSalaryPerPerson)}</td>
                <td className="px-2 py-3 text-right font-bold text-emerald-300">{formatMan(computed.totalReserve)}</td>
                <td className="px-2 py-3 text-right font-bold text-emerald-200">{formatMan(computed.totalReserve)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* KPIサマリー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-lg font-bold text-gray-900">重要KPI</h3>
        <ul className="mt-4 space-y-2">
          {targets.keyKPIs.map((kpi, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
              {kpi}
            </li>
          ))}
        </ul>
        {!isYear2 && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4">
            <div className="text-sm font-medium text-amber-800">借入: {formatMan(year1Targets.loan)}</div>
            <div className="text-xs text-amber-600">1年目はボーナスなし（内部留保696.8万 - 借入700万 = 実質0円）</div>
          </div>
        )}
        {isYear2 && (
          <div className="mt-4 space-y-3">
            {/* 10月特別ボーナス */}
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="text-sm font-medium text-blue-800">10月特別ボーナス：50万 × 3人 = 150万</div>
              <div className="mt-1 text-xs text-blue-500">ゾノ・パンク・カナリア 各50万円均等支給</div>
            </div>

            {/* 3月通常ボーナス クリックで展開 */}
            <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
              <button
                onClick={() => setBonusOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <span className="text-sm font-medium text-emerald-800">3月通常ボーナス：個人支給合計 474.3万</span>
                  <span className="ml-2 text-xs text-emerald-500">ゾノ25% / パンク14% / カナリア11% / 会社50%</span>
                </div>
                <span className="text-emerald-600">{bonusOpen ? "▲" : "▼"}</span>
              </button>

              {bonusOpen && (
                <div className="border-t border-emerald-200 px-4 pb-4 pt-3">
                  {/* ステップ1: 内部留保から分配原資を決定 */}
                  <p className="text-xs font-semibold text-emerald-700">ステップ1：分配原資の確定</p>
                  <table className="mt-2 w-full text-xs text-emerald-700">
                    <tbody>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5">通常ボーナス前の当期内部留保</td>
                        <td className="py-1.5 text-right font-medium">1,897.2万</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5">会社に残す50%</td>
                        <td className="py-1.5 text-right font-medium">948.6万</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-semibold">分配原資（残り50%）</td>
                        <td className="py-1.5 text-right font-bold">948.6万</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* ステップ2: 分配原資の配分 */}
                  <p className="mt-3 text-xs font-semibold text-emerald-700">ステップ2：分配原資 948.6万の配分</p>
                  <table className="mt-2 w-full text-xs">
                    <thead>
                      <tr className="border-b border-emerald-200 text-emerald-600">
                        <th className="pb-1.5 text-left font-medium">区分</th>
                        <th className="pb-1.5 text-right font-medium">比率</th>
                        <th className="pb-1.5 text-right font-medium">金額</th>
                      </tr>
                    </thead>
                    <tbody className="text-emerald-700">
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5">会社</td>
                        <td className="py-1.5 text-right">50%</td>
                        <td className="py-1.5 text-right font-medium">474.3万</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5 font-semibold text-emerald-800">ゾノ</td>
                        <td className="py-1.5 text-right font-semibold">25%</td>
                        <td className="py-1.5 text-right font-bold text-emerald-800">237.2万</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5 font-semibold text-emerald-800">パンク</td>
                        <td className="py-1.5 text-right font-semibold">14%</td>
                        <td className="py-1.5 text-right font-bold text-emerald-800">132.8万</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5 font-semibold text-emerald-800">カナリア</td>
                        <td className="py-1.5 text-right font-semibold">11%</td>
                        <td className="py-1.5 text-right font-bold text-emerald-800">104.3万</td>
                      </tr>
                      <tr className="bg-emerald-100/60">
                        <td className="py-1.5 font-semibold">個人合計</td>
                        <td className="py-1.5 text-right font-semibold">50%</td>
                        <td className="py-1.5 text-right font-bold">474.3万</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* ステップ3: 会社最終内部留保 */}
                  <p className="mt-3 text-xs font-semibold text-emerald-700">ステップ3：会社最終内部留保</p>
                  <table className="mt-2 w-full text-xs text-emerald-700">
                    <tbody>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5">会社に残す50%</td>
                        <td className="py-1.5 text-right">948.6万</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5">分配原資の会社分（50%）</td>
                        <td className="py-1.5 text-right">474.3万</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-semibold">会社最終内部留保</td>
                        <td className="py-1.5 text-right font-bold">1,422.9万</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 年収イメージ（2年目のみ） */}
      {isYear2 && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-lg font-bold text-gray-900">個人年収</h3>
          <p className="mt-1 text-xs text-gray-400">給与546.6万 + 10月ボーナス50万 + 3月通常賞与</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-700">ゾノ（代表）</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{formatMan(year2Targets.annualIncome.daihyo)}</div>
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between"><span>給与累計</span><span>546.6万</span></div>
                <div className="flex justify-between"><span>10月ボーナス</span><span>50万</span></div>
                <div className="flex justify-between font-medium text-emerald-600"><span>3月賞与（25%）</span><span>237.2万</span></div>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-700">パンク</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{formatMan(year2Targets.annualIncome.punk)}</div>
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between"><span>給与累計</span><span>546.6万</span></div>
                <div className="flex justify-between"><span>10月ボーナス</span><span>50万</span></div>
                <div className="flex justify-between font-medium text-emerald-600"><span>3月賞与（14%）</span><span>132.8万</span></div>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-700">カナリア</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{formatMan(year2Targets.annualIncome.canary)}</div>
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between"><span>給与累計</span><span>546.6万</span></div>
                <div className="flex justify-between"><span>10月ボーナス</span><span>50万</span></div>
                <div className="flex justify-between font-medium text-emerald-600"><span>3月賞与（11%）</span><span>104.3万</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 目標vs実績 比較ビュー
function CompareView({ actuals }: { actuals: ReturnType<typeof calculateActuals> }) {
  const targets = year1Targets

  return (
    <>
      {/* 進捗サマリー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-bold text-gray-900">1年目 進捗状況</h2>
        <p className="mt-1 text-sm text-gray-500">月次入力のデータがリアルタイムで反映されます</p>
        
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 売上進捗 */}
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">総売上</span>
              <span className="text-xs text-gray-400">目標: {formatMan(targets.sales.total)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatMan(actuals.totalRevenue)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalRevenue} target={targets.sales.total} />
            </div>
          </div>

          {/* HONNE売上 */}
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600">HONNE売上</span>
              <span className="text-xs text-blue-400">目標: {formatMan(targets.sales.honne)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-700">{formatMan(actuals.totalHonne)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalHonne} target={targets.sales.honne} color="blue" />
            </div>
          </div>

          {/* AI研修売上 */}
          <div className="rounded-xl bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">AI研修売上</span>
              <span className="text-xs text-green-400">目標: {formatMan(targets.sales.training)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-700">{formatMan(actuals.totalTraining)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalTraining} target={targets.sales.training} color="emerald" />
            </div>
          </div>

          {/* KAETAI売上 */}
          <div className="rounded-xl bg-orange-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-600">KAETAI売上</span>
              <span className="text-xs text-orange-400">目標: {formatMan(targets.sales.kaetai)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-orange-700">{formatMan(actuals.totalKaetai)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalKaetai} target={targets.sales.kaetai} color="orange" />
            </div>
          </div>

          {/* ストック売上 */}
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">ストック売上</span>
              <span className="text-xs text-gray-400">目標: {formatMan(targets.sales.stock)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatMan(actuals.totalStock)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalStock} target={targets.sales.stock} />
            </div>
          </div>

          {/* コスト */}
          <div className="rounded-xl bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600">総コスト</span>
              <span className="text-xs text-red-400">目標: {formatMan(targets.costs.total)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-700">{formatMan(actuals.totalCosts)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalCosts} target={targets.costs.total} color="orange" />
            </div>
          </div>
        </div>
      </div>

      {/* 詳細比較テーブル */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-lg font-bold text-gray-900">売上 目標vs実績</h3>
        <table className="mt-4 w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
              <th className="pb-3 font-medium">項目</th>
              <th className="pb-3 text-right font-medium">目標</th>
              <th className="pb-3 text-right font-medium">実績</th>
              <th className="pb-3 text-right font-medium">達成率</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b border-gray-100">
              <td className="py-3">HONNE</td>
              <td className="py-3 text-right">{formatMan(targets.sales.honne)}</td>
              <td className="py-3 text-right font-medium">{formatMan(actuals.totalHonne)}</td>
              <td className="py-3 text-right font-bold text-blue-600">
                {targets.sales.honne > 0 ? Math.round((actuals.totalHonne / targets.sales.honne) * 100) : 0}%
              </td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3">AI研修</td>
              <td className="py-3 text-right">{formatMan(targets.sales.training)}</td>
              <td className="py-3 text-right font-medium">{formatMan(actuals.totalTraining)}</td>
              <td className="py-3 text-right font-bold text-green-600">
                {targets.sales.training > 0 ? Math.round((actuals.totalTraining / targets.sales.training) * 100) : 0}%
              </td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3">KAETAI</td>
              <td className="py-3 text-right">{formatMan(targets.sales.kaetai)}</td>
              <td className="py-3 text-right font-medium">{formatMan(actuals.totalKaetai)}</td>
              <td className="py-3 text-right font-bold text-orange-600">
                {targets.sales.kaetai > 0 ? Math.round((actuals.totalKaetai / targets.sales.kaetai) * 100) : 0}%
              </td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3">ストック</td>
              <td className="py-3 text-right">{formatMan(targets.sales.stock)}</td>
              <td className="py-3 text-right font-medium">{formatMan(actuals.totalStock)}</td>
              <td className="py-3 text-right font-bold">
                {targets.sales.stock > 0 ? Math.round((actuals.totalStock / targets.sales.stock) * 100) : 0}%
              </td>
            </tr>
            <tr className="bg-emerald-50">
              <td className="py-3 font-medium">合計</td>
              <td className="py-3 text-right font-medium">{formatMan(targets.sales.total)}</td>
              <td className="py-3 text-right font-bold">{formatMan(actuals.totalRevenue)}</td>
              <td className="py-3 text-right font-bold text-emerald-600">
                {targets.sales.total > 0 ? Math.round((actuals.totalRevenue / targets.sales.total) * 100) : 0}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* アドバイス */}
      <div className="rounded-3xl bg-gray-900 p-6 text-white shadow-sm">
        <h3 className="text-lg font-bold">進捗に基づくアドバイス</h3>
        <div className="mt-4 space-y-3 text-sm text-gray-300">
          {actuals.totalKaetai < targets.sales.kaetai * 0.3 && (
            <p>KAETAI売上が目標の30%未満です。HONNE → AI研修 → KAETAIの導線強化が必要です。</p>
          )}
          {actuals.totalHonne < targets.sales.honne * 0.5 && (
            <p>HONNE売上が目標の50%未満です。新規リードの獲得と紹介制度の活用を検討してください。</p>
          )}
          {actuals.totalRevenue >= targets.sales.total * 0.5 && (
            <p>売上が目標の50%を超えました。後半戦に向けて、品質維持と受注継続を意識しましょう。</p>
          )}
          {actuals.totalRevenue < targets.sales.total * 0.3 && (
            <p>売上進捗が30%未満です。営業活動の強化と、既存顧客からの紹介獲得を優先してください。</p>
          )}
          {actuals.totalRevenue >= targets.sales.total * 0.7 && (
            <p>順調に進捗しています。このペースを維持しながら、品質と顧客満足度を高めていきましょう。</p>
          )}
        </div>
      </div>
    </>
  )
}
