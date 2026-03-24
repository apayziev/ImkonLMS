import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CalendarDays, ChevronDown, Loader2, Plus, RefreshCw, Settings, Trash2 } from "lucide-react"
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

/** Parse "HH:MM" → total minutes */
function parseHHMM(v: string): number {
  const [h, m] = v.split(":").map(Number)
  return h * 60 + m
}

/** Format total minutes → "HH:MM" */
function fmtHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

/** Validate HH:MM string is a real time (00:00–23:59) */
function isValidTime(v: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(v)) return false
  const [h, m] = v.split(":").map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

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
  currentSlot: Pick<TimeSlotRead, "end_time" | "start_time">,
  nextSlot: Pick<TimeSlotRead, "start_time"> | undefined,
  breaks: BreakItem[],
): { minutes: number; name: string } | null {
  if (!nextSlot) return null
  const gapStart = parseHHMM(currentSlot.end_time)
  const gapEnd = parseHHMM(nextSlot.start_time)
  const diff = gapEnd - gapStart
  if (diff <= 0) return null
  const brk = breaks.find((b) => {
    const bs = parseHHMM(b.start_time)
    return bs >= gapStart && bs < gapEnd
  })
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
  const parsed = breaks
    .map((b) => ({ start: parseHHMM(b.start_time), end: parseHHMM(b.end_time), name: b.name }))
    .sort((a, b) => a.start - b.start)

  let cursor = parseHHMM(dayStart)
  const endMin = parseHHMM(dayEnd)

  const result: { period_number: number; start_time: string; end_time: string }[] = []
  let period = 1

  while (cursor + lessonDur <= endMin) {
    const activeBreak = parsed.find((b) => b.start <= cursor && cursor < b.end)
    if (activeBreak) {
      cursor = activeBreak.end
      continue
    }

    let slotEnd = cursor + lessonDur

    let overlaps = false
    for (const b of parsed) {
      if (cursor < b.start && b.start < slotEnd) {
        slotEnd = b.start
        overlaps = true
        break
      }
    }

    if (slotEnd - cursor < 10) {
      cursor = slotEnd
      continue
    }

    result.push({ period_number: period, start_time: fmtHHMM(cursor), end_time: fmtHHMM(slotEnd) })
    cursor = slotEnd + (overlaps ? 0 : defaultBreak)
    period++
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
        <div className="flex items-center gap-2">
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[180px]">
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
        </div>
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
                        {slot.period_number}-soat
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

// ─── SettingsSection ────────────────────────────────────────────────────────

function SettingsSection({
  settings,
  academicYearId,
  onClose,
}: {
  settings: SchoolSettingsRead | undefined
  academicYearId: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const current = settings ?? {
    day_start_time: "08:00",
    day_end_time: "16:00",
    lesson_duration_minutes: 45,
    default_break_minutes: 5,
    working_days: [1, 2, 3, 4, 5, 6],
    breaks: [],
  }

  const [dayStart, setDayStart] = useState(current.day_start_time)
  const [dayEnd, setDayEnd] = useState(current.day_end_time)
  const [lessonDur, setLessonDur] = useState(current.lesson_duration_minutes)
  const [defaultBreak, setDefaultBreak] = useState(current.default_break_minutes)
  const [breaks, setBreaks] = useState<BreakItem[]>(current.breaks)
  const [workingDays, setWorkingDays] = useState(current.working_days)
  const [newBreak, setNewBreak] = useState({ start: "", end: "", name: "" })

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
      toast.success(`${preview.length} ta soat yaratildi`)
      onClose()
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

  const isSettingsValid = isValidTime(dayStart) && isValidTime(dayEnd) && parseHHMM(dayStart) < parseHHMM(dayEnd)

  const handleSaveAndGenerate = () => {
    if (!academicYearId || !isSettingsValid) return
    updateMutation.mutate(settingsPayload, { onSuccess: () => generateMutation.mutate() })
  }

  const handleSaveOnly = () => {
    if (!isSettingsValid) {
      toast.error("Noto'g'ri vaqt formati")
      return
    }
    updateMutation.mutate(settingsPayload)
  }

  const addBreak = () => {
    if (!newBreak.start || !newBreak.end) return
    if (!isValidTime(newBreak.start) || !isValidTime(newBreak.end)) {
      toast.error("Noto'g'ri vaqt formati (HH:MM)")
      return
    }
    if (parseHHMM(newBreak.start) >= parseHHMM(newBreak.end)) {
      toast.error("Tugash vaqti boshlanishdan keyin bo'lishi kerak")
      return
    }
    if (breaks.some((b) => b.start_time === newBreak.start)) {
      toast.error("Bu vaqtda tanaffus allaqachon mavjud")
      return
    }
    setBreaks((prev) => [...prev, {
      start_time: newBreak.start,
      end_time: newBreak.end,
      name: newBreak.name,
    }].sort((a, b) => a.start_time.localeCompare(b.start_time)))
    setNewBreak({ start: "", end: "", name: "" })
  }

  const removeBreak = (startTime: string) => {
    setBreaks((prev) => prev.filter((b) => b.start_time !== startTime))
  }

  const toggleDay = (day: number) => {
    const newDays = workingDays.includes(day)
      ? workingDays.filter((d) => d !== day)
      : [...workingDays, day].sort()
    if (newDays.length > 0) setWorkingDays(newDays)
  }

  const isPending = updateMutation.isPending || generateMutation.isPending

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        {/* Left: settings form */}
        <div className="space-y-5">
          {/* Vaqt oralig'i */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dars boshlanishi</Label>
              <Input
                placeholder="08:00"
                value={dayStart}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9:]/g, "")
                  if (v.length <= 5) setDayStart(v)
                }}
                maxLength={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dars tugashi</Label>
              <Input
                placeholder="16:00"
                value={dayEnd}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9:]/g, "")
                  if (v.length <= 5) setDayEnd(v)
                }}
                maxLength={5}
              />
            </div>
          </div>

          {/* Dars va tanaffus */}
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
              Tushlik, Dam olish kabi vaqtga asoslangan tanaffuslar
            </p>
            {breaks.length > 0 && (
              <div className="space-y-1.5">
                {breaks.map((b) => (
                  <div
                    key={b.start_time}
                    className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                  >
                    <span>
                      <span className="font-medium">{b.start_time} – {b.end_time}</span>
                      {b.name && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="text-[#6720FF] font-medium">{b.name}</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBreak(b.start_time)}
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
                <Label className="text-[10px] text-muted-foreground">Boshlanishi</Label>
                <Input
                  placeholder="12:30"
                  value={newBreak.start}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9:]/g, "")
                    if (v.length <= 5) setNewBreak((p) => ({ ...p, start: v }))
                  }}
                  maxLength={5}
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-20">
                <Label className="text-[10px] text-muted-foreground">Tugashi</Label>
                <Input
                  placeholder="13:00"
                  value={newBreak.end}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9:]/g, "")
                    if (v.length <= 5) setNewBreak((p) => ({ ...p, end: v }))
                  }}
                  maxLength={5}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Nomi (ixtiyoriy)</Label>
                <Input
                  placeholder="Tushlik"
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

          {/* Working days + Actions */}
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

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleSaveOnly} disabled={isPending || !isSettingsValid}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Saqlash
            </Button>
            <Button
              onClick={handleSaveAndGenerate}
              disabled={isPending || !isSettingsValid || preview.length === 0 || !academicYearId}
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Generatsiya
            </Button>
          </div>
        </div>

        {/* Right: preview */}
        <div className="lg:w-56 lg:border-l lg:pl-6 space-y-2">
          <Label className="text-sm font-semibold">
            Ko'rinish ({preview.length} ta soat)
          </Label>
          {preview.length > 0 ? (
            <div className="space-y-1">
              {preview.map((slot, idx) => {
                const brk = getBreakInfo(slot, preview[idx + 1], breaks)
                return (
                  <div key={slot.period_number}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-primary font-medium w-14">
                        {slot.period_number}-soat
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
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Vaqt oralig'i yetarli emas</p>
          )}
        </div>
      </div>
    </div>
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
                {slot ? `${slot.period_number}-soat (${slot.start_time}–${slot.end_time})` : "—"}
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
