import { Plus, Target, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LessonPlanObjectiveRead } from "@/lib/api"
import { cn } from "@/lib/utils"

import { BLOOM_LEVELS } from "../constants"

export function ObjectivesEditor({
  objectives,
  disabled,
  onTextChange,
  onBloomChange,
  onAdd,
  onRemove,
}: {
  objectives: LessonPlanObjectiveRead[]
  disabled: boolean
  onTextChange: (index: number, value: string) => void
  onBloomChange: (index: number, level: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm font-medium text-muted-foreground">
          Dars maqsadlari
        </label>
      </div>
      <div className="space-y-2">
        {objectives.map((obj, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <Input
                placeholder={`${i + 1}-maqsadni kiriting...`}
                value={obj.text}
                onChange={(e) => onTextChange(i, e.target.value)}
                disabled={disabled}
                className="flex-1"
              />
              {!disabled && (objectives.length > 1 || obj.text.trim()) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onRemove(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {obj.text.trim() && !disabled && (
              <div className="flex items-center gap-1.5 ml-7">
                <span className="text-[10px] text-muted-foreground/60 mr-0.5">
                  Daraja:
                </span>
                {BLOOM_LEVELS.map((bl) => (
                  <button
                    key={bl.value}
                    type="button"
                    onClick={() => onBloomChange(i, bl.value)}
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                      obj.bloom_level === bl.value
                        ? "bg-[var(--imkon-purple)]/15 text-[var(--imkon-purple)] border-[var(--imkon-purple)]/30 font-medium"
                        : "text-muted-foreground border-border hover:bg-accent",
                    )}
                    title={bl.description}
                  >
                    {bl.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {objectives.length < 3 && !disabled && (
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground border-dashed"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-1" /> Maqsad qo'shish
          </Button>
        )}
      </div>
    </div>
  )
}
