"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, Copy } from "lucide-react"
import { formatNumber, parseNumber } from "@/lib/utils"
import {
  copyRecurringFromPreviousMonth,
  costDetailsToYen,
  createEmptyCostDetail,
  finalizeCostDetails,
  formatCostDetailBreakdown,
  mergeCostCategories,
  propagateRecurringToNextMonth,
  updateCostItemNames,
  updateCostItemTemplates,
  type CostDetail,
  type CostDetailMonth,
  type CostItemTemplate,
} from "@/lib/cost-details"

type CostDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  monthLabel: string
  monthIndex: number
  rows: CostDetailMonth[]
  onSave: (
    rows: CostDetailMonth[],
    templates: CostItemTemplate[],
    categories: string[],
    names: string[]
  ) => void
  costItemTemplates: CostItemTemplate[]
  costCategories: string[]
  costItemNames: string[]
}

function ManAmountInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [draft, setDraft] = useState("")

  useEffect(() => {
    setDraft(value === 0 ? "" : formatNumber(value))
  }, [value])

  const commit = () => {
    onChange(parseNumber(draft))
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="text"
        value={draft}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, "")
          if (raw === "" || /^\d+$/.test(raw)) {
            setDraft(raw === "" ? "" : formatNumber(parseNumber(raw)))
          }
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
        }}
        className="h-8 w-20 text-right text-sm"
      />
      <span className="text-xs text-gray-400">万</span>
    </div>
  )
}

function CategoryInput({
  value,
  onChange,
  categories,
}: {
  value: string
  onChange: (v: string) => void
  categories: string[]
}) {
  const listId = React.useId()
  return (
    <>
      <Input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-[100px] text-sm"
        placeholder="区分"
      />
      <datalist id={listId}>
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  )
}

