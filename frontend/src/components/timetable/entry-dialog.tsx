import { Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
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
import type { SubjectRead, TeacherRead, TimeSlotRead } from "@/lib/api"
import { DAY_NAMES, type EntryDialogState } from "./helpers"

export function EntryDialog({
  state,
  onOpenChange,
  gradeId,
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
  gradeId: number
  subjects: SubjectRead[]
  teachers: TeacherRead[]
  timeSlots: TimeSlotRead[]
  onSave: (subjectId: number, teacherId: number, room: string | null) => void
  onDelete: () => void
  isPending: boolean
  isDeleting: boolean
}) {
  const slot = timeSlots.find((s) => s.id === state.slotId)
  const [subjectId, setSubjectId] = useState(
    state.entry?.subject_id?.toString() ?? "",
  )
  const [teacherId, setTeacherId] = useState(
    state.entry?.teacher_id?.toString() ?? "",
  )
  const [room, setRoom] = useState(state.entry?.room ?? "")
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Filter teachers: must have this grade in teaching_grade_ids
  const byGrade = teachers.filter(
    (t) => !t.teaching_grade_ids || t.teaching_grade_ids.includes(gradeId),
  )

  const selectedSubjectName = subjects.find(
    (s) => s.id.toString() === subjectId,
  )?.name
  const bySubject = selectedSubjectName
    ? byGrade.filter((t) => t.subjects?.includes(selectedSubjectName))
    : []
  // Fallback to grade-filtered teachers if none match the selected subject
  const filteredTeachers = subjectId
    ? bySubject.length > 0
      ? bySubject
      : byGrade
    : byGrade

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
                {slot
                  ? `${slot.period_number}-soat (${slot.start_time}–${slot.end_time})`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label>Fan</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v)
                setTeacherId("")
              }}
            >
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
            <Select
              value={teacherId}
              onValueChange={setTeacherId}
              disabled={!subjectId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    subjectId ? "O'qituvchi tanlang" : "Avval fan tanlang"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredTeachers.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room */}
          <div className="space-y-1.5">
            <Label>Xona</Label>
            <Input
              placeholder="Masalan: 14, 2A, Lab-1"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              maxLength={20}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          {state.mode === "edit" &&
            (confirmDelete ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Yo'q
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  disabled={isDeleting}
                >
                  {isDeleting && (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  )}
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
            ))}
          <Button
            onClick={() => {
              if (subjectId && teacherId)
                onSave(
                  Number(subjectId),
                  Number(teacherId),
                  room.trim() || null,
                )
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
