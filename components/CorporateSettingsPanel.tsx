"use client"

import React, { useState } from "react"
import {
  CORPORATE_SETTINGS_FIELDS,
  monthKeyToLabel,
  monthToKey,
  type CorporateSettings,
} from "@/lib/corporate"
import { formatNumber, parseNumber } from "@/lib/utils"

type CorporateSettingsPanelProps = {
  settings: CorporateSettings
  onChange: (settings: CorporateSettings) => void
  readOnly?: boolean
}

function MonthInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
}) {
  const [year, month] = value.split("-")
  if (readOnly) {
    return (
      <span className="text-sm text-gray-700">
        {year}年{Number(month)}月
      </span>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={year}
        onChange={(e) => onChange(`${e.target.value}-${month}`)}
        className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
      />
      <span className="text-sm text-gray-500">年</span>
      <input
        type="number"
        min={1}
        max={12}
        value={Number(month)}
        onChange={(e) =>
          onChange(`${year}-${String(Number(e.target.value)).padStart(2, "0")}`)
        }
        className="w-14 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
      />
      <span className="text-sm text-gray-500">月</span>
    </div>
  )
}

function SettingsField({
  field,
  value,
  onChange,
  readOnly = false,
}: {
  field: (typeof CORPORATE_SETTINGS_FIELDS)[number]
  value: CorporateSettings[keyof CorporateSettings]
  onChange: (v: CorporateSettings[keyof CorporateSettings]) => void
  readOnly?: boolean
}) {
  if (field.type === "month") {
    return (
      <MonthInput readOnly={readOnly} value={String(value)} onChange={(v) => onChange(v)} />
    )
  }

  if (field.type === "percent") {
    const display = Math.round(Number(value) * 10000) / 100
    if (readOnly) {
      return <span className="text-sm text-gray-700">{display}%</span>
    }
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          value={display}
          onChange={(e) => onChange(parseNumber(e.target.value) / 100)}
          className="w-24 rounded border border-gray-300 px-2 py-1.5 text-right text-sm focus:border-blue-400 focus:outline-none"
        />
        <span className="text-sm text-gray-500">%</span>
      </div>
    )
  }

  const isYen = field.type === "yen"
  const numValue = Number(value)

  if (readOnly) {
    return (
      <span className="text-sm text-gray-700">
        {formatNumber(numValue)}
        {isYen ? "円" : field.type === "number" ? "人" : ""}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={formatNumber(numValue)}
        onChange={(e) => {
          const parsed = parseNumber(e.target.value.replace(/,/g, ""))
          if (parsed >= 0) onChange(parsed)
        }}
        className="w-32 rounded border border-gray-300 px-2 py-1.5 text-right text-sm focus:border-blue-400 focus:outline-none"
      />
      {isYen && <span className="text-sm text-gray-500">円</span>}
      {field.type === "number" && <span className="text-sm text-gray-500">人</span>}
    </div>
  )
}

export default function CorporateSettingsPanel({
  settings,
  onChange,
  readOnly = false,
}: CorporateSettingsPanelProps) {
  const [open, setOpen] = useState(true)

  const updateField = <K extends keyof CorporateSettings>(
    key: K,
    value: CorporateSettings[K]
  ) => {
    if (readOnly) return
    onChange({ ...settings, [key]: value })
  }

  const officerTotal = settings.officerMonthlySalary * settings.officerCount
  const monthlyResident = Math.round(settings.annualCorporateResidentTax / 12)

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-900">法人化後コスト設定</h3>
          <p className="mt-1 text-sm text-gray-500">
            法人化予定: {monthKeyToLabel(settings.incorporationMonth)} ／ 役員報酬開始:{" "}
            {monthKeyToLabel(settings.officerSalaryStartMonth)} ／ 役員報酬合計:{" "}
            {formatNumber(officerTotal)}円/月
          </p>
        </div>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CORPORATE_SETTINGS_FIELDS.map((field) => (
            <div
              key={field.key}
              className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
            >
              <label className="text-sm font-medium text-gray-800">{field.label}</label>
              <div className="mt-2">
                <SettingsField
                  readOnly={readOnly}
                  field={field}
                  value={settings[field.key]}
                  onChange={(v) => updateField(field.key, v as CorporateSettings[typeof field.key])}
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{field.description}</p>
              {field.key === "annualCorporateResidentTax" && (
                <p className="mt-1 text-xs font-medium text-violet-600">
                  月割: 約{formatNumber(monthlyResident)}円
                </p>
              )}
              {field.key === "officerMonthlySalary" && (
                <p className="mt-1 text-xs font-medium text-indigo-600">
                  合計: {formatNumber(officerTotal)}円/月（{settings.officerCount}人）
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
