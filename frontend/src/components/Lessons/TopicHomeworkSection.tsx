import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CalendarDays,
  FileText,
  Plus,
  Target,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { SessionDetailRead } from "@/lib/api"
import { lessonsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { FileUploadSection } from "@/components/Common/FileUploadSection"
import { queryKeys } from "@/hooks/useQueryOptions"
import { useSaveStatus } from "@/hooks/useSaveStatus"
import { LESSON_TYPES, SUGGESTED_KEYWORDS } from "./constants"
import { SaveStatusIndicator } from "./formatters"

export function TopicHomeworkSection({
  session,
  sessionId: initialSessionId,
  disabled,
  homeworkEditable = false,
  createSession,
}: {
  session: SessionDetailRead
  sessionId: number
  disabled: boolean
  homeworkEditable?: boolean
  createSession?: () => Promise<SessionDetailRead>
}) {
  const queryClient = useQueryClient()
  const { status: saveStatus, onMutate, onSuccess, onError } = useSaveStatus()

  // Session ID may be 0 initially for new plans — resolved after lazy creation
  const sessionIdRef = useRef(initialSessionId)

  const [lessonType, setLessonType] = useState(session.lesson_type ?? "")
  const [topic, setTopic] = useState(session.topic ?? "")
  const [homework, setHomework] = useState(session.homework ?? "")
  const [deadline, setDeadline] = useState(session.homework_deadline ?? "")
  const [objectives, setObjectives] = useState<string[]>(session.objectives ?? [""])
  const [keywords, setKeywords] = useState<string[]>(session.keywords ?? [])
  const [keywordInput, setKeywordInput] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Sync state when session data changes externally
  useEffect(() => {
    setLessonType(session.lesson_type ?? "")
    setTopic(session.topic ?? "")
    setHomework(session.homework ?? "")
    setDeadline(session.homework_deadline ?? "")
    setObjectives(session.objectives ?? [""])
    setKeywords(session.keywords ?? [])
  }, [session.lesson_type, session.topic, session.homework, session.homework_deadline, session.objectives, session.keywords])

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      // Lazy session creation: if sessionId is 0, create plan first
      if (!sessionIdRef.current && createSession) {
        const created = await createSession()
        sessionIdRef.current = created.id
        queryClient.setQueryData(
          queryKeys.lessonSession(created.id),
          created,
        )
      }
      return lessonsApi.updateSession(sessionIdRef.current, data)
    },
    onMutate,
    onSuccess: (response) => {
      onSuccess()
      queryClient.setQueryData(
        queryKeys.lessonSession(sessionIdRef.current),
        (old: SessionDetailRead | undefined) =>
          old ? { ...old, ...response.data } : old,
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
    },
    onError: () => {
      onError()
      toast.error("Saqlashda xatolik")
    },
  })

  const mutateRef = useRef(mutation.mutate)
  mutateRef.current = mutation.mutate

  const saveImmediate = useCallback(
    (data: Record<string, unknown>) => {
      clearTimeout(debounceRef.current)
      mutateRef.current(data)
    },
    [],
  )

  const saveDebounced = useCallback(
    (data: Record<string, unknown>) => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        mutateRef.current(data)
      }, 1000)
    },
    [],
  )

  // --- Objectives helpers ---
  const updateObjective = (index: number, value: string) => {
    const next = [...objectives]
    next[index] = value
    setObjectives(next)
    const filtered = next.filter((o) => o.trim() !== "")
    saveDebounced({ objectives: filtered.length > 0 ? filtered : null })
  }

  const addObjective = () => {
    if (objectives.length < 3) setObjectives([...objectives, ""])
  }

  const removeObjective = (index: number) => {
    const next = objectives.filter((_, i) => i !== index)
    if (next.length === 0) next.push("")
    setObjectives(next)
    const filtered = next.filter((o) => o.trim() !== "")
    saveImmediate({ objectives: filtered.length > 0 ? filtered : null })
  }

  // --- Keywords helpers ---
  const addKeyword = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || keywords.includes(trimmed)) return
    const next = [...keywords, trimmed]
    setKeywords(next)
    setKeywordInput("")
    saveImmediate({ keywords: next })
  }

  const removeKeyword = (index: number) => {
    const next = keywords.filter((_, i) => i !== index)
    setKeywords(next)
    saveImmediate({ keywords: next.length > 0 ? next : null })
  }

  // File upload/delete handlers
  const handleUpload = async (file: File, onProgress?: (percent: number) => void) => {
    // Lazy session creation for file upload
    if (!sessionIdRef.current && createSession) {
      const created = await createSession()
      sessionIdRef.current = created.id
      queryClient.setQueryData(
        queryKeys.lessonSession(created.id),
        created,
      )
    }
    const sid = sessionIdRef.current
    const response = await lessonsApi.uploadMaterial(sid, file, onProgress)
    queryClient.setQueryData(
      queryKeys.lessonSession(sid),
      (old: SessionDetailRead | undefined) =>
        old ? { ...old, materials: [...(old.materials ?? []), response.data] } : old,
    )
    queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
  }

  const handleDelete = async (materialId: number) => {
    const sid = sessionIdRef.current
    await lessonsApi.deleteMaterial(sid, materialId)
    queryClient.setQueryData(
      queryKeys.lessonSession(sid),
      (old: SessionDetailRead | undefined) =>
        old ? { ...old, materials: (old.materials ?? []).filter((m) => m.id !== materialId) } : old,
    )
    queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
  }

  const materialsCount = (session.materials ?? []).length

  // Progress tracking
  const fields = [
    { label: "Dars turi", filled: !!lessonType },
    { label: "Mavzu", filled: !!topic.trim() },
    { label: "Maqsadlar", filled: objectives.some((o) => o.trim()) },
    { label: "Kalit so'zlar", filled: keywords.length > 0 },
    { label: "Uyga vazifa", filled: !!homework.trim() },
    { label: "Materiallar", filled: materialsCount > 0 },
  ]
  const filledCount = fields.filter((f) => f.filled).length
  const totalCount = fields.length
  const progressPercent = Math.round((filledCount / totalCount) * 100)

  return (
    <Card className="rounded-xl border p-0 space-y-0">
      {/* Sticky header: title + progress + save status */}
      <div className="sticky top-0 z-10 bg-card rounded-t-xl border-b px-5 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Dars rejasi
          </h3>
          <SaveStatusIndicator status={saveStatus} />
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              {filledCount}/{totalCount} maydon to'ldirilgan
            </span>
            <span className={cn(
              "text-xs font-medium",
              progressPercent === 100 ? "text-[var(--imkon-teal)]" : "text-muted-foreground",
            )}>
              {progressPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressPercent === 100
                  ? "bg-[var(--imkon-teal)]"
                  : progressPercent >= 50
                    ? "bg-[var(--imkon-purple)]"
                    : "bg-[var(--imkon-purple)]/50",
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">

      {/* Row 1: Lesson Type + Topic */}
      <div className="grid gap-4 md:grid-cols-[180px_1fr] border-t pt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Dars turi <span className="text-destructive">*</span></label>
          <Select
            value={lessonType}
            onValueChange={(v) => {
              setLessonType(v)
              saveImmediate({ lesson_type: v })
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tanlang..." />
            </SelectTrigger>
            <SelectContent>
              {LESSON_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Mavzu <span className="text-destructive">*</span></label>
          <Input
            placeholder="Dars mavzusini kiriting..."
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value)
              saveDebounced({ topic: e.target.value || null })
            }}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Row 2: Objectives */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium text-muted-foreground">
            Dars maqsadlari
          </label>
        </div>
        <div className="space-y-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
              <Input
                placeholder={`${i + 1}-maqsadni kiriting...`}
                value={obj}
                onChange={(e) => updateObjective(i, e.target.value)}
                disabled={disabled}
                className="flex-1"
              />
              {objectives.length > 1 && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeObjective(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {objectives.length < 3 && !disabled && (
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground border-dashed"
              onClick={addObjective}
            >
              <Plus className="h-4 w-4 mr-1" /> Maqsad qo'shish
            </Button>
          )}
        </div>
      </div>

      {/* Row 3: Keywords */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">Kalit so'zlar</label>
          <span className="text-xs text-muted-foreground/60">Enter yoki vergul bilan qo'shing</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {keywords.map((kw, i) => (
            <Badge key={i} variant="secondary" className="text-sm gap-1 pr-1">
              {kw}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeKeyword(i)}
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
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  addKeyword(keywordInput)
                }
              }}
              onBlur={() => {
                if (keywordInput.trim()) addKeyword(keywordInput)
              }}
              className="w-36 h-8 text-sm"
            />
          )}
        </div>
        {/* Suggested tags */}
        {!disabled && keywords.length < 5 && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_KEYWORDS
              .filter((kw) => !keywords.includes(kw))
              .slice(0, 8)
              .map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => addKeyword(kw)}
                  className="text-xs px-2 py-1 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  + {kw}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Row 4: Homework + Deadline */}
      <div className="grid gap-4 md:grid-cols-[1fr_200px] border-t pt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Uyga vazifa</label>
          <Textarea
            placeholder="Uyga vazifani kiriting..."
            value={homework}
            onChange={(e) => {
              setHomework(e.target.value)
              saveDebounced({ homework: e.target.value || null })
            }}
            disabled={disabled && !homeworkEditable}
            rows={2}
            className="resize-none"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium text-muted-foreground">Vazifa muddati</label>
          </div>
          <DatePicker
            value={deadline}
            onChange={(dateStr) => {
              setDeadline(dateStr)
              saveImmediate({ homework_deadline: dateStr || null })
            }}
            placeholder="Sanani tanlang"
            disabled={disabled && !homeworkEditable}
            fromYear={new Date().getFullYear()}
            toYear={new Date().getFullYear() + 1}
          />
        </div>
      </div>

      {/* Materials */}
      <div className="border-t pt-4">
        <FileUploadSection
          files={(session.materials ?? []).map((m) => ({
            id: m.id,
            file_url: m.file_url,
            original_name: m.original_name,
            file_size: m.file_size,
          }))}
          disabled={disabled}
          onUpload={handleUpload}
          onDelete={handleDelete}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,.jpg,.jpeg,.png,.webp,.gif,.mp3,.mp4,.wav,.ogg,.zip,.rar,.7z"
        />
      </div>
      </div>
    </Card>
  )
}
