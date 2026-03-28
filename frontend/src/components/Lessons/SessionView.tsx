import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Play,
  Square,
  UserCheck,
  UserX,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

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
import { getLessonSessionQueryOptions, queryKeys } from "@/hooks/useQueryOptions"
import { TopicHomeworkSection } from "./TopicHomeworkSection"
import { StudentRow } from "./StudentRow"

export function SessionView({
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
