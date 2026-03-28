import { createFileRoute } from "@tanstack/react-router"
import { CalendarDays, FileText } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { LessonsList, SessionView, WeeklyPlanView } from "@/components/Lessons"

export const Route = createFileRoute("/_layout/lessons")({
  component: LessonsPage,
  head: () => ({
    meta: [{ title: "Darslarim - IMKON LMS" }],
  }),
})

function LessonsPage() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<"today" | "plan">("today")

  if (activeSessionId) {
    return (
      <SessionView
        sessionId={activeSessionId}
        onBack={() => setActiveSessionId(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Darslarim</h1>
        <div className="flex gap-1 rounded-lg border p-1 bg-muted/30">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === "today"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="h-4 w-4 inline mr-1.5" />
            Darslarim
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

      {activeTab === "today" ? (
        <LessonsList
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onSessionOpen={setActiveSessionId}
        />
      ) : (
        <WeeklyPlanView
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onSessionOpen={setActiveSessionId}
        />
      )}
    </div>
  )
}
