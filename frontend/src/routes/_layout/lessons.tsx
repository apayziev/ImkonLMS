import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

import { LessonsList, SessionView } from "@/components/Lessons"
import { TeacherWeeklyTimetable } from "@/components/Lessons/TeacherWeeklyTimetable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import useAuth from "@/hooks/useAuth"
import {
  getCurrentAcademicYearQueryOptions,
  getCurrentQuarterQueryOptions,
  getScheduleQueryOptions,
} from "@/hooks/useQueryOptions"
import { getEffectiveWeekDate, useWeekNavigation } from "@/hooks/useWeekNavigation"
import { cn } from "@/lib/utils"

const UZ_MONTHS_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"]

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0]
}

function getWeekStart(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day))
  return copy
}

function getWeekEnd(d: Date): Date {
  const start = getWeekStart(d)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end
}

function formatWeekRange(days: Date[]): string {
  if (days.length === 0) return ""
  const first = days[0]
  const last = days[days.length - 1]
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} ${UZ_MONTHS_SHORT[first.getMonth()]}`
  }
  return `${first.getDate()} ${UZ_MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${UZ_MONTHS_SHORT[last.getMonth()]}`
}

function generateLessonDates(
  start: string,
  end: string,
  daysOfWeek: number[],
  holidays: string[],
): string[] {
  const result: string[] = []
  const holidaySet = new Set(holidays)
  const cur = new Date(start + "T00:00:00")
  const endDate = new Date(end + "T00:00:00")
  const dowSet = new Set(daysOfWeek)
  while (cur <= endDate) {
    const jsDow = cur.getDay()
    const dbDow = jsDow === 0 ? 7 : jsDow
    const ds = toDateStr(cur)
    if (dowSet.has(dbDow) && !holidaySet.has(ds)) result.push(ds)
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

export const Route = createFileRoute("/_layout/lessons")({
  component: LessonsPage,
  head: () => ({
    meta: [{ title: "Dars jadvali - IMKON LMS" }],
  }),
})

type View =
  | { type: "timetable" }
  | { type: "quarter"; daysOfWeek: number[] }
  | { type: "day"; date: Date; daysOfWeek: number[] }
  | { type: "session"; sessionId: number }

function LessonsPage() {
  const [view, setView] = useState<View>({ type: "timetable" })
  const [selectedDate, setSelectedDate] = useState<Date>(getEffectiveWeekDate)
  const { weekDays, prevWeek, nextWeek } = useWeekNavigation(selectedDate, setSelectedDate)

  if (view.type === "session") {
    return (
      <SessionView
        sessionId={view.sessionId}
        onBack={() => setView({ type: "timetable" })}
      />
    )
  }

  if (view.type === "day") {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setView({ type: "quarter", daysOfWeek: view.daysOfWeek })}
        >
          <ArrowLeft className="h-4 w-4" />
          Chorak jadvaliga qaytish
        </Button>
        <LessonsList
          selectedDate={view.date}
          onDateChange={(date) => setView({ type: "day", date, daysOfWeek: view.daysOfWeek })}
          onSessionOpen={(sessionId) => setView({ type: "session", sessionId })}
        />
      </div>
    )
  }

  if (view.type === "quarter") {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setView({ type: "timetable" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Jadvalga qaytish
        </Button>
        <QuarterDatesView
          daysOfWeek={view.daysOfWeek}
          onDaySelect={(date) => setView({ type: "day", date, daysOfWeek: view.daysOfWeek })}
        />
      </div>
    )
  }

  // Default: timetable
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dars jadvali</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek} className="h-8 w-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
          <span className="text-sm font-semibold min-w-[130px] text-center">
            {formatWeekRange(weekDays)}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek} className="h-8 w-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Button>
        </div>
      </div>
      <TeacherWeeklyTimetable
        selectedDate={selectedDate}
        onSessionOpen={(sessionId) => setView({ type: "session", sessionId })}
        onDaySelect={(date, daysOfWeek) => {
          void date
          setView({ type: "quarter", daysOfWeek })
        }}
      />
    </div>
  )
}

function QuarterDatesView({
  daysOfWeek,
  onDaySelect,
}: {
  daysOfWeek: number[]
  onDaySelect: (date: Date) => void
}) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)

  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const { data: currentQuarter, isLoading: quarterLoading } = useQuery(getCurrentQuarterQueryOptions())
  const { data: scheduleData, isLoading: scheduleLoading } = useQuery(
    getScheduleQueryOptions({
      academic_year_id: currentYear?.id ?? 0,
      teacher_id: user?.id,
    }),
  )

  const isLoading = quarterLoading || scheduleLoading || !currentYear
  const today = toDateStr(new Date())
  const weekStart = toDateStr(getWeekStart(new Date()))
  const weekEnd = toDateStr(getWeekEnd(new Date()))

  const entries = scheduleData?.data ?? []

  const allDates = currentQuarter && daysOfWeek.length > 0
    ? generateLessonDates(
        currentQuarter.start_date,
        currentQuarter.end_date,
        daysOfWeek,
        currentQuarter.holidays,
      )
    : []

  const weekDates = allDates.filter((ds) => ds >= weekStart && ds <= weekEnd)
  const visibleDates = expanded ? allDates : weekDates

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!currentQuarter) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <p>Hozir aktiv chorak mavjud emas</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {currentQuarter.number}-chorak dars kunlari
        </h2>
        <p className="text-sm text-muted-foreground">{allDates.length} ta dars kuni</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {visibleDates.map((ds) => {
          const lessonNumber = allDates.indexOf(ds) + 1
          const isToday = ds === today
          const isPast = ds < today
          const date = new Date(ds + "T00:00:00")
          return (
            <button
              key={ds}
              type="button"
              onClick={() => onDaySelect(date)}
              className={cn(
                "flex flex-col items-start p-3 rounded-xl border text-left transition-colors",
                isToday
                  ? "bg-primary text-primary-foreground border-primary"
                  : isPast
                    ? "bg-muted/30 border-border hover:bg-muted/50"
                    : "bg-card border-border hover:bg-accent",
              )}
            >
              <span className={cn("text-sm font-bold", isPast && !isToday && "text-muted-foreground")}>
                {date.getDate()} {UZ_MONTHS_SHORT[date.getMonth()]}
              </span>
              <span className={cn(
                "text-xs mt-0.5",
                isToday ? "text-primary-foreground/80" : "text-muted-foreground",
              )}>
                {lessonNumber}-dars
              </span>
            </button>
          )
        })}
      </div>

      {allDates.length > weekDates.length && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Yig'ish
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Barcha {allDates.length} ta dars kunini ko'rish
            </>
          )}
        </button>
      )}
    </div>
  )
}
