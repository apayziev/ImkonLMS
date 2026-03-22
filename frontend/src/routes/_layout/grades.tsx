import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { GraduationCap, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import type { AxiosError } from "axios"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { type GradeCreate, type GradeRead, type GradeUpdate, gradesApi } from "@/lib/api"

export const Route = createFileRoute("/_layout/grades")({
  component: GradesPage,
})

function GradesPage() {
  const { user } = useAuth()
  const isAdmin = user?.is_superuser ?? false

  const { data, isLoading } = useQuery({
    queryKey: ["grades"],
    queryFn: async () => {
      const { data } = await gradesApi.list()
      return data
    },
  })

  const [addOpen, setAddOpen] = useState(false)
  const [editGrade, setEditGrade] = useState<GradeRead | null>(null)
  const [deleteGrade, setDeleteGrade] = useState<GradeRead | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  const grades = data?.data ?? []

  // Group by level
  const gradesByLevel = grades.reduce(
    (acc, grade) => {
      if (!acc[grade.level]) acc[grade.level] = []
      acc[grade.level].push(grade)
      return acc
    },
    {} as Record<number, GradeRead[]>,
  )
  const sortedLevels = Object.keys(gradesByLevel).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sinflar</h1>
          <p className="text-sm text-muted-foreground">
            Jami {data?.count ?? 0} ta sinf
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Sinf qo'shish
          </Button>
        )}
      </div>

      {grades.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Hozircha sinf qo'shilmagan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedLevels.map((level) => {
            const levelGrades = gradesByLevel[level]
            const levelName = level === 0 ? "Bog'cha" : `${level}-sinf`
            return (
              <Card key={level} className="hover:border-primary/20 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {level === 0 ? "K" : level}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{levelName}</CardTitle>
                      <CardDescription className="text-xs">
                        {levelGrades.length} ta bo'lim
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {levelGrades
                      .sort((a, b) => a.section.localeCompare(b.section))
                      .map((grade) => (
                        <Badge
                          key={grade.id}
                          variant="secondary"
                          className={`text-xs ${isAdmin ? "cursor-pointer hover:bg-primary/20" : ""}`}
                          onClick={isAdmin ? () => setEditGrade(grade) : undefined}
                        >
                          {grade.display_name}
                          {isAdmin && (
                            <button
                              type="button"
                              className="ml-1 text-destructive/60 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteGrade(grade)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Dialog */}
      <GradeFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
      />

      {/* Edit Dialog */}
      {editGrade && (
        <GradeFormDialog
          open={!!editGrade}
          onOpenChange={(open) => !open && setEditGrade(null)}
          mode="edit"
          grade={editGrade}
        />
      )}

      {/* Delete Dialog */}
      {deleteGrade && (
        <DeleteGradeDialog
          open={!!deleteGrade}
          onOpenChange={(open) => !open && setDeleteGrade(null)}
          grade={deleteGrade}
        />
      )}
    </div>
  )
}

function GradeFormDialog({
  open,
  onOpenChange,
  mode,
  grade,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  grade?: GradeRead
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [level, setLevel] = useState(grade?.level?.toString() ?? "")
  const [section, setSection] = useState(grade?.section ?? "")

  const createMutation = useMutation({
    mutationFn: (data: GradeCreate) => gradesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      showSuccessToast("Sinf muvaffaqiyatli qo'shildi")
      onOpenChange(false)
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      showErrorToast(error.response?.data?.detail ?? "Xatolik yuz berdi")
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: GradeUpdate) => gradesApi.update(grade!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      showSuccessToast("Sinf muvaffaqiyatli yangilandi")
      onOpenChange(false)
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      showErrorToast(error.response?.data?.detail ?? "Xatolik yuz berdi")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const levelNum = Number.parseInt(level)
    if (Number.isNaN(levelNum) || levelNum < 0 || levelNum > 11) return
    if (!section.trim()) return

    if (mode === "add") {
      createMutation.mutate({ level: levelNum, section: section.trim() })
    } else {
      updateMutation.mutate({ level: levelNum, section: section.trim() })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Yangi sinf qo'shish" : "Sinfni tahrirlash"}
          </DialogTitle>
          <DialogDescription>
            Daraja (0-11) va bo'lim nomini kiriting
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="level">Daraja</Label>
            <Input
              id="level"
              type="number"
              min={0}
              max={11}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="0-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section">Bo'lim</Label>
            <Input
              id="section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="A, B, C..."
              maxLength={50}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : mode === "add" ? "Qo'shish" : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteGradeDialog({
  open,
  onOpenChange,
  grade,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  grade: GradeRead
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => gradesApi.delete(grade.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      showSuccessToast("Sinf o'chirildi")
      onOpenChange(false)
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      showErrorToast(error.response?.data?.detail ?? "Xatolik yuz berdi")
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sinfni o'chirish</DialogTitle>
          <DialogDescription>
            <strong>{grade.display_name}</strong> sinfini o'chirishni tasdiqlaysizmi?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
