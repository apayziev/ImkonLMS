import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, BarChart3, BookOpen, ChevronLeft, ChevronRight, Clock, FileText, Info, Users, X } from "lucide-react"

import type { TeacherStatRead, TeacherSessionDetail } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getCurrentQuarterQueryOptions,
  getQuartersQueryOptions,
  getCurrentAcademicYearQueryOptions,
  getTeacherStatsQueryOptions,
  getTeacherDetailQueryOptions,
} from "@/hooks/useQueryOptions"
import { getEffectiveWeekDate, useWeekNavigation } from "@/hooks/useWeekNavigation"
import { toDateString } from "@/components/Lessons/formatters"
import { useMemo, useState } from "react"
import { UZ_WEEKDAYS_FULL, UZ_MONTHS, LESSON_TYPES, PLAN_TOTAL_FIELDS } from "@/components/Lessons/constants"

// ─── Helpers ────────────────────────────────────────────────────────────────

function PctBar({ value, total, color }: { value: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-8 text-right">{percent}%</span>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TeacherStatsTab() {
  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const { data: currentQuarter } = useQuery(getCurrentQuarterQueryOptions())
  const { data: quartersData } = useQuery(getQuartersQueryOptions(currentYear?.id))
  const quarters = quartersData?.data ?? []

  const [selectedQuarterId, setSelectedQuarterId] = useState<string>("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)

  // Auto-select current quarter
  const activeQuarter = selectedQuarterId
    ? quarters.find((q) => q.id === Number(selectedQuarterId))
    : currentQuarter ?? quarters[0]

  const startDate = activeQuarter?.start_date ?? ""
  const endDate = activeQuarter?.end_date ?? ""

  const { data: stats, isLoading } = useQuery(
    getTeacherStatsQueryOptions(startDate, endDate),
  )

  const selectedTeacher = stats?.teachers.find((t) => t.teacher_id === selectedTeacherId)

  if (selectedTeacherId && selectedTeacher) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTeacherId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Orqaga
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={selectedTeacher.photo_url ?? undefined} />
              <AvatarFallback className="text-xs font-bold">
                {selectedTeacher.teacher_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{selectedTeacher.teacher_name}</p>
              <p className="text-xs text-muted-foreground">
                {activeQuarter ? `${activeQuarter.number}-chorak` : ""} darslari
              </p>
            </div>
          </div>
        </div>
        <TeacherDetailView
          teacherId={selectedTeacherId}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Quarter filter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          O'qituvchilarning dars o'tish statistikasi
        </p>
        <Select
          value={selectedQuarterId || (activeQuarter?.id?.toString() ?? "")}
          onValueChange={setSelectedQuarterId}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Chorak tanlang" />
          </SelectTrigger>
          <SelectContent>
            {quarters
              .sort((a, b) => a.number - b.number)
              .map((q) => (
                <SelectItem key={q.id} value={q.id.toString()}>
                  {q.number}-chorak
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !stats || stats.teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-16 w-16 mb-4 opacity-40" />
          <p className="text-xl">Ma'lumot topilmadi</p>
          <p className="text-sm mt-1">Tanlangan chorakda darslar o'tkazilmagan</p>
        </div>
      ) : (
        <TooltipProvider delayDuration={200}>
        <Card className="rounded-xl overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground min-w-[200px]">O'qituvchi</th>
                  <th className="py-3 px-3 text-center text-xs font-medium text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1 cursor-help">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Darslar
                          <Info className="h-3 w-3 opacity-50" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>O'tkazilgan darslar / chorakda kutilgan jami darslar</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-medium text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1 cursor-help">
                          <Clock className="h-3.5 w-3.5" />
                          Vaqtida boshlagan
                          <Info className="h-3 w-3 opacity-50" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Darsni jadvaldan ±5 daqiqa ichida boshlagan / o'tkazilgan</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-medium text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1 cursor-help">
                          <FileText className="h-3.5 w-3.5" />
                          Reja to'ldirilgan
                          <Info className="h-3 w-3 opacity-50" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mavzu yozilgan darslar soni. Sifat: 9 ta maydon to'ldirilishi (mavzu, maqsadlar, kalit so'zlar, uy vazifasi, muddat, dars turi, bosqichlar, resurslar, baholash usuli)</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-medium text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1 cursor-help">
                          O'rtacha davomiylik
                          <Info className="h-3 w-3 opacity-50" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Darsning o'rtacha davomiyligi (boshlanish — tugash vaqti)</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.teachers.map((t, idx) => (
                  <TeacherRow key={t.teacher_id} teacher={t} index={idx + 1} onClick={() => setSelectedTeacherId(t.teacher_id)} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </TooltipProvider>
      )}
    </div>
  )
}

// ─── Teacher Row ────────────────────────────────────────────────────────────

function TeacherRow({ teacher: t, index, onClick }: { teacher: TeacherStatRead; index: number; onClick: () => void }) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/10 transition-colors cursor-pointer" onClick={onClick}>
      <td className="py-3 px-4 text-muted-foreground">{index}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={t.photo_url ?? undefined} />
            <AvatarFallback className="text-xs font-bold">
              {t.teacher_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium truncate">{t.teacher_name}</span>
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <div className="space-y-1">
          <p className="text-sm font-bold">
            {t.total_conducted}
            <span className="font-normal text-muted-foreground">/{t.total_expected}</span>
          </p>
          <PctBar value={t.total_conducted} total={t.total_expected} color="bg-[var(--imkon-teal)]" />
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <div className="space-y-1">
          <p className="text-sm font-bold">
            {t.on_time_starts}
            <span className="font-normal text-muted-foreground">/{t.total_expected}</span>
          </p>
          <PctBar
            value={t.on_time_starts}
            total={t.total_expected}
            color={
              t.total_expected > 0 && t.on_time_starts / t.total_expected >= 0.8
                ? "bg-[var(--imkon-teal)]"
                : t.total_expected > 0 && t.on_time_starts / t.total_expected >= 0.5
                  ? "bg-amber-500"
                  : "bg-[var(--imkon-red)]"
            }
          />
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <div className="space-y-1">
          <p className="text-sm font-bold">
            {t.total_planned}
            <span className="font-normal text-muted-foreground">/{t.total_expected}</span>
          </p>
          <PctBar
            value={t.total_planned}
            total={t.total_expected}
            color={
              t.total_expected > 0 && t.total_planned / t.total_expected >= 0.8
                ? "bg-[var(--imkon-teal)]"
                : "bg-amber-500"
            }
          />
          {t.avg_plan_score != null && (
            <p className="text-[10px] text-muted-foreground">sifat: {t.avg_plan_score}%</p>
          )}
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="text-sm font-medium">
          {t.avg_duration_minutes != null ? `${t.avg_duration_minutes} min` : "—"}
        </span>
      </td>
    </tr>
  )
}

// ─── Detail View ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  completed: { label: "Tugallangan", className: "bg-[var(--imkon-teal)]/10 text-[var(--imkon-teal)]" },
  in_progress: { label: "Davom etmoqda", className: "bg-amber-500/10 text-amber-600" },
  not_started: { label: "Boshlanmagan", className: "bg-muted text-muted-foreground" },
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
}

