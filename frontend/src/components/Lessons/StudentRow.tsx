import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, Clock, Eye, Loader2, TriangleAlert, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { AttendanceStatus, SessionDetailRead, SessionStudentRead } from "@/lib/api"
import { lessonsApi } from "@/lib/api"
import { getErrorDetail } from "@/lib/apiError"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { queryKeys } from "@/hooks/useQueryOptions"
import { ATTENDANCE_OPTIONS } from "./constants"
import { PhotoZoomDialog } from "./PhotoZoomDialog"

const ATTENDANCE_ICONS = {
  present: <Check className="h-3.5 w-3.5" />,
  late: <Clock className="h-3.5 w-3.5" />,
  absent: <X className="h-3.5 w-3.5" />,
} as const

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
  const [photoOpen, setPhotoOpen] = useState(false)

  useEffect(() => {
    return () => clearTimeout(saveTimerRef.current)
  }, [])

  const mutation = useMutation({
    mutationFn: (data: { status: AttendanceStatus }) =>
      lessonsApi.updateAttendance(sessionId, {
        student_id: student.student_id,
        status: data.status,
      }),
    onMutate: () => {
      clearTimeout(saveTimerRef.current)
      setSaveStatus("saving")
    },
    onSuccess: (response) => {
      setSaveStatus("saved")
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000)
      queryClient.setQueryData(
        queryKeys.lessonSession(sessionId),
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
    onError: (error) => {
      setSaveStatus("error")
      toast.error(getErrorDetail(error, "Saqlashda xatolik"))
    },
  })

  const handleStatusChange = (newStatus: AttendanceStatus) => {
    if (disabled) return
    const resolved = newStatus === student.status ? "unmarked" as const : newStatus
    mutation.mutate({ status: resolved })
  }

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-muted/50",
        isLate && "bg-amber-50/50 dark:bg-amber-950/10",
        mutation.isPending && "opacity-70",
      )}
    >
      {/* Number + Save Status */}
      <td className="py-3 px-4 text-sm font-medium text-muted-foreground">
        <span className="relative">
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
      </td>

      {/* Student Name + Photo */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative group shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={student.photo_url ?? undefined} alt={student.full_name} />
              <AvatarFallback className="text-xs">
                {student.first_name[0]}{student.last_name[0]}
              </AvatarFallback>
            </Avatar>
            {student.photo_url && (
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Eye className="h-3.5 w-3.5 text-white" />
              </button>
            )}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium truncate block text-[var(--imkon-teal-dark)]">
              {student.last_name} {student.first_name}
            </span>
            {isLate && (
              <span className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 mt-0.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                </span>
                Kechikmoqda
              </span>
            )}
          </div>
        </div>
        {student.photo_url && (
          <PhotoZoomDialog
            photoUrl={student.photo_url}
            fullName={student.full_name}
            open={photoOpen}
            onOpenChange={setPhotoOpen}
          />
        )}
      </td>

      {/* Attendance Buttons */}
      <td className="py-3 px-3">
        <div className="flex gap-3 justify-center">
          {ATTENDANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              title={opt.label}
              onClick={() => handleStatusChange(opt.value)}
              className={cn(
                "h-7 w-7 rounded-full border flex items-center justify-center transition-all",
                student.status === opt.value
                  ? opt.color
                  : "bg-background text-muted-foreground/40 border-border hover:text-muted-foreground hover:bg-accent",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {ATTENDANCE_ICONS[opt.value]}
            </button>
          ))}
        </div>
      </td>
    </tr>
  )
}
