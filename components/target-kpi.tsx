"use client"

import React, { useState, useMemo, useCallback } from "react"
import Navigation from "./navigation"
import PlanTable from "./PlanTable"
import CorporateSettingsPanel from "./CorporateSettingsPanel"
import CorporateDetailTable from "./CorporateDetailTable"
import { useData, calculateActuals } from "@/lib/data-context"
import { year1Targets, year1Meta, year1Months } from "@/data/year1"
import { year2Targets, year2Meta, year2Months } from "@/data/year2"
import { calculateYearPlan, type MonthlyInput, type YearCalcOptions } from "@/lib/calculate"
import { DEFAULT_CORPORATE_SETTINGS, type CorporateSettings } from "@/lib/corporate"
import { formatNumber, parseNumber, formatManYen, formatManDecimalYen } from "@/lib/utils"

function formatYen(value: number) {
  return `¥${formatNumber(value)}`
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
  const actuals = useMemo(() => calculateActuals(rows), [rows])
  const isYear2 = activeTab === "year2"

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-4 md:p-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              目標KPIダッシュボード
            </h1>
            <p className="mt-2 text-sm leading-7 text-gray-600 md:text-base">
              1年目・2年目の目標KPIと実績の比較。月次入力データがリアルタイムで反映されます。
            </p>
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
            <YearView key={isYear2 ? "year2" : "year1"} isYear2={isYear2} />
          )}
        </div>
      </div>
    </div>
  )
}

