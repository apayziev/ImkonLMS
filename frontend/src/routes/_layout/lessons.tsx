import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Play } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { SessionView } from "@/components/Lessons"
import { TeacherWeeklyTimetable } from "@/components/Lessons/TeacherWeeklyTimetable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getCurrentAcademicYearQueryOptions,
  getCurrentQuarterQueryOptions,
  getSessionStatusesQueryOptions,
  getTodayLessonsQueryOptions,
  queryKeys,
} from "@/hooks/useQueryOptions"
import { getEffectiveWeekDate, useWeekNavigation } from "@/hooks/useWeekNavigation"
import { lessonsApi } from "@/lib/api"
import { cn } from "@/lib/utils"

const UZ_MONTHS_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"]

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
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
  scheduleEntries: { id: number; dow: number }[],
  holidays: string[],
): { ds: string; entryId: number }[] {
  const holidaySet = new Set(holidays)
  const endDate = new Date(end + "T00:00:00")
  const result: { ds: string; entryId: number }[] = []
  for (const { id, dow } of scheduleEntries) {
    const jsDow = dow === 7 ? 0 : dow
    const cur = new Date(start + "T00:00:00")
    while (cur <= endDate) {
      if (cur.getDay() === jsDow) {
        const ds = toDateStr(cur)
        if (!holidaySet.has(ds)) result.push({ ds, entryId: id })
        cur.setDate(cur.getDate() + 7)
      } else {
        cur.setDate(cur.getDate() + 1)
      }
    }
  }
  return result.sort((a, b) => a.ds < b.ds ? -1 : a.ds > b.ds ? 1 : 0)
}

export const Route = createFileRoute("/_layout/lessons")({
  component: LessonsPage,
  head: () => ({
    meta: [{ title: "Dars jadvali - IMKON LMS" }],
  }),
  beforeLoad: async ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(getCurrentAcademicYearQueryOptions())
    queryClient.ensureQueryData(getCurrentQuarterQueryOptions())
  },
})

type View =
  | { type: "timetable" }
  | { type: "quarter"; scheduleEntries: { id: number; dow: number }[]; grade: string; subject: string; selectedDate: Date; clickedEntryId: number }
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
          scheduleEntries={view.scheduleEntries}
          grade={view.grade}
          subject={view.subject}
          selectedDate={view.selectedDate}
          clickedEntryId={view.clickedEntryId}
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
        onDaySelect={(date, scheduleEntries, grade, subject, clickedEntryId) => {
          setView({ type: "quarter", scheduleEntries, grade, subject, selectedDate: date, clickedEntryId })
        }}
      />
    </div>
  )
}