function durationMin(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

function TeacherDetailView({ teacherId, startDate, endDate }: { teacherId: number; startDate: string; endDate: string }) {
  const { data: detail, isLoading } = useQuery(
    getTeacherDetailQueryOptions(teacherId, startDate, endDate),
  )

  // Reuse same week navigation as Dars rejasi page
  const [selectedDate, setSelectedDate] = useState<Date>(getEffectiveWeekDate)
  const { weekDays, prevWeek, nextWeek } = useWeekNavigation(selectedDate, setSelectedDate)

  const weekStart = weekDays.length > 0 ? toDateString(weekDays[0]) : ""
  const weekEnd = weekDays.length > 0 ? toDateString(weekDays[weekDays.length - 1]) : ""

  const weekSessions = useMemo(() => {
    if (!detail?.sessions.length || !weekStart) return []
    return detail.sessions.filter((s) => s.session_date >= weekStart && s.session_date <= weekEnd)
  }, [detail, weekStart, weekEnd])

  const canPrev = !!detail?.sessions.some((s) => s.session_date < weekStart)
  const canNext = !!detail?.sessions.some((s) => s.session_date > weekEnd)

  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return ""
    const first = weekDays[0]
    const last = weekDays[weekDays.length - 1]
    return first.getMonth() === last.getMonth()
      ? `${first.getDate()} – ${last.getDate()} ${UZ_MONTHS[first.getMonth()]}`
      : `${first.getDate()} ${UZ_MONTHS[first.getMonth()]} – ${last.getDate()} ${UZ_MONTHS[last.getMonth()]}`
  }, [weekDays])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!detail || detail.sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BookOpen className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-lg">Bu davrda darslar topilmadi</p>
      </div>
    )
  }

  // Group filtered sessions by date
  const grouped = new Map<string, TeacherSessionDetail[]>()
  for (const s of weekSessions) {
    const arr = grouped.get(s.session_date) ?? []
    arr.push(s)
    grouped.set(s.session_date, arr)
  }

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevWeek} disabled={!canPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{weekLabel}</span>
        <Button variant="ghost" size="icon" onClick={nextWeek} disabled={!canNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {weekSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">Bu haftada darslar topilmadi</p>
        </div>
      ) : (
      <Card className="rounded-xl overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground">Sana</th>
              <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground">Sinf</th>
              <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground">Fan</th>
              <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">Soat</th>
              <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">Jadval vaqti</th>
              <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">Haqiqiy vaqt</th>
              <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">Dars davomiyligi</th>
              <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">Dars rejasi</th>
              <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground">Dars holati</th>
            </tr>
          </thead>
          <tbody>
            {[...grouped.entries()].map(([dateStr, sessions]) => {
              const d = new Date(dateStr + "T00:00:00")
              const isToday = dateStr === todayStr
              const dayName = UZ_WEEKDAYS_FULL[d.getDay()]
              const sorted = sessions.sort((a, b) => a.period_number - b.period_number)
              const midIdx = Math.floor((sorted.length - 1) / 2)

              return sorted.map((s, idx) => (
                <SessionTableRow
                  key={`${dateStr}-${s.period_number}-${s.grade_display}`}
                  session={s}
                  dateLabel={idx === midIdx ? `${dayName}, ${d.getDate()}` : ""}
                  isToday={isToday}
                  isLastInGroup={idx === sorted.length - 1}
                />
              ))
            })}
          </tbody>
        </table>
      </div>
    </Card>
      )}
    </div>
  )
}

