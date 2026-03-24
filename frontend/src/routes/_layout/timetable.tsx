import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CalendarDays, ChevronDown, Info, Loader2, Settings, Trash2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import type React from "react"
import { useMemo, useState } from "react"
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
  const [gradeFilter, setGradeFilter] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [entryDialog, setEntryDialog] = useState<EntryDialogState | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)

  // Data queries
  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const { data: settings } = useQuery(getSchoolSettingsQueryOptions())
  const { data: gradesData } = useQuery(getGradesQueryOptions())
  const { data: subjectsData } = useQuery(getSubjectsQueryOptions())
  const { data: teachersData } = useQuery(getTeachersQueryOptions())
  const academicYearId = currentYear?.id ?? 0

  const { data: timeSlotsData } = useQuery(getTimeSlotsQueryOptions(academicYearId))

  const selectedGradeId = gradeFilter ?? grades[0]?.id?.toString() ?? null
  const gradeId = selectedGradeId ? Number(selectedGradeId) : undefined
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

  // ─── Stats ────────────────────────────────────────────────────────
  const statsData = useMemo(() => {
    if (!entries.length) return null

    const subjectMap = new Map<string, { count: number; teacher: string }>()
    for (const e of entries) {
      const subj = e.subject_name ?? "Noma'lum"
      const existing = subjectMap.get(subj)
      if (existing) {
        existing.count++
      } else {
        subjectMap.set(subj, { count: 1, teacher: e.teacher_name ?? "—" })
      }
    }
    const selectedGrade = grades.find((g) => g.id.toString() === selectedGradeId)
    return {
      mode: "grade" as const,
      gradeName: selectedGrade?.display_name ?? "Sinf",
      total: entries.length,
      subjects: [...subjectMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, { count, teacher }]) => ({ name, count, teacher })),
    }
  }, [entries, selectedGradeId, grades])

  // ─── Mutations ──────────────────────────────────────────────────────

  const createEntryMutation = useMutation({
    mutationFn: timetableApi.createEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      toast.success("Dars qo'shildi")
      setEntryDialog(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Bu vaqtda sinf yoki o'qituvchi band"),
  })

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { subject_id?: number; teacher_id?: number } }) =>
      timetableApi.updateEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      toast.success("Dars yangilandi")
      setEntryDialog(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Bu vaqtda sinf yoki o'qituvchi band"),
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
    if (!isAdmin || !selectedGradeId) return
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
          {statsData && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatsOpen(true)}
            >
              <Info className="h-4 w-4 mr-1.5" />
              Batafsil
            </Button>
          )}
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
        {grades.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGradeFilter(g.id.toString())}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedGradeId === g.id.toString()
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
            }`}
          >
            {g.display_name}
          </button>
        ))}
      </div>

      {/* ─── Batafsil Sheet ─── */}
      <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {statsData ? `${statsData.gradeName} — Haftalik jadval` : "Statistika"}
            </SheetTitle>
            <SheetDescription>
              {`Jami ${statsData?.total ?? 0} ta dars`}
            </SheetDescription>
          </SheetHeader>

          {statsData ? (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-3 py-2 font-medium">Fan</th>
                    <th className="text-left px-3 py-2 font-medium">O'qituvchi</th>
                    <th className="text-center px-3 py-2 font-medium w-20">Soat</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.subjects.map((s) => (
                    <tr key={s.name} className="border-b last:border-0">
                      <td className="px-3 py-1.5">{s.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{s.teacher}</td>
                      <td className="px-3 py-1.5 text-center font-medium">{s.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-medium">
                    <td className="px-3 py-1.5" colSpan={2}>Jami</td>
                    <td className="px-3 py-1.5 text-center">{statsData.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ─── Settings Section ─── */}
      {isAdmin && settingsOpen && (
        <SettingsSection
          key={settings?.updated_at ?? "new"}
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

          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] table-fixed">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="h-11 px-3 text-center align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">
                  Vaqt
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="h-11 px-3 text-center align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider"
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
                        <div className="text-sm font-semibold text-primary">
                          {slot.period_number}-soat
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {slot.start_time} – {slot.end_time}
                        </div>
                      </td>

                      {/* Day cells */}
                      {days.map((day) => {
                        const key = `${day}-${slot.id}`
                        const canClick = isAdmin

                        const entry = cellMap.get(key)
                        return (
                          <td key={day} className="px-1.5 py-1.5 align-top border-r last:border-r-0">
                            {entry ? (
                              <ScheduleCell
                                entry={entry}
                                subtitle={entry.teacher_name}
                                onClick={canClick ? () => handleCellClick(day, slot.id) : undefined}
                              />
                            ) : (
                              <button
                                type="button"
                                className={`h-16 w-full rounded-lg flex items-center justify-center transition-colors ${
                                  canClick
                                    ? "hover:bg-primary/5 cursor-pointer group"
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
                      <tr key={`brk-${slot.id}`} className="border-b bg-muted/30">
                        <td className="px-3 py-1.5 text-center border-r bg-muted/30">
                          <div className="text-xs font-medium text-muted-foreground">
                            {brk.name || "Tanaffus"}
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            {brk.minutes} min
                          </div>
                        </td>
                        {days.map((day) => (
                          <td key={day} className="border-r last:border-r-0 bg-muted/30" />
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
          gradeId={Number(selectedGradeId)}
          subjects={subjects}
          teachers={teachers}
          timeSlots={sorted}
          onSave={(subjectId, teacherId) => {
            if (entryDialog.mode === "create") {
              createEntryMutation.mutate({
                academic_year_id: academicYearId,
                grade_id: Number(selectedGradeId),
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
  subtitle,
  onClick,
}: {
  entry: ScheduleEntryRead
  subtitle?: string | null
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
      <div className="text-sm font-semibold truncate">
        {entry.subject_name ?? "—"}
      </div>
      <div className="text-xs text-muted-foreground truncate mt-0.5">
        {subtitle ?? "—"}
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
