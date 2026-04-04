import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import type { AttendanceStatus } from "@/lib/api"
import { cn } from "@/lib/utils"
import { getAttendanceHistoryQueryOptions } from "@/hooks/useQueryOptions"

const STATUS_ICON: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: "✓", className: "text-[var(--imkon-teal)] font-bold" },
  late: { label: "K", className: "text-amber-500 font-bold" },
  absent: { label: "✗", className: "text-[var(--imkon-red)] font-bold" },
  unmarked: { label: "—", className: "text-muted-foreground" },
}

function formatShortDate(ds: string): string {
  const d = new Date(ds + "T00:00:00")
  const day = d.getDate()
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"]
  return `${day} ${months[d.getMonth()]}`
}

export function AttendanceHistoryView({
  entryIds,
  startDate,
  endDate,
}: {
  entryIds: number[]
  startDate: string
  endDate: string
}) {
  const { data, isLoading } = useQuery(
    getAttendanceHistoryQueryOptions(entryIds, startDate, endDate),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || data.students.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Davomat ma'lumotlari topilmadi
      </div>
    )
  }

  const { dates, students } = data

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse min-w-max">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground sticky left-0 bg-background z-10">
              F.I.O
            </th>
            {dates.map((ds) => (
              <th key={ds} className="text-center py-2 px-2 font-medium text-muted-foreground whitespace-nowrap min-w-[52px]">
                {formatShortDate(ds)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            return (
              <tr key={student.student_id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="py-2.5 px-3 sticky left-0 bg-background z-10">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate max-w-[180px]">{student.full_name}</span>
                  </div>
                </td>
                {dates.map((ds) => {
                  const status = student.records[ds] ?? "unmarked"
                  const icon = STATUS_ICON[status]
                  return (
                    <td key={ds} className="text-center py-2.5 px-2">
                      <span className={cn("text-sm", icon.className)}>{icon.label}</span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2">
            <td className="py-2 px-3 font-medium text-muted-foreground sticky left-0 bg-background z-10">
              Jami
            </td>
            {dates.map((ds) => {
              const present = students.filter((s) => s.records[ds] === "present").length
              const total = students.filter((s) => s.records[ds] && s.records[ds] !== "unmarked").length
              return (
                <td key={ds} className="text-center py-2 px-2">
                  {total > 0 ? (
                    <span className={cn(
                      "text-xs font-medium",
                      present === total ? "text-[var(--imkon-teal)]" : "text-muted-foreground",
                    )}>
                      {present}/{total}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
