import { useMutation } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { KeyRound, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { AxiosError } from "axios"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parentApi } from "@/lib/api"

export const Route = createFileRoute("/parent/_parent/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Sozlamalar - Ota-ona paneli" }],
  }),
})

function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const mutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      parentApi.changePassword(data),
    onSuccess: () => {
      toast.success("Parol muvaffaqiyatli o'zgartirildi!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      toast.error(error.response?.data?.detail || "Parolni o'zgartirishda xatolik yuz berdi")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 4) {
      toast.error("Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Yangi parollar mos kelmadi")
      return
    }
    mutation.mutate({ current_password: currentPassword, new_password: newPassword })
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sozlamalar</h1>
        <p className="text-muted-foreground text-sm">Hisobingiz sozlamalari</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-5" />
            Parolni o'zgartirish
          </CardTitle>
          <CardDescription>
            Xavfsizlik uchun parolingizni vaqti-vaqti bilan o'zgartiring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Joriy parol</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Yangi parol</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={4}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Yangi parolni tasdiqlang</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={4}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              O'zgartirish
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
