import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Play,
} from "lucide-react"
import { useCallback, useState } from "react"

import type { TodayLessonRead } from "@/lib/api"
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
import { getTodayLessonsQueryOptions, getLessonPlanQueryOptions, queryKeys } from "@/hooks/useQueryOptions"
import { useWeekNavigation } from "@/hooks/useWeekNavigation"
import { TopicHomeworkSection } from "./TopicHomeworkSection"
import { UZ_WEEKDAYS_FULL, UZ_MONTHS, PLAN_TOTAL_FIELDS } from "./constants"
import { toDateString, todayStr, lessonStatusFlags } from "./formatters"

export type EditingTarget =
  | { type: "existing"; planId: number; scheduleEntryId: number; date: string }
  | { type: "new"; scheduleEntryId: number; date: string }

export function WeeklyPlanView({
  selectedDate,
  onDateChange,
  editing,
  onEditingChange,
}: {
  selectedDate: Date
  onDateChange: (d: Date) => void
  editing: EditingTarget | null
  onEditingChange: (target: EditingTarget | null) => void
}) {
  const { weekDays, prevWeek, nextWeek } = useWeekNavigation(selectedDate, onDateChange)

  const today = todayStr()

  if (editing) {
    return (
      <PlanEditor
        editing={editing}
        onBack={() => onEditingChange(null)}
      />
    )
  }

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
          onSessionOpen={(lesson, date) => onEditingChange({
            type: "existing",
            planId: lesson.plan_id!,
            scheduleEntryId: lesson.schedule_entry_id,
            date,
          })}
          onNewPlan={(lesson, date) => onEditingChange({ type: "new", scheduleEntryId: lesson.schedule_entry_id, date })}
        />
      ))}
    </div>
  )
}

/** Plan editor — shows TopicHomeworkSection for plan editing */
function PlanEditor({
  editing,
  onBack,
}: {
  editing: EditingTarget
  onBack: () => void
}) {
  const queryClient = useQueryClient()
  const [createdPlanId, setCreatedPlanId] = useState<number | null>(null)

  // For new plans, look up lesson info from todayLessons cache
  const { data: lessonsData, isLoading: lessonsLoading } = useQuery({
    ...getTodayLessonsQueryOptions(editing.date),
    staleTime: 5 * 60 * 1000,
  })
  const lesson = lessonsData?.data?.find(l => l.schedule_entry_id === editing.scheduleEntryId)

  const resolvedPlanId = editing.type === "existing"
    ? editing.planId
    : (createdPlanId ?? lesson?.plan_id ?? null)

  // Load plan from API when we have a plan ID
  const { data: plan, isLoading } = useQuery({
    ...getLessonPlanQueryOptions(resolvedPlanId ?? 0),
    enabled: !!resolvedPlanId,
  })

  // Lazy plan creation for new plans
  const createPlan = useCallback(async () => {
    const res = await lessonsApi.createPlan(editing.scheduleEntryId, editing.date)
    setCreatedPlanId(res.data.id)
    queryClient.setQueryData(queryKeys.lessonPlan(res.data.id), res.data)
    queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
    queryClient.invalidateQueries({ queryKey: queryKeys.lessonsForDate(editing.date) })
    return res.data
  }, [editing, queryClient])

  if (
    (!resolvedPlanId && lessonsLoading) ||
    (resolvedPlanId && (isLoading || !plan))
  ) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const gradeDisplay = lesson?.grade_display ?? ""
  const subjectName = lesson?.subject_name ?? ""
  const periodNumber = lesson?.period_number ?? 0
  const startTime = lesson?.start_time ?? ""
  const endTime = lesson?.end_time ?? ""

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {gradeDisplay} — {subjectName}
          <span className="text-base font-normal text-muted-foreground ml-2">
            {periodNumber}-soat · {startTime} – {endTime}
          </span>
        </h1>
      </div>

      <TopicHomeworkSection
        plan={plan ?? null}
        planId={resolvedPlanId}
        disabled={false}
        {...(!resolvedPlanId && { createPlan })}
      />
    </div>
  )
}

/** Extracted sub-component so useQuery is called at the top level (not inside .map()) */
function DayLessons({
  day,
  today,
  onSessionOpen,
  onNewPlan,
}: {
  day: Date
  today: string
  onSessionOpen: (lesson: TodayLessonRead, date: string) => void
  onNewPlan: (lesson: TodayLessonRead, date: string) => void
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
            const { isInProgress, isCompleted, hasPlan } = lessonStatusFlags(lesson)
            const hasContent = lesson.plan_filled_count > 0

            return (
              <div
                key={`${ds}-${lesson.schedule_entry_id}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm",
                  isCompleted && "border-[var(--imkon-teal)]/30 bg-[var(--imkon-teal)]/5",
                  isInProgress && "border-[var(--imkon-purple)]/40 bg-[var(--imkon-purple)]/5",
                  hasPlan && !isInProgress && !isCompleted && "border-[var(--imkon-purple)]/20 bg-[var(--imkon-purple)]/3",
                  !hasPlan && !isInProgress && !isCompleted && "border-border hover:bg-muted/20",
                )}
                onClick={() => {
                  if (lesson.plan_id) {
                    onSessionOpen(lesson, ds)
                  } else {
                    onNewPlan(lesson, ds)
                  }
                }}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
                    isCompleted && "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal)]",
                    isInProgress && "bg-[var(--imkon-purple)]/15 text-[var(--imkon-purple)]",
                    hasPlan && !isInProgress && !isCompleted && "bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)]",
                    !hasPlan && !isInProgress && !isCompleted && "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isInProgress ? (
                    <Play className="h-4 w-4" />
                  ) : hasContent ? (
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
                    {lesson.lesson_number > 0 && (
                      <span className="text-[var(--imkon-purple)] font-medium">
                        · {lesson.lesson_number}/{lesson.total_lessons}-dars
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge + progress */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {isCompleted ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--imkon-teal)]/10 text-[var(--imkon-teal)] font-medium">
                      Tugallangan
                    </span>
                  ) : isInProgress ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)] font-medium">
                      Davom etmoqda
                    </span>
                  ) : hasPlan ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple)]/70 font-medium">
                      Rejalashtirilgan
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                      Reja yo'q
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          lesson.plan_filled_count >= PLAN_TOTAL_FIELDS
                            ? "bg-[var(--imkon-teal)]"
                            : lesson.plan_filled_count >= Math.floor(PLAN_TOTAL_FIELDS / 2)
                              ? "bg-[var(--imkon-purple)]"
                              : "bg-[var(--imkon-purple)]/50",
                        )}
                        style={{ width: `${Math.round((lesson.plan_filled_count / PLAN_TOTAL_FIELDS) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{lesson.plan_filled_count}/{PLAN_TOTAL_FIELDS}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
