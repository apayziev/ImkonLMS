import { useQuery } from "@tanstack/react-query"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  UserX,
} from "lucide-react"
import { useState } from "react"

import type { AttendanceSessionRead, AttendanceStudentRead, GradeRead } from "@/lib/api"
import { cn, formatDateShortUz, getInitials } from "@/lib/utils"
import { getWeekDays } from "@/hooks/useWeekNavigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  getAttendanceQueryOptions,
  getGradesQueryOptions,
  getSchoolSettingsQueryOptions,
} from "@/hooks/useQueryOptions"
import { ATTENDANCE_OPTIONS } from "@/components/Lessons/constants"
import { toDateString } from "@/components/Lessons/formatters"
import { UZ_MONTHS, UZ_WEEKDAYS_SHORT } from "@/lib/locale"

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = Object.fromEntries(
  [
    ...ATTENDANCE_OPTIONS.map((o) => [o.value, { label: o.label, className: o.badgeClassName }]),
    ["unmarked", { label: "Belgilanmagan", className: "bg-muted text-muted-foreground" }],
  ]
) as Record<string, { label: string; className: string }>

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AttendanceTab() {
  const [gradeId, setGradeId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const { data: settings } = useQuery(getSchoolSettingsQueryOptions())
  const workingDays = settings?.working_days ?? [1, 2, 3, 4, 5, 6]

  const { data: gradesData } = useQuery(getGradesQueryOptions())
  const grades: GradeRead[] = [...(gradesData?.data ?? [])].sort(
    (a, b) => (a.level !== b.level ? a.level - b.level : a.section.localeCompare(b.section)),
  )

  const dateStr = toDateString(selectedDate)
  const todayStr = toDateString(new Date())
  const weekDays = getWeekDays(selectedDate, workingDays)

  const numericGradeId = gradeId ? Number(gradeId) : 0
  const { data: attendance, isLoading } = useQuery(
    getAttendanceQueryOptions(numericGradeId, dateStr),
  )

  const prevWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 7)
    setSelectedDate(d)
  }
  const nextWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 7)
    setSelectedDate(d)
  }

  return (
    <div className="space-y-5">
      {/* Filters: Grade selector + Week day selector */}
      <div className="flex items-center gap-4">
        <Select value={gradeId} onValueChange={setGradeId}>
          <SelectTrigger className="w-[200px] shrink-0">
            <SelectValue placeholder="Sinf tanlang" />
          </SelectTrigger>
          <SelectContent>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id.toString()}>
                {g.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-col items-end gap-1 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-3 py-1 rounded-md hover:bg-muted/50"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {UZ_MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => { if (date) setSelectedDate(date) }}
                defaultMonth={selectedDate}
                fromYear={2024}
                toYear={new Date().getFullYear() + 1}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevWeek} className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {weekDays.map((d) => {
              const ds = toDateString(d)
              const isSelected = ds === dateStr
              const isDayToday = ds === todayStr
              return (
                <button
                  key={ds}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={cn(
                    "flex flex-col items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors min-w-[52px]",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isDayToday
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent text-muted-foreground",
                  )}
                >
                  <span className="text-xs">{UZ_WEEKDAYS_SHORT[d.getDay()]}</span>
                  <span className="text-lg font-bold">{d.getDate()}</span>
                </button>
              )
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={nextWeek} className="shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {!gradeId ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CalendarDays className="h-16 w-16 mb-4 opacity-40" />
          <p className="text-xl">Davomat ko'rish uchun sinf tanlang</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !attendance || attendance.sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ClipboardList className="h-16 w-16 mb-4 opacity-40" />
          <p className="text-xl">Bu kunda dars o'tkazilmagan</p>
        </div>
      ) : (
        <UnifiedAttendanceTable
          sessions={attendance.sessions}
          gradeDisplay={attendance.grade_display}
          date={dateStr}
        />
      )}
    </div>
  )
}

// ─── Unified Attendance Table ───────────────────────────────────────────────

