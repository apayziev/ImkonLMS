import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { QuarterRead, ViolationTypeRead } from "@/lib/api"
import { quartersApi, violationsApi } from "@/lib/api"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getCurrentAcademicYearQueryOptions,
  getQuartersQueryOptions,
  getViolationTypesQueryOptions,
  queryKeys,
} from "@/hooks/useQueryOptions"
import { requireAdmin } from "@/lib/routeGuards"
import { formatDateShortUz } from "@/lib/utils"

export const Route = createFileRoute("/_layout/settings")({
  beforeLoad: requireAdmin,
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Sozlamalar - IMKON LMS" }],
  }),
})

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuarterForm {
  number: string
  start_date: string
  end_date: string
  holidays: string[]
}

const EMPTY_FORM: QuarterForm = { number: "", start_date: "", end_date: "", holidays: [] }

interface ViolationTypeForm {
  name: string
  description: string
  points: string
}

const EMPTY_VT_FORM: ViolationTypeForm = { name: "", description: "", points: "1" }

// ─── Page ───────────────────────────────────────────────────────────────────

function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin" || user?.is_superuser
  const queryClient = useQueryClient()

  // Quarter state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<QuarterRead | null>(null)
  const [form, setForm] = useState<QuarterForm>(EMPTY_FORM)
  const [holidayPickerKey, setHolidayPickerKey] = useState(0)

  // Violation Type state
  const [vtDialogOpen, setVtDialogOpen] = useState(false)
  const [editingVt, setEditingVt] = useState<ViolationTypeRead | null>(null)
  const [vtForm, setVtForm] = useState<ViolationTypeForm>(EMPTY_VT_FORM)

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "quarter" | "violation"
    id: number
    label: string
  } | null>(null)

  // Queries
  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const academicYearId = currentYear?.id

  const { data: quartersData, isLoading } = useQuery(
    getQuartersQueryOptions(academicYearId),
  )
  const quarters = quartersData?.data ?? []

  const { data: violationTypes = [], isLoading: vtLoading } = useQuery({
    ...getViolationTypesQueryOptions(),
    select: (data) => data,
  })

  const today = new Date().toISOString().split("T")[0]

  const getCurrentQuarter = () =>
    quarters.find((q) => q.start_date <= today && today <= q.end_date)
  const currentQuarter = getCurrentQuarter()

  // ─── Quarter mutations ─────────────────────────────────────────────

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true) }
  const openEdit = (q: QuarterRead) => {
    setEditing(q)
    setForm({
      number: String(q.number),
      start_date: q.start_date,
      end_date: q.end_date,
      holidays: q.holidays,
    })
    setHolidayPickerKey((k) => k + 1)
    setDialogOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof quartersApi.create>[0]) => quartersApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.quarters(academicYearId) }); toast.success("Chorak yaratildi"); setDialogOpen(false) },
    onError: () => toast.error("Xatolik yuz berdi"),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof quartersApi.update>[1] }) => quartersApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.quarters(academicYearId) }); toast.success("Chorak yangilandi"); setDialogOpen(false) },
    onError: () => toast.error("Xatolik yuz berdi"),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => quartersApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.quarters(academicYearId) }); toast.success("Chorak o'chirildi") },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!academicYearId) return
    if (!form.start_date || !form.end_date) { toast.error("Boshlanish va tugash sanasini tanlang"); return }
    const payload = {
      number: Number(form.number),
      start_date: form.start_date,
      end_date: form.end_date,
      holidays: form.holidays,
    }
    editing ? updateMutation.mutate({ id: editing.id, data: payload }) : createMutation.mutate({ academic_year_id: academicYearId, ...payload })
  }

  // ─── Violation Type mutations ──────────────────────────────────────

  const openVtCreate = () => { setEditingVt(null); setVtForm(EMPTY_VT_FORM); setVtDialogOpen(true) }
  const openVtEdit = (vt: ViolationTypeRead) => {
    setEditingVt(vt)
    setVtForm({ name: vt.name, description: vt.description ?? "", points: String(vt.points) })
    setVtDialogOpen(true)
  }

  const vtCreateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; points?: number }) => violationsApi.createType(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.violationTypes }); toast.success("Qoidabuzarlik turi yaratildi"); setVtDialogOpen(false) },
    onError: () => toast.error("Xatolik yuz berdi"),
  })
  const vtUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string; points?: number } }) => violationsApi.updateType(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.violationTypes }); toast.success("Tur yangilandi"); setVtDialogOpen(false) },
    onError: () => toast.error("Xatolik yuz berdi"),
  })
  const vtDeleteMutation = useMutation({
    mutationFn: (id: number) => violationsApi.deleteType(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.violationTypes }); toast.success("Tur o'chirildi") },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const handleVtSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vtForm.name.trim()) { toast.error("Nomini kiriting"); return }
    const payload = { name: vtForm.name.trim(), description: vtForm.description.trim() || undefined, points: Number(vtForm.points) || 1 }
    editingVt ? vtUpdateMutation.mutate({ id: editingVt.id, data: payload }) : vtCreateMutation.mutate(payload)
  }

  // ─── Delete confirmation handler ──────────────────────────────────

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === "quarter") deleteMutation.mutate(deleteConfirm.id)
    else vtDeleteMutation.mutate(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const vtPending = vtCreateMutation.isPending || vtUpdateMutation.isPending

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Sozlamalar</h1>

      <Tabs defaultValue="quarters" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="quarters">Choraklar</TabsTrigger>
          <TabsTrigger value="violations">Qoidabuzarlik turlari</TabsTrigger>
        </TabsList>

        {/* ═══ Quarters Tab ═══ */}
        <TabsContent value="quarters" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {currentYear ? `${currentYear.name} o'quv yili` : "—"}
                {currentQuarter ? ` · Hozir ${currentQuarter.number}-chorak` : ""}
              </p>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} disabled={!academicYearId}>
                <Plus className="h-4 w-4 mr-1.5" />
                Yangi chorak
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : quarters.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground text-sm">
              Hali chorak kiritilmagan
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              {quarters
                .sort((a, b) => a.number - b.number)
                .map((q, idx) => {
                  const isActive = q.start_date <= today && today <= q.end_date
                  const isPast = q.end_date < today
                  return (
                    <div
                      key={q.id}
                      className={`flex items-center justify-between px-4 py-3 ${idx !== 0 ? "border-t" : ""} ${isActive ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold w-6 ${isActive ? "text-primary" : isPast ? "text-muted-foreground" : ""}`}>
                          {q.number}
                        </span>
                        <div>
                          <p className={`text-sm font-medium ${isActive ? "text-primary" : isPast ? "text-muted-foreground" : ""}`}>
                            {q.number}-chorak
                            {isActive && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                Aktiv
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateShortUz(q.start_date)} – {formatDateShortUz(q.end_date)}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm({ type: "quarter", id: q.id, label: `${q.number}-chorak` })}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </TabsContent>

        {/* ═══ Violation Types Tab ═══ */}
        <TabsContent value="violations" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              O'qituvchilar darsda turlardan birini tanlaydi
            </p>
            {isAdmin && (
              <Button size="sm" onClick={openVtCreate}>
                <Plus className="h-4 w-4 mr-1.5" />
                Yangi tur
              </Button>
            )}
          </div>

          {vtLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : violationTypes.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground text-sm">
              Hali qoidabuzarlik turi kiritilmagan
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              {violationTypes.map((vt, idx) => (
                <div
                  key={vt.id}
                  className={`flex items-center justify-between px-4 py-3 ${idx !== 0 ? "border-t" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shrink-0">
                      {vt.points}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{vt.name}</p>
                      {vt.description && (
                        <p className="text-xs text-muted-foreground truncate">{vt.description}</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openVtEdit(vt)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm({ type: "violation", id: vt.id, label: vt.name })}
                        disabled={vtDeleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              O'chirishni tasdiqlang
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteConfirm?.label}"</strong> ni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ Quarter Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Chorakni tahrirlash" : "Yangi chorak"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="number">Chorak raqami</Label>
              <Input
                id="number"
                type="number"
                min={1}
                max={4}
                required
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                placeholder="1–4"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Boshlanish sanasi</Label>
              <DatePicker
                value={form.start_date || null}
                onChange={(d) => setForm((f) => ({ ...f, start_date: d }))}
                placeholder="Sanani tanlang"
                fromYear={2020}
                toYear={2035}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tugash sanasi</Label>
              <DatePicker
                value={form.end_date || null}
                onChange={(d) => setForm((f) => ({ ...f, end_date: d }))}
                placeholder="Sanani tanlang"
                fromYear={2020}
                toYear={2035}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dam kunlari</Label>
              {form.holidays.length > 0 && (
                <div className="space-y-1">
                  {form.holidays.map((h) => (
                    <div key={h} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                      <span>{formatDateShortUz(h)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setForm((f) => ({ ...f, holidays: f.holidays.filter((d) => d !== h) }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <DatePicker
                key={holidayPickerKey}
                value={null}
                onChange={(d) => {
                  if (d && !form.holidays.includes(d)) {
                    setForm((f) => ({ ...f, holidays: [...f.holidays, d].sort() }))
                  }
                  setHolidayPickerKey((k) => k + 1)
                }}
                placeholder="Dam kuni qo'shish"
                fromYear={2020}
                toYear={2035}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {editing ? "Saqlash" : "Yaratish"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ Violation Type Dialog ═══ */}
      <Dialog open={vtDialogOpen} onOpenChange={setVtDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingVt ? "Turni tahrirlash" : "Yangi qoidabuzarlik turi"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVtSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="vt-name">Nomi</Label>
              <Input
                id="vt-name"
                required
                value={vtForm.name}
                onChange={(e) => setVtForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Masalan: Yengil intizomiy xatolar"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vt-desc">Tavsif</Label>
              <Textarea
                id="vt-desc"
                value={vtForm.description}
                onChange={(e) => setVtForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Qoidabuzarlik haqida tushuntirish"
                className="min-h-[80px] resize-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vt-points">Ball</Label>
              <Input
                id="vt-points"
                type="number"
                min={1}
                max={100}
                required
                value={vtForm.points}
                onChange={(e) => setVtForm((f) => ({ ...f, points: e.target.value }))}
                placeholder="1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setVtDialogOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={vtPending}>
                {vtPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {editingVt ? "Saqlash" : "Yaratish"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