function HonneContractPeopleTargetCell({
  actual,
  target,
  onTargetChange,
}: {
  actual: number
  target: number | null
  onTargetChange: (v: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const displayValue = target ?? actual

  const startEdit = () => {
    setDraft(String(displayValue))
    setEditing(true)
  }

  const commit = () => {
    const parsed = parseNumber(draft)
    if (parsed >= 0) {
      onTargetChange(parsed === actual ? null : parsed)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, "")
            if (raw === "" || /^\d+$/.test(raw)) setDraft(raw)
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          className="w-16 rounded border border-blue-400 bg-blue-50 px-1 py-0.5 text-right text-sm focus:outline-none"
        />
        <span className="text-xs text-gray-400">人</span>
      </span>
    )
  }

  return (
    <button
      onClick={startEdit}
      title="クリックして目標値を編集（実績は月次入力の合計）"
      className="cursor-pointer rounded px-1 py-0.5 text-right text-sm hover:bg-blue-50 hover:ring-1 hover:ring-blue-300"
    >
      <span className="font-medium">{displayValue}人</span>
      {target !== null && target !== actual && (
        <span className="ml-1 text-xs text-gray-400">（実績{actual}人）</span>
      )}
    </button>
  )
}

function YearView({ isYear2 }: { isYear2: boolean }) {
  const targets = isYear2 ? year2Targets : year1Targets
  const initialMonths = isYear2 ? year2Months : year1Months
  const [corporateSettings, setCorporateSettings] = useState<CorporateSettings>(
    () => ({ ...DEFAULT_CORPORATE_SETTINGS })
  )

  const calcOptions: YearCalcOptions = isYear2
    ? {
        priorCompanyContracts: year2Meta.priorCompanyContracts,
        priorTwoMonthContracts: year2Meta.priorTwoMonthContracts,
        priorMonthContracts: year2Meta.priorMonthContracts,
        isYear2: true,
        octoberBonusPerPerson: year2Meta.octoberBonusPerPerson,
        corporateSettings,
      }
    : {
        priorCompanyContracts: year1Meta.priorCompanyContracts,
        priorMonthContracts: year1Meta.priorMonthContracts,
        isYear2: false,
      }

  const [plan, setPlan] = useState<MonthlyInput[]>(() => initialMonths.map((m) => ({ ...m })))
  const [honneContractPeopleTarget, setHonneContractPeopleTarget] = useState<number | null>(null)

  const computed = useMemo(() => calculateYearPlan(plan, calcOptions), [plan, calcOptions])
  const honneContractPeopleActual = computed.totals.honneContractPeople

  const handlePlanChange = useCallback((newPlan: MonthlyInput[]) => {
    setPlan(newPlan)
  }, [])

  const [bonusOpen, setBonusOpen] = useState(false)
  const marchBonus = isYear2 ? year2Targets.bonus.march : null

  return (
    <>
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

      <div className={`grid grid-cols-2 gap-4 ${isYear2 ? "md:grid-cols-4 lg:grid-cols-4" : "md:grid-cols-3 lg:grid-cols-6"}`}>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">総売上</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{formatManYen(computed.totals.totalRevenue)}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">コスト</div>
          <div className="mt-1 text-lg font-bold text-red-600">{formatManYen(computed.totals.cost)}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">総利益（給与前）</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{formatManYen(computed.totals.profitBeforeSalary)}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">給与累計（1人）</div>
          <div className="mt-1 text-lg font-bold text-blue-600">{formatManDecimalYen(computed.totals.salaryPerPerson)}</div>
          {isYear2 && <div className="mt-0.5 text-xs text-gray-400">4-6月:利益×20%、7月〜:固定50万</div>}
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">給与総額（3人）</div>
          <div className="mt-1 text-lg font-bold text-blue-600">{formatManDecimalYen(computed.totals.salaryTotal3)}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">会社最終内部留保（税引前）</div>
          <div className="mt-1 text-lg font-bold text-emerald-600">{formatManDecimalYen(computed.totals.internalReserve)}</div>
        </div>
        {isYear2 && (
          <>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="text-xs text-gray-500">法人化後追加コスト</div>
              <div className="mt-1 text-lg font-bold text-violet-600">
                {formatManDecimalYen(computed.totals.corporateAdditionalCostTotal)}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="text-xs text-gray-500">税引後内部留保累計</div>
              <div className="mt-1 text-lg font-bold text-emerald-600">
                {formatManDecimalYen(computed.totals.reserveAfterTaxCumulative)}
              </div>
            </div>
          </>
        )}
      </div>

      {isYear2 && (
        <CorporateSettingsPanel
          settings={corporateSettings}
          onChange={setCorporateSettings}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-lg font-bold text-gray-900">KPI（売上・契約）</h3>
          <table className="mt-4 w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="pb-3 font-medium">項目</th>
                <th className="pb-3 text-right font-medium">値</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-gray-100">
                <td className="py-3">HONNE売上</td>
                <td className="py-3 text-right font-medium">{formatManYen(computed.totals.honne)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">HONNE契約人数合計</td>
                <td className="py-3 text-right">
                  <HonneContractPeopleTargetCell
                    actual={honneContractPeopleActual}
                    target={honneContractPeopleTarget}
                    onTargetChange={setHonneContractPeopleTarget}
                  />
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">AI研修売上</td>
                <td className="py-3 text-right font-medium">{formatManYen(computed.totals.training)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">KAETAI売上</td>
                <td className="py-3 text-right font-medium">{formatManYen(computed.totals.kaetai)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">KAETAI契約数</td>
                <td className="py-3 text-right font-medium">{computed.totals.kaetaiPeriodCumulative}社</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">ストック売上</td>
                <td className="py-3 text-right font-medium">{formatManYen(computed.totals.stock)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 font-medium">総売上</td>
                <td className="py-3 text-right font-bold text-emerald-600">{formatManYen(computed.totals.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-lg font-bold text-gray-900">売上内訳（目標値）</h3>
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
                <td className="py-3 text-right font-medium">{formatManYen(targets.sales.honne)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">HONNE契約人数合計</td>
                <td className="py-3 text-right font-medium">{targets.sales.honneContractPeople}人</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">AI研修</td>
                <td className="py-3 text-right font-medium">{formatManYen(targets.sales.training)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">KAETAI</td>
                <td className="py-3 text-right font-medium">{formatManYen(targets.sales.kaetai)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">KAETAI契約数</td>
                <td className="py-3 text-right font-medium">{targets.sales.kaetaiContracts}社</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">ストック</td>
                <td className="py-3 text-right font-medium">{formatManYen(targets.sales.stock)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 font-medium">合計</td>
                <td className="py-3 text-right font-bold text-emerald-600">{formatManYen(targets.sales.total)}</td>
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
                <td className="py-3 text-right font-medium">{formatManYen(targets.costs.referral)}</td>
              </tr>
              {isYear2 && (
                <tr className="border-b border-gray-100">
                  <td className="py-3">業務委託（2人×20万×6ヶ月）</td>
                  <td className="py-3 text-right font-medium">{formatManYen((targets.costs as typeof year2Targets.costs).outsource)}</td>
                </tr>
              )}
              <tr className="border-b border-gray-100">
                <td className="py-3">AI/営業/雑費</td>
                <td className="py-3 text-right font-medium">{formatManYen(targets.costs.aiAndOther)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 font-medium">合計</td>
                <td className="py-3 text-right font-bold text-red-600">{formatManYen(targets.costs.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h3 className="text-lg font-bold text-gray-900">利益計算</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">総売上</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{formatManYen(computed.totals.totalRevenue)}</div>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-500">コスト</div>
            <div className="mt-1 text-xl font-bold text-red-600">-{formatManYen(computed.totals.cost)}</div>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="text-sm text-gray-500">営業利益（給与前）</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{formatManYen(computed.totals.profitBeforeSalary)}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <div className="text-sm text-gray-500">内部留保</div>
            <div className="mt-1 text-xl font-bold text-emerald-600">{formatManDecimalYen(computed.totals.internalReserve)}</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          {isYear2
            ? `給与: 4-6月は総利益×20%/人、7月以降固定50万/人 → 給与総額（3人）= ${formatManDecimalYen(computed.totals.salaryTotal3)}`
            : `給与は営業利益の60%（1人20%）= ${formatManYen(computed.totals.salaryTotal3)}、内部留保は40% = ${formatManDecimalYen(computed.totals.internalReserve)}`}
        </p>
      </div>

      <PlanTable
        key={isYear2 ? "year2" : "year1"}
        plan={plan}
        onPlanChange={handlePlanChange}
        calcOptions={calcOptions}
        isYear2={isYear2}
      />

      {isYear2 && (
        <CorporateDetailTable rows={computed.rows} settings={corporateSettings} />
      )}

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
            <div className="text-sm font-medium text-amber-800">借入: {formatManYen(year1Targets.loan)}</div>
            <div className="text-xs text-amber-600">1年目はボーナスなし（内部留保372万 - 借入700万）</div>
          </div>
        )}
        {isYear2 && marchBonus && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="text-sm font-medium text-blue-800">
                10月特別ボーナス：50万 × 3人 = 150万
              </div>
              <div className="mt-1 text-xs text-blue-500">ゾノ・パンク・カナリア 各50万円均等支給</div>
            </div>

            <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
              <button
                onClick={() => setBonusOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <span className="text-sm font-medium text-emerald-800">
                    3月通常ボーナス：個人支給合計 {formatManDecimalYen(marchBonus.personalTotal)}
                  </span>
                  <span className="ml-2 text-xs text-emerald-500">ゾノ25% / パンク14% / カナリア11% / 会社50%</span>
                </div>
                <span className="text-emerald-600">{bonusOpen ? "▲" : "▼"}</span>
              </button>

              {bonusOpen && (
                <div className="border-t border-emerald-200 px-4 pb-4 pt-3">
                  <p className="text-xs font-semibold text-emerald-700">ステップ1：分配原資の確定</p>
                  <table className="mt-2 w-full text-xs text-emerald-700">
                    <tbody>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5">通常ボーナス前の当期内部留保</td>
                        <td className="py-1.5 text-right font-medium">{formatManDecimalYen(marchBonus.reserveBeforeBonus)}</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5">会社に残す50%</td>
                        <td className="py-1.5 text-right font-medium">{formatManDecimalYen(marchBonus.companyKeep)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-semibold">分配原資（残り50%）</td>
                        <td className="py-1.5 text-right font-bold">{formatManDecimalYen(marchBonus.pool)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="mt-3 text-xs font-semibold text-emerald-700">
                    ステップ2：分配原資 {formatManDecimalYen(marchBonus.pool)} の配分
                  </p>
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
                        <td className="py-1.5 text-right font-medium">{formatManDecimalYen(marchBonus.company)}</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5 font-semibold text-emerald-800">ゾノ</td>
                        <td className="py-1.5 text-right font-semibold">25%</td>
                        <td className="py-1.5 text-right font-bold text-emerald-800">{formatManDecimalYen(marchBonus.daihyo)}</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5 font-semibold text-emerald-800">パンク</td>
                        <td className="py-1.5 text-right font-semibold">14%</td>
                        <td className="py-1.5 text-right font-bold text-emerald-800">{formatManDecimalYen(marchBonus.punk)}</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5 font-semibold text-emerald-800">カナリア</td>
                        <td className="py-1.5 text-right font-semibold">11%</td>
                        <td className="py-1.5 text-right font-bold text-emerald-800">{formatManDecimalYen(marchBonus.canary)}</td>
                      </tr>
                      <tr className="bg-emerald-100/60">
                        <td className="py-1.5 font-semibold">個人合計</td>
                        <td className="py-1.5 text-right font-semibold">50%</td>
                        <td className="py-1.5 text-right font-bold">{formatManDecimalYen(marchBonus.personalTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="mt-3 text-xs font-semibold text-emerald-700">ステップ3：会社最終内部留保</p>
                  <table className="mt-2 w-full text-xs text-emerald-700">
                    <tbody>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5">通常ボーナス前の当期内部留保</td>
                        <td className="py-1.5 text-right">{formatManDecimalYen(marchBonus.reserveBeforeBonus)}</td>
                      </tr>
                      <tr className="border-b border-emerald-100">
                        <td className="py-1.5">個人への3月通常ボーナス</td>
                        <td className="py-1.5 text-right">-{formatManDecimalYen(marchBonus.personalTotal)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-semibold">会社最終内部留保</td>
                        <td className="py-1.5 text-right font-bold">{formatManDecimalYen(computed.totals.internalReserve)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isYear2 && year2Targets.annualIncome && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-lg font-bold text-gray-900">個人年収</h3>
          <p className="mt-1 text-xs text-gray-400">
            給与{formatManDecimalYen(computed.totals.salaryPerPerson)} + 10月ボーナス50万 + 3月通常ボーナス
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {(
              [
                { name: "ゾノ（代表）", key: "daihyo" as const, marchBonus: marchBonus!.daihyo },
                { name: "パンク", key: "punk" as const, marchBonus: marchBonus!.punk },
                { name: "カナリア", key: "canary" as const, marchBonus: marchBonus!.canary },
              ] as const
            ).map(({ name, key, marchBonus: mb }) => (
              <div key={key} className="rounded-xl bg-gray-50 p-4">
                <div className="text-sm font-medium text-gray-700">{name}</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {formatManDecimalYen(year2Targets.annualIncome[key])}
                </div>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>給与累計</span>
                    <span>{formatManDecimalYen(computed.totals.salaryPerPerson)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>10月ボーナス</span>
                    <span>50万円</span>
                  </div>
                  <div className="flex justify-between font-medium text-emerald-600">
                    <span>3月通常ボーナス</span>
                    <span>{formatManDecimalYen(mb)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function CompareView({ actuals }: { actuals: ReturnType<typeof calculateActuals> }) {
  const targets = year1Targets

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-bold text-gray-900">1年目 進捗状況</h2>
        <p className="mt-1 text-sm text-gray-500">月次入力のデータがリアルタイムで反映されます</p>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">総売上</span>
              <span className="text-xs text-gray-400">目標: {formatManYen(targets.sales.total)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatManYen(actuals.totalRevenue)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalRevenue} target={targets.sales.total} />
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600">HONNE売上</span>
              <span className="text-xs text-blue-400">目標: {formatManYen(targets.sales.honne)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-700">{formatManYen(actuals.totalHonne)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalHonne} target={targets.sales.honne} color="blue" />
            </div>
          </div>

          <div className="rounded-xl bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">AI研修売上</span>
              <span className="text-xs text-green-400">目標: {formatManYen(targets.sales.training)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-700">{formatManYen(actuals.totalTraining)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalTraining} target={targets.sales.training} color="emerald" />
            </div>
          </div>

          <div className="rounded-xl bg-orange-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-600">KAETAI売上</span>
              <span className="text-xs text-orange-400">目標: {formatManYen(targets.sales.kaetai)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-orange-700">{formatManYen(actuals.totalKaetai)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalKaetai} target={targets.sales.kaetai} color="orange" />
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">ストック売上</span>
              <span className="text-xs text-gray-400">目標: {formatManYen(targets.sales.stock)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatManYen(actuals.totalStock)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalStock} target={targets.sales.stock} />
            </div>
          </div>

          <div className="rounded-xl bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600">総コスト</span>
              <span className="text-xs text-red-400">目標: {formatManYen(targets.costs.total)}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-700">{formatManYen(actuals.totalCosts)}</div>
            <div className="mt-3">
              <ProgressBar current={actuals.totalCosts} target={targets.costs.total} color="orange" />
            </div>
          </div>
        </div>
      </div>

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
            {(
              [
                { label: "HONNE", target: targets.sales.honne, actual: actuals.totalHonne, color: "text-blue-600" },
                { label: "AI研修", target: targets.sales.training, actual: actuals.totalTraining, color: "text-green-600" },
                { label: "KAETAI", target: targets.sales.kaetai, actual: actuals.totalKaetai, color: "text-orange-600" },
                { label: "ストック", target: targets.sales.stock, actual: actuals.totalStock, color: "" },
              ] as const
            ).map(({ label, target, actual, color }) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-3">{label}</td>
                <td className="py-3 text-right">{formatManYen(target)}</td>
                <td className="py-3 text-right font-medium">{formatManYen(actual)}</td>
                <td className={`py-3 text-right font-bold ${color}`}>
                  {target > 0 ? Math.round((actual / target) * 100) : 0}%
                </td>
              </tr>
            ))}
            <tr className="bg-emerald-50">
              <td className="py-3 font-medium">合計</td>
              <td className="py-3 text-right font-medium">{formatManYen(targets.sales.total)}</td>
              <td className="py-3 text-right font-bold">{formatManYen(actuals.totalRevenue)}</td>
              <td className="py-3 text-right font-bold text-emerald-600">
                {targets.sales.total > 0 ? Math.round((actuals.totalRevenue / targets.sales.total) * 100) : 0}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
