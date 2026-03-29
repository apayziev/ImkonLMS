import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { getSchoolSettingsQueryOptions } from "@/hooks/useQueryOptions"

export function getEffectiveWeekDate(): Date {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 6=Sat
  if (day === 0) today.setDate(today.getDate() + 1) // Sun → Mon
  else if (day === 6) today.setDate(today.getDate() + 2) // Sat → Mon
  return today
}

function getWeekDays(baseDate: Date, workingDays: number[]): Date[] {
  const day = baseDate.getDay() // 0=Sun
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((day + 6) % 7))
  return workingDays.map((wd) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + (wd === 7 ? 6 : wd - 1))
    return d
  })
}

export function useWeekNavigation(
  selectedDate: Date,
  onDateChange: (d: Date) => void,
) {
  const { data: settings } = useQuery(getSchoolSettingsQueryOptions())
  const workingDays = settings?.working_days ?? [1, 2, 3, 4, 5, 6]
  const weekDays = useMemo(
    () => getWeekDays(selectedDate, workingDays),
    [selectedDate, workingDays],
  )

  const prevWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 7)
    onDateChange(d)
  }

  const nextWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 7)
    onDateChange(d)
  }

  return { weekDays, workingDays, prevWeek, nextWeek }
}
