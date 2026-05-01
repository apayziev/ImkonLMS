import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Loader2, Play } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { SessionView } from "@/components/Lessons"
import { AttendanceHistoryView } from "@/components/Lessons/AttendanceHistoryView"
import { toDateString as toDateStr, todayStr } from "@/components/Lessons/formatters"
import { TeacherWeeklyTimetable } from "@/components/Lessons/TeacherWeeklyTimetable"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { getErrorDetail } from "@/lib/apiError"
import { UZ_MONTHS_SHORT, UZ_WEEKDAYS_FULL } from "@/lib/locale"
import { cn } from "@/lib/utils"

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
  const endDate = new Date(`${end}T00:00:00`)
  const result: { ds: string; entryId: number }[] = []
  for (const { id, dow } of scheduleEntries) {
    const jsDow = dow === 7 ? 0 : dow
    const cur = new Date(`${start}T00:00:00`)
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
          <Button variant="outline" size="icon" onClick={prevWeek} className="h-8 w-8" aria-label="Oldingi hafta">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
          <span className="text-sm font-semibold min-w-[130px] text-center">
            {formatWeekRange(weekDays)}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek} className="h-8 w-8" aria-label="Keyingi hafta">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
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
  const [selectedCard, setSelectedCard] = useState<{ ds: string; lessonNumber: number; entryId: number } | null>(null)
  const [activeTab, setActiveTab] = useState<"session" | "attendance">("session")

  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const { data: currentQuarter, isLoading: quarterLoading } = useQuery(getCurrentQuarterQueryOptions())

  const isLoading = quarterLoading || !currentYear
  const today = todayStr()

  const allIndexed = useMemo(
    () => {
      if (!currentQuarter || scheduleEntries.length === 0) return []
      return generateLessonDates(
        currentQuarter.start_date,
        currentQuarter.end_date,
        scheduleEntries,
        currentQuarter.holidays,
      ).map(({ ds, entryId }, i) => ({ ds, entryId, lessonNumber: i + 1 }))
    },
    [currentQuarter, scheduleEntries],
  )

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
  }, [allIndexed, clickedEntryId, clickedDs])

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
        <span className="text-sm text-muted-foreground">{currentQuarter.number}-chorak · {allIndexed.length} ta dars</span>
      </div>

      <LessonDateNavigator
        lessons={allIndexed}
        selected={selectedCard}
        onSelect={setSelectedCard}
        sessionStatusMap={sessionStatusMap}
        today={today}
      />

      {selectedCard && (
        <div className="border-t pt-4">
          <div className="flex border-b overflow-x-auto mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("session")}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors",
                activeTab === "session"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Darsdagi faollik
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("attendance")}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors",
                activeTab === "attendance"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Davomat
            </button>
          </div>
          {activeTab === "session" ? (
            <DayAttendanceView
              key={`${selectedCard.ds}-${selectedCard.entryId}`}
              dateStr={selectedCard.ds}
              entryId={selectedCard.entryId}
            />
          ) : (
            <AttendanceHistoryView
              entryIds={entryIds}
              startDate={currentQuarter?.start_date ?? ""}
              endDate={currentQuarter?.end_date ?? ""}
              dateLessonMap={Object.fromEntries(allIndexed.map(({ ds, lessonNumber }) => [ds, lessonNumber]))}
            />
          )}
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
      queryClient.invalidateQueries({ queryKey: ["session-statuses"] })
      setActiveSessionId(response.data.id)
    },
    onError: (error) => {
      toast.error(getErrorDetail(error, "Darsni boshlashda xatolik"))
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

type LessonCard = { ds: string; lessonNumber: number; entryId: number }

const STATUS_TONE: Record<string, { dot: string; label: string; tint: string }> = {
  completed: {
    dot: "bg-[var(--imkon-teal)]",
    label: "Tugatilgan",
    tint: "border-[var(--imkon-teal)]/40 bg-[var(--imkon-teal)]/5",
  },
  in_progress: {
    dot: "bg-[var(--imkon-purple)]",
    label: "Davom etmoqda",
    tint: "border-[var(--imkon-purple)]/40 bg-[var(--imkon-purple)]/5",
  },
}

function LessonDateNavigator({
  lessons,
  selected,
  onSelect,
  sessionStatusMap,
  today,
}: {
  lessons: LessonCard[]
  selected: LessonCard | null
  onSelect: (card: LessonCard) => void
  sessionStatusMap: Map<string, string>
  today: string
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const idx = selected
    ? lessons.findIndex((l) => l.ds === selected.ds && l.entryId === selected.entryId)
    : -1
  const canPrev = idx > 0
  const canNext = idx >= 0 && idx < lessons.length - 1

  const status = selected ? sessionStatusMap.get(`${selected.entryId}-${selected.ds}`) : undefined
  const tone = status ? STATUS_TONE[status] : undefined

  const date = selected ? new Date(`${selected.ds}T00:00:00`) : null
  const isToday = selected?.ds === today

  // Map lesson dates → card so the calendar can resolve a picked date back
  // to a lesson row (date alone is not enough — same date can host two
  // schedule entries, but for one teacher within a quarter that's rare).
  const lessonsByDs = useMemo(() => {
    const m = new Map<string, LessonCard>()
    for (const l of lessons) m.set(l.ds, l)
    return m
  }, [lessons])

  const lessonDates = useMemo(
    () => lessons.map((l) => new Date(`${l.ds}T00:00:00`)),
    [lessons],
  )
  const completedDates = useMemo(
    () =>
      lessons
        .filter((l) => sessionStatusMap.get(`${l.entryId}-${l.ds}`) === "completed")
        .map((l) => new Date(`${l.ds}T00:00:00`)),
    [lessons, sessionStatusMap],
  )
  const inProgressDates = useMemo(
    () =>
      lessons
        .filter((l) => sessionStatusMap.get(`${l.entryId}-${l.ds}`) === "in_progress")
        .map((l) => new Date(`${l.ds}T00:00:00`)),
    [lessons, sessionStatusMap],
  )

  return (
    <div className="flex items-stretch gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => canPrev && onSelect(lessons[idx - 1])}
        disabled={!canPrev}
        aria-label="Oldingi dars"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        className={cn(
          "flex-1 flex items-center justify-between gap-3 rounded-md border px-4 py-2",
          isToday && !tone && "border-[var(--imkon-red)]/40 bg-[var(--imkon-red)]/5",
          tone?.tint,
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "size-2.5 rounded-full shrink-0",
              tone?.dot ?? (isToday ? "bg-[var(--imkon-red)]" : "bg-muted-foreground/30"),
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {date && (
                <>
                  {date.getDate()} {UZ_MONTHS_SHORT[date.getMonth()]} ·{" "}
                  <span className="text-muted-foreground font-medium">
                    {UZ_WEEKDAYS_FULL[date.getDay()]}
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {selected?.lessonNumber}-dars
              {tone && <> · {tone.label}</>}
              {!tone && isToday && <> · Bugun</>}
            </div>
          </div>
        </div>
      </div>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Sana tanlash">
            <CalendarDays className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date ?? undefined}
            onSelect={(d) => {
              if (!d) return
              const ds = toDateStr(d)
              const card = lessonsByDs.get(ds)
              if (card) {
                onSelect(card)
                setPickerOpen(false)
              }
            }}
            disabled={(d) => !lessonsByDs.has(toDateStr(d))}
            modifiers={{
              hasLesson: lessonDates,
              completed: completedDates,
              inProgress: inProgressDates,
            }}
            modifiersClassNames={{
              hasLesson: "font-bold",
              completed: "text-[var(--imkon-teal-dark)]",
              inProgress: "text-[var(--imkon-purple-dark)]",
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => canNext && onSelect(lessons[idx + 1])}
        disabled={!canNext}
        aria-label="Keyingi dars"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
