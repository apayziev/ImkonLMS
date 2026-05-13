import { cn } from "@/lib/utils"

export function PctBar({
  value,
  total,
  color,
}: {
  value: number
  total: number
  color: string
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-8 text-right">
        {percent}%
      </span>
    </div>
  )
}
