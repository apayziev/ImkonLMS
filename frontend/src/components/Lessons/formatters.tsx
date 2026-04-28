import { Check, Loader2, TriangleAlert } from "lucide-react"

import type { SaveStatus } from "@/hooks/useSaveStatus"
import { cn } from "@/lib/utils"

export function toDateString(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const todayStr = () => toDateString(new Date())

export function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
}

export function durationMin(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

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

export function lessonStatusFlags(lesson: { session_status?: string | null; status?: string | null; plan_id?: number | null; plan_filled_count?: number }) {
  const s = lesson.session_status ?? lesson.status ?? null
  const isInProgress = s === "in_progress"
  const isCompleted = s === "completed"
  const hasPlan = !!lesson.plan_id && (lesson.plan_filled_count ?? 0) > 0
  return { isInProgress, isCompleted, hasPlan }
}
