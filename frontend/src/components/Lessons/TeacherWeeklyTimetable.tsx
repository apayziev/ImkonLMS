import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { buildGrid } from "@/components/timetable/helpers"

const DAY_FULL: Record<number, string> = {
  1: "Dushanba",
  2: "Seshanba",
  3: "Chorshanba",
  4: "Payshanba",
  5: "Juma",
  6: "Shanba",
  7: "Yakshanba",
}
import useAuth from "@/hooks/useAuth"
import {
  getCurrentAcademicYearQueryOptions,
  getCurrentQuarterQueryOptions,
  getScheduleQueryOptions,
  getTimeSlotsQueryOptions,
  getTodayLessonsQueryOptions,
} from "@/hooks/useQueryOptions"
import { getEffectiveWeekDate, useWeekNavigation } from "@/hooks/useWeekNavigation"

import { toDateString, todayStr } from "./formatters"

/** "day_of_week" (1=Dush…7=Yak) mos keladigan kunlar sonini hisoblaydi, dam kunlari ayiriladi */
function countDayInRange(dayOfWeek: number, start: string, end: string, holidays: string[] = []): number {
  const jsDow = dayOfWeek === 7 ? 0 : dayOfWeek
  const startDate = new Date(start + "T00:00:00")
  const endDate = new Date(end + "T00:00:00")
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1
  const offset = (jsDow - startDate.getDay() + 7) % 7
  if (offset >= totalDays) return 0
  const count = Math.floor((totalDays - offset - 1) / 7) + 1
  const holidaysOnDay = holidays.filter((h) => {
    const d = new Date(h + "T00:00:00")
    return d.getDay() === jsDow && d >= startDate && d <= endDate
  }).length
  return Math.max(0, count - holidaysOnDay)
}

