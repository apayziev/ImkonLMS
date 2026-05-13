import { cn } from "@/lib/utils"

interface ChipOption {
  value: string
  label: string
}

export function ChipMultiSelect({
  options,
  selected,
  disabled,
  onChange,
  activeClass,
}: {
  options: ReadonlyArray<ChipOption>
  selected: string[]
  disabled: boolean
  onChange: (next: string[]) => void
  activeClass: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const isSelected = selected.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = isSelected
                ? selected.filter((v) => v !== o.value)
                : [...selected, o.value]
              onChange(next)
            }}
            className={cn(
              "text-xs px-2.5 py-1.5 rounded-md border transition-colors",
              isSelected
                ? activeClass
                : "text-muted-foreground border-border hover:bg-accent",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
