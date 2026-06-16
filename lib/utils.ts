import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatNumber = (value: number | string) => {
  const num = Number(String(value).replace(/,/g, ""))
  if (Number.isNaN(num)) return ""
  return num.toLocaleString("ja-JP")
}

export const parseNumber = (value: string) => {
  const num = Number(value.replace(/,/g, ""))
  return Number.isNaN(num) ? 0 : num
}

/** 円単位の金額をカンマ付き万円表示に変換 */
export function formatManYen(value: number) {
  const man = Math.round(value / 10000)
  return `${formatNumber(man)}万円`
}

/** 円単位の金額を0.1万円単位のカンマ付き万円表示に変換 */
export function formatManDecimalYen(value: number) {
  const man = Math.round(value / 1000) / 10
  const [intPart, decPart] = String(man).split(".")
  return decPart ? `${formatNumber(intPart)}.${decPart}万円` : `${formatNumber(intPart)}万円`
}
