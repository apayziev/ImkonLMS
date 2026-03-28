import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Play,
} from "lucide-react"
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
import { getTodayLessonsQueryOptions, queryKeys } from "@/hooks/useQueryOptions"
import { useWeekNavigation } from "@/hooks/useWeekNavigation"
import { UZ_WEEKDAYS_FULL, UZ_MONTHS } from "./constants"
import { toDateString, todayStr, lessonStatusFlags } from "./helpers"

export function WeeklyPlanView({
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

  const planMutation = useMutation({
    mutationFn: ({ scheduleEntryId, date }: { scheduleEntryId: number; date: string }) =>
      lessonsApi.planSession(scheduleEntryId, date),
    onSuccess: (response) => {
      toast.success("Dars rejasi yaratildi")
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      for (const d of weekDays) {
        queryClient.invalidateQueries({ queryKey: queryKeys.lessonsForDate(toDateString(d)) })
      }
      onSessionOpen(response.data.id)
    },
    onError: () => toast.error("Xatolik"),
  })

  const today = todayStr()

  // Week label
  const firstDay = weekDays[0]
  const lastDay = weekDays[weekDays.length - 1]
  const weekLabel =
    firstDay && lastDay
      ? firstDay.getMonth() === lastDay.getMonth()
        ? `${firstDay.getDate()} – ${lastDay.getDate()} ${UZ_MONTHS[firstDay.getMonth()]} ${firstDay.getFullYear()}`
        : `${firstDay.getDate()} ${UZ_MONTHS[firstDay.getMonth()]} – ${lastDay.getDate()} ${UZ_MONTHS[lastDay.getMonth()]}`
      : ""

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-3 py-1.5 rounded-md hover:bg-muted/50"
            >
              <CalendarDays className="h-3.5 w-3.5 inline mr-1.5" />
              {weekLabel}
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
        <Button variant="ghost" size="icon" onClick={nextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days */}
      {weekDays.map((day) => (
        <DayLessons
          key={toDateString(day)}
          day={day}
          today={today}
          onSessionOpen={onSessionOpen}
          onPlan={(scheduleEntryId, date) => planMutation.mutate({ scheduleEntryId, date })}
        />
      ))}
    </div>
  )
}

/** Extracted sub-component so useQuery is called at the top level (not inside .map()) */
function DayLessons({
  day,
  today,
  onSessionOpen,
  onPlan,
}: {
  day: Date
  today: string
  onSessionOpen: (sessionId: number) => void
  onPlan: (scheduleEntryId: number, date: string) => void
}) {
  const ds = toDateString(day)
  const isToday = ds === today
  const dayName = UZ_WEEKDAYS_FULL[day.getDay()]

  const { data, isLoading } = useQuery({
    ...getTodayLessonsQueryOptions(ds),
    staleTime: 5 * 60 * 1000,
  })

  const lessons = data?.data ?? []

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg mb-2",
          isToday ? "bg-primary/10" : "bg-muted/30",
        )}
      >
        <span className={cn(
          "text-sm font-bold",
          isToday ? "text-primary" : "text-muted-foreground",
        )}>
          {dayName}, {day.getDate()}{isToday && " (bugun)"}
        </span>
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {lessons.length === 0 && !isLoading ? (
        <p className="text-sm text-muted-foreground pl-3 pb-3">Dars yo'q</p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {lessons.map((lesson) => {
            const { isInProgress, isCompleted, isPlanned, hasPlan } = lessonStatusFlags(lesson)
            const hasSession = !!lesson.session_id

            return (
              <div
                key={`${ds}-${lesson.schedule_entry_id}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm",
                  isCompleted && "border-[var(--imkon-teal)]/30 bg-[var(--imkon-teal)]/5",
                  isInProgress && "border-[var(--imkon-purple)]/40 bg-[var(--imkon-purple)]/5",
                  isPlanned && "border-[var(--imkon-purple)]/20 bg-[var(--imkon-purple)]/3",
                  !hasPlan && "border-border hover:bg-muted/20",
                )}
                onClick={() => {
                  if (hasSession) {
                    onSessionOpen(lesson.session_id!)
                  } else {
                    onPlan(lesson.schedule_entry_id, ds)
                  }
                }}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
                    isCompleted && "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal)]",
                    isInProgress && "bg-[var(--imkon-purple)]/15 text-[var(--imkon-purple)]",
                    isPlanned && "bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)]",
                    !hasPlan && "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isInProgress ? (
                    <Play className="h-4 w-4" />
                  ) : isPlanned ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4 opacity-40" />
                  )}
                </div>

                {/* Lesson info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{lesson.grade_display}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{lesson.subject_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{lesson.start_time} – {lesson.end_time}</span>
                    <span>({lesson.period_number}-soat)</span>
                  </div>
                </div>

                {/* Status badge */}
                <div className="shrink-0">
                  {isCompleted ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--imkon-teal)]/10 text-[var(--imkon-teal)] font-medium">
                      Tugallangan
                    </span>
                  ) : isInProgress ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)] font-medium">
                      Davom etmoqda
                    </span>
                  ) : isPlanned ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)]/70 font-medium">
                      Rejalashtirilgan
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                      Reja yo'q
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
