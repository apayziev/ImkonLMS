import { useQuery } from "@tanstack/react-query"
import { Check, Clock, Loader2, Minus, X } from "lucide-react"
import type { ReactNode } from "react"

import type { AttendanceStatus } from "@/lib/api"
import { cn } from "@/lib/utils"
import { getAttendanceHistoryQueryOptions } from "@/hooks/useQueryOptions"

const STATUS_CELL: Record<AttendanceStatus, { icon: ReactNode; bg: string }> = {
  present: {
    icon: <Check className="h-3.5 w-3.5 text-white" />,
    bg: "bg-[var(--imkon-teal)]",
  },
  late: {
    icon: <Clock className="h-3.5 w-3.5 text-white" />,
    bg: "bg-amber-400",
  },
  absent: {
    icon: <X className="h-3.5 w-3.5 text-white" />,
    bg: "bg-[var(--imkon-red)]",
  },
  unmarked: {
    icon: <Minus className="h-3 w-3 text-muted-foreground" />,
    bg: "bg-muted",
  },
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
            {dates.map((ds, i) => (
              <th key={ds} className="text-center py-2 px-2 font-medium text-muted-foreground whitespace-nowrap min-w-[52px]">
                <div className="text-xs font-bold text-foreground">{i + 1}-dars</div>
                <div className="text-[10px]">{formatShortDate(ds)}</div>
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
                  const cell = STATUS_CELL[status]
                  return (
                    <td key={ds} className="text-center py-2.5 px-2">
                      <div className={cn("inline-flex items-center justify-center h-6 w-6 rounded-full", cell.bg)}>
                        {cell.icon}
                      </div>
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
