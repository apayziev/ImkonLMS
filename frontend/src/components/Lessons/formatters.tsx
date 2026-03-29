import { Check, Loader2, TriangleAlert } from "lucide-react"

import type { SaveStatus } from "@/hooks/useSaveStatus"
import { cn } from "@/lib/utils"

export function toDateString(d: Date) {
  return d.toISOString().split("T")[0]
}

export const todayStr = () => toDateString(new Date())

export function SaveStatusIndicator({ status, className }: { status: SaveStatus; className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs transition-opacity",
        status === "idle" ? "opacity-0" : "opacity-100",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-[var(--imkon-teal)]",
        status === "error" && "text-red-500",
        className,
      )}
    >
      {status === "saving" && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saqlanmoqda...</>)}
      {status === "saved" && (<><Check className="h-3.5 w-3.5" /> Saqlandi</>)}
      {status === "error" && (<><TriangleAlert className="h-3.5 w-3.5" /> Xatolik</>)}
    </span>
  )
}

export function lessonStatusFlags(lesson: { session_status?: string | null; has_plan_content?: boolean }) {
  const isInProgress = lesson.session_status === "in_progress"
  const isCompleted = lesson.session_status === "completed"
  const isPlanned = lesson.session_status === "planned"
  const hasPlan = isPlanned || isInProgress || isCompleted
  return { isInProgress, isCompleted, isPlanned, hasPlan }
}
