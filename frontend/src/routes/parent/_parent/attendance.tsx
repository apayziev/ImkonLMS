import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CheckCircle2, ClipboardList, Clock, XCircle } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChildSelector } from "@/components/Common/ChildSelector"
import { useSelectedChild } from "@/hooks/useSelectedChild"
import { parentApi, type ChildAttendanceRecord } from "@/lib/api"

export const Route = createFileRoute("/parent/_parent/attendance")({
  component: AttendancePage,
  head: () => ({
    meta: [{ title: "Davomat - Ota-ona paneli" }],
  }),
})

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string; badgeVariant: "default" | "secondary" | "destructive" }> = {
  present: { icon: CheckCircle2, label: "Kelgan", color: "text-green-600", badgeVariant: "default" },
  late: { icon: Clock, label: "Kechikkan", color: "text-yellow-600", badgeVariant: "secondary" },
  absent: { icon: XCircle, label: "Kelmagan", color: "text-red-600", badgeVariant: "destructive" },
}

function AttendancePage() {
  const { children, selectedChildId, setSelectedChildId } = useSelectedChild()
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  const params = {
    ...(startDate && { start_date: startDate }),
    ...(endDate && { end_date: endDate }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ["parent-attendance-full", selectedChildId, startDate, endDate],
    queryFn: async () => {
      const { data } = await parentApi.attendance(selectedChildId, Object.keys(params).length ? params : undefined)
      return data
    },
    enabled: selectedChildId > 0,
  })

  // Group records by date
  const grouped = (data?.records ?? []).reduce<Record<string, ChildAttendanceRecord[]>>(
    (acc, record) => {
      if (!acc[record.date]) acc[record.date] = []
      acc[record.date].push(record)
      return acc
    },
    {},
  )
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const summary = data?.summary

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Davomat</h1>
          <p className="text-muted-foreground text-sm">Farzandingizning davomat tarixi</p>
        </div>

        <ChildSelector children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />
      </div>

      {/* Date filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <DatePicker value={startDate || null} onChange={setStartDate} placeholder="Boshlanish sanasi" className="w-full sm:w-48" />
        <DatePicker value={endDate || null} onChange={setEndDate} placeholder="Tugash sanasi" className="w-full sm:w-48" />
        {(startDate || endDate) && (
          <button type="button" onClick={() => { setStartDate(""); setEndDate("") }} className="text-sm text-muted-foreground hover:text-foreground">
            Tozalash
          </button>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Jami</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">{summary.present}</p>
              <p className="text-xs text-muted-foreground">Kelgan</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
              <p className="text-xs text-muted-foreground">Kechikkan</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
              <p className="text-xs text-muted-foreground">Kelmagan</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records by date */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 text-center space-y-2">
                  <Skeleton className="h-8 w-16 mx-auto" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-5 w-48" /></CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="size-12 mx-auto mb-3 opacity-50" />
            <p>Davomat ma'lumotlari topilmadi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {new Date(date).toLocaleDateString("uz-UZ", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fan</TableHead>
                      <TableHead>Dars</TableHead>
                      <TableHead>Vaqt</TableHead>
                      <TableHead>Holat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped[date].map((record, i) => {
                      const config = statusConfig[record.status]
                      const Icon = config?.icon ?? CheckCircle2
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{record.subject_name}</TableCell>
                          <TableCell>{record.period_number}-dars</TableCell>
                          <TableCell className="text-muted-foreground">
                            {record.start_time.slice(0, 5)} - {record.end_time.slice(0, 5)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={config?.badgeVariant ?? "secondary"}
                              className="gap-1"
                            >
                              <Icon className="size-3" />
                              {config?.label ?? record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
