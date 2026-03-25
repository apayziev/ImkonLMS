import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  UserCheck,
  UserX,
} from "lucide-react"
import { useState } from "react"

import type { AttendanceSessionRead, GradeRead } from "@/lib/api"
import { cn } from "@/lib/utils"
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
import {
  getAttendanceQueryOptions,
  getGradesQueryOptions,
  getSchoolSettingsQueryOptions,
} from "@/hooks/useQueryOptions"

export const Route = createFileRoute("/_layout/attendance")({
  component: AttendancePage,
  head: () => ({
    meta: [{ title: "Davomat - IMKON LMS" }],
  }),
})

// ─── Helpers ────────────────────────────────────────────────────────────────

const UZ_WEEKDAYS_SHORT = ["Ya", "Du", "Se", "Cho", "Pa", "Ju", "Sha"]

function formatDate(d: Date) {
  return d.toISOString().split("T")[0]
}

function getWeekDays(baseDate: Date, workingDays: number[]): Date[] {
  const day = baseDate.getDay()
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((day + 6) % 7))
  return workingDays.map((wd) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + (wd === 7 ? 6 : wd - 1))
    return d
  })
}

const STATUS_CONFIG = {
  present: { label: "Keldi", className: "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal-dark)]" },
  excused: { label: "Sababli", className: "bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple-dark)]" },
  unexcused: { label: "Sababsiz", className: "bg-[var(--imkon-red)]/10 text-[var(--imkon-red)]" },
  unmarked: { label: "Belgilanmagan", className: "bg-muted text-muted-foreground" },
} as const

// ─── Page ───────────────────────────────────────────────────────────────────

function AttendancePage() {
  const [gradeId, setGradeId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const { data: settings } = useQuery(getSchoolSettingsQueryOptions())
  const workingDays = settings?.working_days ?? [1, 2, 3, 4, 5, 6]

  const { data: gradesData } = useQuery(getGradesQueryOptions())
  const grades: GradeRead[] = [...(gradesData?.data ?? [])].sort(
    (a, b) => (a.level !== b.level ? a.level - b.level : a.section.localeCompare(b.section)),
  )

  const dateStr = formatDate(selectedDate)
  const todayStr = formatDate(new Date())
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Davomat
        </h1>
        <p className="text-muted-foreground text-sm">
          Sinflar bo'yicha kunlik davomat
        </p>
      </div>

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

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="icon" onClick={prevWeek} className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {weekDays.map((d) => {
              const ds = formatDate(d)
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
        <div className="space-y-6">
          {/* Summary */}
          <AttendanceSummary sessions={attendance.sessions} />

          {/* Sessions */}
          {attendance.sessions.map((session) => (
            <SessionCard key={session.session_id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Summary ────────────────────────────────────────────────────────────────

function AttendanceSummary({ sessions }: { sessions: AttendanceSessionRead[] }) {
  const allStudentStatuses = sessions.flatMap((s) => s.students.map((st) => st.status))
  const total = allStudentStatuses.length
  const present = allStudentStatuses.filter((s) => s === "present").length
  const excused = allStudentStatuses.filter((s) => s === "excused").length
  const unexcused = allStudentStatuses.filter((s) => s === "unexcused").length
  const unmarked = allStudentStatuses.filter((s) => s === "unmarked").length

  if (total === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-[var(--imkon-teal)]">{present}</p>
        <p className="text-sm text-muted-foreground">Keldi</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-[var(--imkon-purple)]">{excused}</p>
        <p className="text-sm text-muted-foreground">Sababli</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-[var(--imkon-red)]">{unexcused}</p>
        <p className="text-sm text-muted-foreground">Sababsiz</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-muted-foreground">{unmarked}</p>
        <p className="text-sm text-muted-foreground">Belgilanmagan</p>
      </Card>
    </div>
  )
}

// ─── Session Card ───────────────────────────────────────────────────────────

function SessionCard({ session }: { session: AttendanceSessionRead }) {
  const isCompleted = session.status === "completed"
  const presentCount = session.students.filter((s) => s.status === "present").length
  const totalCount = session.students.length

  return (
    <Card
      className={cn(
        "rounded-xl border-2 p-5 space-y-4",
        isCompleted
          ? "border-[var(--imkon-teal)]/30 bg-[var(--imkon-teal)]/5"
          : "border-[var(--imkon-purple)]/40 bg-[var(--imkon-purple)]/5",
      )}
    >
      {/* Session Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xl font-bold">{session.subject_name}</p>
          <p className="text-sm text-muted-foreground">{session.teacher_name}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-medium">
              {session.start_time} – {session.end_time}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {session.period_number}-soat
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="flex items-center gap-1.5 text-sm text-[var(--imkon-teal)]">
              <Check className="h-4 w-4" />
              Tugallangan
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-[var(--imkon-purple)]">
              <Clock className="h-4 w-4" />
              Davom etmoqda
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <UserCheck className="h-4 w-4" />
          {presentCount}/{totalCount} keldi
        </div>
      </div>

      {/* Student list */}
      {session.students.length > 0 ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span>#</span>
            <span>O'quvchi</span>
            <span className="w-28 text-center">Davomat</span>
            <span className="w-12 text-center">Baho</span>
          </div>
          {session.students.map((student, idx) => {
            const config = STATUS_CONFIG[student.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unmarked
            return (
              <div
                key={student.student_id}
                className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 rounded-lg border px-3 py-2 bg-card"
              >
                <span className="text-sm text-muted-foreground">{idx + 1}</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={student.photo_url ?? undefined} alt={student.full_name} />
                    <AvatarFallback className="text-xs">
                      {student.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{student.full_name}</span>
                </div>
                <span className={cn("w-28 text-center text-xs font-medium rounded-md px-2 py-1", config.className)}>
                  {config.label}
                </span>
                <span className="w-12 text-center text-sm font-bold">
                  {student.grade ?? "—"}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <UserX className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">O'quvchilar topilmadi</p>
        </div>
      )}
    </Card>
  )
}
