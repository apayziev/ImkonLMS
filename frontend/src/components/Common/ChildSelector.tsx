import type { ParentChildRead } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChildSelectorProps {
  children: ParentChildRead[]
  selectedChildId: number
  onSelect: (id: number) => void
  showGrade?: boolean
  className?: string
}

export function ChildSelector({
  children,
  selectedChildId,
  onSelect,
  showGrade = false,
  className = "w-full sm:w-60",
}: ChildSelectorProps) {
  if (children.length <= 1) return null

  return (
    <Select
      value={String(selectedChildId)}
      onValueChange={(v) => onSelect(Number(v))}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Farzandni tanlang" />
      </SelectTrigger>
      <SelectContent>
        {children.map((child) => (
          <SelectItem key={child.id} value={String(child.id)}>
            {child.full_name}
            {showGrade && ` — ${child.grade_display || "Sinf belgilanmagan"}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