function NameInput({
  value,
  onChange,
  suggestions,
  nameCandidates,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: CostItemTemplate[]
  nameCandidates: string[]
}) {
  const listId = React.useId()
  const uniqueNames = useMemo(() => {
    const seen = new Set<string>()
    const merged = [...nameCandidates]
    for (const t of suggestions) {
      if (t.name) merged.push(t.name)
    }
    return merged.filter((name) => {
      if (!name || seen.has(name)) return false
      seen.add(name)
      return true
    })
  }, [suggestions, nameCandidates])

  return (
    <>
      <Input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-[120px] text-sm"
        placeholder="名前"
      />
      <datalist id={listId}>
        {uniqueNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  )
}

export default function CostDetailDialog({
  open,
  onOpenChange,
  monthLabel,
  monthIndex,
  rows,
  onSave,
  costItemTemplates,
  costCategories,
  costItemNames,
}: CostDetailDialogProps) {
  const [details, setDetails] = useState<CostDetail[]>([])
  const [confirmCopyOpen, setConfirmCopyOpen] = useState(false)

  useEffect(() => {
    if (open) {
      const month = rows[monthIndex]
      const existing = month?.costDetails ?? []
      setDetails(existing.length > 0 ? existing.map((d) => ({ ...d })) : [createEmptyCostDetail()])
    }
  }, [open, monthIndex, rows])

  const totalMan = useMemo(() => details.reduce((s, d) => s + d.amount, 0), [details])

  const updateDetail = useCallback((index: number, patch: Partial<CostDetail>) => {
    setDetails((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }, [])

  const removeDetail = useCallback((index: number) => {
    setDetails((prev) => {
      if (prev.length <= 1) return [createEmptyCostDetail()]
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const addDetail = useCallback(() => {
    setDetails((prev) => [...prev, createEmptyCostDetail()])
  }, [])

  const applyTemplate = useCallback(
    (index: number, template: CostItemTemplate) => {
      updateDetail(index, {
        category: template.category,
        name: template.name,
        amount: template.defaultAmount,
        isRecurring: template.isRecurring,
      })
    },
    [updateDetail]
  )

  const handleCopyFromPrevious = () => {
    const currentDetails = rows[monthIndex]?.costDetails ?? []
    if (currentDetails.length > 0) {
      setConfirmCopyOpen(true)
      return
    }
    executeCopyFromPrevious()
  }

  const executeCopyFromPrevious = () => {
    const copied = copyRecurringFromPreviousMonth(rows, monthIndex)
    const newDetails = copied[monthIndex]?.costDetails ?? []
    setDetails(newDetails.length > 0 ? newDetails.map((d) => ({ ...d })) : [createEmptyCostDetail()])
    setConfirmCopyOpen(false)
  }

  const handleSave = () => {
    const finalized = finalizeCostDetails(
      details.filter((d) => d.name.trim() || d.amount > 0 || d.category !== "その他")
    )
    const normalizedDetails = finalized.length > 0 ? finalized : []
    const cost = costDetailsToYen(normalizedDetails)

    let newRows = rows.map((m, i) =>
      i === monthIndex ? { ...m, costDetails: normalizedDetails, cost } : { ...m }
    )
    newRows = propagateRecurringToNextMonth(newRows, monthIndex)

    const newTemplates = updateCostItemTemplates(costItemTemplates, normalizedDetails)
    const newCategories = mergeCostCategories(costCategories, normalizedDetails)
    const newNames = updateCostItemNames(costItemNames, normalizedDetails)
    onSave(newRows, newTemplates, newCategories, newNames)
    onOpenChange(false)
  }

  const breakdown = formatCostDetailBreakdown(details)
  const canCopyFromPrevious = monthIndex > 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{monthLabel} — 費用詳細</DialogTitle>
            {breakdown && (
              <p className="whitespace-pre-line text-xs text-gray-500">{breakdown}</p>
            )}
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2 pr-2 font-medium">区分</th>
                  <th className="pb-2 pr-2 font-medium">名前</th>
                  <th className="pb-2 pr-2 text-right font-medium">金額</th>
                  <th className="pb-2 pr-2 text-center font-medium">継続</th>
                  <th className="pb-2 pr-2 font-medium">メモ</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {details.map((detail, index) => (
                  <tr key={detail.id} className="border-b border-gray-50">
                    <td className="py-2 pr-2">
                      <CategoryInput
                        value={detail.category}
                        onChange={(v) => updateDetail(index, { category: v })}
                        categories={costCategories}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <NameInput
                        value={detail.name}
                        onChange={(v) => updateDetail(index, { name: v })}
                        suggestions={costItemTemplates}
                        nameCandidates={costItemNames}
                      />
                      {costItemTemplates.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {costItemTemplates
                            .filter((t) => t.name)
                            .slice(0, 4)
                            .map((t) => (
                              <button
                                key={`${t.category}-${t.name}`}
                                type="button"
                                onClick={() => applyTemplate(index, t)}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200"
                              >
                                {t.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <ManAmountInput
                        value={detail.amount}
                        onChange={(v) => updateDetail(index, { amount: v })}
                      />
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Switch
                          checked={detail.isRecurring}
                          onCheckedChange={(checked) =>
                            updateDetail(index, { isRecurring: checked })
                          }
                        />
                        <span className="text-xs text-gray-500">
                          {detail.isRecurring ? "ON" : "OFF"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={detail.memo ?? ""}
                        onChange={(e) => updateDetail(index, { memo: e.target.value })}
                        className="h-8 text-sm"
                        placeholder="メモ"
                      />
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => removeDetail(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-3 text-right font-medium text-gray-700">
                    合計
                  </td>
                  <td className="pt-3 text-right font-bold text-red-600">
                    {formatNumber(totalMan)}万円
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addDetail}>
                <Plus className="mr-1 h-4 w-4" />
                追加
              </Button>
              {canCopyFromPrevious && (
                <Button type="button" variant="outline" size="sm" onClick={handleCopyFromPrevious}>
                  <Copy className="mr-1 h-4 w-4" />
                  前月からコピー
                </Button>
              )}
            </div>
            <Button type="button" onClick={handleSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCopyOpen} onOpenChange={setConfirmCopyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>前月の継続費用を追加しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この月には既に費用詳細が入力されています。前月の継続費用（isRecurring=ON）を追加します。既存の項目は上書きされません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={executeCopyFromPrevious}>追加する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
