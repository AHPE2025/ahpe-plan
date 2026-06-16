"use client"

import React, { useMemo, useState } from "react"
import Navigation from "./navigation"
import { useData, type MonthRow } from "@/lib/data-context"
import { formatNumber, parseNumber } from "@/lib/utils"

// 件数選択肢（0〜10）
const countOptions = Array.from({ length: 11 }, (_, i) => i)

// HONNE面談人数選択肢（0〜50人、10人単位で50〜200人）
const personOptions = [
  ...Array.from({ length: 51 }, (_, i) => i),
  60, 70, 80, 90, 100, 120, 140, 160, 180, 200,
]

// 給与計算: 利益の60%を給与（1人20%）、40%を内部留保
const SALARY_RATE = 0.6 // 給与率60%
const SALARY_RATE_PER_PERSON = 0.2 // 1人あたり20%
const RESERVE_RATE = 0.4 // 内部留保率40%

function formatYen(value: number) {
  return `¥${formatNumber(value)}`
}

// 金額入力コンポーネント（円単位・カンマ区切り表示）
function AmountInput({
  value,
  onChange,
}: {
  value: number
  onChange: (val: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const startEdit = () => {
    setDraft(value === 0 ? "" : formatNumber(value))
    setEditing(true)
  }

  const commit = () => {
    const parsed = parseNumber(draft)
    if (parsed >= 0) onChange(parsed)
    setEditing(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "")
    if (raw === "" || /^\d+$/.test(raw)) {
      setDraft(raw === "" ? "" : formatNumber(parseNumber(raw)))
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={handleChange}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        className="w-28 rounded-lg border border-blue-400 bg-blue-50 px-2 py-1.5 text-right text-sm focus:outline-none"
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      title="クリックして金額を入力"
      className="w-28 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-sm hover:bg-blue-50 hover:ring-1 hover:ring-blue-300"
    >
      {value === 0 ? "0" : formatNumber(value)}
    </button>
  )
}

// 件数選択コンポーネント
function CountSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (val: number) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
    >
      {countOptions.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  )
}

// HONNE面談人数選択コンポーネント（0〜200人）
function PersonSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (val: number) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
    >
      {personOptions.map((n) => (
        <option key={n} value={n}>
          {n}人
        </option>
      ))}
    </select>
  )
}

// 金額選択コンポーネント（1万円単位）— 後方互換のため残すが AmountInput を使用
function AmountSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (val: number) => void
}) {
  return <AmountInput value={value} onChange={onChange} />
}



