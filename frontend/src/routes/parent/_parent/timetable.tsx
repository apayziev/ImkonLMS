import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CalendarDays } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { parentApi, type ChildTimetableEntry } from "@/lib/api"

export const Route = createFileRoute("/parent/_parent/timetable")({
  component: TimetablePage,
  head: () => ({
    meta: [{ title: "Dars jadvali - Ota-ona paneli" }],
  }),
})

const DAY_NAMES: Record<number, string> = {
  1: "Dushanba",
  2: "Seshanba",
  3: "Chorshanba",
  4: "Payshanba",
  5: "Juma",
  6: "Shanba",
}

function TimetablePage() {
  const { children, selectedChildId, setSelectedChildId } = useSelectedChild()

  const { data, isLoading } = useQuery({
    queryKey: ["parent-timetable", selectedChildId],
    queryFn: async () => {
      const { data } = await parentApi.timetable(selectedChildId)
      return data
    },
    enabled: selectedChildId > 0,
  })

  // Group by day
  const grouped = (data?.entries ?? []).reduce<Record<number, ChildTimetableEntry[]>>(
    (acc, entry) => {
      if (!acc[entry.day_of_week]) acc[entry.day_of_week] = []
      acc[entry.day_of_week].push(entry)
      return acc
    },
    {},
  )
  const days = Object.keys(grouped).map(Number).sort()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dars jadvali</h1>
          <p className="text-muted-foreground text-sm">Haftalik dars jadvali</p>
        </div>

        <ChildSelector children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : days.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="size-12 mx-auto mb-3 opacity-50" />
            <p>Dars jadvali topilmadi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{DAY_NAMES[day] || `${day}-kun`}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Dars</TableHead>
                      <TableHead>Vaqt</TableHead>
                      <TableHead>Fan</TableHead>
                      <TableHead>O'qituvchi</TableHead>
                      <TableHead className="w-16">Xona</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped[day]
                      .sort((a, b) => a.period_number - b.period_number)
                      .map((entry) => (
                        <TableRow key={`${day}-${entry.period_number}`}>
                          <TableCell className="font-medium">{entry.period_number}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                          </TableCell>
                          <TableCell className="font-medium">{entry.subject_name}</TableCell>
                          <TableCell>{entry.teacher_name}</TableCell>
                          <TableCell>{entry.room || "—"}</TableCell>
                        </TableRow>
                      ))}
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
