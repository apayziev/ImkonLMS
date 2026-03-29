import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { LessonsList, SessionView } from "@/components/Lessons"
import { TeacherWeeklyTimetable } from "@/components/Lessons/TeacherWeeklyTimetable"

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
      <h1 className="text-2xl font-bold tracking-tight">Dars jadvali</h1>
      <TeacherWeeklyTimetable
        onSessionOpen={(sessionId) => setView({ type: "session", sessionId })}
        onDaySelect={(date) => setView({ type: "day", date })}
      />
    </div>
  )
}
