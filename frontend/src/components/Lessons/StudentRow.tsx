import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, Clock, Eye, Loader2, TriangleAlert, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { queryKeys } from "@/hooks/useQueryOptions"
import type {
  AttendanceStatus,
  SessionDetailRead,
  SessionStudentAssessment,
  SessionStudentRead,
} from "@/lib/api"
import { lessonsApi } from "@/lib/api"
import { getErrorDetail } from "@/lib/apiError"
import { cn } from "@/lib/utils"
import { ATTENDANCE_OPTIONS } from "./constants"
import { PhotoZoomDialog } from "./PhotoZoomDialog"

const ATTENDANCE_ICONS = {
  present: <Check className="h-3.5 w-3.5" />,
  late: <Clock className="h-3.5 w-3.5" />,
  absent: <X className="h-3.5 w-3.5" />,
} as const

type Dim = "knowing" | "applying" | "reasoning"

const DIM_MAX: Record<Dim, number> = { knowing: 4, applying: 4, reasoning: 2 }
const DIM_LABEL: Record<Dim, string> = {
  knowing: "B",
  applying: "Q",
  reasoning: "M",
}
const DIMS: readonly Dim[] = ["knowing", "applying", "reasoning"] as const

const computeTotal = (a: SessionStudentAssessment) =>
  (a.knowing ?? 0) + (a.applying ?? 0) + (a.reasoning ?? 0)
const isPartial = (a: SessionStudentAssessment) =>
  a.knowing === null || a.applying === null || a.reasoning === null
const isEmpty = (a: SessionStudentAssessment) =>
  a.knowing === null && a.applying === null && a.reasoning === null

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

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [photoOpen, setPhotoOpen] = useState(false)

  useEffect(() => {
    return () => clearTimeout(saveTimerRef.current)
  }, [])

  const flashSaved = () => {
    setSaveStatus("saved")
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000)
  }

  const onSaveError = (error: unknown, fallback: string) => {
    setSaveStatus("error")
    toast.error(getErrorDetail(error, fallback))
  }

  const attendanceMutation = useMutation({
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
      flashSaved()
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
    onError: (error) => onSaveError(error, "Saqlashda xatolik"),
  })

  // Optimistic assessment update — pill highlights instantly on click,
  // rolls back on error. The server response is authoritative on success.
  const assessmentMutation = useMutation({
    mutationFn: (data: Partial<Record<Dim, number | null>>) =>
      lessonsApi.updateAssessment(sessionId, {
        student_id: student.student_id,
        ...data,
      }),
    onMutate: async (data) => {
      clearTimeout(saveTimerRef.current)
      setSaveStatus("saving")
      await queryClient.cancelQueries({
        queryKey: queryKeys.lessonSession(sessionId),
      })
      const previous = queryClient.getQueryData<SessionDetailRead>(
        queryKeys.lessonSession(sessionId),
      )
      queryClient.setQueryData(
        queryKeys.lessonSession(sessionId),
        (old: SessionDetailRead | undefined) => {
          if (!old) return old
          return {
            ...old,
            students: old.students.map((s) =>
              s.student_id === student.student_id
                ? { ...s, assessment: { ...s.assessment, ...data } }
                : s,
            ),
          }
        },
      )
      return { previous }
    },
    onSuccess: (response) => {
      flashSaved()
      queryClient.setQueryData(
        queryKeys.lessonSession(sessionId),
        (old: SessionDetailRead | undefined) => {
          if (!old) return old
          return {
            ...old,
            students: old.students.map((s) =>
              s.student_id === student.student_id
                ? { ...s, assessment: response.data }
                : s,
            ),
          }
        },
      )
    },
    onError: (error, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.lessonSession(sessionId),
          context.previous,
        )
      }
      onSaveError(error, "Baholashda xatolik")
    },
  })

  const handleStatusChange = (newStatus: AttendanceStatus) => {
    if (disabled) return
    const resolved =
      newStatus === student.status ? ("unmarked" as const) : newStatus
    attendanceMutation.mutate({ status: resolved })
  }

  // Require an explicit attendance decision (present/late) before scoring.
  // UNMARKED is not enough — the teacher must commit. Also serialize
  // score edits: with optimistic updates + full-query rollback,
  // overlapping mutations could cause an error rollback to wipe a later
  // successful change. The mutation is fast, so blocking briefly is fine.
  const isAttended = student.status === "present" || student.status === "late"
  const scoresDisabled = disabled || !isAttended || assessmentMutation.isPending

  // Toggle: clicking the currently-active value clears it (NULL = not assessed).
  const handleScoreClick = (dim: Dim, value: number) => {
    if (scoresDisabled) return
    const next = student.assessment[dim] === value ? null : value
    assessmentMutation.mutate({ [dim]: next })
  }

  const total = computeTotal(student.assessment)
  const empty = isEmpty(student.assessment)
  const partial = isPartial(student.assessment)

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-muted/50",
        isLate && "bg-amber-50/50 dark:bg-amber-950/10",
        (attendanceMutation.isPending || assessmentMutation.isPending) &&
          "opacity-70",
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
            <TriangleAlert className="absolute -right-3 -top-1 h-3 w-3 text-[var(--imkon-red)]" />
          )}
        </span>
      </td>

      {/* Student Name + Photo */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative group shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={student.photo_url ?? undefined}
                alt={student.full_name}
              />
              <AvatarFallback className="text-xs">
                {student.first_name[0]}
                {student.last_name[0]}
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

      {/* Daily activity (BQM) */}
      <td className="py-3 px-3">
        <div className="flex items-center justify-center gap-3">
          {DIMS.map((dim) => (
            <ScoreDim
              key={dim}
              label={DIM_LABEL[dim]}
              max={DIM_MAX[dim]}
              value={student.assessment[dim]}
              disabled={scoresDisabled}
              onPick={(n) => handleScoreClick(dim, n)}
            />
          ))}
          <span
            className={cn(
              "text-sm ml-1 tabular-nums min-w-[3rem]",
              empty
                ? "text-muted-foreground/40"
                : partial
                  ? "text-muted-foreground"
                  : "font-semibold text-[var(--imkon-teal-dark)]",
            )}
          >
            {empty ? "—/10" : `${total}/10`}
          </span>
        </div>
      </td>
    </tr>
  )
}

function ScoreDim({
  label,
  max,
  value,
  disabled,
  onPick,
}: {
  label: string
  max: number
  value: number | null
  disabled: boolean
  onPick: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-medium text-muted-foreground w-3 text-right">
        {label}
      </span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const active = value === n
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onPick(n)}
              title={active ? "Bekor qilish uchun bosing" : `${label}: ${n}`}
              className={cn(
                "w-7 h-7 text-xs font-semibold rounded border transition-colors",
                active
                  ? "bg-[var(--imkon-teal)] text-white border-[var(--imkon-teal)]"
                  : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground",
                disabled &&
                  "cursor-not-allowed opacity-50 hover:bg-background hover:text-muted-foreground",
              )}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
