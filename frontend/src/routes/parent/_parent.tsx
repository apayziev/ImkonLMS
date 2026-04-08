import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import {
  BookOpen,
  CalendarDays,
  Home,
  LogOut,
  ClipboardList,
  Shield,
} from "lucide-react"
import { ErrorBoundary } from "react-error-boundary"

import { AUTH } from "@/config"
import { ErrorComponent } from "@/components/Common/ErrorComponent"
import { Footer } from "@/components/Common/Footer"
import { isParentLoggedIn } from "@/hooks/useParentAuth"
import useParentAuth from "@/hooks/useParentAuth"
import { Link as RouterLink, useRouterState } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/parent/_parent")({
  component: ParentLayout,
  beforeLoad: async () => {
    if (!isParentLoggedIn()) {
      throw redirect({ to: AUTH.parentLoginPath })
    }
  },
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
})

const menuItems = [
  { icon: Home, title: "Bosh sahifa", path: "/parent" },
  { icon: ClipboardList, title: "Davomat", path: "/parent/attendance" },
  { icon: CalendarDays, title: "Dars jadvali", path: "/parent/timetable" },
  { icon: BookOpen, title: "Uyga vazifa", path: "/parent/homework" },
  { icon: Shield, title: "Intizom", path: "/parent/discipline" },
]

function ParentLayout() {
  const { parent, logout } = useParentAuth()
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          <RouterLink to="/parent" className="flex items-center gap-2">
            <img src="/images/icons/red-icon.png" alt="IMKON" className="h-8 w-8" />
            <span className="font-bold text-lg hidden sm:inline">IMKON</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium hidden sm:inline">
              Ota-ona
            </span>
          </RouterLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {menuItems.map((item) => {
              const isActive = currentPath === item.path
              return (
                <RouterLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.title}
                </RouterLink>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {parent && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{parent.name}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Chiqish</span>
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path
            return (
              <RouterLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <item.icon className="size-3.5" />
                {item.title}
              </RouterLink>
            )
          })}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <ErrorBoundary fallback={<ErrorComponent />}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  )
}
