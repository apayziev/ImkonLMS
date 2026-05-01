import type { BreakItem, ScheduleEntryRead, TimeSlotRead } from "@/lib/api"

// ─── Constants ──────────────────────────────────────────────────────────────

export const DAY_NAMES: Record<number, string> = {
  1: "Dushanba",
  2: "Seshanba",
  3: "Chorshanba",
  4: "Payshanba",
  5: "Juma",
  6: "Shanba",
  7: "Yakshanba",
}

export const DAY_SHORT: Record<number, string> = {
  1: "Dush",
  2: "Sesh",
  3: "Chor",
  4: "Pay",
  5: "Jum",
  6: "Shan",
  7: "Yak",
}

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

/** Format total minutes → "HH:MM" */
export function fmtHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
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
  timeSlots: readonly TimeSlotRead[],
  entries: readonly ScheduleEntryRead[],
  workingDays: readonly number[],
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

/** Generate preview slots from settings (pure function, same logic as backend). */
export function generatePreviewSlots(
  dayStart: string,
  dayEnd: string,
  lessonDur: number,
  defaultBreak: number,
  breaks: BreakItem[],
): { period_number: number; start_time: string; end_time: string }[] {
  const parsed = breaks
    .map((b) => ({
      start: parseHHMM(b.start_time),
      end: parseHHMM(b.end_time),
      name: b.name,
    }))
    .sort((a, b) => a.start - b.start)

  let cursor = parseHHMM(dayStart)
  const endMin = parseHHMM(dayEnd)

  const result: {
    period_number: number
    start_time: string
    end_time: string
  }[] = []
  let period = 1

  while (cursor + lessonDur <= endMin) {
    const activeBreak = parsed.find((b) => b.start <= cursor && cursor < b.end)
    if (activeBreak) {
      cursor = activeBreak.end
      continue
    }

    let slotEnd = cursor + lessonDur

    let overlaps = false
    for (const b of parsed) {
      if (cursor < b.start && b.start < slotEnd) {
        slotEnd = b.start
        overlaps = true
        break
      }
    }

    if (slotEnd - cursor < 10) {
      cursor = slotEnd
      continue
    }

    result.push({
      period_number: period,
      start_time: fmtHHMM(cursor),
      end_time: fmtHHMM(slotEnd),
    })
    cursor = slotEnd + (overlaps ? 0 : defaultBreak)
    period++
  }

  return result
}
