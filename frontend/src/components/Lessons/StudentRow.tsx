import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, Loader2, TriangleAlert } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { SessionDetailRead, SessionStudentRead } from "@/lib/api"
import { lessonsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { queryKeys } from "@/hooks/useQueryOptions"
import { ATTENDANCE_OPTIONS, GRADES } from "./constants"

export function StudentRow({
  student,
  index,
  sessionId,
  disabled,
  isLate = false,
}: {
  student: SessionStudentRead
  index: number
  sessionId: number
  disabled: boolean
  isLate?: boolean
}) {
  const queryClient = useQueryClient()

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

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
        isLate
          ? "border-amber-400/50 bg-amber-50 dark:bg-amber-950/20"
          : isUnmarked
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
        <div className="min-w-0">
          <span className="text-lg font-medium truncate block">
            {student.last_name} {student.first_name}
          </span>
          {isLate && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Kechikmoqda
            </span>
          )}
        </div>
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
          <span className="text-xs text-muted-foreground/50 italic" title="Yo'q o'quvchiga baho qo'yilmaydi">
            baho yo'q
          </span>
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
