import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { ErrorBoundary } from "react-error-boundary"
import { LogOut, BookOpen } from "lucide-react"

import { isLoggedIn } from "@/hooks/useAuth"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }
  },
})

function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-display text-2xl tracking-wide text-primary">
            IMKON LMS
          </span>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-muted-foreground">
              {user.full_name}
            </span>
          )}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <ErrorBoundary
            fallback={
              <div className="flex items-center justify-center p-8">
                <p className="text-destructive">Xatolik yuz berdi</p>
              </div>
            }
          >
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}

export default Layout
