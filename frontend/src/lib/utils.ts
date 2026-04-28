import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { UZ_MONTHS_LOWER, UZ_MONTHS_SHORT } from "@/lib/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function toDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null
  // YYYY-MM-DD: parse as local date — `new Date("2026-04-28")` is UTC midnight
  // per ECMA-262, which displays as the previous day in zones west of UTC.
  const d =
    typeof date === "string"
      ? /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date)
      : date
  return Number.isNaN(d.getTime()) ? null : d
}

/** "05.06.2026" — numeric, used in tables. */
export function formatDate(date: string | Date | null | undefined): string {
  const d = toDate(date)
  if (!d) return "—"
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${day}.${month}.${d.getFullYear()}`
}

/** "5-iyun 2026" — long Uzbek form, used in date pickers. */
export function formatDateUz(date: string | Date | null | undefined): string {
  const d = toDate(date)
  if (!d) return "—"
  return `${d.getDate()}-${UZ_MONTHS_LOWER[d.getMonth()]} ${d.getFullYear()}`
}

/** "5-iyn" — short Uzbek form, used where year is implicit. */
export function formatDateShortUz(date: string | Date | null | undefined): string {
  const d = toDate(date)
  if (!d) return "—"
  return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()].toLowerCase()}`
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}
