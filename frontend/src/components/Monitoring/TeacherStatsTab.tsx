import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  BarChart3,
  Clock,
  FileText,
  Info,
  Users,
} from "lucide-react"
import { useState } from "react"

import { PLAN_TOTAL_FIELDS } from "@/components/Lessons/constants"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getCurrentAcademicYearQueryOptions,
  getCurrentQuarterQueryOptions,
  getQuartersQueryOptions,
  getTeacherStatsQueryOptions,
} from "@/hooks/useQueryOptions"
import { getInitials } from "@/lib/utils"

import { TeacherDetailView } from "./TeacherDetailView"
import { TeacherRow } from "./TeacherRow"

export function TeacherStatsTab() {
  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const { data: currentQuarter } = useQuery(getCurrentQuarterQueryOptions())
  const { data: quartersData } = useQuery(
    getQuartersQueryOptions(currentYear?.id),
  )
  const quarters = quartersData?.data ?? []

  const [selectedQuarterId, setSelectedQuarterId] = useState<string>("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
    null,
  )

  // Auto-select current quarter
  const activeQuarter = selectedQuarterId
    ? quarters.find((q) => q.id === Number(selectedQuarterId))
    : (currentQuarter ?? quarters[0])

  const startDate = activeQuarter?.start_date ?? ""
  const endDate = activeQuarter?.end_date ?? ""

  const { data: stats, isLoading } = useQuery(
    getTeacherStatsQueryOptions(startDate, endDate),
  )

  const selectedTeacher = stats?.teachers.find(
    (t) => t.teacher_id === selectedTeacherId,
  )

  if (selectedTeacherId && selectedTeacher) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTeacherId(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Orqaga
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={selectedTeacher.photo_url ?? undefined} />
              <AvatarFallback className="text-xs font-bold">
                {getInitials(selectedTeacher.teacher_name)}
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
          <p className="text-sm mt-1">
            Tanlangan chorakda darslar o'tkazilmagan
          </p>
        </div>
      ) : (
        <TooltipProvider delayDuration={200}>
          <Card className="rounded-xl overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">
                      #
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground min-w-[200px]">
                      O'qituvchi
                    </th>
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
                          <p>
                            O'tkazilgan darslar / chorakda kutilgan jami darslar
                          </p>
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
                          <p>
                            Darsni jadvaldan ±5 daqiqa ichida boshlagan /
                            o'tkazilgan
                          </p>
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
                          <p>
                            Mavzu yozilgan darslar soni. Sifat: {PLAN_TOTAL_FIELDS} ta
                            maydon to'ldirilishi (dars turi, mavzu, maqsadlar,
                            kalit so'zlar, uy vazifasi, materiallar, resurslar,
                            baholash usullari)
                          </p>
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
                          <p>
                            Darsning o'rtacha davomiyligi (boshlanish — tugash
                            vaqti)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.teachers.map((t, idx) => (
                    <TeacherRow
                      key={t.teacher_id}
                      teacher={t}
                      index={idx + 1}
                      onClick={() => setSelectedTeacherId(t.teacher_id)}
                    />
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
