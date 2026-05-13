import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { TeacherStatRead } from "@/lib/api"
import { cn, getInitials } from "@/lib/utils"

import { PctBar } from "./PctBar"

export function TeacherRow({
  teacher: t,
  index,
  onClick,
}: {
  teacher: TeacherStatRead
  index: number
  onClick: () => void
}) {
  return (
    <tr
      className="border-b last:border-b-0 hover:bg-muted/10 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <td className="py-3 px-4 text-muted-foreground">{index}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={t.photo_url ?? undefined} />
            <AvatarFallback className="text-xs font-bold">
              {getInitials(t.teacher_name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium truncate">{t.teacher_name}</span>
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <div className="space-y-1">
          <p className="text-sm font-bold">
            {t.total_conducted}
            <span className="font-normal text-muted-foreground">
              /{t.total_expected}
            </span>
          </p>
          <PctBar
            value={t.total_conducted}
            total={t.total_expected}
            color="bg-[var(--imkon-teal)]"
          />
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <div className="space-y-1">
          <p className="text-sm font-bold">
            {t.on_time_starts}
            <span className="font-normal text-muted-foreground">
              /{t.total_expected}
            </span>
          </p>
          <PctBar
            value={t.on_time_starts}
            total={t.total_expected}
            color={
              t.total_expected > 0 && t.on_time_starts / t.total_expected >= 0.8
                ? "bg-[var(--imkon-teal)]"
                : t.total_expected > 0 &&
                    t.on_time_starts / t.total_expected >= 0.5
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
            <span className="font-normal text-muted-foreground">
              /{t.total_expected}
            </span>
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
            <p className="text-[10px] text-muted-foreground">
              sifat: {t.avg_plan_score}%
            </p>
          )}
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="text-sm font-medium">
          {t.avg_duration_minutes != null
            ? `${t.avg_duration_minutes} min`
            : "—"}
        </span>
      </td>
    </tr>
  )
}

export const STATUS_LABELS: Record<
  string,
  { label: string; className: string }
> = {
  completed: {
    label: "Tugallangan",
    className: "bg-[var(--imkon-teal)]/10 text-[var(--imkon-teal)]",
  },
  in_progress: {
    label: "Davom etmoqda",
    className: "bg-amber-500/10 text-amber-600",
  },
  planned: {
    label: "Rejalashtirilgan",
    className: "bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)]",
  },
  not_started: {
    label: "Boshlanmagan",
    className: "bg-muted text-muted-foreground",
  },
  not_created: {
    label: "Reja yo'q",
    className: "bg-muted text-muted-foreground",
  },
}

// Re-export cn to keep import surface stable if SessionTableRow needs it
export { cn }