function SessionTableRow({ session: s, dateLabel, isToday, isLastInGroup }: {
  session: TeacherSessionDetail
  dateLabel: string
  isToday: boolean
  isLastInGroup: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const effectiveStatus = s.status === "completed" ? "completed" : s.status === "in_progress" ? "in_progress" : "not_started"
  const statusCfg = STATUS_LABELS[effectiveStatus]
  const hasContent = s.plan_filled_count > 0
  const dur = s.started_at && s.ended_at ? durationMin(s.started_at, s.ended_at) : null

  return (
    <>
      <tr
        className={cn(
          "hover:bg-muted/10 transition-colors cursor-pointer",
          isToday && "bg-primary/5",
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <td className={cn(
          "py-2.5 px-3 text-sm border-r",
          isLastInGroup && "border-b",
          isToday && "text-primary",
        )}>
          {dateLabel && <span className="font-semibold">{dateLabel}</span>}
        </td>
        <td className="py-2.5 px-3 border-b">
          <span className="font-bold">{s.grade_display}</span>
        </td>
        <td className="py-2.5 px-3 text-muted-foreground border-b">{s.subject_name}</td>
        <td className="py-2.5 px-3 text-center text-muted-foreground border-b">
          {s.period_number}
          <span className="text-[10px] text-muted-foreground ml-1">({s.lesson_number}-dars)</span>
        </td>
        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground border-b">{s.start_time}–{s.end_time}</td>
        <td className="py-2.5 px-3 text-center text-xs border-b">
          {s.started_at ? (
            <span>
              {formatTime(s.started_at)}
              {s.ended_at && <>–{formatTime(s.ended_at)}</>}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2.5 px-3 text-center border-b">
          {dur != null ? (
            <span className={cn(
              "text-xs font-medium",
              dur < 30 ? "text-[var(--imkon-red)]" : dur >= 40 ? "text-[var(--imkon-teal)]" : "text-amber-500",
            )}>
              {dur} min
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2.5 px-3 text-center border-b">
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  s.plan_filled_count >= 6
                    ? "bg-[var(--imkon-teal)]"
                    : s.plan_filled_count >= 4
                      ? "bg-[var(--imkon-purple)]"
                      : "bg-[var(--imkon-purple)]/50",
                )}
                style={{ width: `${Math.round((s.plan_filled_count / PLAN_TOTAL_FIELDS) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{s.plan_filled_count}/{PLAN_TOTAL_FIELDS}</span>
          </div>
        </td>
        <td className="py-2.5 px-3 text-center border-b">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", statusCfg.className)}>
            {statusCfg.label}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b">
          <td className="border-r" />
          <td colSpan={8} className="px-6 py-3 bg-muted/5">
            {!hasContent ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <X className="h-3.5 w-3.5 text-[var(--imkon-red)]" />
                Dars rejasi to'ldirilmagan
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {s.topic && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Mavzu</p>
                    <p className="text-sm">{s.topic}</p>
                  </div>
                )}
                {s.lesson_type && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Dars turi</p>
                    <p className="text-sm">{LESSON_TYPES.find((t) => t.value === s.lesson_type)?.label ?? s.lesson_type}</p>
                  </div>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
