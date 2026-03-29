import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Play,
} from "lucide-react"

import type { TodayLessonRead } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { lessonStatusFlags } from "./formatters"

export function LessonCard({
  lesson,
  onStart,
  onContinue,
  isStarting,
  canStart,
}: {
  lesson: TodayLessonRead
  onStart: () => void
  onContinue: () => void
  isStarting: boolean
  canStart: boolean
}) {
  const { isInProgress, isCompleted, isPlanned } = lessonStatusFlags(lesson)

  return (
    <Card
      className={cn(
        "rounded-xl border-2 p-5 transition-colors",
        isInProgress && "border-[var(--imkon-purple)]/40 bg-[var(--imkon-purple)]/5",
        isCompleted && "border-[var(--imkon-teal)]/30 bg-[var(--imkon-teal)]/5",
        isPlanned && "border-[var(--imkon-purple)]/20 bg-[var(--imkon-purple)]/3",
        !isInProgress && !isCompleted && !isPlanned && "border-border",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-2xl font-bold">{lesson.grade_display}</p>
          <p className="text-lg text-muted-foreground">{lesson.subject_name}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-lg font-medium">
              {lesson.start_time} – {lesson.end_time}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lesson.period_number}-soat
          </p>
        </div>
      </div>

      {isCompleted ? (
        <Button size="lg" className="w-full text-lg h-12" variant="outline" onClick={onContinue}>
          <CheckCircle2 className="mr-2 h-5 w-5 text-[var(--imkon-teal)]" />
          Tugallangan — Ko'rish
        </Button>
      ) : isInProgress ? (
        <Button size="lg" className="w-full text-lg h-12" variant="default" onClick={onContinue}>
          <Play className="mr-2 h-5 w-5" />
          Davom etish
        </Button>
      ) : isPlanned ? (
        <div className="flex gap-2">
          <Button size="lg" className="flex-1 text-lg h-12" variant="outline" onClick={onContinue}>
            <FileText className="mr-2 h-5 w-5" />
            Rejani ko'rish
          </Button>
          {canStart && (
            <Button size="lg" className="flex-1 text-lg h-12" onClick={onStart} disabled={isStarting}>
              {isStarting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}
              Darsni boshlash
            </Button>
          )}
        </div>
      ) : (
        <Button size="lg" className="w-full text-lg h-12" onClick={onStart} disabled={!canStart || isStarting}>
          {isStarting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}
          Darsni boshlash
        </Button>
      )}
    </Card>
  )
}
