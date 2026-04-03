import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2, MapPin, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { SessionStudentRead, ViolationReportRead } from "@/lib/api"
import { violationsApi } from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { queryKeys, getViolationTypesQueryOptions } from "@/hooks/useQueryOptions"
import { cn } from "@/lib/utils"

export function ViolationReportDialog({
  student,
  sessionId,
  disabled,
  violations,
  open,
  onOpenChange,
}: {
  student: SessionStudentRead
  sessionId: number
  disabled: boolean
  violations: ViolationReportRead[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [location, setLocation] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const { data: violationTypes = [] } = useQuery(getViolationTypesQueryOptions())

  const selectedType = violationTypes.find((t) => t.id === selectedTypeId)

  const reportMutation = useMutation({
    mutationFn: () =>
      violationsApi.report({
        student_id: student.student_id,
        violation_type_id: selectedTypeId!,
        session_id: sessionId,
        note: note.trim() || null,
        location: location.trim() || null,
        occurred_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.violationReports(sessionId) })
      setSelectedTypeId(null)
      setNote("")
      setLocation("")
      onOpenChange(false)
      toast.success("Qoidabuzarlik haqida xabar berildi")
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const removeMutation = useMutation({
    mutationFn: (reportId: number) => violationsApi.remove(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.violationReports(sessionId) })
      toast.success("Xabar o'chirildi")
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const totalPoints = violations.reduce((sum, v) => sum + v.violation_type.points, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 text-center">
          <div className="flex justify-center mb-3">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={student.photo_url ?? undefined} className="object-cover" />
              <AvatarFallback className="text-lg font-bold">
                {student.first_name[0]}{student.last_name[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          <DialogTitle className="text-lg font-bold">
            Qoidabuzarlik haqida xabar berish
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {student.last_name} {student.first_name} uchun qoidabuzarlik turini tanlang va izoh qo'shing
          </p>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Existing violations */}
          {violations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Bu chorakdagi xabarlar ({violations.length} ta, {totalPoints} ball):
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1.5">
                {violations.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-red-700 dark:text-red-400 truncate">
                        {v.violation_type.name}
                      </p>
                      {v.note && (
                        <p className="text-red-600/70 dark:text-red-400/70 mt-0.5 line-clamp-1">{v.note}</p>
                      )}
                      <p className="text-red-500/50 mt-0.5">
                        {new Date(v.created_at).toLocaleDateString("uz-UZ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {v.violation_type.points}
                      </span>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => removeMutation.mutate(v.id)}
                          disabled={removeMutation.isPending}
                          className="h-5 w-5 rounded-full bg-red-200/50 hover:bg-red-200 flex items-center justify-center"
                        >
                          <X className="h-3 w-3 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issue new report */}
          {!disabled && (
            <div className="space-y-3">
              {/* Violation Type Selector */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Qoidabuzarlik turi</p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border bg-background text-sm text-left hover:bg-accent transition-colors"
                  >
                    <span className={cn("min-w-0", selectedType ? "text-foreground" : "text-muted-foreground")}>
                      <span className="block truncate">{selectedType?.name ?? "Qoidabuzarlik turini tanlang"}</span>
                      {selectedType?.description && (
                        <span className="block text-xs text-muted-foreground truncate">{selectedType.description}</span>
                      )}
                    </span>
                    <svg className={cn("h-4 w-4 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                      {violationTypes.length === 0 ? (
                        <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                          Admin hali qoidabuzarlik turlari yaratmagan
                        </p>
                      ) : (
                        violationTypes.map((vt) => (
                          <button
                            key={vt.id}
                            type="button"
                            onClick={() => {
                              setSelectedTypeId(vt.id)
                              setDropdownOpen(false)
                            }}
                            className={cn(
                              "w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-0",
                              selectedTypeId === vt.id && "bg-accent",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold truncate">{vt.name}</p>
                              {vt.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{vt.description}</p>
                              )}
                            </div>
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                              {vt.points}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Note */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Izoh</p>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Izohni kiriting"
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Qoidabuzarlik yuz bergan joy</p>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Qoidabuzarlik yuz bergan joyni kiriting"
                    className="pl-8 text-sm"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                className="w-full bg-[var(--imkon-teal)] hover:bg-[var(--imkon-teal-dark)] text-white font-semibold"
                onClick={() => reportMutation.mutate()}
                disabled={reportMutation.isPending || !selectedTypeId}
              >
                {reportMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Xabar berish
                    </>
                  )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