export default function AhpeSalarySheet() {
  const { rows, setRows, updateRow } = useData()
  const [visibleMonthIds, setVisibleMonthIds] = useState<Set<number>>(
    new Set(rows.map((r) => r.id))
  )
  const [showMonthSelector, setShowMonthSelector] = useState(false)

  const addMonth = () => {
    const lastRow = rows[rows.length - 1]
    const lastMonth = lastRow.month
    // Parse year and month from format "2027年3月"
    const match = lastMonth.match(/(\d+)年(\d+)月/)
    let newYear = 2026
    let newMonthNum = 1
    if (match) {
      newYear = parseInt(match[1])
      newMonthNum = parseInt(match[2]) + 1
      if (newMonthNum > 12) {
        newMonthNum = 1
        newYear += 1
      }
    }
    const newId = Math.max(...rows.map((r) => r.id)) + 1
    const newRow: MonthRow = {
      id: newId,
      month: `${newYear}年${newMonthNum}月`,
      honnePersonCount: 0,
      trainingContractCount: 0,
      trainingActiveCount: 0,
      trainingAmount: 0,
      kaetaiContractCount: 0,
      kaetaiAmount: 0,
      stockRevenue: 0,
      aiCost: 20000,
      travelCost: 20000,
      foodCost: 40000,
      personnelCostOther: 0,
      miscCost: 0,
    }
    setRows((prev) => [...prev, newRow])
    setVisibleMonthIds((prev) => new Set([...prev, newId]))
  }

  const toggleMonthVisibility = (id: number) => {
    setVisibleMonthIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
})
  }

  const calculatedRows = useMemo(() => {
    // 累計を計算するために先に処理
    let honneCumulativePersons = 0
    let trainingCumulative = 0
    let kaetaiCumulative = 0
    let salaryCumulativePerPerson = 0
    let salaryCumulative3 = 0
    let reserveCumulative = 0

    return rows.map((row) => {
      // 累計を更新
      honneCumulativePersons += row.honnePersonCount
      trainingCumulative += row.trainingContractCount
      kaetaiCumulative += row.kaetaiContractCount

      // HONNE売上は人数から自動計算（1人1万円）
      const honneAmount = row.honnePersonCount * 10000

      const totalRevenue =
        honneAmount + row.trainingAmount + row.kaetaiAmount + row.stockRevenue

      const fixedAndOtherCosts =
        row.aiCost + row.travelCost + row.foodCost + row.personnelCostOther + row.miscCost

      const monthlyProfitBeforeSalary = totalRevenue - fixedAndOtherCosts

      // 給与は利益の60%（1人20%）、内部留保は40%
      const salaryPerPerson = Math.max(0, Math.round(monthlyProfitBeforeSalary * SALARY_RATE_PER_PERSON))
      const salaryTotal3 = salaryPerPerson * 3
      const internalReserve = Math.round(monthlyProfitBeforeSalary * RESERVE_RATE)

      salaryCumulativePerPerson += salaryPerPerson
      salaryCumulative3 += salaryTotal3
      reserveCumulative += internalReserve

      const operatingProfitAfterSalary = monthlyProfitBeforeSalary - salaryTotal3

      return {
        ...row,
        honneAmount,
        honneCumulativePersons,
        trainingCumulative,
        kaetaiCumulative,
        totalRevenue,
        fixedAndOtherCosts,
        monthlyProfitBeforeSalary,
        salaryPerPerson,
        salaryTotal3,
        internalReserve,
        salaryCumulativePerPerson,
        salaryCumulative3,
        reserveCumulative,
        operatingProfitAfterSalary,
      }
    })
  }, [rows])

  const visibleRows = calculatedRows.filter((row) => visibleMonthIds.has(row.id))

  const summary = useMemo(() => {
    const totalHonnePersons = calculatedRows.reduce((sum, row) => sum + row.honnePersonCount, 0)
    const totalHonne = totalHonnePersons * 10000 // 1人1万円
    const totalTraining = calculatedRows.reduce((sum, row) => sum + row.trainingAmount, 0)
    const totalKaetai = calculatedRows.reduce((sum, row) => sum + row.kaetaiAmount, 0)
    const totalStock = calculatedRows.reduce((sum, row) => sum + row.stockRevenue, 0)
    const totalRevenue = totalHonne + totalTraining + totalKaetai + totalStock
    const totalCostsBeforeSalary = calculatedRows.reduce((sum, row) => sum + row.fixedAndOtherCosts, 0)
    const totalProfitBeforeSalary = totalRevenue - totalCostsBeforeSalary
    // 給与は利益の60%（1人20%）
    const totalSalaryPerPerson = calculatedRows.reduce((sum, row) => sum + row.salaryPerPerson, 0)
    const totalSalary = totalSalaryPerPerson * 3
    // 内部留保は利益の40%
    const totalInternalReserve = calculatedRows.reduce((sum, row) => sum + row.internalReserve, 0)
    const totalOperatingProfitAfterSalary = totalProfitBeforeSalary - totalSalary

    return {
      totalRevenue,
      totalCostsBeforeSalary,
      totalProfitBeforeSalary,
      totalSalaryPerPerson,
      totalSalary,
      totalInternalReserve,
      totalOperatingProfitAfterSalary,
      totalHonnePersons,
      totalHonne,
      totalTraining,
      totalKaetai,
      totalStock,
    }
  }, [calculatedRows])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 md:p-8">
        <div className="mx-auto max-w-[1800px] space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              AHPE 報酬自動計算シート
            </h1>
            <p className="mt-2 text-sm leading-7 text-gray-600 md:text-base">
              給与は営業利益（給与前）の60%（1人20%）、内部留保は40%で自動計算されます。
              KAETAIは100万円・2分割（契約月50万＋翌月50万）の実入金額を入力してください。
            </p>
          </div>

