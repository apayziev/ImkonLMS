import { cn } from "@/lib/utils"

type Accent = "teal" | "purple"

const ACCENT_CLASSES: Record<Accent, string> = {
  teal: "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal-dark)] border-[var(--imkon-teal)]/30 font-medium",
  purple:
    "bg-[var(--imkon-purple)]/15 text-[var(--imkon-purple)] border-[var(--imkon-purple)]/30 font-medium",
}

interface MultiSelectChipsProps<V extends string> {
  label: string
  options: ReadonlyArray<{ value: V; label: string }>
  selected: ReadonlyArray<V>
  onChange: (next: V[]) => void
  disabled?: boolean
  accent?: Accent
}

export function MultiSelectChips<V extends string>({
  label,
  options,
  selected,
  onChange,
  disabled = false,
  accent = "teal",
}: MultiSelectChipsProps<V>) {
  const toggle = (value: V) => {
    if (disabled) return
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt.value)}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-md border transition-colors",
                isSelected
                  ? ACCENT_CLASSES[accent]
                  : "text-muted-foreground border-border hover:bg-accent",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
