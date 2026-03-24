import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { BreakItem, SchoolSettingsRead, SchoolSettingsUpdate } from "@/lib/api"
import { timetableApi } from "@/lib/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { queryKeys } from "@/hooks/useQueryOptions"
import { DAY_SHORT, formatTimeInput, generatePreviewSlots, isValidTime, parseHHMM } from "./helpers"

export function SettingsSection({
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
      <div className="space-y-5">
          {/* Vaqt oralig'i */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dars boshlanishi</Label>
              <Input
                placeholder="08:00"
                value={dayStart}
                onChange={(e) => setDayStart(formatTimeInput(e.target.value))}
                maxLength={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dars tugashi</Label>
              <Input
                placeholder="16:00"
                value={dayEnd}
                onChange={(e) => setDayEnd(formatTimeInput(e.target.value))}
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
                  onChange={(e) => setNewBreak((p) => ({ ...p, start: formatTimeInput(e.target.value) }))}
                  maxLength={5}
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-20">
                <Label className="text-[10px] text-muted-foreground">Tugashi</Label>
                <Input
                  placeholder="13:00"
                  value={newBreak.end}
                  onChange={(e) => setNewBreak((p) => ({ ...p, end: formatTimeInput(e.target.value) }))}
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isPending || !isSettingsValid || preview.length === 0 || !academicYearId}>
                  {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Generatsiya
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Soatlarni qayta generatsiya qilish</AlertDialogTitle>
                  <AlertDialogDescription>
                    Barcha mavjud soatlar va ularga biriktirilgan darslar o'chiriladi. Yangi {preview.length} ta soat yaratiladi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSaveAndGenerate}>
                    Ha, generatsiya qilish
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
    </div>
  )
}
