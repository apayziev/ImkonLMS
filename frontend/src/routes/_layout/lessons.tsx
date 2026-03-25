import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Square,
  TriangleAlert,
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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
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

// ─── Page ───────────────────────────────────────────────────────────────────

function LessonsPage() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)

  if (activeSessionId) {
    return (
      <SessionView
        sessionId={activeSessionId}
        onBack={() => setActiveSessionId(null)}
      />
    )
  }

  return <TodayLessonsList onSessionOpen={setActiveSessionId} />
}

// ─── Today's Lessons ────────────────────────────────────────────────────────

function TodayLessonsList({
  onSessionOpen,
}: {
  onSessionOpen: (sessionId: number) => void
}) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery(getTodayLessonsQueryOptions())

  const startMutation = useMutation({
    mutationFn: (scheduleEntryId: number) =>
      lessonsApi.startSession(scheduleEntryId),
    onSuccess: (response) => {
      toast.success("Dars boshlandi")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      onSessionOpen(response.data.id)
    },
    onError: () => toast.error("Darsni boshlashda xatolik"),
  })

  const lessons = data?.data ?? []

  const todayLabel = new Intl.DateTimeFormat("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Darslarim</h1>
        <p className="text-muted-foreground mt-1 text-lg capitalize">
          {todayLabel}
        </p>
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
          <p className="text-xl">Bugun dars yo'q</p>
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
}: {
  lesson: TodayLessonRead
  onStart: () => void
  onContinue: () => void
  isStarting: boolean
}) {
  const isInProgress = lesson.session_status === "in_progress"
  const isCompleted = lesson.session_status === "completed"

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-5 transition-colors",
        isInProgress && "border-blue-400 bg-blue-50/50",
        isCompleted && "border-green-200 bg-green-50/30",
        !isInProgress && !isCompleted && "border-border bg-card",
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
            {lesson.period_number}-dars
          </p>
        </div>
      </div>

      {isCompleted ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-lg font-medium">Tugallangan</span>
        </div>
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
      ) : (
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
      )}
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
              {session.period_number}-dars · {session.start_time} – {session.end_time}
            </p>
          </div>
        </div>
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

      {isCompleted && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg px-4 py-3">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-lg font-medium">
            Dars tugatilgan · {session.ended_at ? new Date(session.ended_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>
      )}

      {/* Student List */}
      <div className="space-y-2">
        <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 px-4 py-2 text-sm font-medium text-muted-foreground">
          <span>#</span>
          <span>O'quvchi</span>
          <span className="w-56 text-center">Davomat</span>
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
        isAbsent ? "bg-muted/50" : "bg-card",
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

      {/* Student Name */}
      <span className="text-lg font-medium truncate">
        {student.last_name} {student.first_name}
      </span>

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
