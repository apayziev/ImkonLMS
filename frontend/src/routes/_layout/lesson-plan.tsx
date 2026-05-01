import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"
import { WeeklyPlanView } from "@/components/Lessons"
import type { EditingTarget } from "@/components/Lessons/WeeklyPlanView"
import { toDateString } from "@/lib/utils"

type LessonPlanSearch = {
  date?: string
  planId?: number
  entryId?: number
  entryDate?: string
}

const positiveInt = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
  return Number.isInteger(n) && n > 0 ? n : undefined
}

export const Route = createFileRoute("/_layout/lesson-plan")({
  component: LessonPlanPage,
  head: () => ({
    meta: [{ title: "Dars rejasi - IMKON LMS" }],
  }),
  validateSearch: (search: Record<string, unknown>): LessonPlanSearch => ({
    date: typeof search.date === "string" ? search.date : undefined,
    planId: positiveInt(search.planId),
    entryId: positiveInt(search.entryId),
    entryDate:
      typeof search.entryDate === "string" ? search.entryDate : undefined,
  }),
})

function LessonPlanPage() {
  const search = useSearch({ from: "/_layout/lesson-plan" })
  const navigate = useNavigate()

  const planDate = search.date
    ? new Date(`${search.date}T12:00:00`)
    : new Date()

  const editing: EditingTarget | null =
    search.planId && search.entryId && search.entryDate
      ? {
          type: "existing",
          planId: search.planId,
          scheduleEntryId: search.entryId,
          date: search.entryDate,
        }
      : search.entryId && search.entryDate
        ? {
            type: "new",
            scheduleEntryId: search.entryId,
            date: search.entryDate,
          }
        : null

  return (
    <div className="space-y-6">
      {!editing && (
        <h1 className="text-2xl font-bold tracking-tight">Dars rejasi</h1>
      )}
      <WeeklyPlanView
        selectedDate={planDate}
        onDateChange={(d) =>
          navigate({ to: "/lesson-plan", search: { date: toDateString(d) } })
        }
        editing={editing}
        onEditingChange={(target) => {
          if (!target) {
            navigate({ to: "/lesson-plan", search: { date: search.date } })
          } else if (target.type === "existing") {
            navigate({
              to: "/lesson-plan",
              search: {
                date: search.date,
                planId: target.planId,
                entryId: target.scheduleEntryId,
                entryDate: target.date,
              },
            })
          } else {
            navigate({
              to: "/lesson-plan",
              search: {
                date: search.date,
                entryId: target.scheduleEntryId,
                entryDate: target.date,
              },
            })
          }
        }}
      />
    </div>
  )
}