function UnifiedAttendanceTable({
  sessions,
  gradeDisplay,
  date,
}: {
  sessions: AttendanceSessionRead[]
  gradeDisplay: string
  date: string
}) {
  const startedSessions = sessions

  // Collect unique students across all sessions
  const studentMap = new Map<number, { student_id: number; full_name: string; photo_url: string | null }>()
  for (const session of sessions) {
    for (const student of session.students) {
      if (!studentMap.has(student.student_id)) {
        studentMap.set(student.student_id, student)
      }
    }
  }
  const students = [...studentMap.values()].sort((a, b) => a.full_name.localeCompare(b.full_name))

  // Build matrix: student_id → session_index → attendance
  const matrix = new Map<number, Map<number, AttendanceStudentRead>>()
  startedSessions.forEach((session, idx) => {
    for (const student of session.students) {
      if (!matrix.has(student.student_id)) matrix.set(student.student_id, new Map())
      matrix.get(student.student_id)!.set(idx, student)
    }
  })

  // Title: if all sessions are same subject, show subject name
  const subjects = [...new Set(startedSessions.map((s) => s.subject_name))]
  const teachers = [...new Set(startedSessions.map((s) => s.teacher_name))]
  const titleSubject = subjects.length === 1 ? subjects[0] : "Darslar"
  const titleTeacher = teachers.length === 1 ? teachers[0] : ""

  const formattedDate = formatDateShortUz(date)

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-muted-foreground">
        <UserX className="h-10 w-10 mb-3 opacity-40" />
        <p>Darslar boshlanmagan</p>
      </div>
    )
  }

  return (
    <Card className="rounded-xl overflow-hidden p-0 gap-0">
      {/* Card header */}
      <div className="flex items-start justify-between p-5 pb-3 border-b">
        <div>
          <h2 className="text-xl font-bold">
            {titleSubject} — {gradeDisplay} sinf davomat
          </h2>
          <p className="text-sm text-muted-foreground">
            {titleTeacher && `${titleTeacher} · `}
            {formattedDate} · {startedSessions.length} soat birlashtirilgan
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="sticky left-0 z-20 w-10 py-2.5 px-3 text-left text-xs font-medium text-muted-foreground border-r bg-muted/30">#</th>
              <th className="sticky left-10 z-20 py-2.5 px-3 text-left text-xs font-medium text-muted-foreground min-w-[180px] border-r bg-muted/30">O'quvchi</th>
              {startedSessions.map((session, idx) => {
                const p = session.students.filter((s) => s.status === "present").length
                const e = session.students.filter((s) => s.status === "late").length
                const u = session.students.filter((s) => s.status === "absent").length
                return (
                <th
                  key={idx}
                  className={cn(
                    "py-2.5 px-2 text-center min-w-[100px]",
                    idx < startedSessions.length - 1 && "border-r-2",
                  )}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm">{session.period_number}-soat {session.subject_name}</p>
                    <p className="text-[10px] text-muted-foreground">{session.start_time}–{session.end_time}</p>
                    {session.started_at && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatTime(session.started_at)}
                        {session.ended_at ? ` — ${formatTime(session.ended_at)}` : " · davom etmoqda"}
                        {session.started_at && session.ended_at && (() => {
                          const diff = Math.floor((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)
                          const min = Math.floor(diff / 60)
                          const sec = diff % 60
                          return ` (${min}m ${sec.toString().padStart(2, "0")}s)`
                        })()}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-1.5 text-[10px]">
                      <span><span className="font-bold text-[var(--imkon-teal)]">{p}</span> keldi</span>
                      <span><span className="font-bold text-amber-500">{e}</span> kech</span>
                      <span><span className="font-bold text-[var(--imkon-red)]">{u}</span> kelmadi</span>
                    </div>
                  </div>
                </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.student_id} className="border-b last:border-b-0 hover:bg-muted/10">
                <td className="sticky left-0 z-10 py-2.5 px-3 text-muted-foreground border-r bg-card">{idx + 1}</td>
                <td className="sticky left-10 z-10 py-2.5 px-3 border-r bg-card">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={student.photo_url ?? undefined} alt={student.full_name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(student.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{student.full_name}</span>
                  </div>
                </td>
                {startedSessions.map((_, sIdx) => {
                  const att = matrix.get(student.student_id)?.get(sIdx)
                  const config = att
                    ? (STATUS_CONFIG[att.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unmarked)
                    : STATUS_CONFIG.unmarked
                  return (
                    <td
                      key={sIdx}
                      className={cn(
                        "py-2.5 px-2 text-center",
                        sIdx < startedSessions.length - 1 && "border-r-2",
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={cn("text-xs font-medium rounded-md px-2 py-0.5 inline-block", config.className)}>
                          {config.label}
                        </span>
                        {att?.marked_at && (
                          <span className="text-[10px] text-muted-foreground">- {formatTime(att.marked_at)}</span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
