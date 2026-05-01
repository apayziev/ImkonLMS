"use client"

import { CalendarIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn, formatDateUz, toDateString, toLocalDate } from "@/lib/utils"

interface DatePickerProps {
  value?: string | null
  onChange?: (dateStr: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  fromYear?: number
  toYear?: number
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Sanani tanlang",
  disabled = false,
  className,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 5,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const dateValue = React.useMemo(
    () => toLocalDate(value) ?? undefined,
    [value],
  )

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date ? toDateString(date) : "")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? formatDateUz(dateValue) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          defaultMonth={dateValue ?? new Date()}
          fromYear={fromYear}
          toYear={toYear}
        />
      </PopoverContent>
    </Popover>
  )
}
