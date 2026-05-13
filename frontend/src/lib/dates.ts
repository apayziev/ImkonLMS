/**
 * Date-arithmetic helpers used by the schedule & lessons pages.
 *
 * Backend has a Python equivalent (`count_weekday_between`) used in lesson
 * statistics. Keeping these helpers client-side avoids a network round-trip
 * for what is pure date math, but the two implementations must follow the
 * same algorithm — both treat `day_of_week` as 1=Dushanba..7=Yakshanba and
 * exclude holidays.
 */

import { toDateString } from "@/lib/utils"

/** schedule day_of_week (1=Mon..7=Sun) → JS Date.getDay() (0=Sun..6=Sat). */
function dowToJsDay(dayOfWeek: number): number {
  return dayOfWeek === 7 ? 0 : dayOfWeek
}

/**
 * Count occurrences of a given weekday between two YYYY-MM-DD dates
 * (inclusive), minus any holidays that land on that same weekday.
 */
export function countDayInRange(
  dayOfWeek: number,
  start: string,
  end: string,
  holidays: string[] = [],
): number {
  const jsDow = dowToJsDay(dayOfWeek)
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const totalDays =
    Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1
  const offset = (jsDow - startDate.getDay() + 7) % 7
  if (offset >= totalDays) return 0
  const count = Math.floor((totalDays - offset - 1) / 7) + 1

  const holidaysOnDay = holidays.filter((h) => {
    const d = new Date(`${h}T00:00:00`)
    return d.getDay() === jsDow && d >= startDate && d <= endDate
  }).length

  return Math.max(0, count - holidaysOnDay)
}

/**
 * Enumerate every actual lesson date within a date range for a set of
 * schedule entries (each with its own weekday). Holidays are skipped.
 * Returns the dates sorted chronologically.
 */
export function generateLessonDates(
  start: string,
  end: string,
  scheduleEntries: { id: number; dow: number }[],
  holidays: string[],
): { ds: string; entryId: number }[] {
  const holidaySet = new Set(holidays)
  const endDate = new Date(`${end}T00:00:00`)
  const result: { ds: string; entryId: number }[] = []

  for (const { id, dow } of scheduleEntries) {
    const jsDow = dowToJsDay(dow)
    const cur = new Date(`${start}T00:00:00`)
    while (cur <= endDate) {
      if (cur.getDay() === jsDow) {
        const ds = toDateString(cur)
        if (!holidaySet.has(ds)) result.push({ ds, entryId: id })
        cur.setDate(cur.getDate() + 7)
      } else {
        cur.setDate(cur.getDate() + 1)
      }
    }
  }
  return result.sort((a, b) => (a.ds < b.ds ? -1 : a.ds > b.ds ? 1 : 0))
}