function QuarterDatesView({
  scheduleEntries,
  grade,
  subject,
  selectedDate,
  clickedEntryId,
}: {
  scheduleEntries: { id: number; dow: number }[]
  grade: string
  subject: string
  selectedDate: Date
  clickedEntryId: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [selectedCard, setSelectedCard] = useState<{ ds: string; lessonNumber: number; entryId: number } | null>(null)
  const { weekDays } = useWeekNavigation(selectedDate, () => {})

  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const { data: currentQuarter, isLoading: quarterLoading } = useQuery(getCurrentQuarterQueryOptions())

  const isLoading = quarterLoading || !currentYear
  const today = toDateStr(new Date())
  // Use workingDays-aware week range (matches timetable's week display)
  const weekStart = weekDays.length > 0 ? toDateStr(weekDays[0]) : ""
  const weekEnd = weekDays.length > 0 ? toDateStr(weekDays[weekDays.length - 1]) : ""

  const allDates = currentQuarter && scheduleEntries.length > 0
    ? generateLessonDates(
        currentQuarter.start_date,
        currentQuarter.end_date,
        scheduleEntries,
        currentQuarter.holidays,
      )
    : []

  const allIndexed = allDates.map(({ ds, entryId }, i) => ({ ds, entryId, lessonNumber: i + 1 }))

  const entryIds = scheduleEntries.map((e) => e.id)
  const { data: statusesData } = useQuery(
    getSessionStatusesQueryOptions(
      entryIds,
      currentQuarter?.start_date ?? "",
      currentQuarter?.end_date ?? "",
    ),
  )
  // Map: `${entryId}-${ds}` → status
  const sessionStatusMap = new Map<string, string>(
    statusesData?.data.map((s) => [`${s.schedule_entry_id}-${s.session_date}`, s.status]) ?? [],
  )

  const clickedDs = toDateStr(selectedDate)
  useEffect(() => {
    if (allIndexed.length === 0) return
    const match = allIndexed.find((c) => c.ds === clickedDs && c.entryId === clickedEntryId)
    if (match) setSelectedCard(match)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIndexed.length, clickedEntryId, clickedDs])

  const weekGroups = allIndexed.filter(({ ds }) => ds >= weekStart && ds <= weekEnd)
  const visibleGroups = expanded ? allIndexed : weekGroups

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
      <div className="flex items-baseline gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">{grade} · {subject}</h2>
        <span className="text-sm text-muted-foreground">{currentQuarter.number}-chorak · {allDates.length} ta dars</span>
      </div>

      <div className={cn(
        expanded
          ? "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2"
          : "flex gap-2 overflow-x-auto pb-1 -mx-1 px-1",
      )}>
        {visibleGroups.map(({ ds, lessonNumber, entryId }) => {
          const isToday = ds === today
          const isPast = ds < today
          const date = new Date(ds + "T00:00:00")
          const isSelected = selectedCard?.ds === ds && selectedCard?.entryId === entryId
          const sessionStatus = sessionStatusMap.get(`${entryId}-${ds}`)
          const isCompleted = sessionStatus === "completed"
          const isInProgress = sessionStatus === "in_progress"
          return (
            <button
              key={`${ds}-${entryId}`}
              type="button"
              onClick={() => setSelectedCard({ ds, lessonNumber, entryId })}
              className={cn(
                "flex flex-col items-start p-3 rounded-xl border-2 text-left transition-colors",
                expanded ? "w-full" : "shrink-0 w-28",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : isCompleted
                    ? "bg-[#00A27D]/10 border-[#00A27D] hover:border-[#0D735B]"
                    : isInProgress
                      ? "bg-amber-50 border-amber-400 hover:border-amber-500 dark:bg-amber-950/30 dark:border-amber-700"
                      : isToday
                        ? "bg-primary/10 border-primary/40 hover:border-primary"
                        : isPast
                          ? "bg-muted/30 border-border hover:bg-muted/50"
                          : "bg-card border-border hover:bg-accent",
              )}
            >
              <span className={cn(
                "text-sm font-bold",
                !isSelected && isCompleted && "text-[#0D735B]",
                !isSelected && isInProgress && "text-amber-700 dark:text-amber-400",
                !isSelected && !isCompleted && !isInProgress && isPast && !isToday && "text-muted-foreground",
              )}>
                {date.getDate()} {UZ_MONTHS_SHORT[date.getMonth()]}
              </span>
              <span className={cn(
                "text-xs mt-0.5",
                isSelected
                  ? "text-primary-foreground/80"
                  : isCompleted
                    ? "text-[#00A27D]"
                    : isInProgress
                      ? "text-amber-600 dark:text-amber-500"
                      : isToday
                        ? "text-primary"
                        : "text-muted-foreground",
              )}>
                {lessonNumber}-dars
              </span>
            </button>
          )
        })}
      </div>

      {allIndexed.length > weekGroups.length && (
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
              Barcha {allDates.length} ta darsni ko'rish
            </>
          )}
        </button>
      )}

      {selectedCard && (
        <div className="border-t pt-4">
          <div className="flex border-b overflow-x-auto mb-4">
            <button
              type="button"
              className="px-5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 border-primary text-primary"
            >
              Darsdagi faollik
            </button>
          </div>
          <DayAttendanceView
            key={`${selectedCard.ds}-${selectedCard.entryId}`}
            dateStr={selectedCard.ds}
            entryId={selectedCard.entryId}
          />
        </div>
      )}
    </div>
  )
}

function DayAttendanceView({
  dateStr,
  entryId,
}: {
  dateStr: string
  entryId: number
}) {
  const queryClient = useQueryClient()
  const [activeSessionId, setActiveSessionId] = useState<number>(0)

  const { data: lessonsData, isLoading: lessonsLoading } = useQuery(getTodayLessonsQueryOptions(dateStr))

  const matchedLesson = lessonsData?.data.find((l) => l.schedule_entry_id === entryId)
  const sessionId = activeSessionId || (matchedLesson?.session_id ?? 0)

  const startMutation = useMutation({
    mutationFn: () => lessonsApi.startSession(entryId, dateStr),
    onSuccess: (response) => {
      toast.success("Dars boshlandi")
      queryClient.invalidateQueries({ queryKey: queryKeys.lessonsForDate(dateStr) })
      setActiveSessionId(response.data.id)
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? "Darsni boshlashda xatolik")
    },
  })

  if (lessonsLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="py-6 flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">Dars hali boshlanmagan</p>
        <Button
          size="sm"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
        >
          {startMutation.isPending
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Play className="mr-2 h-4 w-4" />}
          Darsni boshlash
        </Button>
      </div>
    )
  }

  return <SessionView sessionId={sessionId} onBack={() => {}} hideBack />
}