<div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm text-gray-500">総売上</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatYen(summary.totalRevenue)}</div>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm text-gray-500">総コスト</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatYen(summary.totalCostsBeforeSalary)}</div>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm text-gray-500">営業利益（給与前）</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatYen(summary.totalProfitBeforeSalary)}</div>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm text-gray-500">給与累計（1人）</div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{formatYen(summary.totalSalaryPerPerson)}</div>
            <div className="mt-1 text-xs text-gray-400">3人合計: {formatYen(summary.totalSalary)}</div>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm text-gray-500">内部留保累計</div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">{formatYen(summary.totalInternalReserve)}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
<div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm text-gray-500">HONNE売上合計（累計{summary.totalHonnePersons}人）</div>
            <div className="mt-2 text-xl font-bold text-gray-900">{formatYen(summary.totalHonne)}</div>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm text-gray-500">研修売上合計</div>
            <div className="mt-2 text-xl font-bold text-gray-900">{formatYen(summary.totalTraining)}</div>
          </div>
<div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm text-gray-500">KAETAI入金合計</div>
            <div className="mt-2 text-xl font-bold text-gray-900">{formatYen(summary.totalKaetai)}</div>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm text-gray-500">ストック売上合計</div>
            <div className="mt-2 text-xl font-bold text-gray-900">{formatYen(summary.totalStock)}</div>
          </div>
        </div>