export function TeacherWeeklyTimetable({
  selectedDate,
  onSessionOpen,
  onDaySelect,
}: {
  selectedDate: Date
  onSessionOpen: (sessionId: number) => void
  onDaySelect: (date: Date, scheduleEntries: { id: number; dow: number }[], grade: string, subject: string) => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [loadingCell, setLoadingCell] = useState<number | null>(null)

  const { weekDays, workingDays } = useWeekNavigation(selectedDate, () => {})
  const today = todayStr()

  // Compare week by Monday — effective week (next Mon if today is Sat/Sun) is also active
  const getMonday = (d: Date): string => {
    const copy = new Date(d)
    copy.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return toDateString(copy)
  }
  const isCurrentWeek = getMonday(selectedDate) === getMonday(getEffectiveWeekDate())

  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const academicYearId = currentYear?.id ?? 0

  const { data: currentQuarter } = useQuery(getCurrentQuarterQueryOptions())

  const { data: timeSlotsData } = useQuery(getTimeSlotsQueryOptions(academicYearId))
  const { data: scheduleData, isLoading } = useQuery(
    getScheduleQueryOptions({ academic_year_id: academicYearId, teacher_id: user?.id }),
  )

  const timeSlots = timeSlotsData?.data ?? []
  const entries = scheduleData?.data ?? []
  const { sorted, cellMap } = buildGrid(timeSlots, entries, workingDays)

  // Only show columns that have at least one lesson entry for this teacher
  const activeDays = workingDays.filter((day) =>
    sorted.some((slot) => cellMap.has(`${day}-${slot.id}`)),
  )

  // Only show rows that have at least one entry
  const activeSlots = sorted.filter((slot) =>
    activeDays.some((day) => cellMap.has(`${day}-${slot.id}`)),
  )

  const dateForDay = (dayOfWeek: number): Date | undefined =>
    weekDays[workingDays.indexOf(dayOfWeek)]

  const dateStrForDay = (dayOfWeek: number): string => {
    const d = dateForDay(dayOfWeek)
    return d ? toDateString(d) : ""
  }

  const handleCellClick = async (scheduleEntryId: number, dayOfWeek: number) => {
    const date = dateForDay(dayOfWeek)
    if (!date) return
    const dateStr = toDateString(date)

    setLoadingCell(scheduleEntryId)
    try {
      const lessons = await queryClient.fetchQuery(getTodayLessonsQueryOptions(dateStr))
      const lesson = lessons.data.find((l) => l.schedule_entry_id === scheduleEntryId)
      if (lesson?.session_id) {
        onSessionOpen(lesson.session_id)
      } else {
        const clickedEntry = entries.find((e) => e.id === scheduleEntryId)
        const matchingEntries = clickedEntry
          ? entries
              .filter(
                (e) =>
                  e.grade_display === clickedEntry.grade_display &&
                  e.subject_name === clickedEntry.subject_name,
              )
              .map((e) => ({ id: e.id, dow: e.day_of_week }))
          : [{ id: scheduleEntryId, dow: dayOfWeek }]
        onDaySelect(date, matchingEntries, clickedEntry?.grade_display ?? "", clickedEntry?.subject_name ?? "")
      }
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik")
    } finally {
      setLoadingCell(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Grid */}
      {isLoading ? (
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/50 h-14 border-b" />
          {Array.from({ length: 5 }).map((_, r) => (
            <div key={r} className="flex gap-2 px-3 py-2 border-b last:border-0">
              <Skeleton className="h-16 w-24 shrink-0" />
              {Array.from({ length: activeDays.length || 5 }).map((_, d) => (
                <Skeleton key={d} className="h-16 flex-1 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : sorted.length === 0 || activeDays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CalendarDays className="h-16 w-16 mb-4 opacity-40" />
          <p className="text-lg">Jadval hali kiritilmagan</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed" style={{ minWidth: `${activeDays.length * 120 + 110}px` }}>
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="h-14 px-3 text-center w-[110px] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Vaqt
                  </th>
                  {activeDays.map((day) => {
                    const dateStr = dateStrForDay(day)
                    const isToday = dateStr === today
                    const date = dateForDay(day)
                    return (
                      <th
                        key={day}
                        className="h-14 px-2 text-center"
                      >
                        <div className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          {DAY_FULL[day]}
                        </div>
                        {date && (
                          <div className="flex items-center justify-center mt-0.5">
                            <span className={`text-lg font-bold leading-tight ${isToday ? "text-primary" : "text-foreground"}`}>
                              {date.getDate()}
                            </span>
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {activeSlots.map((slot) => (
                  <tr key={slot.id} className="border-b last:border-0">
                    {/* Time column */}
                    <td className="px-3 py-2 align-middle border-r bg-muted/20 text-center">
                      <div className="text-xs font-bold text-primary">
                        {slot.period_number}-soat
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {slot.start_time}–{slot.end_time}
                      </div>
                    </td>

                    {/* Day cells */}
                    {activeDays.map((day) => {
                      const entry = cellMap.get(`${day}-${slot.id}`)
                      const dateStr = dateStrForDay(day)
                      const isPast = dateStr < today
                      const isClickable = isCurrentWeek
                      const isThisLoading = entry !== undefined && loadingCell === entry.id

                      return (
                        <td
                          key={day}
                          className="px-1.5 py-1.5 align-top border-r last:border-r-0"
                        >
                          {entry ? (
                            <button
                              type="button"
                              onClick={() => isClickable && !isThisLoading && handleCellClick(entry.id, day)}
                              disabled={!isClickable || isThisLoading}
                              className={`w-full min-h-[96px] rounded-lg px-2.5 py-3 text-left flex flex-col justify-center relative overflow-hidden transition-all
                                bg-primary/10 border border-primary/20
                                ${isClickable ? "hover:shadow-md hover:-translate-y-px hover:bg-primary/15 active:translate-y-0 cursor-pointer" : "cursor-default opacity-50"}
                                ${isClickable && isPast ? "opacity-50" : ""}
                                ${isThisLoading ? "opacity-60 cursor-wait" : ""}
                              `}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-primary" />
                              {isThisLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                              ) : (
                                <>
                                  <div className="flex items-baseline justify-between gap-1">
                                    <p className="text-sm font-bold truncate">{entry.grade_display}</p>
                                    {entry.room && (
                                      <p className="text-[11px] text-muted-foreground shrink-0">#{entry.room}</p>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{entry.subject_name}</p>
                                  {currentQuarter && (() => {
                                    const total = entries
                                      .filter(e => e.grade_display === entry.grade_display && e.subject_name === entry.subject_name)
                                      .reduce((sum, e) => sum + countDayInRange(e.day_of_week, currentQuarter.start_date, currentQuarter.end_date, currentQuarter.holidays), 0)
                                    return (
                                      <p className="text-[10px] text-muted-foreground mt-1.5">
                                        {currentQuarter.number}-chorak · {total} ta dars
                                      </p>
                                    )
                                  })()}
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="min-h-[96px] flex items-center justify-center">
                              <span className="text-[11px] text-muted-foreground/50">Dars yo'q</span>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
