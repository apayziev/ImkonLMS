import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, BarChart3, BookOpen, Clock, Download, FileText, Info, Users, X } from "lucide-react"

import type { TeacherStatRead, TeacherSessionDetail } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { useState } from "react"

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
                        <p>Dars mavzusi yozilgan sessionlar / o'tkazilgan darslar</p>
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
            <span className="font-normal text-muted-foreground">/{t.total_conducted}</span>
          </p>
          <PctBar
            value={t.on_time_starts}
            total={t.total_conducted}
            color={
              t.total_conducted > 0 && t.on_time_starts / t.total_conducted >= 0.8
                ? "bg-[var(--imkon-teal)]"
                : t.total_conducted > 0 && t.on_time_starts / t.total_conducted >= 0.5
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
            <span className="font-normal text-muted-foreground">/{t.total_conducted}</span>
          </p>
          <PctBar
            value={t.total_planned}
            total={t.total_conducted}
            color={
              t.total_conducted > 0 && t.total_planned / t.total_conducted >= 0.8
                ? "bg-[var(--imkon-teal)]"
                : "bg-amber-500"
            }
          />
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

const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"]

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  completed: { label: "Tugatilgan", className: "bg-[var(--imkon-teal)]/10 text-[var(--imkon-teal)]" },
  in_progress: { label: "Davom etmoqda", className: "bg-amber-500/10 text-amber-600" },
  planned: { label: "Rejalashtirilgan", className: "bg-blue-500/10 text-blue-600" },
}

const PLAN_FIELDS = [
  { key: "topic", label: "Mavzu" },
  { key: "lesson_type", label: "Dars turi" },
  { key: "objectives", label: "Maqsadlar" },
  { key: "keywords", label: "Kalit so'zlar" },
  { key: "homework", label: "Uy vazifasi" },
  { key: "materials", label: "Materiallar" },
] as const

function TeacherDetailView({ teacherId, startDate, endDate }: { teacherId: number; startDate: string; endDate: string }) {
  const { data: detail, isLoading } = useQuery(
    getTeacherDetailQueryOptions(teacherId, startDate, endDate),
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
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

  // Group sessions by date
  const grouped = new Map<string, TeacherSessionDetail[]>()
  for (const s of detail.sessions) {
    const arr = grouped.get(s.session_date) ?? []
    arr.push(s)
    grouped.set(s.session_date, arr)
  }

  return (
    <div className="space-y-3">
      {[...grouped.entries()].map(([dateStr, sessions]) => {
        const d = new Date(dateStr)
        const dayLabel = `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()]}`
        return (
          <Card key={dateStr} className="rounded-xl overflow-hidden p-0">
            <div className="px-4 py-2.5 bg-muted/30 border-b flex items-center justify-between">
              <p className="text-sm font-semibold">{dayLabel}, {d.getFullYear()}</p>
              <p className="text-xs text-muted-foreground">{sessions.length} dars</p>
            </div>
            <div className="divide-y">
              {sessions
                .sort((a, b) => a.period_number - b.period_number)
                .map((s) => (
                  <SessionRow key={s.session_id} session={s} />
                ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function SessionRow({ session: s }: { session: TeacherSessionDetail }) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = STATUS_LABELS[s.status] ?? STATUS_LABELS.planned

  const filledFields = PLAN_FIELDS.filter((f) => {
    if (f.key === "materials") return s.materials.length > 0
    if (f.key === "objectives" || f.key === "keywords") {
      const val = s[f.key]
      return val && val.length > 0
    }
    return !!s[f.key]
  })
  const hasAnyPlan = filledFields.length > 0

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors text-left cursor-pointer"
      >
        {/* Period */}
        <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">{s.period_number}</span>

        {/* Subject + Grade */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{s.subject_name}</span>
            <span className="text-xs text-muted-foreground">{s.grade_display}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {s.start_time}–{s.end_time}
            {s.started_at && (
              <> · boshlangan: {new Date(s.started_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</>
            )}
          </p>
        </div>

        {/* Plan status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5">
            {PLAN_FIELDS.map((f) => {
              const filled = f.key === "materials"
                ? s.materials.length > 0
                : f.key === "objectives" || f.key === "keywords"
                  ? s[f.key] && s[f.key]!.length > 0
                  : !!s[f.key]
              return (
                <div
                  key={f.key}
                  className={cn(
                    "h-2 w-2 rounded-full",
                    filled ? "bg-[var(--imkon-teal)]" : "bg-muted",
                  )}
                  title={f.label}
                />
              )
            })}
          </div>
          <span className="text-xs text-muted-foreground">{s.plan_filled_count}/6</span>
          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", statusCfg.className)}>
            {statusCfg.label}
          </Badge>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-9 space-y-2 border-t border-dashed">
          {!hasAnyPlan ? (
            <p className="text-sm text-muted-foreground py-2 flex items-center gap-1.5">
              <X className="h-3.5 w-3.5 text-[var(--imkon-red)]" />
              Dars rejasi to'ldirilmagan
            </p>
          ) : (
            <div className="grid gap-2 pt-2">
              {s.topic && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Mavzu</p>
                  <p className="text-sm">{s.topic}</p>
                </div>
              )}
              {s.lesson_type && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Dars turi</p>
                  <p className="text-sm">{s.lesson_type}</p>
                </div>
              )}
              {s.objectives && s.objectives.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Maqsadlar</p>
                  <ul className="text-sm list-disc list-inside">
                    {s.objectives.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              )}
              {s.keywords && s.keywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Kalit so'zlar</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {s.keywords.map((k, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {s.homework && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Uy vazifasi</p>
                  <p className="text-sm">{s.homework}</p>
                </div>
              )}
              {s.materials.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Materiallar</p>
                  <div className="flex flex-col gap-1 mt-0.5">
                    {s.materials.map((m) => (
                      <a
                        key={m.id}
                        href={m.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        {m.original_name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
