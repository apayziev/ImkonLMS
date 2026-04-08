import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { GraduationCap, RefreshCw } from "lucide-react"
import { ErrorBoundary } from "react-error-boundary"
import { toast } from "sonner"

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
import { getCurrentAcademicYearQueryOptions } from "@/hooks/useQueryOptions"
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

function Layout() {
  const { data: currentYear } = useQuery(getCurrentAcademicYearQueryOptions())
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const syncMutation = useMutation({
    mutationFn: () => syncApi.runSync(),
    onSuccess: (res) => {
      const d = res.data as Record<string, number>
      toast.success("Sync muvaffaqiyatli!", {
        description: `O'quvchilar: +${d.students_created ?? 0}, O'qituvchilar: +${d.teachers_created ?? 0}, Ota-onalar: +${d.parents_created ?? 0}`,
      })
      queryClient.invalidateQueries()
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
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1 text-muted-foreground" aria-label="Sidebar ochish/yopish" />
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
