import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CalendarDays, ChevronDown, Loader2, Settings, Trash2 } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"

import type { GradeRead, ScheduleEntryRead } from "@/lib/api"
import { timetableApi } from "@/lib/api"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getCurrentAcademicYearQueryOptions,
  getGradesQueryOptions,
  getScheduleQueryOptions,
  getSchoolSettingsQueryOptions,
  getSubjectsQueryOptions,
  getTeachersQueryOptions,
  getTimeSlotsQueryOptions,
  queryKeys,
} from "@/hooks/useQueryOptions"
import { EntryDialog } from "@/components/timetable/entry-dialog"
import { DAY_NAMES, buildGrid, getBreakInfo, type EntryDialogState } from "@/components/timetable/helpers"
import { SettingsSection } from "@/components/timetable/settings-section"

export const Route = createFileRoute("/_layout/timetable")({
  component: TimetablePage,
  head: () => ({
    meta: [{ title: "Dars jadvali - IMKON LMS" }],
  }),
})

// ─── Page ───────────────────────────────────────────────────────────────────

function TimetablePage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.is_superuser ?? false

  // UI state
  const [gradeFilter, setGradeFilter] = useState("all")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [entryDialog, setEntryDialog] = useState<EntryDialogState | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  // Data queries
  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const { data: settings } = useQuery(getSchoolSettingsQueryOptions())
  const { data: gradesData } = useQuery(getGradesQueryOptions())
  const { data: subjectsData } = useQuery(getSubjectsQueryOptions())
  const { data: teachersData } = useQuery(getTeachersQueryOptions())
  const academicYearId = currentYear?.id ?? 0

  const { data: timeSlotsData } = useQuery(getTimeSlotsQueryOptions(academicYearId))

  const gradeId = gradeFilter !== "all" ? Number(gradeFilter) : undefined
  const { data: scheduleData, isLoading } = useQuery(
    getScheduleQueryOptions({
      academic_year_id: academicYearId,
      grade_id: gradeId,
    }),
  )

  const grades: GradeRead[] = [...(gradesData?.data ?? [])].sort((a: GradeRead, b: GradeRead) =>
    a.level !== b.level ? a.level - b.level : a.section.localeCompare(b.section),
  )
  const subjects = subjectsData?.data ?? []
  const teachers = teachersData?.data ?? []
  const timeSlots = timeSlotsData?.data ?? []
  const entries = scheduleData?.data ?? []
  const workingDays = settings?.working_days ?? [1, 2, 3, 4, 5, 6]
  const settingsBreaks = settings?.breaks ?? []

  const { sorted, cellMap, days } = buildGrid(timeSlots, entries, workingDays)

  // ─── Mutations ──────────────────────────────────────────────────────

  const createEntryMutation = useMutation({
    mutationFn: timetableApi.createEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      toast.success("Dars qo'shildi")
      setEntryDialog(null)
    },
    onError: () => toast.error("Bu vaqtda sinf yoki o'qituvchi band"),
  })

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { subject_id?: number; teacher_id?: number } }) =>
      timetableApi.updateEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      toast.success("Dars yangilandi")
      setEntryDialog(null)
    },
    onError: () => toast.error("Bu vaqtda sinf yoki o'qituvchi band"),
  })

  const deleteEntryMutation = useMutation({
    mutationFn: timetableApi.deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      toast.success("Dars o'chirildi")
      setEntryDialog(null)
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const clearSlotsMutation = useMutation({
    mutationFn: () => timetableApi.deleteAllTimeSlots(academicYearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeSlots })
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      toast.success("Jadval tozalandi")
      setConfirmClear(false)
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleCellClick = (day: number, slotId: number) => {
    if (!isAdmin || gradeFilter === "all") return
    const existing = cellMap.get(`${day}-${slotId}`)
    if (existing) {
      setEntryDialog({ open: true, mode: "edit", day, slotId, entry: existing })
    } else {
      setEntryDialog({ open: true, mode: "create", day, slotId })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Dars jadvali
          </h1>
          <p className="text-muted-foreground text-sm">
            Haftalik dars jadvali — {currentYear?.name ?? "O'quv yili tanlanmagan"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <Settings className="h-4 w-4 mr-1.5" />
              Sozlamalar
              <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </Button>
          )}
          {isAdmin && sorted.length > 0 && (
            confirmClear ? (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setConfirmClear(false)}>
                  Bekor
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => clearSlotsMutation.mutate()}
                  disabled={clearSlotsMutation.isPending}
                >
                  {clearSlotsMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Ha, tozalash
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Tozalash
              </Button>
            )
          )}
        </div>
      </div>

      {/* ─── Class Chips ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Sinf:</span>
        <button
          type="button"
          onClick={() => setGradeFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            gradeFilter === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
          }`}
        >
          Barchasi
        </button>
        {grades.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGradeFilter(g.id.toString())}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              gradeFilter === g.id.toString()
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
            }`}
          >
            {g.display_name}
          </button>
        ))}
      </div>

      {/* ─── Settings Section ─── */}
      {isAdmin && settingsOpen && (
        <SettingsSection
          key={settings?.id ?? 0}
          settings={settings}
          academicYearId={academicYearId}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Timetable Grid */}
      {!academicYearId ? (
        <EmptyState message="Joriy o'quv yili topilmadi. Avval sync qiling." />
      ) : isLoading ? (
        <GridSkeleton days={days.length} rows={6} />
      ) : sorted.length === 0 ? (
        <EmptyState
          message="Dars vaqtlari hali kiritilmagan."
          action={isAdmin ? (
            <Button size="sm" className="mt-3" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-1.5" />
              Sozlamalar
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {gradeFilter === "all" && isAdmin && (
            <div className="rounded-md bg-muted/50 border border-dashed px-4 py-2.5 text-sm text-muted-foreground">
              Sinf tanlang, keyin katakka bosib <span className="font-medium text-foreground">fan va o'qituvchi</span> biriktiring
            </div>
          )}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="h-11 px-3 text-center align-middle text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">
                  Vaqt
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="h-11 px-3 text-center align-middle text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {DAY_NAMES[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((slot, idx) => {
                const brk = getBreakInfo(slot, sorted[idx + 1], settingsBreaks)

                return (
                  <>
                    <tr key={slot.id} className="border-b last:border-0">
                      {/* Period + Time */}
                      <td className="px-3 py-2 align-middle border-r bg-muted/30" style={{ minHeight: 76 }}>
                        <div className="text-[11px] font-semibold text-primary font-mono">
                          {slot.period_number}-soat
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {slot.start_time} – {slot.end_time}
                        </div>
                      </td>

                      {/* Day cells */}
                      {days.map((day) => {
                        const entry = cellMap.get(`${day}-${slot.id}`)
                        const canClick = isAdmin && gradeFilter !== "all"
                        return (
                          <td key={day} className="px-1.5 py-1.5 align-top border-r last:border-r-0">
                            {entry ? (
                              <ScheduleCell
                                entry={entry}
                                onClick={canClick ? () => handleCellClick(day, slot.id) : undefined}
                              />
                            ) : (
                              <button
                                type="button"
                                className={`h-16 w-full rounded-lg flex items-center justify-center transition-colors ${
                                  canClick
                                    ? "hover:bg-[#FFF0EE] cursor-pointer group"
                                    : "cursor-default"
                                }`}
                                onClick={canClick ? () => handleCellClick(day, slot.id) : undefined}
                                disabled={!canClick}
                              >
                                {canClick && (
                                  <span className="text-xl text-muted-foreground/30 group-hover:text-primary transition-colors">+</span>
                                )}
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>

                    {/* Break row */}
                    {brk && (
                      <tr key={`brk-${slot.id}`} className="border-b" style={{ background: "#FDF8F0" }}>
                        <td className="px-3 py-1.5 text-center border-r" style={{ background: "#FDF8F0" }}>
                          <div className="text-[11px] font-medium" style={{ color: "#D97706" }}>
                            {brk.name || "Tanaffus"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {brk.minutes} min
                          </div>
                        </td>
                        {days.map((day) => (
                          <td key={day} className="border-r last:border-r-0" style={{ background: "#FDF8F0" }} />
                        ))}
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
        </div>
      )}

      {/* ─── Entry Dialog ─── */}
      {entryDialog && (
        <EntryDialog
          key={`${entryDialog.day}-${entryDialog.slotId}`}
          state={entryDialog}
          onOpenChange={(open) => !open && setEntryDialog(null)}
          academicYearId={academicYearId}
          gradeId={Number(gradeFilter)}
          subjects={subjects}
          teachers={teachers}
          timeSlots={sorted}
          onSave={(subjectId, teacherId) => {
            if (entryDialog.mode === "create") {
              createEntryMutation.mutate({
                academic_year_id: academicYearId,
                grade_id: Number(gradeFilter),
                subject_id: subjectId,
                teacher_id: teacherId,
                time_slot_id: entryDialog.slotId,
                day_of_week: entryDialog.day,
              })
            } else if (entryDialog.entry) {
              updateEntryMutation.mutate({
                id: entryDialog.entry.id,
                data: { subject_id: subjectId, teacher_id: teacherId },
              })
            }
          }}
          onDelete={() => {
            if (entryDialog.entry) deleteEntryMutation.mutate(entryDialog.entry.id)
          }}
          isPending={createEntryMutation.isPending || updateEntryMutation.isPending}
          isDeleting={deleteEntryMutation.isPending}
        />
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScheduleCell({
  entry,
  onClick,
}: {
  entry: ScheduleEntryRead
  onClick?: () => void
}) {
  return (
    <div
      className={`h-16 rounded-lg relative overflow-hidden px-2.5 py-1.5 flex flex-col justify-center transition-all bg-primary/5 border border-primary/15 ${
        onClick ? "hover:shadow-sm hover:-translate-y-px cursor-pointer" : ""
      }`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-primary" />
      <div className="text-[13px] font-semibold truncate">
        {entry.subject_name ?? "—"}
      </div>
      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
        {entry.teacher_name ?? "—"}
      </div>
    </div>
  )
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <CalendarDays className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
      <p className="text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}

function GridSkeleton({ days, rows }: { days: number; rows: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/40 h-12 flex items-center px-3 gap-4 border-b">
        <Skeleton className="h-4 w-16" />
        {Array.from({ length: days }, (_, i) => (
          <Skeleton key={i} className="h-4 w-20 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center px-3 py-2 gap-4 border-b last:border-0">
          <Skeleton className="h-10 w-16" />
          {Array.from({ length: days }, (_, d) => (
            <Skeleton key={d} className="h-14 flex-1 rounded-md" />
          ))}
        </div>
      ))}
    </div>
  )
}
