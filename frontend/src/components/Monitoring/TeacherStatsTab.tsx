import { useQuery } from "@tanstack/react-query"
import { BarChart3, Clock, FileText, Users } from "lucide-react"

import type { TeacherStatRead } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  getCurrentQuarterQueryOptions,
  getQuartersQueryOptions,
  getCurrentAcademicYearQueryOptions,
  getTeacherStatsQueryOptions,
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

  // Auto-select current quarter
  const activeQuarter = selectedQuarterId
    ? quarters.find((q) => q.id === Number(selectedQuarterId))
    : currentQuarter ?? quarters[0]

  const startDate = activeQuarter?.start_date ?? ""
  const endDate = activeQuarter?.end_date ?? ""

  const { data: stats, isLoading } = useQuery(
    getTeacherStatsQueryOptions(startDate, endDate),
  )

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
        <Card className="rounded-xl overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground min-w-[200px]">O'qituvchi</th>
                  <th className="py-3 px-3 text-center text-xs font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Darslar
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Vaqtida boshlagan
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Reja to'ldirilgan
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-medium text-muted-foreground">
                    O'rtacha davomiylik
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.teachers.map((t, idx) => (
                  <TeacherRow key={t.teacher_id} teacher={t} index={idx + 1} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Teacher Row ────────────────────────────────────────────────────────────

function TeacherRow({ teacher: t, index }: { teacher: TeacherStatRead; index: number }) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/10 transition-colors">
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
