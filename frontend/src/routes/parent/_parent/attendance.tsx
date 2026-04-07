import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useParentAuth from "@/hooks/useParentAuth"
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
  const { parent } = useParentAuth()
  const children = parent?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState<number>(
    children[0]?.id ?? 0,
  )

  const { data, isLoading } = useQuery({
    queryKey: ["parent-attendance-full", selectedChildId],
    queryFn: async () => {
      const { data } = await parentApi.attendance(selectedChildId)
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
          <h1 className="text-2xl font-bold">Davomat</h1>
          <p className="text-muted-foreground">Farzandingizning davomat tarixi</p>
        </div>

        {children.length > 1 && (
          <Select
            value={String(selectedChildId)}
            onValueChange={(v) => setSelectedChildId(Number(v))}
          >
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={String(child.id)}>
                  {child.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : dates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Davomat ma'lumotlari topilmadi
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
