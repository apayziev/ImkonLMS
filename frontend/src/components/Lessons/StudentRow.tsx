import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, Clock, Eye, Loader2, TriangleAlert, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { SessionDetailRead, SessionStudentRead, YellowCardRead } from "@/lib/api"
import { lessonsApi, yellowCardsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { queryKeys } from "@/hooks/useQueryOptions"
import { ATTENDANCE_OPTIONS, GRADED_STATUSES } from "./constants"

const ATTENDANCE_ICONS = {
  present: <Check className="h-4 w-4" />,
  late: <Clock className="h-4 w-4" />,
  absent: <X className="h-4 w-4" />,
} as const

export function StudentRow({
  student,
  index,
  sessionId,
  disabled,
  isLate = false,
  yellowCards = [],
  yellowCardLimit = 2,
}: {
  student: SessionStudentRead
  index: number
  sessionId: number
  disabled: boolean
  isLate?: boolean
  yellowCards?: YellowCardRead[]
  yellowCardLimit?: number
}) {
  const queryClient = useQueryClient()

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    return () => clearTimeout(saveTimerRef.current)
  }, [])

  const mutation = useMutation({
    mutationFn: (data: { status: string }) =>
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

  const isAbsent = !GRADED_STATUSES.has(student.status as "present" | "late")
  const isUnmarked = student.status === "unmarked"
  const [photoOpen, setPhotoOpen] = useState(false)
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [cardReason, setCardReason] = useState("")
  const cardCount = yellowCards.length
  const isOverLimit = cardCount >= yellowCardLimit

  const issueMutation = useMutation({
    mutationFn: () =>
      yellowCardsApi.issue({
        student_id: student.student_id,
        session_id: sessionId,
        reason: cardReason.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.yellowCards(sessionId) })
      setCardReason("")
      setCardDialogOpen(false)
      toast.success("Sariq kartochka berildi")
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const removeMutation = useMutation({
    mutationFn: (cardId: number) => yellowCardsApi.remove(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.yellowCards(sessionId) })
      toast.success("Kartochka o'chirildi")
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const handleStatusChange = (newStatus: string) => {
    if (disabled) return
    const resolved = newStatus === student.status ? "unmarked" : newStatus
    mutation.mutate({ status: resolved })
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
      <div className="flex gap-3 w-56 justify-center">
        {ATTENDANCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            title={opt.label}
            onClick={() => handleStatusChange(opt.value)}
            className={cn(
              "h-9 w-9 rounded-full border flex items-center justify-center transition-all",
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

      {/* Yellow Card Button */}
      <button
        type="button"
        onClick={() => setCardDialogOpen(true)}
        title="Sariq kartochkalar"
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all select-none",
          isOverLimit
            ? "bg-[var(--imkon-red)] text-white"
            : "bg-[var(--imkon-red)]/70 hover:bg-[var(--imkon-red)]/85 text-white",
        )}
      >
        <span className="h-4 w-4 rounded-sm bg-white/30 shrink-0" />
        <span>Ogohlantirish {cardCount}/{yellowCardLimit}</span>
      </button>

      {/* Yellow Card Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
          {/* Header: big photo + name */}
          <div className="flex items-center gap-4 px-5 pt-5 pb-4">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage src={student.photo_url ?? undefined} className="object-cover" />
              <AvatarFallback className="text-lg font-bold">
                {student.first_name[0]}{student.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base font-bold leading-tight">
                {student.last_name} {student.first_name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bu chorak: {cardCount}/{yellowCardLimit} ta sariq kartochka
              </p>
            </div>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Card slots: limit ta uyacha, to'lganları sariq */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Hozirgi chorakdagi sariq kartochkalar:
              </p>
              <div className="flex gap-2">
                {Array.from({ length: yellowCardLimit }).map((_, i) => {
                  const card = yellowCards[i]
                  return card ? (
                    <div
                      key={card.id}
                      className="relative flex flex-col justify-between w-[72px] h-[88px] rounded-lg bg-yellow-400 p-2 shadow-sm"
                    >
                      <p className="text-[9px] font-medium text-yellow-900 leading-tight line-clamp-3">
                        {card.reason ?? "—"}
                      </p>
                      <p className="text-[8px] text-yellow-800/70 leading-tight">
                        {new Date(card.created_at).toLocaleDateString("uz-UZ")}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeMutation.mutate(card.id)}
                        disabled={removeMutation.isPending}
                        className="absolute top-1 right-1 h-4 w-4 rounded-full bg-yellow-900/15 hover:bg-yellow-900/30 flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5 text-yellow-900" />
                      </button>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="w-[72px] h-[88px] rounded-lg bg-muted/60 border border-dashed border-muted-foreground/20"
                    />
                  )
                })}
              </div>
            </div>

            {/* Issue new card */}
            {!disabled && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Izoh</p>
                <Textarea
                  value={cardReason}
                  onChange={(e) => setCardReason(e.target.value)}
                  placeholder="Sariq kartochka berilish sababini tasvirlab bering"
                  className="min-h-[90px] resize-none text-sm"
                />
                <Button
                  className="w-full bg-[var(--imkon-teal)] hover:bg-[var(--imkon-teal-dark)] text-white font-semibold"
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isPending || cardReason.trim().length === 0}
                >
                  {issueMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : "Kartochka berish"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo zoom dialog */}
      {student.photo_url && (
        <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
          <DialogContent className="flex items-center justify-center bg-transparent border-none shadow-none p-0 max-w-sm [&>button]:hidden">
            <div className="relative">
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="rounded-xl max-h-[80vh] max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setPhotoOpen(false)}
                className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-white/90 dark:bg-black/70 flex items-center justify-center shadow hover:bg-white transition-colors"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

