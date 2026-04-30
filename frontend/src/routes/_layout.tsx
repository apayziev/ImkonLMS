import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronRight, GraduationCap, Home, RefreshCw } from "lucide-react"
import { useEffect } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { toast } from "sonner"
import { z } from "zod"

import { ErrorComponent } from "@/components/Common/ErrorComponent"
import { Footer } from "@/components/Common/Footer"
import { AppSidebar } from "@/components/Sidebar/AppSidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getCurrentAcademicYearQueryOptions, queryKeys } from "@/hooks/useQueryOptions"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { syncApi } from "@/lib/api"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }
  },
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
})

const BG_PATTERN_STYLE = {
  backgroundImage: "url(/images/patterns/Patterns-02.png)",
  backgroundSize: "cover",
  backgroundPosition: "left center",
  backgroundRepeat: "no-repeat",
} as const

const TEACHER_ALLOWED = ["/lessons", "/lesson-plan", "/"] as const

// Sync endpoint returns counts per affected table; unknown keys are tolerated
// so a backend that adds new tables doesn't break the toast.
const syncResponseSchema = z.record(z.string(), z.number().int().nonnegative()).default({})

const PATH_LABELS: Record<string, string> = {
  "/students": "O'quvchilar",
  "/teachers": "O'qituvchilar",
  "/timetable": "Dars jadvali",
  "/lessons": "Darslar",
  "/lesson-plan": "Dars rejasi",
  "/monitoring": "Monitoring",
  "/settings": "Sozlamalar",
  "/attendance": "Davomat",
}

function Breadcrumb({ pathname }: { pathname: string }) {
  if (pathname === "/") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Home className="size-4" />
        Bosh sahifa
      </span>
    )
  }
  const label = PATH_LABELS[pathname] ?? null
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Bosh sahifaga qaytish"
      >
        <Home className="size-4" />
      </Link>
      <ChevronRight className="size-3.5 text-muted-foreground/50" aria-hidden="true" />
      <span className="font-medium text-foreground" aria-current="page">
        {label ?? pathname.replace(/^\//, "")}
      </span>
    </nav>
  )
}

function Layout() {
  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const router = useRouterState()
  const currentPath = router.location.pathname

  // Teacher subdomain: non-teacher → stays on admin home (different subdomain is just cosmetic for admin)
  // Teacher user (any subdomain): block admin-only routes
  const isTeacher = user?.role === "teacher"

  useEffect(() => {
    if (!user) return

    if (isTeacher && !TEACHER_ALLOWED.some((r) => r === "/" ? currentPath === "/" : currentPath.startsWith(r))) {
      navigate({ to: "/lessons" })
    }
  }, [user, currentPath, isTeacher, navigate])

  const syncMutation = useMutation({
    mutationFn: () => syncApi.runSync(),
    onSuccess: (res) => {
      const parsed = syncResponseSchema.safeParse(res.data)
      const d = parsed.success ? parsed.data : {}
      const parts = [
        d.students_created && `${d.students_created} yangi o'quvchi`,
        d.students_updated && `${d.students_updated} o'quvchi yangilandi`,
        d.teachers_created && `${d.teachers_created} yangi o'qituvchi`,
        d.teachers_updated && `${d.teachers_updated} o'qituvchi yangilandi`,
        d.parents_created && `${d.parents_created} yangi ota-ona`,
      ].filter(Boolean)
      toast.success("Sync muvaffaqiyatli!", {
        description: parts.length
          ? parts.join(", ")
          : "Barcha ma'lumotlar dolzarb — o'zgarish yo'q",
      })
      // Sync only touches roster data — invalidate just those, not the
      // entire cache. An unscoped invalidate refetches every query on every
      // mounted page (timetables, dashboards, ongoing sessions).
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers })
    },
    onError: () => {
      toast.error("Sync xatolik!", {
        description: "Payment tizimidan ma'lumot olishda xatolik yuz berdi",
      })
    },
  })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div
          className="fixed top-0 right-0 w-full sm:w-[400px] h-full opacity-[0.03] pointer-events-none z-0"
          style={BG_PATTERN_STYLE}
        />
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b px-4 bg-background/80 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1 text-muted-foreground" aria-label="Sidebar ochish/yopish" />
          <Breadcrumb pathname={currentPath} />
          <div className="ml-auto flex items-center gap-2">
            {user?.is_superuser && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="gap-1.5 text-sm"
              >
                <RefreshCw className={`size-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                {syncMutation.isPending ? "Sync..." : "Sync"}
              </Button>
            )}
            {currentYear && (
              <Badge variant="outline" className="gap-1.5 text-sm font-medium">
                <GraduationCap className="size-4" />
                {currentYear.name}
              </Badge>
            )}
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 relative z-[1]">
          <ErrorBoundary fallback={<ErrorComponent />}>
            <Outlet />
          </ErrorBoundary>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
