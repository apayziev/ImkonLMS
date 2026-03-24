import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CalendarDays, Loader2, Plus, Settings, Trash2, Wand2 } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"

import type {
  GradeRead,
  ScheduleEntryRead,
  SchoolSettingsRead,
  SchoolSettingsUpdate,
  SubjectRead,
  TeacherRead,
  TimeSlotRead,
} from "@/lib/api"
import { timetableApi } from "@/lib/api"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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

export const Route = createFileRoute("/_layout/timetable")({
  component: TimetablePage,
  head: () => ({
    meta: [{ title: "Dars jadvali - IMKON LMS" }],
  }),
})

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_NAMES: Record<number, string> = {
  1: "Dushanba",
  2: "Seshanba",
  3: "Chorshanba",
  4: "Payshanba",
  5: "Juma",
  6: "Shanba",
  7: "Yakshanba",
}

const DAY_SHORT: Record<number, string> = {
  1: "Dush",
  2: "Sesh",
  3: "Chor",
  4: "Pay",
  5: "Jum",
  6: "Shan",
  7: "Yak",
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface EntryDialogState {
  open: boolean
  mode: "create" | "edit"
  day: number
  slotId: number
  entry?: ScheduleEntryRead
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildGrid(
  timeSlots: TimeSlotRead[],
  entries: ScheduleEntryRead[],
  workingDays: number[],
) {
  // Map: "day-slotId" → entry
  const cellMap = new Map<string, ScheduleEntryRead>()
  for (const entry of entries) {
    cellMap.set(`${entry.day_of_week}-${entry.time_slot_id}`, entry)
  }
  const sorted = [...timeSlots].sort((a, b) => a.period_number - b.period_number)
  return { sorted, cellMap, days: workingDays }
}

function getBreakMinutes(
  currentSlot: TimeSlotRead,
  nextSlot: TimeSlotRead | undefined,
): number | null {
  if (!nextSlot) return null
  const [ch, cm] = currentSlot.end_time.split(":").map(Number)
  const [nh, nm] = nextSlot.start_time.split(":").map(Number)
  const diff = (nh * 60 + nm) - (ch * 60 + cm)
  return diff > 0 ? diff : null
}

// ─── Page ───────────────────────────────────────────────────────────────────

function TimetablePage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.is_superuser ?? false

  // UI state
  const [gradeFilter, setGradeFilter] = useState("all")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [startTime, setStartTime] = useState("08:00")
  const [entryDialog, setEntryDialog] = useState<EntryDialogState | null>(null)

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

  const grades: GradeRead[] = gradesData?.data ?? []
  const subjects = subjectsData?.data ?? []
  const teachers = teachersData?.data ?? []
  const timeSlots = timeSlotsData?.data ?? []
  const entries = scheduleData?.data ?? []
  const workingDays = settings?.working_days ?? [1, 2, 3, 4, 5, 6]

  const { sorted, cellMap, days } = buildGrid(timeSlots, entries, workingDays)

  // ─── Mutations ──────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: (data: { academic_year_id: number; start_time: string }) =>
      timetableApi.generateTimeSlots(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeSlots })
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      toast.success("Dars vaqtlari yaratildi")
      setGenerateOpen(false)
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

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
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-1.5" />
              Sozlamalar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateOpen(true)}
              disabled={!academicYearId}
            >
              <Wand2 className="h-4 w-4 mr-1.5" />
              Vaqtlarni yaratish
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Sinf tanlang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha sinflar</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id.toString()}>
                {g.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && gradeFilter === "all" && sorted.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Dars qo'shish uchun sinf tanlang
          </p>
        )}
      </div>

      {/* Timetable Grid */}
      {!academicYearId ? (
        <EmptyState message="Joriy o'quv yili topilmadi. Avval sync qiling." />
      ) : isLoading ? (
        <GridSkeleton days={days.length} rows={6} />
      ) : sorted.length === 0 ? (
        <EmptyState
          message="Dars vaqtlari hali kiritilmagan."
          action={
            isAdmin ? (
              <Button variant="outline" className="mt-4" onClick={() => setGenerateOpen(true)}>
                <Wand2 className="h-4 w-4 mr-1.5" />
                Vaqtlarni yaratish
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-24">
                  Vaqt
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="h-12 px-3 text-center align-middle font-medium text-muted-foreground"
                  >
                    <span className="hidden sm:inline">{DAY_NAMES[day]}</span>
                    <span className="sm:hidden">{DAY_SHORT[day]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((slot, idx) => {
                const breakMin = getBreakMinutes(slot, sorted[idx + 1])
                const isLongBreak = breakMin !== null && settings
                  ? breakMin >= settings.long_break_minutes
                  : false

                return (
                  <tr key={slot.id} className="border-b last:border-0">
                    {/* Period + Time */}
                    <td className="px-3 py-2 align-top">
                      <div className="text-xs font-semibold text-primary">
                        {slot.period_number}-dars
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {slot.start_time} – {slot.end_time}
                      </div>
                      {breakMin !== null && (
                        <div className={`text-[10px] mt-1 ${isLongBreak ? "text-[#6720FF] font-medium" : "text-muted-foreground/60"}`}>
                          {isLongBreak ? "Tushlik" : "Tanaffus"} {breakMin} min
                        </div>
                      )}
                    </td>

                    {/* Day cells */}
                    {days.map((day) => {
                      const entry = cellMap.get(`${day}-${slot.id}`)
                      const canClick = isAdmin && gradeFilter !== "all"
                      return (
                        <td key={day} className="px-1.5 py-1.5 align-top">
                          {entry ? (
                            <ScheduleCell
                              entry={entry}
                              onClick={canClick ? () => handleCellClick(day, slot.id) : undefined}
                            />
                          ) : (
                            <button
                              type="button"
                              className={`h-14 w-full rounded-md border border-dashed border-border/50 flex items-center justify-center transition-colors ${
                                canClick
                                  ? "hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                                  : "cursor-default"
                              }`}
                              onClick={canClick ? () => handleCellClick(day, slot.id) : undefined}
                              disabled={!canClick}
                            >
                              {canClick ? (
                                <Plus className="h-4 w-4 text-muted-foreground/40" />
                              ) : (
                                <span className="text-xs text-muted-foreground/40">—</span>
                              )}
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Settings Sheet ─── */}
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} />

      {/* ─── Generate Dialog ─── */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Dars vaqtlarini yaratish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sozlamalar asosida dars vaqtlari avtomatik hisoblanadi.
            {timeSlots.length > 0 && " Mavjud vaqtlar o'chiriladi."}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="start-time">Birinchi dars boshlanish vaqti</Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-32"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => {
                if (!academicYearId) return
                generateMutation.mutate({ academic_year_id: academicYearId, start_time: startTime })
              }}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Yaratish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// ─── SettingsSheet ──────────────────────────────────────────────────────────

function SettingsSheet({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: SchoolSettingsRead | undefined
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SchoolSettingsUpdate>({})

  const defaults = {
    lesson_duration_minutes: 45,
    short_break_minutes: 10,
    long_break_minutes: 25,
    long_break_after_period: 3,
    periods_per_day: 6,
    working_days: [1, 2, 3, 4, 5, 6],
  }
  const current = settings ?? defaults

  const updateMutation = useMutation({
    mutationFn: (data: SchoolSettingsUpdate) => timetableApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolSettings })
      toast.success("Sozlamalar saqlandi")
      onOpenChange(false)
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const handleSave = () => {
    if (Object.keys(form).length === 0) {
      onOpenChange(false)
      return
    }
    updateMutation.mutate(form)
  }

  const currentDays = form.working_days ?? current.working_days
  const toggleDay = (day: number) => {
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort()
    if (newDays.length > 0) setForm((prev) => ({ ...prev, working_days: newDays }))
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setForm({}) }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Maktab sozlamalari</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label>Dars davomiyligi (min)</Label>
            <Input
              type="number"
              min={15}
              max={120}
              value={form.lesson_duration_minutes ?? current.lesson_duration_minutes}
              onChange={(e) => setForm((p) => ({ ...p, lesson_duration_minutes: +e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kichik tanaffus (min)</Label>
            <Input
              type="number"
              min={5}
              max={30}
              value={form.short_break_minutes ?? current.short_break_minutes}
              onChange={(e) => setForm((p) => ({ ...p, short_break_minutes: +e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Katta tanaffus (min)</Label>
            <Input
              type="number"
              min={10}
              max={60}
              value={form.long_break_minutes ?? current.long_break_minutes}
              onChange={(e) => setForm((p) => ({ ...p, long_break_minutes: +e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Katta tanaffus nechchi darsdan keyin</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.long_break_after_period ?? current.long_break_after_period}
              onChange={(e) => setForm((p) => ({ ...p, long_break_after_period: +e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kuniga darslar soni</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={form.periods_per_day ?? current.periods_per_day}
              onChange={(e) => setForm((p) => ({ ...p, periods_per_day: +e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ish kunlari</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    currentDays.includes(day)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {DAY_SHORT[day]}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full mt-4">
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Saqlash
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── EntryDialog ────────────────────────────────────────────────────────────

function EntryDialog({
  state,
  onOpenChange,
  subjects,
  teachers,
  timeSlots,
  onSave,
  onDelete,
  isPending,
  isDeleting,
}: {
  state: EntryDialogState
  onOpenChange: (open: boolean) => void
  academicYearId: number
  gradeId: number
  subjects: SubjectRead[]
  teachers: TeacherRead[]
  timeSlots: TimeSlotRead[]
  onSave: (subjectId: number, teacherId: number) => void
  onDelete: () => void
  isPending: boolean
  isDeleting: boolean
}) {
  const slot = timeSlots.find((s) => s.id === state.slotId)
  const [subjectId, setSubjectId] = useState(state.entry?.subject_id?.toString() ?? "")
  const [teacherId, setTeacherId] = useState(state.entry?.teacher_id?.toString() ?? "")
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state.mode === "create" ? "Dars qo'shish" : "Darsni tahrirlash"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info (readonly) */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Kun</span>
              <p className="font-medium">{DAY_NAMES[state.day]}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Vaqt</span>
              <p className="font-medium">
                {slot ? `${slot.period_number}-dars (${slot.start_time}–${slot.end_time})` : "—"}
              </p>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label>Fan</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Fan tanlang" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teacher */}
          <div className="space-y-1.5">
            <Label>O'qituvchi</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="O'qituvchi tanlang" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          {state.mode === "edit" && (
            confirmDelete ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                  Yo'q
                </Button>
                <Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Ha, o'chirish
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                O'chirish
              </Button>
            )
          )}
          <Button
            onClick={() => {
              if (subjectId && teacherId) onSave(Number(subjectId), Number(teacherId))
            }}
            disabled={!subjectId || !teacherId || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      className={`h-14 rounded-md bg-primary/5 border border-primary/10 px-2 py-1.5 flex flex-col justify-center transition-colors ${
        onClick ? "hover:bg-primary/10 cursor-pointer" : ""
      }`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="text-xs font-medium truncate">{entry.subject_name ?? "—"}</div>
      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
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
