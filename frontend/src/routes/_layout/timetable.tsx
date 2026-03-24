import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CalendarDays, Loader2, Plus, RefreshCw, Settings, Trash2 } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"

import type {
  BreakItem,
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
  const cellMap = new Map<string, ScheduleEntryRead>()
  for (const entry of entries) {
    cellMap.set(`${entry.day_of_week}-${entry.time_slot_id}`, entry)
  }
  const sorted = [...timeSlots].sort((a, b) => a.period_number - b.period_number)
  return { sorted, cellMap, days: workingDays }
}

function getBreakInfo(
  currentSlot: Pick<TimeSlotRead, "period_number" | "end_time" | "start_time">,
  nextSlot: Pick<TimeSlotRead, "start_time"> | undefined,
  breaks: BreakItem[],
): { minutes: number; name: string } | null {
  if (!nextSlot) return null
  const [ch, cm] = currentSlot.end_time.split(":").map(Number)
  const [nh, nm] = nextSlot.start_time.split(":").map(Number)
  const diff = (nh * 60 + nm) - (ch * 60 + cm)
  if (diff <= 0) return null
  const brk = breaks.find((b) => b.after_period === currentSlot.period_number)
  return { minutes: diff, name: brk?.name || "" }
}

/** Generate preview slots from settings (pure function, same logic as backend). */
function generatePreviewSlots(
  dayStart: string,
  dayEnd: string,
  lessonDur: number,
  defaultBreak: number,
  breaks: BreakItem[],
): { period_number: number; start_time: string; end_time: string }[] {
  const breaksMap = new Map<number, BreakItem>()
  for (const b of breaks) breaksMap.set(b.after_period, b)

  const [sh, sm] = dayStart.split(":").map(Number)
  const [eh, em] = dayEnd.split(":").map(Number)
  let cursor = sh * 60 + sm
  const endMin = eh * 60 + em

  // Break before first lesson (after_period=0)
  const pre = breaksMap.get(0)
  if (pre) cursor += pre.duration

  const result: { period_number: number; start_time: string; end_time: string }[] = []
  let period = 1

  while (cursor + lessonDur <= endMin) {
    const start = cursor
    const end = cursor + lessonDur
    result.push({
      period_number: period,
      start_time: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
      end_time: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
    })
    cursor = end
    period++
    const brk = breaksMap.get(period - 1)
    cursor += brk ? brk.duration : defaultBreak
  }

  return result
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
        <EmptyState
          message="Dars vaqtlari hali kiritilmagan."
          action={isAdmin ? (
            <Button size="sm" className="mt-3" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-1.5" />
              Sozlamalar orqali generatsiya qilish
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="h-12 px-3 text-left align-middle font-medium text-muted-foreground w-28">
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
                const brk = getBreakInfo(slot, sorted[idx + 1], settingsBreaks)

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
                      {brk && (
                        <div className={`text-[10px] mt-1 ${brk.name ? "text-[#6720FF] font-medium" : "text-muted-foreground/60"}`}>
                          {brk.name || "Tanaffus"} {brk.minutes} min
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: SchoolSettingsRead | undefined
  academicYearId: number
}) {
  const queryClient = useQueryClient()

  const defaults: SchoolSettingsRead = {
    id: 0,
    day_start_time: "08:00",
    day_end_time: "16:00",
    lesson_duration_minutes: 45,
    default_break_minutes: 5,
    periods_per_day: 6,
    working_days: [1, 2, 3, 4, 5, 6],
    breaks: [],
    created_at: "",
    updated_at: null,
  }
  const current = settings ?? defaults

  const [dayStart, setDayStart] = useState(current.day_start_time)
  const [dayEnd, setDayEnd] = useState(current.day_end_time)
  const [lessonDur, setLessonDur] = useState(current.lesson_duration_minutes)
  const [defaultBreak, setDefaultBreak] = useState(current.default_break_minutes)
  const [breaks, setBreaks] = useState<BreakItem[]>(current.breaks)
  const [workingDays, setWorkingDays] = useState(current.working_days)
  const [newBreak, setNewBreak] = useState({ after: "", dur: "", name: "" })

  // Sync state when settings load/change
  const [lastSettingsId, setLastSettingsId] = useState(current.id)
  if (settings && settings.id !== lastSettingsId) {
    setDayStart(settings.day_start_time)
    setDayEnd(settings.day_end_time)
    setLessonDur(settings.lesson_duration_minutes)
    setDefaultBreak(settings.default_break_minutes)
    setBreaks(settings.breaks)
    setWorkingDays(settings.working_days)
    setLastSettingsId(settings.id)
  }

  const preview = generatePreviewSlots(dayStart, dayEnd, lessonDur, defaultBreak, breaks)

  const updateMutation = useMutation({
    mutationFn: (data: SchoolSettingsUpdate) => timetableApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schoolSettings })
      toast.success("Sozlamalar saqlandi")
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const generateMutation = useMutation({
    mutationFn: () => timetableApi.generateTimeSlots(academicYearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeSlots })
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
      toast.success(`${preview.length} ta dars vaqti yaratildi`)
      onOpenChange(false)
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const settingsPayload: SchoolSettingsUpdate = {
    day_start_time: dayStart,
    day_end_time: dayEnd,
    lesson_duration_minutes: lessonDur,
    default_break_minutes: defaultBreak,
    breaks,
    working_days: workingDays,
  }

  const handleSaveAndGenerate = () => {
    if (!academicYearId) return
    updateMutation.mutate(settingsPayload, { onSuccess: () => generateMutation.mutate() })
  }

  const handleSaveOnly = () => {
    updateMutation.mutate(settingsPayload)
  }

  const addBreak = () => {
    if (!newBreak.after || !newBreak.dur) return
    const afterPeriod = Number(newBreak.after)
    // Don't add duplicate
    if (breaks.some((b) => b.after_period === afterPeriod)) {
      toast.error("Bu darsdan keyingi tanaffus allaqachon mavjud")
      return
    }
    setBreaks((prev) => [...prev, {
      after_period: afterPeriod,
      duration: Number(newBreak.dur),
      name: newBreak.name,
    }].sort((a, b) => a.after_period - b.after_period))
    setNewBreak({ after: "", dur: "", name: "" })
  }

  const removeBreak = (afterPeriod: number) => {
    setBreaks((prev) => prev.filter((b) => b.after_period !== afterPeriod))
  }

  const toggleDay = (day: number) => {
    const newDays = workingDays.includes(day)
      ? workingDays.filter((d) => d !== day)
      : [...workingDays, day].sort()
    if (newDays.length > 0) setWorkingDays(newDays)
  }

  const isPending = updateMutation.isPending || generateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Jadval sozlamalari</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-6">
          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kun boshlanishi</Label>
              <Input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Kun tugashi</Label>
              <Input type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} />
            </div>
          </div>

          {/* Lesson duration + default break */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dars davomiyligi (min)</Label>
              <Input
                type="number"
                min={15}
                max={120}
                value={lessonDur}
                onChange={(e) => setLessonDur(+e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Oddiy tanaffus (min)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={defaultBreak}
                onChange={(e) => setDefaultBreak(+e.target.value)}
              />
            </div>
          </div>

          {/* Special breaks */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Maxsus tanaffuslar</Label>
            <p className="text-[10px] text-muted-foreground">
              Oddiy tanaffusdan farq qiladigan tanaffuslar (Nonushta, Tushlik, Tolma choy)
            </p>
            {breaks.length > 0 && (
              <div className="space-y-1.5">
                {breaks.map((b) => (
                  <div
                    key={b.after_period}
                    className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                  >
                    <span>
                      <span className="text-muted-foreground">
                        {b.after_period === 0 ? "Darsdan oldin" : `${b.after_period}-darsdan keyin`}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span className="font-medium">{b.duration} min</span>
                      {b.name && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="text-[#6720FF] font-medium">{b.name}</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBreak(b.after_period)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add new break */}
            <div className="flex items-end gap-2">
              <div className="w-20">
                <Label className="text-[10px] text-muted-foreground">Darsdan keyin</Label>
                <Input
                  type="number"
                  min={0}
                  max={12}
                  placeholder="0"
                  value={newBreak.after}
                  onChange={(e) => setNewBreak((p) => ({ ...p, after: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-16">
                <Label className="text-[10px] text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="30"
                  value={newBreak.dur}
                  onChange={(e) => setNewBreak((p) => ({ ...p, dur: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Nomi (ixtiyoriy)</Label>
                <Input
                  placeholder="Nonushta"
                  value={newBreak.name}
                  onChange={(e) => setNewBreak((p) => ({ ...p, name: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={addBreak}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Working days */}
          <div className="space-y-1.5">
            <Label>Ish kunlari</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    workingDays.includes(day)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {DAY_SHORT[day]}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="border-t pt-4 space-y-2">
            <Label className="text-sm font-semibold">
              Ko'rinish ({preview.length} ta dars)
            </Label>
            {preview.length > 0 ? (
              <div className="space-y-1">
                {preview.map((slot, idx) => {
                  const brk = getBreakInfo(slot, preview[idx + 1], breaks)
                  return (
                    <div key={slot.period_number}>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-primary font-medium w-14">
                          {slot.period_number}-dars
                        </span>
                        <span className="text-muted-foreground">
                          {slot.start_time} – {slot.end_time}
                        </span>
                      </div>
                      {brk && (
                        <div className={`text-[10px] ml-14 ${brk.name ? "text-[#6720FF] font-medium" : "text-muted-foreground/60"}`}>
                          {brk.name || "Tanaffus"} {brk.minutes} min
                        </div>
                      )}
                    </div>
                  )
                })}
                {(() => {
                  const preBreak = breaks.find((b) => b.after_period === 0)
                  return preBreak ? (
                    <p className="text-[10px] text-[#6720FF] font-medium">
                      * {preBreak.name || "Darsdan oldingi tanaffus"} {preBreak.duration} min ({dayStart} dan)
                    </p>
                  ) : null
                })()}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Vaqt oralig'i yetarli emas</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleSaveOnly} disabled={isPending} className="flex-1">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Saqlash
            </Button>
            <Button
              onClick={handleSaveAndGenerate}
              disabled={isPending || preview.length === 0 || !academicYearId}
              className="flex-1"
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Generatsiya
            </Button>
          </div>
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
