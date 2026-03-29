import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { LessonsList, SessionView } from "@/components/Lessons"
import { TeacherWeeklyTimetable } from "@/components/Lessons/TeacherWeeklyTimetable"
import { getEffectiveWeekDate, useWeekNavigation } from "@/hooks/useWeekNavigation"

const UZ_MONTHS_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"]

function formatWeekRange(days: Date[]): string {
  if (days.length === 0) return ""
  const first = days[0]
  const last = days[days.length - 1]
  const firstMon = UZ_MONTHS_SHORT[first.getMonth()]
  const lastMon = UZ_MONTHS_SHORT[last.getMonth()]
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} ${firstMon}`
  }
  return `${first.getDate()} ${firstMon} – ${last.getDate()} ${lastMon}`
}

export const Route = createFileRoute("/_layout/lessons")({
  component: LessonsPage,
  head: () => ({
    meta: [{ title: "Dars jadvali - IMKON LMS" }],
  }),
})

type View =
  | { type: "timetable" }
  | { type: "day"; date: Date }
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
          onClick={() => setView({ type: "timetable" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Jadvalga qaytish
        </Button>
        <LessonsList
          selectedDate={view.date}
          onDateChange={(date) => setView({ type: "day", date })}
          onSessionOpen={(sessionId) => setView({ type: "session", sessionId })}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dars jadvali</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[130px] text-center">
            {formatWeekRange(weekDays)}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <TeacherWeeklyTimetable
        selectedDate={selectedDate}
        onSessionOpen={(sessionId) => setView({ type: "session", sessionId })}
        onDaySelect={(date) => setView({ type: "day", date })}
      />
    </div>
  )
}
