import type { BreakItem, ScheduleEntryRead, TimeSlotRead } from "@/lib/api"
import { UZ_WEEKDAYS_BY_DOW, UZ_WEEKDAYS_SHORT_BY_DOW } from "@/lib/locale"

// ─── Re-exported locale (canonical home: @/lib/locale) ─────────────────────

export const DAY_NAMES = UZ_WEEKDAYS_BY_DOW
export const DAY_SHORT = UZ_WEEKDAYS_SHORT_BY_DOW

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EntryDialogState {
  open: boolean
  mode: "create" | "edit"
  day: number
  slotId: number
  entry?: ScheduleEntryRead
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse "HH:MM" → total minutes */
export function parseHHMM(v: string): number {
  const [h, m] = v.split(":").map(Number)
  return h * 60 + m
}

/** Validate HH:MM string is a real time (00:00–23:59) */
export function isValidTime(v: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(v)) return false
  const [h, m] = v.split(":").map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

/** Auto-format time input: "0812" → "08:12", strips non-digits, max 5 chars */
export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4)
  if (digits.length > 2) return `${digits.slice(0, 2)}:${digits.slice(2)}`
  return digits
}

export function buildGrid(
  timeSlots: TimeSlotRead[],
  entries: ScheduleEntryRead[],
  workingDays: number[],
) {
  const cellMap = new Map<string, ScheduleEntryRead>()
  for (const entry of entries) {
    const key = `${entry.day_of_week}-${entry.time_slot_id}`
    cellMap.set(key, entry)
  }
  const sorted = [...timeSlots].sort(
    (a, b) => a.period_number - b.period_number,
  )
  return { sorted, cellMap, days: workingDays }
}

export function getBreakInfo(
  currentSlot: Pick<TimeSlotRead, "end_time" | "start_time">,
  nextSlot: Pick<TimeSlotRead, "start_time"> | undefined,
  breaks: BreakItem[],
): { minutes: number; name: string } | null {
  if (!nextSlot) return null
  const gapStart = parseHHMM(currentSlot.end_time)
  const gapEnd = parseHHMM(nextSlot.start_time)
  const diff = gapEnd - gapStart
  if (diff <= 0) return null
  const brk = breaks.find((b) => {
    const bs = parseHHMM(b.start_time)
    return bs >= gapStart && bs < gapEnd
  })
  return { minutes: diff, name: brk?.name || "" }
}

/** Find a named break that ends at or before the first slot's start time. */
export function getBreakBefore(
  firstSlot: Pick<TimeSlotRead, "start_time">,
  breaks: BreakItem[],
): { minutes: number; name: string } | null {
  const slotStart = parseHHMM(firstSlot.start_time)
  const brk = breaks.find((b) => parseHHMM(b.end_time) <= slotStart)
  if (!brk) return null
  return {
    minutes: parseHHMM(brk.end_time) - parseHHMM(brk.start_time),
    name: brk.name || "Tanaffus",
  }
}

/** Find a named break that starts at or after the last slot's end time. */
export function getBreakAfter(
  lastSlot: Pick<TimeSlotRead, "end_time">,
  breaks: BreakItem[],
): { minutes: number; name: string } | null {
  const slotEnd = parseHHMM(lastSlot.end_time)
  const brk = breaks.find((b) => parseHHMM(b.start_time) >= slotEnd)
  if (!brk) return null
  return {
    minutes: parseHHMM(brk.end_time) - parseHHMM(brk.start_time),
    name: brk.name || "Tanaffus",
  }
}

