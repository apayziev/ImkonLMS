import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Play,
  Square,
  TriangleAlert,
  UserCheck,
  UserX,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { SessionStudentRead } from "@/lib/api"
import { lessonsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getLessonSessionQueryOptions, queryKeys } from "@/hooks/useQueryOptions"
import { TopicHomeworkSection } from "./TopicHomeworkSection"
import { StudentRow } from "./StudentRow"
import { ATTENDANCE_OPTIONS } from "./constants"

export function SessionView({
  sessionId,
  onBack,
  hideBack = false,
}: {
  sessionId: number
  onBack: () => void
  hideBack?: boolean
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
    mutationFn: (scheduleEntryId: number) => lessonsApi.startSession(scheduleEntryId, session?.session_date),
    onSuccess: (response) => {
      toast.success("Dars boshlandi")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      queryClient.invalidateQueries({ queryKey: [...queryKeys.lessonSession, sessionId] })
      queryClient.setQueryData([...queryKeys.lessonSession, sessionId], response.data)
    },
    onError: () => {
      toast.error("Darsni boshlashda xatolik")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      queryClient.invalidateQueries({ queryKey: [...queryKeys.lessonSession, sessionId] })
    },
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
  const isInProgress = session.status === "in_progress"
  const unmarkedCount = session.students.filter((s) => s.status === "unmarked").length

  // Late warning: 5+ minutes since session started, student still unmarked
  const showLateWarning = isInProgress && (() => {
    const started = new Date(session.started_at).getTime()
    return Date.now() - started >= 5 * 60 * 1000
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!hideBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
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
            <EndSessionDialog
              session={session}
              sessionId={sessionId}
              endMutation={endMutation}
            />
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

      {/* Dars rejasi */}
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
            <TopicHomeworkSection session={session} sessionId={sessionId} disabled={isCompleted} homeworkEditable={isInProgress} />
          )}
        </>
      )}

      {!isPlanned && (
        <>
          <div className="space-y-2">
            <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 px-4 py-2 text-sm font-medium text-muted-foreground">
              <span>#</span>
              <span>O'quvchi</span>
              <div className="flex gap-1.5 w-56 justify-center items-center">
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
                <span>Davomat</span>
              </div>
              <span className="w-28 text-center">Baho</span>
            </div>

            {session.students.map((student, index) => (
              <StudentRow
                key={student.student_id}
                student={student}
                index={index + 1}
                sessionId={sessionId}
                disabled={isCompleted}
                isLate={showLateWarning && student.status === "unmarked"}
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

/* ------------------------------------------------------------------ */
/*  End Session Dialog                                                */
/* ------------------------------------------------------------------ */

function EndSessionDialog({
  session,
  sessionId,
  endMutation,
}: {
  session: { grade_display: string; subject_name: string; period_number: number; students: SessionStudentRead[] }
  sessionId: number
  endMutation: { mutate: () => void; isPending: boolean }
}) {
  const queryClient = useQueryClient()
  const unmarkedStudents = session.students.filter((s) => s.status === "unmarked")
  const hasUnmarked = unmarkedStudents.length > 0

  const markMutation = useMutation({
    mutationFn: (data: { student_id: number; status: string }) =>
      lessonsApi.updateAttendance(sessionId, { ...data, grade: null }),
    onSuccess: (response) => {
      queryClient.setQueryData(
        [...queryKeys.lessonSession, sessionId],
        (old: import("@/lib/api").SessionDetailRead | undefined) => {
          if (!old) return old
          return {
            ...old,
            students: old.students.map((s) =>
              s.student_id === response.data.student_id ? response.data : s,
            ),
          }
        },
      )
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
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
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Darsni tugatish</DialogTitle>
          <DialogDescription>
            {session.grade_display} · {session.subject_name} · {session.period_number}-soat
          </DialogDescription>
        </DialogHeader>

        {hasUnmarked && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
            <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                {unmarkedStudents.length} o'quvchi belgilanmagan.
              </p>
              <p className="text-amber-700 dark:text-amber-400">
                Darsni tugatishdan oldin ularning holatini belgilang.
              </p>
            </div>
          </div>
        )}

        {hasUnmarked && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {unmarkedStudents.map((student) => (
              <div key={student.student_id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={student.photo_url ?? undefined} alt={student.full_name} />
                  <AvatarFallback className="text-xs">
                    {student.first_name[0]}{student.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium min-w-0 truncate flex-1">
                  {student.last_name} {student.first_name}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  {ATTENDANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={markMutation.isPending}
                      onClick={() => markMutation.mutate({ student_id: student.student_id, status: opt.value })}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
                        "bg-background text-muted-foreground border-border hover:bg-accent",
                        markMutation.isPending && "cursor-not-allowed opacity-60",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasUnmarked && (
          <p className="text-sm text-muted-foreground">
            Darsni tugatgandan keyin davomat va baholarni o'zgartirib bo'lmaydi.
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Bekor qilish</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={hasUnmarked || endMutation.isPending}
            onClick={() => endMutation.mutate()}
          >
            {endMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Darsni tugatish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
