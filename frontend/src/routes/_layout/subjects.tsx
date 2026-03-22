import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import type { AxiosError } from "axios"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import {
  type SubjectCreate,
  type SubjectRead,
  type SubjectUpdate,
  subjectsApi,
} from "@/lib/api"

export const Route = createFileRoute("/_layout/subjects")({
  component: SubjectsPage,
})

function SubjectsPage() {
  const { user } = useAuth()
  const isAdmin = user?.is_superuser ?? false

  const { data, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data } = await subjectsApi.list()
      return data
    },
  })

  const [addOpen, setAddOpen] = useState(false)
  const [editSubject, setEditSubject] = useState<SubjectRead | null>(null)
  const [deleteSubject, setDeleteSubject] = useState<SubjectRead | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  const subjects = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fanlar</h1>
          <p className="text-sm text-muted-foreground">
            Jami {data?.count ?? 0} ta fan
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Fan qo'shish
          </Button>
        )}
      </div>

      {subjects.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Hozircha fan qo'shilmagan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {subjects.map((subject) => {
            const displayName = subject.name_uz || subject.name
            const color = subject.color || "#6366f1"

            return (
              <Card
                key={subject.id}
                className="hover:border-primary/20 transition-colors"
              >
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <BookOpen className="h-4 w-4" style={{ color }} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{displayName}</CardTitle>
                        {subject.name_uz && subject.name !== subject.name_uz && (
                          <CardDescription className="text-xs">
                            {subject.name}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditSubject(subject)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteSubject(subject)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            O'chirish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {!isAdmin && (
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    )}
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Dialog */}
      <SubjectFormDialog open={addOpen} onOpenChange={setAddOpen} mode="add" />

      {/* Edit Dialog */}
      {editSubject && (
        <SubjectFormDialog
          open={!!editSubject}
          onOpenChange={(open) => !open && setEditSubject(null)}
          mode="edit"
          subject={editSubject}
        />
      )}

      {/* Delete Dialog */}
      {deleteSubject && (
        <DeleteSubjectDialog
          open={!!deleteSubject}
          onOpenChange={(open) => !open && setDeleteSubject(null)}
          subject={deleteSubject}
        />
      )}
    </div>
  )
}

function SubjectFormDialog({
  open,
  onOpenChange,
  mode,
  subject,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  subject?: SubjectRead
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [name, setName] = useState(subject?.name ?? "")
  const [nameUz, setNameUz] = useState(subject?.name_uz ?? "")
  const [color, setColor] = useState(subject?.color ?? "#6366f1")

  const createMutation = useMutation({
    mutationFn: (data: SubjectCreate) => subjectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      showSuccessToast("Fan muvaffaqiyatli qo'shildi")
      onOpenChange(false)
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      showErrorToast(error.response?.data?.detail ?? "Xatolik yuz berdi")
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: SubjectUpdate) => subjectsApi.update(subject!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      showSuccessToast("Fan muvaffaqiyatli yangilandi")
      onOpenChange(false)
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      showErrorToast(error.response?.data?.detail ?? "Xatolik yuz berdi")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      name: name.trim(),
      name_uz: nameUz.trim() || null,
      color: color || null,
    }

    if (mode === "add") {
      createMutation.mutate(payload)
    } else {
      updateMutation.mutate(payload)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Yangi fan qo'shish" : "Fanni tahrirlash"}
          </DialogTitle>
          <DialogDescription>Fan ma'lumotlarini kiriting</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nomi (inglizcha)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mathematics"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name_uz">Nomi (o'zbekcha)</Label>
            <Input
              id="name_uz"
              value={nameUz}
              onChange={(e) => setNameUz(e.target.value)}
              placeholder="Matematika"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Rang</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#6366f1"
                maxLength={7}
                className="flex-1"
              />
            </div>
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

function DeleteSubjectDialog({
  open,
  onOpenChange,
  subject,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: SubjectRead
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => subjectsApi.delete(subject.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      showSuccessToast("Fan o'chirildi")
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
          <DialogTitle>Fanni o'chirish</DialogTitle>
          <DialogDescription>
            <strong>{subject.name_uz || subject.name}</strong> fanini o'chirishni
            tasdiqlaysizmi?
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
