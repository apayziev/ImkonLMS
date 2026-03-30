import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

import { lessonsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { getTodayLessonsQueryOptions, queryKeys } from "@/hooks/useQueryOptions"
import { useWeekNavigation } from "@/hooks/useWeekNavigation"
import { UZ_MONTHS, UZ_WEEKDAYS_SHORT } from "./constants"
import { toDateString, todayStr } from "./formatters"
import { LessonCard } from "./LessonCard"

export function LessonsList({
  selectedDate,
  onDateChange,
  onSessionOpen,
}: {
  selectedDate: Date
  onDateChange: (d: Date) => void
  onSessionOpen: (sessionId: number) => void
}) {
  const queryClient = useQueryClient()
  const { weekDays, prevWeek, nextWeek } = useWeekNavigation(selectedDate, onDateChange)
  const dateStr = toDateString(selectedDate)
  const today = todayStr()
  const isToday = dateStr === today

  const { data, isLoading } = useQuery(getTodayLessonsQueryOptions(dateStr))
  const isFutureDate = dateStr > today

  const startMutation = useMutation({
    mutationFn: (scheduleEntryId: number) => lessonsApi.startSession(scheduleEntryId, dateStr),
    onSuccess: (response) => {
      toast.success("Dars boshlandi")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      queryClient.invalidateQueries({ queryKey: queryKeys.lessonsForDate(dateStr) })
      onSessionOpen(response.data.id)
    },
    onError: () => {
      toast.error("Darsni boshlashda xatolik")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      queryClient.invalidateQueries({ queryKey: queryKeys.lessonsForDate(dateStr) })
    },
  })

  const lessons = data?.data ?? []
  const hasInProgressLesson = lessons.some((l) => l.session_status === "in_progress")
  const visibleLessons = hasInProgressLesson
    ? lessons.filter((l) => l.session_status === "in_progress" || l.session_status === "completed")
    : lessons

  return (
    <div className="space-y-6">
      {/* Month label + Calendar popup */}
      <div className="flex items-center justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-3 py-1.5 rounded-md hover:bg-muted/50"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {UZ_MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) onDateChange(date)
              }}
              defaultMonth={selectedDate}
              fromYear={2024}
              toYear={new Date().getFullYear() + 1}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Week day selector */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={prevWeek} className="shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1.5 flex-1 justify-center">
          {weekDays.map((d) => {
            const ds = toDateString(d)
            const isSelected = ds === dateStr
            const isDayToday = ds === today
            return (
              <button
                key={ds}
                type="button"
                onClick={() => onDateChange(d)}
                className={cn(
                  "flex flex-col items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors min-w-[52px]",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isDayToday
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent text-muted-foreground",
                )}
              >
                <span className="text-xs">{UZ_WEEKDAYS_SHORT[d.getDay()]}</span>
                <span className="text-lg font-bold">{d.getDate()}</span>
              </button>
            )
          })}
        </div>
        <Button variant="ghost" size="icon" onClick={nextWeek} className="shrink-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="h-16 w-16 mb-4 opacity-40" />
          <p className="text-xl">
            {isToday ? "Bugun dars yo'q" : "Bu kunda dars yo'q"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleLessons.map((lesson) => (
            <LessonCard
              key={lesson.schedule_entry_id}
              lesson={lesson}
              onStart={() => startMutation.mutate(lesson.schedule_entry_id)}
              onContinue={() => onSessionOpen(lesson.session_id!)}
              isStarting={startMutation.isPending && startMutation.variables === lesson.schedule_entry_id}
              canStart={!isFutureDate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