<div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">月次入力・自動計算表</h2>
              <p className="mt-2 text-sm leading-7 text-gray-600">
                KAETAIは契約額ではなく、その月に実際に入金された金額を入力してください。
                2分割入金（契約月50万＋翌月50万）の場合は各月入金額を入力します。
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMonthSelector(!showMonthSelector)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                月を選択 ({visibleMonthIds.size}/{rows.length})
              </button>
              <button
                onClick={addMonth}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                + 月を追加
              </button>
            </div>
          </div>

          {showMonthSelector && (
            <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-gray-50 p-4">
              {rows.map((row) => (
                <button
                  key={row.id}
                  onClick={() => toggleMonthVisibility(row.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    visibleMonthIds.has(row.id)
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 ring-1 ring-gray-200"
                  }`}
                >
                  {row.month}
                </button>
              ))}
            </div>
          )}

          <div className="relative mt-4 max-h-[600px] overflow-auto">
            <table className="min-w-[2600px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr className="text-left text-xs text-gray-600 md:text-sm">
                  <th className="sticky left-0 z-30 border-b border-gray-200 bg-white px-3 py-3 font-semibold">月</th>
                  {/* HONNE（人数ベース） */}
                  <th className="border-b border-gray-200 bg-blue-50 px-3 py-3 font-semibold">HONNE人数</th>
                  <th className="border-b border-gray-200 bg-blue-50 px-3 py-3 font-semibold">累計人数</th>
                  <th className="border-b border-gray-200 bg-blue-50 px-3 py-3 font-semibold">HONNE売上</th>
                  {/* AI研修 */}
                  <th className="border-b border-gray-200 bg-green-50 px-3 py-3 font-semibold">研修契約</th>
                  <th className="border-b border-gray-200 bg-green-50 px-3 py-3 font-semibold">研修累計</th>
                  <th className="border-b border-gray-200 bg-green-50 px-3 py-3 font-semibold">研修稼働</th>
                  <th className="border-b border-gray-200 bg-green-50 px-3 py-3 font-semibold">研修入金</th>
                  {/* KAETAI */}
                  <th className="border-b border-gray-200 bg-orange-50 px-3 py-3 font-semibold">KAETAI契約</th>
                  <th className="border-b border-gray-200 bg-orange-50 px-3 py-3 font-semibold">KAETAI累計</th>
                  <th className="border-b border-gray-200 bg-orange-50 px-3 py-3 font-semibold">KAETAI入金</th>
                  {/* その他 */}
                  <th className="border-b border-gray-200 bg-white px-3 py-3 font-semibold">ストック</th>
                  <th className="border-b border-gray-200 bg-gray-50 px-3 py-3 font-semibold">AI費用</th>
                  <th className="border-b border-gray-200 bg-gray-50 px-3 py-3 font-semibold">移動費</th>
                  <th className="border-b border-gray-200 bg-gray-50 px-3 py-3 font-semibold">食費</th>
                  <th className="border-b border-gray-200 bg-gray-50 px-3 py-3 font-semibold">他人件費</th>
                  <th className="border-b border-gray-200 bg-gray-50 px-3 py-3 font-semibold">雑費</th>
                  {/* 計算結果 */}
                  <th className="border-b border-gray-200 bg-white px-3 py-3 font-semibold">総売上</th>
                  <th className="border-b border-gray-200 bg-white px-3 py-3 font-semibold">コスト</th>
                  <th className="border-b border-gray-200 bg-white px-3 py-3 font-semibold">営業利益</th>
                  <th className="border-b border-gray-200 bg-blue-50 px-3 py-3 font-semibold">給与（1人）</th>
                  <th className="border-b border-gray-200 bg-blue-50 px-3 py-3 font-semibold">給与（3人）</th>
                  <th className="border-b border-gray-200 bg-blue-100 px-3 py-3 font-semibold">給与累計（3人）</th>
                  <th className="border-b border-gray-200 bg-emerald-50 px-3 py-3 font-semibold">内部留保</th>
                  <th className="border-b border-gray-200 bg-emerald-50 px-3 py-3 font-semibold">留保累計</th>
                </tr>
              </thead>
<tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className="text-sm">
                    <td className="sticky left-0 z-10 border-b border-gray-100 bg-white px-3 py-3 font-medium">{row.month}</td>

                    {/* HONNE（人数ベース） */}
                    <td className="border-b border-gray-100 bg-blue-50/50 px-3 py-3">
                      <PersonSelect
                        value={row.honnePersonCount}
                        onChange={(val) => updateRow(row.id, "honnePersonCount", val)}
                      />
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/50 px-3 py-3 text-center font-medium">
                      {row.honneCumulativePersons}人
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/50 px-3 py-3 text-right font-medium">
                      {formatYen(row.honneAmount)}
                    </td>

                    {/* AI研修 */}
                    <td className="border-b border-gray-100 bg-green-50/50 px-3 py-3">
                      <CountSelect
                        value={row.trainingContractCount}
                        onChange={(val) => updateRow(row.id, "trainingContractCount", val)}
                      />
                    </td>
                    <td className="border-b border-gray-100 bg-green-50/50 px-3 py-3 text-center font-medium">
                      {row.trainingCumulative}
                    </td>
                    <td className="border-b border-gray-100 bg-green-50/50 px-3 py-3">
                      <CountSelect
                        value={row.trainingActiveCount}
                        onChange={(val) => updateRow(row.id, "trainingActiveCount", val)}
                      />
                    </td>
                    <td className="border-b border-gray-100 bg-green-50/50 px-3 py-3">
                      <AmountSelect
                        value={row.trainingAmount}
                        onChange={(val) => updateRow(row.id, "trainingAmount", val)}
                      />
                    </td>

                    {/* KAETAI */}
                    <td className="border-b border-gray-100 bg-orange-50/50 px-3 py-3">
                      <CountSelect
                        value={row.kaetaiContractCount}
                        onChange={(val) => updateRow(row.id, "kaetaiContractCount", val)}
                      />
                    </td>
                    <td className="border-b border-gray-100 bg-orange-50/50 px-3 py-3 text-center font-medium">
                      {row.kaetaiCumulative}
                    </td>
                    <td className="border-b border-gray-100 bg-orange-50/50 px-3 py-3">
                      <AmountSelect
                        value={row.kaetaiAmount}
                        onChange={(val) => updateRow(row.id, "kaetaiAmount", val)}
                      />
                    </td>

                    {/* ストック */}
                    <td className="border-b border-gray-100 px-3 py-3">
                      <AmountSelect
                        value={row.stockRevenue}
                        onChange={(val) => updateRow(row.id, "stockRevenue", val)}
                      />
                    </td>

                    {/* 経費 */}
                    <td className="border-b border-gray-100 bg-gray-50/50 px-3 py-3">
                      <AmountSelect
                        value={row.aiCost}
                        onChange={(val) => updateRow(row.id, "aiCost", val)}
                      />
                    </td>
                    <td className="border-b border-gray-100 bg-gray-50/50 px-3 py-3">
                      <AmountSelect
                        value={row.travelCost}
                        onChange={(val) => updateRow(row.id, "travelCost", val)}
                      />
                    </td>
                    <td className="border-b border-gray-100 bg-gray-50/50 px-3 py-3">
                      <AmountSelect
                        value={row.foodCost}
                        onChange={(val) => updateRow(row.id, "foodCost", val)}
                      />
                    </td>
                    <td className="border-b border-gray-100 bg-gray-50/50 px-3 py-3">
                      <AmountSelect
                        value={row.personnelCostOther}
                        onChange={(val) => updateRow(row.id, "personnelCostOther", val)}
                      />
                    </td>
                    <td className="border-b border-gray-100 bg-gray-50/50 px-3 py-3">
                      <AmountSelect
                        value={row.miscCost}
                        onChange={(val) => updateRow(row.id, "miscCost", val)}
                      />
                    </td>

{/* 計算結果 */}
                    <td className="border-b border-gray-100 px-3 py-3 font-medium">
                      {formatYen(row.totalRevenue)}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 font-medium">
                      {formatYen(row.fixedAndOtherCosts)}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 font-bold text-gray-900">
                      {formatYen(row.monthlyProfitBeforeSalary)}
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/50 px-3 py-3 font-semibold text-blue-600">
                      {formatYen(row.salaryPerPerson)}
                    </td>
                    <td className="border-b border-gray-100 bg-blue-50/50 px-3 py-3 font-semibold text-blue-600">
                      {formatYen(row.salaryTotal3)}
                    </td>
                    <td className="border-b border-gray-100 bg-blue-100/50 px-3 py-3 font-bold text-blue-700">
                      {formatYen(row.salaryCumulative3)}
                    </td>
                    <td className="border-b border-gray-100 bg-emerald-50/50 px-3 py-3 font-semibold text-emerald-600">
                      {formatYen(row.internalReserve)}
                    </td>
                    <td className="border-b border-gray-100 bg-emerald-50/50 px-3 py-3 font-medium text-emerald-600">
                      {formatYen(row.reserveCumulative)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

<div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-bold text-gray-900">計算ルール</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-gray-700 md:text-base">
            <p>1. KAETAIは「契約額」ではなく「その月の実入金額」を入力する。</p>
            <p>2. 給与は営業利益（給与前）の60%を3人で分配（1人20%）。</p>
            <p>3. 内部留保は営業利益（給与前）の40%。</p>
            <p>4. 給与（3人）= 給与（1人）× 3、給与累計（3人）は月ごとに累積。</p>
            <p>5. 分割入金でも一括入金でも同じルールで処理する。</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
