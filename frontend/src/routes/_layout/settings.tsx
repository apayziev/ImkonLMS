import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { QuarterRead } from "@/lib/api"
import { quartersApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getCurrentAcademicYearQueryOptions,
  getQuartersQueryOptions,
  queryKeys,
} from "@/hooks/useQueryOptions"

export const Route = createFileRoute("/_layout/settings")({
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
  yellow_card_limit: string
}

const EMPTY_FORM: QuarterForm = { number: "", start_date: "", end_date: "", holidays: [], yellow_card_limit: "2" }

// ─── Page ───────────────────────────────────────────────────────────────────

function SettingsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<QuarterRead | null>(null)
  const [form, setForm] = useState<QuarterForm>(EMPTY_FORM)
  const [holidayPickerKey, setHolidayPickerKey] = useState(0)

  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const academicYearId = currentYear?.id

  const { data: quartersData, isLoading } = useQuery(
    getQuartersQueryOptions(academicYearId),
  )
  const quarters = quartersData?.data ?? []

  const today = new Date().toISOString().split("T")[0]

  const getCurrentQuarter = () =>
    quarters.find((q) => q.start_date <= today && today <= q.end_date)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (q: QuarterRead) => {
    setEditing(q)
    setForm({
      number: String(q.number),
      start_date: q.start_date,
      end_date: q.end_date,
      holidays: q.holidays,
      yellow_card_limit: String(q.yellow_card_limit ?? 2),
    })
    setHolidayPickerKey((k) => k + 1)
    setDialogOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof quartersApi.create>[0]) =>
      quartersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quarters(academicYearId) })
      toast.success("Chorak yaratildi")
      setDialogOpen(false)
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof quartersApi.update>[1] }) =>
      quartersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quarters(academicYearId) })
      toast.success("Chorak yangilandi")
      setDialogOpen(false)
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => quartersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quarters(academicYearId) })
      toast.success("Chorak o'chirildi")
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!academicYearId) return
    if (!form.start_date || !form.end_date) {
      toast.error("Boshlanish va tugash sanasini tanlang")
      return
    }

    const payload = {
      number: Number(form.number),
      start_date: form.start_date,
      end_date: form.end_date,
      holidays: form.holidays,
      yellow_card_limit: Number(form.yellow_card_limit) || 2,
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload })
    } else {
      createMutation.mutate({ academic_year_id: academicYearId, ...payload })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const currentQuarter = getCurrentQuarter()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Sozlamalar</h1>

      {/* Quarters section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Choraklar</h2>
            <p className="text-sm text-muted-foreground">
              {currentYear ? `${currentYear.name} o'quv yili` : "—"}
              {currentQuarter ? ` · Hozir ${currentQuarter.number}-chorak` : ""}
            </p>
          </div>
          <Button size="sm" onClick={openCreate} disabled={!academicYearId}>
            <Plus className="h-4 w-4 mr-1.5" />
            Yangi chorak
          </Button>
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
                          {formatDate(q.start_date)} – {formatDate(q.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(q.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </section>

      {/* Dialog */}
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
              <Label htmlFor="yellow_card_limit">Ogohlantirish limiti (chorakda)</Label>
              <Input
                id="yellow_card_limit"
                type="number"
                min={1}
                max={10}
                required
                value={form.yellow_card_limit}
                onChange={(e) => setForm((f) => ({ ...f, yellow_card_limit: e.target.value }))}
                placeholder="2"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dam kunlari</Label>
              {form.holidays.length > 0 && (
                <div className="space-y-1">
                  {form.holidays.map((h) => (
                    <div key={h} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                      <span>{formatDate(h)}</span>
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
    </div>
  )
}

function formatDate(dateStr: string): string {
  const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"]
  const [, m, d] = dateStr.split("-")
  return `${parseInt(d)}-${UZ_MONTHS[parseInt(m) - 1]}`
}
