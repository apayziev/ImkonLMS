import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Paperclip,
  Play,
  Plus,
  Square,
  Target,
  Trash2,
  TriangleAlert,
  Upload,
  UserCheck,
  UserX,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type {
  LessonMaterialRead,
  SessionDetailRead,
  SessionStudentRead,
  TodayLessonRead,
} from "@/lib/api"
import { lessonsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import {
  getSchoolSettingsQueryOptions,
  getTodayLessonsQueryOptions,
  getLessonSessionQueryOptions,
  queryKeys,
} from "@/hooks/useQueryOptions"

export const Route = createFileRoute("/_layout/lessons")({
  component: LessonsPage,
  head: () => ({
    meta: [{ title: "Darslarim - IMKON LMS" }],
  }),
})

// ─── Helpers ────────────────────────────────────────────────────────────────

const UZ_WEEKDAYS_SHORT = ["Ya", "Du", "Se", "Cho", "Pa", "Ju", "Sha"]

function formatDate(d: Date) {
  return d.toISOString().split("T")[0]
}

function getWeekDays(baseDate: Date, workingDays: number[]): Date[] {
  const day = baseDate.getDay() // 0=Sun
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((day + 6) % 7))
  // workingDays: 1=Mon..7=Sun → offset from monday: Mon=0, Tue=1, ..., Sun=6
  return workingDays.map((wd) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + (wd === 7 ? 6 : wd - 1))
    return d
  })
}

// ─── Page ───────────────────────────────────────────────────────────────────

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

// ─── Week Selector + Lessons ────────────────────────────────────────────────

