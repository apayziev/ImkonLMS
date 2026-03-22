"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useMemo } from "react"
import type { ComponentProps } from "react"
import { DayPicker } from "react-day-picker"

import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Uzbek month names
const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
]

// Uzbek day names (short) - starting from Monday
const UZ_WEEKDAYS_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"]

export type CalendarProps = ComponentProps<typeof DayPicker> & {
  fromYear?: number
  toYear?: number
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = 1950,
  toYear = new Date().getFullYear(),
  ...props
}: CalendarProps) {
  // Default to today's date
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    props.defaultMonth ?? props.month ?? today
  )

  // Generate years array
  const years = useMemo(() => {
    const arr = []
    for (let y = toYear; y >= fromYear; y--) {
      arr.push(y)
    }
    return arr
  }, [fromYear, toYear])

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(parseInt(monthIndex))
    setCurrentMonth(newDate)
  }

  const handleYearChange = (year: string) => {
    const newDate = new Date(currentMonth)
    newDate.setFullYear(parseInt(year))
    setCurrentMonth(newDate)
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      weekStartsOn={1}
      month={currentMonth}
      onMonthChange={setCurrentMonth}
      formatters={{
        formatWeekdayName: (date) => {
          const dayIndex = date.getDay()
          return UZ_WEEKDAYS_SHORT[dayIndex === 0 ? 6 : dayIndex - 1]
        },
      }}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "hidden",
        nav: "hidden",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        today: "bg-accent text-accent-foreground rounded-md",
        outside:
          "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left"
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />,
        MonthCaption: () => (
          <div className="flex items-center justify-center gap-2 pb-2">
            {/* Month Select */}
            <Select
              value={currentMonth.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue placeholder={UZ_MONTHS[currentMonth.getMonth()]}>
                  {UZ_MONTHS[currentMonth.getMonth()]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {UZ_MONTHS.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Select */}
            <Select
              value={currentMonth.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue placeholder={currentMonth.getFullYear().toString()}>
                  {currentMonth.getFullYear()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
