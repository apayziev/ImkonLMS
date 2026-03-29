import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, CalendarDays, FileText } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LessonsList, SessionView, WeeklyPlanView } from "@/components/Lessons"
import { TeacherWeeklyTimetable } from "@/components/Lessons/TeacherWeeklyTimetable"

export const Route = createFileRoute("/_layout/lessons")({
  component: LessonsPage,
  head: () => ({
    meta: [{ title: "Darslarim - IMKON LMS" }],
  }),
})

type View =
  | { type: "timetable" }
  | { type: "day"; date: Date }
  | { type: "session"; sessionId: number }

function LessonsPage() {
  const [view, setView] = useState<View>({ type: "timetable" })
  const [planDate, setPlanDate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<"timetable" | "plan">("timetable")

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
        <h1 className="text-2xl font-bold tracking-tight">Darslarim</h1>
        <div className="flex gap-1 rounded-lg border p-1 bg-muted/30">
          <button
            type="button"
            onClick={() => setActiveTab("timetable")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === "timetable"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="h-4 w-4 inline mr-1.5" />
            Jadval
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("plan")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === "plan"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText className="h-4 w-4 inline mr-1.5" />
            Dars rejasi
          </button>
        </div>
      </div>

      {activeTab === "timetable" ? (
        <TeacherWeeklyTimetable
          onSessionOpen={(sessionId) => setView({ type: "session", sessionId })}
          onDaySelect={(date) => setView({ type: "day", date })}
        />
      ) : (
        <WeeklyPlanView
          selectedDate={planDate}
          onDateChange={setPlanDate}
        />
      )}
    </div>
  )
}