function LessonsList({
  selectedDate,
  onDateChange,
  onSessionOpen,
}: {
  selectedDate: Date
  onDateChange: (d: Date) => void
  onSessionOpen: (sessionId: number) => void
}) {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery(getSchoolSettingsQueryOptions())
  const workingDays = settings?.working_days ?? [1, 2, 3, 4, 5, 6]
  const dateStr = formatDate(selectedDate)
  const todayStr = formatDate(new Date())
  const isToday = dateStr === todayStr
  const weekDays = getWeekDays(selectedDate, workingDays)

  const { data, isLoading } = useQuery(getTodayLessonsQueryOptions(dateStr))

  const startMutation = useMutation({
    mutationFn: (scheduleEntryId: number) =>
      lessonsApi.startSession(scheduleEntryId),
    onSuccess: (response) => {
      toast.success("Dars boshlandi")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      queryClient.invalidateQueries({ queryKey: queryKeys.lessonsForDate(dateStr) })
      onSessionOpen(response.data.id)
    },
    onError: () => toast.error("Darsni boshlashda xatolik"),
  })

  const planMutation = useMutation({
    mutationFn: (scheduleEntryId: number) =>
      lessonsApi.planSession(scheduleEntryId, dateStr),
    onSuccess: (response) => {
      toast.success("Dars rejasi yaratildi")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      queryClient.invalidateQueries({ queryKey: queryKeys.lessonsForDate(dateStr) })
      onSessionOpen(response.data.id)
    },
    onError: () => toast.error("Dars rejasini yaratishda xatolik"),
  })

  const lessons = data?.data ?? []

  const prevWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 7)
    onDateChange(d)
  }
  const nextWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 7)
    onDateChange(d)
  }

  return (
    <div className="space-y-6">
      {/* Week day selector */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={prevWeek} className="shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1.5 flex-1 justify-center">
          {weekDays.map((d) => {
            const ds = formatDate(d)
            const isSelected = ds === dateStr
            const isDayToday = ds === todayStr
            return (
              <button
                key={ds}
                type="button"
                onClick={() => onDateChange(d)}
                className={cn(
                  "flex flex-col items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors min-w-[52px]",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isDayToday
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent text-muted-foreground",
                )}
              >
                <span className="text-xs">{UZ_WEEKDAYS_SHORT[d.getDay()]}</span>
                <span className="text-lg font-bold">{d.getDate()}</span>
              </button>
            )
          })}
        </div>
        <Button variant="ghost" size="icon" onClick={nextWeek} className="shrink-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="h-16 w-16 mb-4 opacity-40" />
          <p className="text-xl">
            {isToday ? "Bugun dars yo'q" : "Bu kunda dars yo'q"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.schedule_entry_id}
              lesson={lesson}
              onStart={() => startMutation.mutate(lesson.schedule_entry_id)}
              onPlan={() => {
                if (lesson.session_id) {
                  onSessionOpen(lesson.session_id)
                } else {
                  planMutation.mutate(lesson.schedule_entry_id)
                }
              }}
              onContinue={() => onSessionOpen(lesson.session_id!)}
              isStarting={
                startMutation.isPending &&
                startMutation.variables === lesson.schedule_entry_id
              }
              isPlanning={
                planMutation.isPending &&
                planMutation.variables === lesson.schedule_entry_id
              }
              canStart={isToday}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Lesson Card ────────────────────────────────────────────────────────────

function LessonCard({
  lesson,
  onStart,
  onPlan,
  onContinue,
  isStarting,
  isPlanning,
  canStart,
}: {
  lesson: TodayLessonRead
  onStart: () => void
  onPlan: () => void
  onContinue: () => void
  isStarting: boolean
  isPlanning: boolean
  canStart: boolean
}) {
  const isInProgress = lesson.session_status === "in_progress"
  const isCompleted = lesson.session_status === "completed"
  const isPlanned = lesson.session_status === "planned" && lesson.has_plan_content

  return (
    <Card
      className={cn(
        "rounded-xl border-2 p-5 transition-colors",
        isInProgress && "border-[var(--imkon-purple)]/40 bg-[var(--imkon-purple)]/5",
        isCompleted && "border-[var(--imkon-teal)]/30 bg-[var(--imkon-teal)]/5",
        isPlanned && "border-[var(--imkon-purple)]/20 bg-[var(--imkon-purple)]/3",
        !isInProgress && !isCompleted && !isPlanned && "border-border",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-2xl font-bold">{lesson.grade_display}</p>
          <p className="text-lg text-muted-foreground">{lesson.subject_name}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-lg font-medium">
              {lesson.start_time} – {lesson.end_time}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lesson.period_number}-soat
          </p>
        </div>
      </div>

      {isCompleted ? (
        <Button
          size="lg"
          className="w-full text-lg h-12"
          variant="outline"
          onClick={onContinue}
        >
          <CheckCircle2 className="mr-2 h-5 w-5 text-[var(--imkon-teal)]" />
          Tugallangan — Ko'rish
        </Button>
      ) : isInProgress ? (
        <Button
          size="lg"
          className="w-full text-lg h-12"
          variant="default"
          onClick={onContinue}
        >
          <Play className="mr-2 h-5 w-5" />
          Davom etish
        </Button>
      ) : isPlanned ? (
        <div className="flex gap-2">
          <Button
            size="lg"
            className="flex-1 text-lg h-12"
            variant="outline"
            onClick={onContinue}
          >
            <FileText className="mr-2 h-5 w-5" />
            Rejani ko'rish
          </Button>
          {canStart && (
            <Button
              size="lg"
              className="flex-1 text-lg h-12"
              onClick={onStart}
              disabled={isStarting}
            >
              {isStarting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              Darsni boshlash
            </Button>
          )}
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full text-lg h-12"
          onClick={canStart ? onStart : onPlan}
          disabled={canStart ? isStarting : isPlanning}
        >
          {(canStart ? isStarting : isPlanning) ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Play className="mr-2 h-5 w-5" />
          )}
          Darsni boshlash
        </Button>
      )}
    </Card>
  )
}

// ─── Weekly Plan View ───────────────────────────────────────────────────────

function WeeklyPlanView({
  selectedDate,
  onDateChange,
  onSessionOpen,
}: {
  selectedDate: Date
  onDateChange: (d: Date) => void
  onSessionOpen: (sessionId: number) => void
}) {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery(getSchoolSettingsQueryOptions())
  const workingDays = settings?.working_days ?? [1, 2, 3, 4, 5, 6]
  const weekDays = getWeekDays(selectedDate, workingDays)

  // Fetch lessons for all working days of the week
  const dayQueries = weekDays.map((d) => {
    const ds = formatDate(d)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useQuery({
      ...getTodayLessonsQueryOptions(ds),
      staleTime: 5 * 60 * 1000,
    })
  })

  const planMutation = useMutation({
    mutationFn: ({ scheduleEntryId, date }: { scheduleEntryId: number; date: string }) =>
      lessonsApi.planSession(scheduleEntryId, date),
    onSuccess: (response) => {
      toast.success("Dars rejasi yaratildi")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      weekDays.forEach((d) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lessonsForDate(formatDate(d)) })
      })
      onSessionOpen(response.data.id)
    },
    onError: () => toast.error("Xatolik"),
  })

  const prevWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 7)
    onDateChange(d)
  }
  const nextWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 7)
    onDateChange(d)
  }

  const todayStr = formatDate(new Date())

  // Get month-year display for the week
  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ]
  const firstDay = weekDays[0]
  const lastDay = weekDays[weekDays.length - 1]
  const weekLabel =
    firstDay && lastDay
      ? firstDay.getMonth() === lastDay.getMonth()
        ? `${firstDay.getDate()} – ${lastDay.getDate()} ${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()}`
        : `${firstDay.getDate()} ${monthNames[firstDay.getMonth()]} – ${lastDay.getDate()} ${monthNames[lastDay.getMonth()]}`
      : ""

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{weekLabel}</span>
        <Button variant="ghost" size="icon" onClick={nextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days */}
      {weekDays.map((day, dayIdx) => {
        const ds = formatDate(day)
        const isToday = ds === todayStr
        const dayName = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"][day.getDay()]
        const query = dayQueries[dayIdx]
        const lessons = query?.data?.data ?? []

        return (
          <div key={ds}>
            <div
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-lg mb-2",
                isToday ? "bg-primary/10" : "bg-muted/30",
              )}
            >
              <span className={cn(
                "text-sm font-bold",
                isToday ? "text-primary" : "text-muted-foreground",
              )}>
                {dayName}, {day.getDate()}{isToday && " (bugun)"}
              </span>
              {query?.isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>

            {lessons.length === 0 && !query?.isLoading ? (
              <p className="text-sm text-muted-foreground pl-3 pb-3">Dars yo'q</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {lessons.map((lesson) => {
                  const hasSession = !!lesson.session_id
                  const isPlanned = lesson.session_status === "planned"
                  const isInProgress = lesson.session_status === "in_progress"
                  const isCompleted = lesson.session_status === "completed"
                  const hasContent = lesson.has_plan_content
                  const hasPlan = (isPlanned && hasContent) || isInProgress || isCompleted

                  return (
                    <div
                      key={`${ds}-${lesson.schedule_entry_id}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm",
                        isCompleted && "border-[var(--imkon-teal)]/30 bg-[var(--imkon-teal)]/5",
                        isInProgress && "border-[var(--imkon-purple)]/40 bg-[var(--imkon-purple)]/5",
                        isPlanned && hasContent && "border-[var(--imkon-purple)]/20 bg-[var(--imkon-purple)]/3",
                        !hasPlan && "border-border hover:bg-muted/20",
                      )}
                      onClick={() => {
                        if (hasSession) {
                          onSessionOpen(lesson.session_id!)
                        } else {
                          planMutation.mutate({
                            scheduleEntryId: lesson.schedule_entry_id,
                            date: ds,
                          })
                        }
                      }}
                    >
                      {/* Status indicator */}
                      <div
                        className={cn(
                          "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
                          isCompleted && "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal)]",
                          isInProgress && "bg-[var(--imkon-purple)]/15 text-[var(--imkon-purple)]",
                          isPlanned && hasContent && "bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)]",
                          !hasPlan && "bg-muted text-muted-foreground",
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : isInProgress ? (
                          <Play className="h-4 w-4" />
                        ) : isPlanned && hasContent ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4 opacity-40" />
                        )}
                      </div>

                      {/* Lesson info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{lesson.grade_display}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{lesson.subject_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{lesson.start_time} – {lesson.end_time}</span>
                          <span>({lesson.period_number}-soat)</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="shrink-0">
                        {isCompleted ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--imkon-teal)]/10 text-[var(--imkon-teal)] font-medium">
                            Tugallangan
                          </span>
                        ) : isInProgress ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)] font-medium">
                            Davom etmoqda
                          </span>
                        ) : isPlanned && hasContent ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)]/70 font-medium">
                            Rejalashtirilgan
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                            Reja yo'q
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Session View (Davomat + Baholash) ──────────────────────────────────────

function SessionView({
  sessionId,
  onBack,
}: {
  sessionId: number
  onBack: () => void
}) {
  const queryClient = useQueryClient()
  const { data: session, isLoading } = useQuery(
    getLessonSessionQueryOptions(sessionId),
  )

  const endMutation = useMutation({
    mutationFn: () => lessonsApi.endSession(sessionId),
    onSuccess: () => {
      toast.success("Dars tugatildi")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      onBack()
    },
    onError: () => toast.error("Darsni tugatishda xatolik"),
  })

  const markAllMutation = useMutation({
    mutationFn: (action: "mark" | "unmark") =>
      action === "mark" ? lessonsApi.markAllPresent(sessionId) : lessonsApi.unmarkAll(sessionId),
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.lessonSession, sessionId] })
      toast.success(action === "mark" ? "Barcha o'quvchilar belgilandi" : "Barcha belgilar olib tashlandi")
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const startFromPlanMutation = useMutation({
    mutationFn: (scheduleEntryId: number) => lessonsApi.startSession(scheduleEntryId),
    onSuccess: (response) => {
      toast.success("Dars boshlandi")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      queryClient.invalidateQueries({ queryKey: [...queryKeys.lessonSession, sessionId] })
      queryClient.setQueryData([...queryKeys.lessonSession, sessionId], response.data)
    },
    onError: () => toast.error("Darsni boshlashda xatolik"),
  })

  const [showPlan, setShowPlan] = useState(false)

  if (isLoading || !session) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 rounded-xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  const isCompleted = session.status === "completed"
  const isPlanned = session.status === "planned"
  const unmarkedCount = session.students.filter((s) => s.status === "unmarked").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {session.grade_display} — {session.subject_name}
            </h1>
            <p className="text-muted-foreground text-lg">
              {session.period_number}-soat · {session.start_time} – {session.end_time}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isPlanned && (
            <Button
              size="lg"
              className="text-lg h-12 px-6"
              onClick={() => startFromPlanMutation.mutate(session.schedule_entry_id)}
              disabled={startFromPlanMutation.isPending}
            >
              {startFromPlanMutation.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              Darsni boshlash
            </Button>
          )}
          {!isCompleted && !isPlanned && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="lg"
                className="text-lg h-12 px-6"
                disabled={endMutation.isPending}
              >
                {endMutation.isPending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Square className="mr-2 h-5 w-5" />
                )}
                Darsni tugatish
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Darsni tugatishni tasdiqlang</AlertDialogTitle>
                <AlertDialogDescription>
                  Darsni tugatgandan keyin davomat va baholarni o'zgartirib bo'lmaydi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => endMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ha, tugatish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        </div>
      </div>

      {isCompleted && (
        <div className="flex items-center gap-2 text-[var(--imkon-teal)] bg-[var(--imkon-teal)]/10 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-lg font-medium">
            Dars tugatilgan · {session.ended_at ? new Date(session.ended_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>
      )}

      {/* Dars rejasi — toggle button for in_progress/completed, always open for planned */}
      {isPlanned ? (
        <TopicHomeworkSection session={session} sessionId={sessionId} disabled={false} />
      ) : (
        <>
          <Button
            variant="outline"
            className="w-full justify-between h-12 text-base"
            onClick={() => setShowPlan(!showPlan)}
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dars rejasi
            </span>
            <ChevronRight className={cn("h-4 w-4 transition-transform", showPlan && "rotate-90")} />
          </Button>
          {showPlan && (
            <TopicHomeworkSection session={session} sessionId={sessionId} disabled={isCompleted} />
          )}
        </>
      )}

      {!isPlanned && (
      <>
      <div className="space-y-2">
        <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 px-4 py-2 text-sm font-medium text-muted-foreground">
          <span>#</span>
          <span>O'quvchi</span>
          <div className="flex gap-1.5 w-56 justify-center">
            <span className="flex items-center gap-1 px-3 py-1.5">
              <button
                  type="button"
                  title={unmarkedCount > 0 ? "Hammasini keldi" : "Hammasini bekor qilish"}
                  onClick={() => markAllMutation.mutate(unmarkedCount > 0 ? "mark" : "unmark")}
                  disabled={markAllMutation.isPending}
                  className={cn(
                    "inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors disabled:opacity-50",
                    unmarkedCount > 0
                      ? "bg-[var(--imkon-teal)] hover:bg-[var(--imkon-teal-dark)] text-white"
                      : "bg-muted-foreground/20 hover:bg-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {markAllMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserCheck className="h-3 w-3" />
                  )}
              </button>
              Keldi
            </span>
            <span className="px-3 py-1.5">Sababli</span>
            <span className="px-3 py-1.5">Sababsiz</span>
          </div>
          <span className="w-28 text-center">Baho</span>
        </div>

        {session.students.map((student, index) => (
          <StudentRow
            key={student.student_id}
            student={student}
            index={index + 1}
            sessionId={sessionId}
            disabled={false}
          />
        ))}
      </div>

      {session.students.length === 0 && (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <UserX className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg">Bu sinfda o'quvchilar topilmadi</p>
        </div>
      )}
      </>
      )}
    </div>
  )
}

// ─── Lesson Type Options ────────────────────────────────────────────────────

const LESSON_TYPES = [
  { value: "new_topic", label: "Yangi mavzu" },
  { value: "reinforcement", label: "Mustahkamlash" },
  { value: "assessment", label: "Nazorat" },
  { value: "practical", label: "Amaliy" },
] as const

// ─── Topic & Homework Section ───────────────────────────────────────────────

function TopicHomeworkSection({
  session,
  sessionId,
  disabled,
}: {
  session: SessionDetailRead
  sessionId: number
  disabled: boolean
}) {
  const queryClient = useQueryClient()
  const [lessonType, setLessonType] = useState(session.lesson_type ?? "")
  const [topic, setTopic] = useState(session.topic ?? "")
  const [homework, setHomework] = useState(session.homework ?? "")
  const [deadline, setDeadline] = useState(session.homework_deadline ?? "")
  const [objectives, setObjectives] = useState<string[]>(session.objectives ?? [""])
  const [keywords, setKeywords] = useState<string[]>(session.keywords ?? [])
  const [keywordInput, setKeywordInput] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Sync state when session data changes externally
  useEffect(() => {
    setLessonType(session.lesson_type ?? "")
    setTopic(session.topic ?? "")
    setHomework(session.homework ?? "")
    setDeadline(session.homework_deadline ?? "")
    setObjectives(session.objectives ?? [""])
    setKeywords(session.keywords ?? [])
  }, [session.lesson_type, session.topic, session.homework, session.homework_deadline, session.objectives, session.keywords])

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current)
      clearTimeout(saveTimerRef.current)
    }
  }, [])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      lessonsApi.updateSession(sessionId, data),
    onMutate: () => {
      clearTimeout(saveTimerRef.current)
      setSaveStatus("saving")
    },
    onSuccess: (response) => {
      setSaveStatus("saved")
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000)
      queryClient.setQueryData(
        [...queryKeys.lessonSession, sessionId],
        (old: SessionDetailRead | undefined) =>
          old ? { ...old, ...response.data } : old,
      )
    },
    onError: () => {
      setSaveStatus("error")
      toast.error("Saqlashda xatolik")
    },
  })

  // Immediate save (for selects, dates, keywords)
  const saveImmediate = useCallback(
    (data: Record<string, unknown>) => {
      clearTimeout(debounceRef.current)
      mutation.mutate(data)
    },
    [mutation],
  )

  // Debounced save (for text fields — auto-save while typing)
  const saveDebounced = useCallback(
    (data: Record<string, unknown>) => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        mutation.mutate(data)
      }, 1000)
    },
    [mutation],
  )

  // --- Objectives helpers ---
  const updateObjective = (index: number, value: string) => {
    const next = [...objectives]
    next[index] = value
    setObjectives(next)
    const filtered = next.filter((o) => o.trim() !== "")
    saveDebounced({ objectives: filtered.length > 0 ? filtered : null })
  }

  const addObjective = () => {
    if (objectives.length < 3) setObjectives([...objectives, ""])
  }

  const removeObjective = (index: number) => {
    const next = objectives.filter((_, i) => i !== index)
    if (next.length === 0) next.push("")
    setObjectives(next)
    const filtered = next.filter((o) => o.trim() !== "")
    saveImmediate({ objectives: filtered.length > 0 ? filtered : null })
  }

  // --- Keywords helpers ---
  const addKeyword = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || keywords.includes(trimmed)) return
    const next = [...keywords, trimmed]
    setKeywords(next)
    setKeywordInput("")
    saveImmediate({ keywords: next })
  }

  const removeKeyword = (index: number) => {
    const next = keywords.filter((_, i) => i !== index)
    setKeywords(next)
    saveImmediate({ keywords: next.length > 0 ? next : null })
  }

  return (
    <Card className="rounded-xl border p-5 space-y-0">
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Dars rejasi
        </h3>
        <span
          className={`flex items-center gap-1.5 text-xs transition-opacity ${
            saveStatus === "idle" ? "opacity-0" : "opacity-100"
          } ${
            saveStatus === "saving"
              ? "text-muted-foreground"
              : saveStatus === "saved"
                ? "text-[var(--imkon-teal)]"
                : saveStatus === "error"
                  ? "text-red-500"
                  : ""
          }`}
        >
          {saveStatus === "saving" && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saqlanmoqda...</>)}
          {saveStatus === "saved" && (<><Check className="h-3.5 w-3.5" /> Saqlandi</>)}
          {saveStatus === "error" && (<><TriangleAlert className="h-3.5 w-3.5" /> Xatolik</>)}
        </span>
      </div>

      {/* Row 1: Lesson Type + Topic */}
      <div className="grid gap-4 md:grid-cols-[180px_1fr] border-t pt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Dars turi</label>
          <Select
            value={lessonType}
            onValueChange={(v) => {
              setLessonType(v)
              saveImmediate({ lesson_type: v })
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tanlang..." />
            </SelectTrigger>
            <SelectContent>
              {LESSON_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Mavzu</label>
          <Input
            placeholder="Dars mavzusini kiriting..."
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value)
              saveDebounced({ topic: e.target.value || null })
            }}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Row 2: Objectives */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium text-muted-foreground">
            Dars maqsadlari
          </label>
        </div>
        <div className="space-y-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
              <Input
                placeholder={`${i + 1}-maqsadni kiriting...`}
                value={obj}
                onChange={(e) => updateObjective(i, e.target.value)}
                disabled={disabled}
                className="flex-1"
              />
              {objectives.length > 1 && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeObjective(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {objectives.length < 3 && !disabled && (
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground border-dashed"
              onClick={addObjective}
            >
              <Plus className="h-4 w-4 mr-1" /> Maqsad qo'shish
            </Button>
          )}
        </div>
      </div>

      {/* Row 3: Keywords */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">Kalit so'zlar</label>
          <span className="text-xs text-muted-foreground/60">Enter yoki vergul bilan qo'shing</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {keywords.map((kw, i) => (
            <Badge key={i} variant="secondary" className="text-sm gap-1 pr-1">
              {kw}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeKeyword(i)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {!disabled && (
            <Input
              placeholder="Kalit so'z..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  addKeyword(keywordInput)
                }
              }}
              onBlur={() => {
                if (keywordInput.trim()) addKeyword(keywordInput)
              }}
              className="w-36 h-8 text-sm"
            />
          )}
        </div>
      </div>

      {/* Row 4: Homework + Deadline */}
      <div className="grid gap-4 md:grid-cols-[1fr_200px] border-t pt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Uyga vazifa</label>
          <Textarea
            placeholder="Uyga vazifani kiriting..."
            value={homework}
            onChange={(e) => {
              setHomework(e.target.value)
              saveDebounced({ homework: e.target.value || null })
            }}
            disabled={disabled}
            rows={2}
            className="resize-none"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium text-muted-foreground">Vazifa muddati</label>
          </div>
          <DatePicker
            value={deadline}
            onChange={(dateStr) => {
              setDeadline(dateStr)
              saveImmediate({ homework_deadline: dateStr || null })
            }}
            placeholder="Sanani tanlang"
            disabled={disabled}
            fromYear={new Date().getFullYear()}
            toYear={new Date().getFullYear() + 1}
          />
        </div>
      </div>

      {/* Materials */}
      <div className="border-t pt-4">
        <MaterialsSection sessionId={sessionId} materials={session.materials ?? []} disabled={disabled} />
      </div>
    </Card>
  )
}


// ─── Materials Section ──────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MaterialsSection({
  sessionId,
  materials,
  disabled,
}: {
  sessionId: number
  materials: LessonMaterialRead[]
  disabled: boolean
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => lessonsApi.uploadMaterial(sessionId, file),
    onSuccess: (response) => {
      toast.success("Fayl yuklandi")
      queryClient.setQueryData(
        [...queryKeys.lessonSession, sessionId],
        (old: SessionDetailRead | undefined) =>
          old ? { ...old, materials: [...(old.materials ?? []), response.data] } : old,
      )
    },
    onError: () => toast.error("Fayl yuklashda xatolik"),
  })

  const deleteMutation = useMutation({
    mutationFn: (materialId: number) => lessonsApi.deleteMaterial(sessionId, materialId),
    onSuccess: (_, materialId) => {
      toast.success("Fayl o'chirildi")
      queryClient.setQueryData(
        [...queryKeys.lessonSession, sessionId],
        (old: SessionDetailRead | undefined) =>
          old ? { ...old, materials: (old.materials ?? []).filter((m) => m.id !== materialId) } : old,
      )
    },
    onError: () => toast.error("Fayl o'chirishda xatolik"),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      uploadMutation.mutate(file)
    }
    e.target.value = ""
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-4 w-4" />
          Materiallar ({materials.length})
        </label>
        {!disabled && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Fayl yuklash
            </Button>
          </>
        )}
      </div>

      {materials.length > 0 && (
        <div className="space-y-1.5">
          {materials.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={m.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate font-medium hover:underline text-primary"
              >
                {m.original_name}
              </a>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(m.file_size)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(m.id)}
                  disabled={deleteMutation.isPending}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="O'chirish"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ─── Student Row ────────────────────────────────────────────────────────────

const ATTENDANCE_OPTIONS = [
  { value: "present", label: "Keldi", color: "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal-dark)] border-[var(--imkon-teal)]/40" },
  { value: "excused", label: "Sababli", color: "bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple-dark)] border-[var(--imkon-purple)]/30" },
  { value: "unexcused", label: "Sababsiz", color: "bg-[var(--imkon-red)]/10 text-[var(--imkon-red)] border-[var(--imkon-red)]/30" },
] as const

const GRADES = [5, 4, 3, 2, 1] as const

function StudentRow({
  student,
  index,
  sessionId,
  disabled,
}: {
  student: SessionStudentRead
  index: number
  sessionId: number
  disabled: boolean
}) {
  const queryClient = useQueryClient()

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Auto-clear "saved" status after 2s
  useEffect(() => {
    return () => clearTimeout(saveTimerRef.current)
  }, [])

  const mutation = useMutation({
    mutationFn: (data: { status: string; grade: number | null }) =>
      lessonsApi.updateAttendance(sessionId, {
        student_id: student.student_id,
        status: data.status,
        grade: data.grade,
      }),
    onMutate: () => {
      clearTimeout(saveTimerRef.current)
      setSaveStatus("saving")
    },
    onSuccess: (response) => {
      setSaveStatus("saved")
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000)
      queryClient.setQueryData(
        [...queryKeys.lessonSession, sessionId],
        (old: SessionDetailRead | undefined) => {
          if (!old) return old
          return {
            ...old,
            students: old.students.map((s) =>
              s.student_id === student.student_id ? response.data : s,
            ),
          }
        },
      )
    },
    onError: () => {
      setSaveStatus("error")
      toast.error("Saqlashda xatolik")
    },
  })

  const isAbsent = student.status !== "present"
  const isUnmarked = student.status === "unmarked"

  const handleStatusChange = (newStatus: string) => {
    if (disabled) return
    // Toggle: clicking same status resets to unmarked
    const resolved = newStatus === student.status ? "unmarked" : newStatus
    const grade = resolved === "present" ? student.grade : null
    mutation.mutate({ status: resolved, grade })
  }

  const handleGradeChange = (newGrade: number) => {
    if (disabled || isAbsent) return
    const grade = student.grade === newGrade ? null : newGrade
    mutation.mutate({ status: student.status, grade })
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 rounded-lg border px-4 py-3 transition-colors",
        isUnmarked
          ? "border-dashed border-muted-foreground/30 bg-muted/30"
          : isAbsent
            ? "bg-muted/50"
            : "bg-card",
        mutation.isPending && "opacity-70",
      )}
    >
      {/* Number + Save Status */}
      <span className="text-lg font-medium text-muted-foreground relative">
        {index}
        {saveStatus === "saving" && (
          <Loader2 className="absolute -right-3 -top-1 h-3 w-3 animate-spin text-muted-foreground" />
        )}
        {saveStatus === "saved" && (
          <Check className="absolute -right-3 -top-1 h-3 w-3 text-[var(--imkon-teal)]" />
        )}
        {saveStatus === "error" && (
          <TriangleAlert className="absolute -right-3 -top-1 h-3 w-3 text-red-500" />
        )}
      </span>

      {/* Student Name + Photo */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={student.photo_url ?? undefined} alt={student.full_name} />
          <AvatarFallback className="text-xs">
            {student.first_name[0]}{student.last_name[0]}
          </AvatarFallback>
        </Avatar>
        <span className="text-lg font-medium truncate">
          {student.last_name} {student.first_name}
        </span>
      </div>

      {/* Attendance Buttons */}
      <div className="flex gap-1.5 w-56 justify-center">
        {ATTENDANCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => handleStatusChange(opt.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
              student.status === opt.value
                ? opt.color
                : "bg-background text-muted-foreground border-border hover:bg-accent",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grade Buttons */}
      <div className="flex gap-1 w-28 justify-center">
        {isAbsent ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          GRADES.map((g) => (
            <button
              key={g}
              type="button"
              disabled={disabled}
              onClick={() => handleGradeChange(g)}
              className={cn(
                "h-9 w-9 rounded-md border text-base font-bold transition-all",
                student.grade === g
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {g}
            </button>
          ))
        )}
      </div>

    </div>
  )
}
