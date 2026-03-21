import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Users, GraduationCap } from "lucide-react"

import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold">
          Xush kelibsiz{user?.first_name ? `, ${user.first_name}` : ""}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          IMKON LMS — O'quv boshqaruv tizimi
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">O'quvchilar</p>
              <p className="text-2xl font-bold">—</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fanlar</p>
              <p className="text-2xl font-bold">—</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--imkon-teal)]/10">
              <GraduationCap className="h-6 w-6 text-[var(--imkon-teal)]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sinflar</p>
              <p className="text-2xl font-bold">—</p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder */}
      <div className="rounded-lg border border-dashed p-12 text-center">
        <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Tizim qurilmoqda</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Keyingi qadamlarda sinflar, fanlar va boshqa modullar qo'shiladi.
        </p>
      </div>
    </div>
  )
}
