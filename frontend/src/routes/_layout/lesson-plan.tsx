import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import { WeeklyPlanView } from "@/components/Lessons"

export const Route = createFileRoute("/_layout/lesson-plan")({
  component: LessonPlanPage,
  head: () => ({
    meta: [{ title: "Dars rejasi - IMKON LMS" }],
  }),
})

function LessonPlanPage() {
  const [planDate, setPlanDate] = useState<Date>(new Date())

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dars rejasi</h1>
      <WeeklyPlanView
        selectedDate={planDate}
        onDateChange={setPlanDate}
      />
    </div>
  )
}
