import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Play,
  Square,
  TriangleAlert,
  UserCheck,
  UserX,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type {
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
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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

const UZ_WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"]
const UZ_WEEKDAYS_SHORT = ["Ya", "Du", "Se", "Cho", "Pa", "Ju", "Sha"]
const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"]

function formatDate(d: Date) {
  return d.toISOString().split("T")[0]
}

function formatLabel(d: Date) {
  return `${UZ_WEEKDAYS[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`
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

  if (activeSessionId) {
    return (
      <SessionView
        sessionId={activeSessionId}
        onBack={() => setActiveSessionId(null)}
      />
    )
  }

  return (
    <LessonsList
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      onSessionOpen={setActiveSessionId}
    />
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Darslarim</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          {formatLabel(selectedDate)}
        </p>
      </div>

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
              onContinue={() => onSessionOpen(lesson.session_id!)}
              isStarting={
                startMutation.isPending &&
                startMutation.variables === lesson.schedule_entry_id
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
  onContinue,
  isStarting,
  canStart,
}: {
  lesson: TodayLessonRead
  onStart: () => void
  onContinue: () => void
  isStarting: boolean
  canStart: boolean
}) {
  const isInProgress = lesson.session_status === "in_progress"
  const isCompleted = lesson.session_status === "completed"

  return (
    <Card
      className={cn(
        "rounded-xl border-2 p-5 transition-colors",
        isInProgress && "border-blue-400 bg-blue-50/50",
        isCompleted && "border-green-200 bg-green-50/30",
        !isInProgress && !isCompleted && "border-border",
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
          <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
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
          Darsni boshlash
        </Button>
      ) : canStart ? (
        <Button
          size="lg"
          className="w-full text-lg h-12"
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
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground justify-center py-2">
          <span className="text-sm">Boshlanmagan</span>
        </div>
      )}
    </Card>
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
    mutationFn: () => lessonsApi.markAllPresent(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.lessonSession, sessionId] })
      toast.success("Barcha o'quvchilar belgilandi")
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

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
          {!isCompleted && (
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
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-lg font-medium">
            Dars tugatilgan · {session.ended_at ? new Date(session.ended_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>
      )}

      {/* Bulk Actions + Counter */}
      {/* Student List */}
      <div className="space-y-2">
        <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 px-4 py-2 text-sm font-medium text-muted-foreground">
          <span>#</span>
          <span>O'quvchi</span>
          <span className="w-56 text-center flex items-center justify-center gap-2">
            Davomat
            {!isCompleted && unmarkedCount > 0 && (
              <button
                type="button"
                title="Hammasini keldi"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
              >
                {markAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
              </button>
            )}
          </span>
          <span className="w-28 text-center">Baho</span>
        </div>

        {session.students.map((student, index) => (
          <StudentRow
            key={student.student_id}
            student={student}
            index={index + 1}
            sessionId={sessionId}
            disabled={isCompleted}
          />
        ))}
      </div>

      {session.students.length === 0 && (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <UserX className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg">Bu sinfda o'quvchilar topilmadi</p>
        </div>
      )}
    </div>
  )
}

// ─── Student Row ────────────────────────────────────────────────────────────

const ATTENDANCE_OPTIONS = [
  { value: "present", label: "Keldi", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "excused", label: "Sababli", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "unexcused", label: "Sababsiz", color: "bg-red-100 text-red-800 border-red-300" },
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
    const grade = newStatus === "present" ? student.grade : null
    mutation.mutate({ status: newStatus, grade })
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
          <Check className="absolute -right-3 -top-1 h-3 w-3 text-green-600" />
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
