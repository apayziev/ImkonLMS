import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CalendarDays, Loader2, Plus, Settings, Trash2 } from "lucide-react"
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
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-1.5" />
            Sozlamalar
          </Button>
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
        <EmptyState message="Dars vaqtlari hali kiritilmagan." />
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
                const breakName = settings?.break_names?.[String(slot.period_number)]
                const hasCustomName = !!breakName

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
                        <div className={`text-[10px] mt-1 ${hasCustomName ? "text-[#6720FF] font-medium" : "text-muted-foreground/60"}`}>
                          {breakName || "Tanaffus"} {breakMin} min
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
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        academicYearId={academicYearId}
        timeSlots={timeSlots}
      />

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
  academicYearId,
  timeSlots,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: SchoolSettingsRead | undefined
  academicYearId: number
  timeSlots: TimeSlotRead[]
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SchoolSettingsUpdate>({})
  const [newSlot, setNewSlot] = useState({ period: "", start: "", end: "" })

  const defaults = {
    lesson_duration_minutes: 45,
    short_break_minutes: 10,
    long_break_minutes: 25,
    long_break_after_period: 3,
    periods_per_day: 6,
    working_days: [1, 2, 3, 4, 5, 6],
    break_names: {} as Record<string, string>,
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

  const createSlotMutation = useMutation({
    mutationFn: timetableApi.createTimeSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeSlots })
      toast.success("Dars vaqti qo'shildi")
      setNewSlot({ period: "", start: "", end: "" })
    },
    onError: () => toast.error("Bu dars raqami allaqachon mavjud"),
  })

  const deleteSlotMutation = useMutation({
    mutationFn: timetableApi.deleteTimeSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeSlots })
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      toast.success("Dars vaqti o'chirildi")
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

  const handleAddSlot = () => {
    if (!newSlot.period || !newSlot.start || !newSlot.end || !academicYearId) return
    createSlotMutation.mutate({
      academic_year_id: academicYearId,
      period_number: Number(newSlot.period),
      start_time: newSlot.start,
      end_time: newSlot.end,
    })
  }

  const currentDays = form.working_days ?? current.working_days
  const toggleDay = (day: number) => {
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort()
    if (newDays.length > 0) setForm((prev) => ({ ...prev, working_days: newDays }))
  }

  const sortedSlots = [...timeSlots].sort((a, b) => a.period_number - b.period_number)

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setForm({}) }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Maktab sozlamalari</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          {/* ─── Time Slots ─── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Dars vaqtlari</Label>
            {sortedSlots.length > 0 ? (
              <div className="space-y-1.5">
                {sortedSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium text-primary">{slot.period_number}-dars</span>
                      <span className="text-muted-foreground ml-2">
                        {slot.start_time} – {slot.end_time}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSlotMutation.mutate(slot.id)}
                      disabled={deleteSlotMutation.isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Hali dars vaqtlari kiritilmagan</p>
            )}
            {/* Add new time slot */}
            <div className="flex items-end gap-2 pt-1">
              <div className="w-16">
                <Label className="text-[10px] text-muted-foreground">Dars №</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  placeholder="1"
                  value={newSlot.period}
                  onChange={(e) => setNewSlot((p) => ({ ...p, period: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Boshlanish</Label>
                <Input
                  type="time"
                  value={newSlot.start}
                  onChange={(e) => setNewSlot((p) => ({ ...p, start: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Tugash</Label>
                <Input
                  type="time"
                  value={newSlot.end}
                  onChange={(e) => setNewSlot((p) => ({ ...p, end: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2"
                onClick={handleAddSlot}
                disabled={createSlotMutation.isPending || !newSlot.period || !newSlot.start || !newSlot.end}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold">Umumiy sozlamalar</Label>
          </div>

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

          {/* Break names */}
          <div className="space-y-2">
            <Label>Tanaffus nomlari</Label>
            <p className="text-[10px] text-muted-foreground">
              Darsdan keyin maxsus tanaffus bo'lsa, nom kiriting (masalan: Nonushta, Tushlik, Tolma choy)
            </p>
            {sortedSlots.length > 0 ? (
              <div className="space-y-1.5">
                {sortedSlots.slice(0, -1).map((slot) => {
                  const currentBreakNames = form.break_names ?? current.break_names
                  const name = currentBreakNames[String(slot.period_number)] ?? ""
                  return (
                    <div key={slot.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">
                        {slot.period_number}-dars →
                      </span>
                      <Input
                        placeholder="Tanaffus"
                        value={name}
                        onChange={(e) => {
                          const updated = { ...(form.break_names ?? current.break_names) }
                          if (e.target.value) {
                            updated[String(slot.period_number)] = e.target.value
                          } else {
                            delete updated[String(slot.period_number)]
                          }
                          setForm((p) => ({ ...p, break_names: updated }))
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Avval dars vaqtlarini qo'shing</p>
            )}
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
