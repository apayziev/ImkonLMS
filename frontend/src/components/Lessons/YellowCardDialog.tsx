import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { SessionStudentRead, YellowCardRead } from "@/lib/api"
import { yellowCardsApi } from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { queryKeys } from "@/hooks/useQueryOptions"

export function YellowCardDialog({
  student,
  sessionId,
  disabled,
  yellowCards,
  yellowCardLimit,
  open,
  onOpenChange,
}: {
  student: SessionStudentRead
  sessionId: number
  disabled: boolean
  yellowCards: YellowCardRead[]
  yellowCardLimit: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [cardReason, setCardReason] = useState("")
  const cardCount = yellowCards.length

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
      onOpenChange(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-sm p-0 overflow-hidden gap-0">
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
          {/* Card slots */}
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
  )
}
