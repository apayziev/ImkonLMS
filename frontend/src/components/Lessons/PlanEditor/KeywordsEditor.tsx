import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

import { SUGGESTED_KEYWORDS } from "../constants"

export function KeywordsEditor({
  keywords,
  keywordInput,
  disabled,
  onInputChange,
  onAdd,
  onRemove,
}: {
  keywords: string[]
  keywordInput: string
  disabled: boolean
  onInputChange: (value: string) => void
  onAdd: (value: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          Kalit so'zlar
        </label>
        <span className="text-xs text-muted-foreground/60">
          Enter yoki vergul bilan qo'shing
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {keywords.map((kw, i) => (
          <Badge key={i} variant="secondary" className="text-sm gap-1 pr-1">
            {kw}
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {!disabled && (
          <Input
            placeholder="Kalit so'z..."
            value={keywordInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault()
                onAdd(keywordInput)
              }
            }}
            onBlur={() => {
              if (keywordInput.trim()) onAdd(keywordInput)
            }}
            className="w-36 h-8 text-sm"
          />
        )}
      </div>
      {/* Suggested tags */}
      {!disabled && keywords.length < 5 && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_KEYWORDS.filter((kw) => !keywords.includes(kw))
            .slice(0, 8)
            .map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => onAdd(kw)}
                className="text-xs px-2 py-1 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                + {kw}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
