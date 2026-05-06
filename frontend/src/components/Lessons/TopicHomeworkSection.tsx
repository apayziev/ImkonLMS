import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, FileText, Plus, Target, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { FileUploadSection } from "@/components/Common/FileUploadSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { queryKeys } from "@/hooks/useQueryOptions"
import { useSaveStatus } from "@/hooks/useSaveStatus"
import type { LessonPlanObjectiveRead, LessonPlanRead } from "@/lib/api"
import { lessonsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  ASSESSMENT_METHODS,
  BLOOM_LEVELS,
  LESSON_TYPES,
  RESOURCE_TYPES,
  SUGGESTED_KEYWORDS,
} from "./constants"
import { SaveStatusIndicator } from "./formatters"
import { TmsTestPickerDialog } from "./TmsTestPickerDialog"

export function TopicHomeworkSection({
  plan,
  planId: initialPlanId,
  disabled,
  homeworkEditable = false,
  createPlan,
}: {
  plan: LessonPlanRead | null
  planId: number | null
  disabled: boolean
  homeworkEditable?: boolean
  createPlan?: () => Promise<LessonPlanRead>
}) {
  const queryClient = useQueryClient()
  const { status: saveStatus, onMutate, onSuccess, onError } = useSaveStatus()

  const planIdRef = useRef(initialPlanId ?? 0)

  const [lessonType, setLessonType] = useState(plan?.lesson_type ?? "")
  const [topic, setTopic] = useState(plan?.topic ?? "")
  const [homework, setHomework] = useState(plan?.homework ?? "")
  const [deadline, setDeadline] = useState(plan?.homework_deadline ?? "")
  const [objectives, setObjectives] = useState<LessonPlanObjectiveRead[]>(
    plan?.objectives?.length
      ? plan.objectives
      : [{ text: "", bloom_level: null }],
  )
  const [keywords, setKeywords] = useState<string[]>(plan?.keywords ?? [])
  const [keywordInput, setKeywordInput] = useState("")
  const [resources, setResources] = useState<string[]>(plan?.resources ?? [])
  const [assessmentMethods, setAssessmentMethods] = useState<string[]>(
    plan?.assessment_methods ?? [],
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pendingDataRef = useRef<Record<string, unknown> | null>(null)

  useEffect(() => {
    setLessonType(plan?.lesson_type ?? "")
    setTopic(plan?.topic ?? "")
    setHomework(plan?.homework ?? "")
    setDeadline(plan?.homework_deadline ?? "")
    setObjectives(
      plan?.objectives?.length
        ? plan.objectives
        : [{ text: "", bloom_level: null }],
    )
    setKeywords(plan?.keywords ?? [])
    setResources(plan?.resources ?? [])
    setAssessmentMethods(plan?.assessment_methods ?? [])
  }, [
    plan?.lesson_type,
    plan?.topic,
    plan?.homework,
    plan?.homework_deadline,
    plan?.objectives,
    plan?.keywords,
    plan?.resources,
    plan?.assessment_methods,
  ])

  // Flush pending debounced save on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current)
      if (pendingDataRef.current) {
        mutateRef.current(pendingDataRef.current)
        pendingDataRef.current = null
      }
    }
  }, [])

  const ensurePlanId = async (): Promise<number> => {
    if (planIdRef.current) return planIdRef.current
    if (!createPlan) throw new Error("No createPlan callback")
    const created = await createPlan()
    planIdRef.current = created.id
    return created.id
  }

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const pid = await ensurePlanId()
      return lessonsApi.updatePlan(pid, data)
    },
    onMutate,
    onSuccess: (res) => {
      onSuccess()
      // Update plan cache directly from response (avoids extra fetch)
      if (res.data?.id) {
        queryClient.setQueryData(queryKeys.lessonPlan(res.data.id), res.data)
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
      queryClient.invalidateQueries({ queryKey: ["lessons-for-date"] })
    },
    onError: () => {
      onError()
      toast.error("Saqlashda xatolik")
    },
  })

  const mutateRef = useRef(mutation.mutate)
  mutateRef.current = mutation.mutate

  const saveImmediate = useCallback((data: Record<string, unknown>) => {
    clearTimeout(debounceRef.current)
    // Merge any pending debounced fields into this immediate save
    const merged = pendingDataRef.current
      ? { ...pendingDataRef.current, ...data }
      : data
    pendingDataRef.current = null
    mutateRef.current(merged)
  }, [])

  const saveDebounced = useCallback((data: Record<string, unknown>) => {
    clearTimeout(debounceRef.current)
    // Merge with any existing pending data (e.g. topic + homework typed in quick succession)
    pendingDataRef.current = { ...pendingDataRef.current, ...data }
    const pending = pendingDataRef.current
    debounceRef.current = setTimeout(() => {
      pendingDataRef.current = null
      mutateRef.current(pending)
    }, 1000)
  }, [])

  // --- Objectives helpers ---
  const updateObjectiveText = (index: number, value: string) => {
    const next = [...objectives]
    next[index] = { ...next[index], text: value }
    setObjectives(next)
    const filtered = next.filter((o) => o.text.trim() !== "")
    saveDebounced({ objectives: filtered.length > 0 ? filtered : null })
  }

  const updateObjectiveBloom = (index: number, level: string) => {
    const next = [...objectives]
    next[index] = {
      ...next[index],
      bloom_level: next[index].bloom_level === level ? null : level,
    }
    setObjectives(next)
    const filtered = next.filter((o) => o.text.trim() !== "")
    if (filtered.length > 0) saveImmediate({ objectives: filtered })
  }

  const addObjective = () => {
    if (objectives.length < 3)
      setObjectives([...objectives, { text: "", bloom_level: null }])
  }

  const removeObjective = (index: number) => {
    const next = objectives.filter((_, i) => i !== index)
    if (next.length === 0) next.push({ text: "", bloom_level: null })
    setObjectives(next)
    const filtered = next.filter((o) => o.text.trim() !== "")
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
    saveImmediate({ keywords: next })
  }

  // File upload/delete handlers
  const handleUpload = async (
    file: File,
    onProgress?: (percent: number) => void,
  ) => {
    const pid = await ensurePlanId()
    const response = await lessonsApi.uploadMaterial(pid, file, onProgress)
    queryClient.invalidateQueries({ queryKey: queryKeys.lessonPlan(pid) })
    queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
    queryClient.invalidateQueries({ queryKey: ["lessons-for-date"] })
    return response
  }

  const handleDelete = async (materialId: number) => {
    const pid = planIdRef.current
    if (!pid) return
    await lessonsApi.deleteMaterial(pid, materialId)
    queryClient.invalidateQueries({ queryKey: queryKeys.lessonPlan(pid) })
    queryClient.invalidateQueries({ queryKey: queryKeys.todayLessons })
    queryClient.invalidateQueries({ queryKey: ["lessons-for-date"] })
  }

  const materials = plan?.materials ?? []
  const materialsCount = materials.length

  // Progress tracking (8 fields, stages excluded from quick editor)
  const fields = [
    { label: "Dars turi", filled: !!lessonType },
    { label: "Mavzu", filled: !!topic.trim() },
    { label: "Maqsadlar", filled: objectives.some((o) => o.text.trim()) },
    { label: "Kalit so'zlar", filled: keywords.length > 0 },
    { label: "Uyga vazifa", filled: !!homework.trim() },
    { label: "Materiallar", filled: materialsCount > 0 },
    { label: "Resurslar", filled: resources.length > 0 },
    { label: "Baholash usullari", filled: assessmentMethods.length > 0 },
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
            <span
              className={cn(
                "text-xs font-medium",
                progressPercent === 100
                  ? "text-[var(--imkon-teal)]"
                  : "text-muted-foreground",
              )}
            >
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
            <label className="text-sm font-medium text-muted-foreground">
              Dars turi
            </label>
            <div className="flex items-center gap-2">
              <Select
                value={lessonType}
                onValueChange={(v) => {
                  setLessonType(v)
                  saveImmediate({ lesson_type: v })
                }}
                disabled={disabled}
              >
                <SelectTrigger className="flex-1">
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
              {lessonType && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setLessonType("")
                    saveImmediate({ lesson_type: null })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Mavzu
            </label>
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
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <Input
                    placeholder={`${i + 1}-maqsadni kiriting...`}
                    value={obj.text}
                    onChange={(e) => updateObjectiveText(i, e.target.value)}
                    disabled={disabled}
                    className="flex-1"
                  />
                  {!disabled && (objectives.length > 1 || obj.text.trim()) && (
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
                {obj.text.trim() && !disabled && (
                  <div className="flex items-center gap-1.5 ml-7">
                    <span className="text-[10px] text-muted-foreground/60 mr-0.5">
                      Daraja:
                    </span>
                    {BLOOM_LEVELS.map((bl) => (
                      <button
                        key={bl.value}
                        type="button"
                        onClick={() => updateObjectiveBloom(i, bl.value)}
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                          obj.bloom_level === bl.value
                            ? "bg-[var(--imkon-purple)]/15 text-[var(--imkon-purple)] border-[var(--imkon-purple)]/30 font-medium"
                            : "text-muted-foreground border-border hover:bg-accent",
                        )}
                        title={bl.description}
                      >
                        {bl.label}
                      </button>
                    ))}
                  </div>
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
              {SUGGESTED_KEYWORDS.filter((kw) => !keywords.includes(kw))
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
            <label className="text-sm font-medium text-muted-foreground">
              Uyga vazifa
            </label>
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
              <label className="text-sm font-medium text-muted-foreground">
                Vazifa muddati
              </label>
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

        {/* Row 5: TMS Test */}
        <div className="space-y-2 border-t pt-4">
          <label className="text-sm font-medium text-muted-foreground">
            Uyga vazifa testi (TMS)
          </label>
          <TmsTestPickerDialog
            currentTestId={plan?.homework_test_id ?? null}
            currentTestTitle={plan?.homework_test_title ?? null}
            disabled={disabled}
            onSelect={(testId, title) => {
              saveImmediate({
                homework_test_id: testId,
                homework_test_title: title,
              })
            }}
            onRemove={() => {
              saveImmediate({
                homework_test_id: null,
                homework_test_title: null,
              })
            }}
          />
        </div>

        {/* Row 6: Resources + Assessment Methods */}
        <div className="grid gap-4 md:grid-cols-[1fr_1fr] border-t pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Resurslar
            </label>
            <div className="flex flex-wrap gap-1.5">
              {RESOURCE_TYPES.map((r) => {
                const selected = resources.includes(r.value)
                return (
                  <button
                    key={r.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      const next = selected
                        ? resources.filter((v) => v !== r.value)
                        : [...resources, r.value]
                      setResources(next)
                      saveImmediate({
                        resources: next.length > 0 ? next : null,
                      })
                    }}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-md border transition-colors",
                      selected
                        ? "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal-dark)] border-[var(--imkon-teal)]/30 font-medium"
                        : "text-muted-foreground border-border hover:bg-accent",
                      disabled && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Baholash usullari
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ASSESSMENT_METHODS.map((m) => {
                const selected = assessmentMethods.includes(m.value)
                return (
                  <button
                    key={m.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      const next = selected
                        ? assessmentMethods.filter((v) => v !== m.value)
                        : [...assessmentMethods, m.value]
                      setAssessmentMethods(next)
                      saveImmediate({
                        assessment_methods: next.length > 0 ? next : null,
                      })
                    }}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-md border transition-colors",
                      selected
                        ? "bg-[var(--imkon-purple)]/15 text-[var(--imkon-purple)] border-[var(--imkon-purple)]/30 font-medium"
                        : "text-muted-foreground border-border hover:bg-accent",
                      disabled && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Materials */}
        <div className="border-t pt-4">
          <FileUploadSection
            files={materials.map((m) => ({
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
