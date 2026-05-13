import { useQuery } from "@tanstack/react-query"
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { toDateString, todayStr } from "@/components/Lessons/formatters"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getTeacherDetailQueryOptions } from "@/hooks/useQueryOptions"
import {
  getEffectiveWeekDate,
  useWeekNavigation,
} from "@/hooks/useWeekNavigation"
import type { TeacherSessionDetail } from "@/lib/api"
import { UZ_MONTHS, UZ_WEEKDAYS_FULL } from "@/lib/locale"

import { SessionTableRow } from "./SessionTableRow"

export function TeacherDetailView({
  teacherId,
  startDate,
  endDate,
}: {
  teacherId: number
  startDate: string
  endDate: string
}) {
  const { data: detail, isLoading } = useQuery(
    getTeacherDetailQueryOptions(teacherId, startDate, endDate),
  )

  // Reuse same week navigation as Dars rejasi page
  const [selectedDate, setSelectedDate] = useState<Date>(getEffectiveWeekDate)
  const { weekDays, prevWeek, nextWeek } = useWeekNavigation(
    selectedDate,
    setSelectedDate,
  )

  const weekStart = weekDays.length > 0 ? toDateString(weekDays[0]) : ""
  const weekEnd =
    weekDays.length > 0 ? toDateString(weekDays[weekDays.length - 1]) : ""

  const weekSessions = useMemo(() => {
    if (!detail?.sessions.length || !weekStart) return []
    return detail.sessions.filter(
      (s) => s.session_date >= weekStart && s.session_date <= weekEnd,
    )
  }, [detail, weekStart, weekEnd])

  const canPrev = !!detail?.sessions.some((s) => s.session_date < weekStart)
  const canNext = !!detail?.sessions.some((s) => s.session_date > weekEnd)

  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return ""
    const first = weekDays[0]
    const last = weekDays[weekDays.length - 1]
    return first.getMonth() === last.getMonth()
      ? `${first.getDate()} – ${last.getDate()} ${UZ_MONTHS[first.getMonth()]}`
      : `${first.getDate()} ${UZ_MONTHS[first.getMonth()]} – ${last.getDate()} ${UZ_MONTHS[last.getMonth()]}`
  }, [weekDays])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!detail || detail.sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BookOpen className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-lg">Bu davrda darslar topilmadi</p>
      </div>
    )
  }

  // Group filtered sessions by date
  const grouped = new Map<string, TeacherSessionDetail[]>()
  for (const s of weekSessions) {
    const arr = grouped.get(s.session_date) ?? []
    arr.push(s)
    grouped.set(s.session_date, arr)
  }

  const todayDateStr = todayStr()

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevWeek}
          disabled={!canPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {weekLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextWeek}
          disabled={!canNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {weekSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">Bu haftada darslar topilmadi</p>
        </div>
      ) : (
        <Card className="rounded-xl overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground">
                    Sana
                  </th>
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground">
                    Sinf
                  </th>
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground">
                    Fan
                  </th>
                  <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">
                    Soat
                  </th>
                  <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">
                    Jadval vaqti
                  </th>
                  <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">
                    Haqiqiy vaqt
                  </th>
                  <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">
                    Dars davomiyligi
                  </th>
                  <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">
                    Dars rejasi
                  </th>
                  <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">
                    Dars holati
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...grouped.entries()].map(([dateStr, sessions]) => {
                  const d = new Date(`${dateStr}T00:00:00`)
                  const isToday = dateStr === todayDateStr
                  const dayName = UZ_WEEKDAYS_FULL[d.getDay()]
                  const sorted = sessions.sort(
                    (a, b) => a.period_number - b.period_number,
                  )
                  const midIdx = Math.floor((sorted.length - 1) / 2)

                  return sorted.map((s, idx) => (
                    <SessionTableRow
                      key={`${dateStr}-${s.period_number}-${s.grade_display}`}
                      session={s}
                      dateLabel={
                        idx === midIdx ? `${dayName}, ${d.getDate()}` : ""
                      }
                      isToday={isToday}
                      isLastInGroup={idx === sorted.length - 1}
                    />
                  ))
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
