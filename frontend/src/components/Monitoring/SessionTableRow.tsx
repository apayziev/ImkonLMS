import { X } from "lucide-react"
import { useState } from "react"
import {
  ASSESSMENT_METHODS,
  BLOOM_LEVELS,
  LESSON_TYPES,
  PLAN_TOTAL_FIELDS,
  RESOURCE_TYPES,
} from "@/components/Lessons/constants"
import {
  durationMin,
  formatTime,
} from "@/components/Lessons/formatters"
import type { TeacherSessionDetail } from "@/lib/api"
import { cn } from "@/lib/utils"

import { STATUS_LABELS } from "./TeacherRow"

export function SessionTableRow({
  session: s,
  dateLabel,
  isToday,
  isLastInGroup,
}: {
  session: TeacherSessionDetail
  dateLabel: string
  isToday: boolean
  isLastInGroup: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = STATUS_LABELS[s.status] ?? STATUS_LABELS.not_started
  const hasContent = s.plan_filled_count > 0
  const dur =
    s.started_at && s.ended_at ? durationMin(s.started_at, s.ended_at) : null

  return (
    <>
      <tr
        className={cn(
          "hover:bg-muted/10 transition-colors cursor-pointer",
          isToday && "bg-primary/5",
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <td
          className={cn(
            "py-2.5 px-3 text-sm border-r",
            isLastInGroup && "border-b",
            isToday && "text-primary",
          )}
        >
          {dateLabel && <span className="font-semibold">{dateLabel}</span>}
        </td>
        <td className="py-2.5 px-3 border-b">
          <span className="font-bold">{s.grade_display}</span>
        </td>
        <td className="py-2.5 px-3 text-muted-foreground border-b">
          {s.subject_name}
        </td>
        <td className="py-2.5 px-3 text-center text-muted-foreground border-b">
          {s.period_number}
          <span className="text-[10px] text-muted-foreground ml-1">
            ({s.lesson_number}-dars)
          </span>
        </td>
        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground border-b">
          {s.start_time}–{s.end_time}
        </td>
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
            <span
              className={cn(
                "text-xs font-medium",
                dur < 30
                  ? "text-[var(--imkon-red)]"
                  : dur >= 40
                    ? "text-[var(--imkon-teal)]"
                    : "text-amber-500",
              )}
            >
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
                style={{
                  width: `${Math.round((s.plan_filled_count / PLAN_TOTAL_FIELDS) * 100)}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {s.plan_filled_count}/{PLAN_TOTAL_FIELDS}
            </span>
          </div>
        </td>
        <td className="py-2.5 px-3 text-center border-b">
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
              statusCfg.className,
            )}
          >
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
                    <p className="text-xs font-medium text-muted-foreground">
                      Mavzu
                    </p>
                    <p className="text-sm">{s.topic}</p>
                  </div>
                )}
                {s.lesson_type && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Dars turi
                    </p>
                    <p className="text-sm">
                      {LESSON_TYPES.find((t) => t.value === s.lesson_type)
                        ?.label ?? s.lesson_type}
                    </p>
                  </div>
                )}
                {s.objectives && s.objectives.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Maqsadlar
                    </p>
                    <ul className="text-sm space-y-0.5 mt-0.5">
                      {s.objectives.map((o, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span>• {o.text}</span>
                          {o.bloom_level && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)] font-medium">
                              {BLOOM_LEVELS.find(
                                (b) => b.value === o.bloom_level,
                              )?.label ?? o.bloom_level}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {s.keywords && s.keywords.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Kalit so'zlar
                    </p>
                    <p className="text-sm">{s.keywords.join(", ")}</p>
                  </div>
                )}
                {s.homework && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Uy vazifasi
                    </p>
                    <p className="text-sm">{s.homework}</p>
                  </div>
                )}
                {s.resources && s.resources.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Resurslar
                    </p>
                    <p className="text-sm">
                      {s.resources
                        .map(
                          (r) =>
                            RESOURCE_TYPES.find((rt) => rt.value === r)
                              ?.label ?? r,
                        )
                        .join(", ")}
                    </p>
                  </div>
                )}
                {s.assessment_methods && s.assessment_methods.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Baholash
                    </p>
                    <p className="text-sm">
                      {s.assessment_methods
                        .map(
                          (a) =>
                            ASSESSMENT_METHODS.find((am) => am.value === a)
                              ?.label ?? a,
                        )
                        .join(", ")}
                    </p>
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
