import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import {
  UZ_MONTHS_LOWER,
  UZ_MONTHS_SHORT,
  UZ_WEEKDAYS_FULL,
} from "@/lib/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string/Date into a local-zone Date, or null if invalid.
 *
 * `new Date("2026-04-28")` is UTC midnight per ECMA-262, which displays as
 * the previous day in zones west of UTC. For YYYY-MM-DD inputs we append
 * `T00:00:00` so the result is local midnight.
 */
export function toLocalDate(
  date: string | Date | null | undefined,
): Date | null {
  if (!date) return null
  const d =
    typeof date === "string"
      ? /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00`)
        : new Date(date)
      : date
  return Number.isNaN(d.getTime()) ? null : d
}

/** "05.06.2026" — numeric, used in tables. */
export function formatDate(date: string | Date | null | undefined): string {
  const d = toLocalDate(date)
  if (!d) return "—"
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${day}.${month}.${d.getFullYear()}`
}

/** "5-iyun 2026" — long Uzbek form, used in date pickers. */
export function formatDateUz(date: string | Date | null | undefined): string {
  const d = toLocalDate(date)
  if (!d) return "—"
  return `${d.getDate()}-${UZ_MONTHS_LOWER[d.getMonth()]} ${d.getFullYear()}`
}

/** "5-iyn" — short Uzbek form, used where year is implicit. */
export function formatDateShortUz(
  date: string | Date | null | undefined,
): string {
  const d = toLocalDate(date)
  if (!d) return "—"
  return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()].toLowerCase()}`
}

/** "Dushanba, 5-iyun 2026" — full weekday form, used in parent attendance grouping. */
export function formatDateWithWeekdayUz(
  date: string | Date | null | undefined,
): string {
  const d = toLocalDate(date)
  if (!d) return "—"
  return `${UZ_WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS_LOWER[d.getMonth()]} ${d.getFullYear()}`
}

/** True if `deadline` (YYYY-MM-DD) is strictly before today's local date. */
export function isPastDate(deadline: string | null | undefined): boolean {
  const d = toLocalDate(deadline)
  if (!d) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

/** Sort grades by level ascending, then section alphabetically (1-A, 1-B, 2-A...). */
export function sortGrades<T extends { level: number; section: string }>(
  grades: readonly T[],
): T[] {
  return [...grades].sort((a, b) =>
    a.level !== b.level
      ? a.level - b.level
      : a.section.localeCompare(b.section),
  )
}
