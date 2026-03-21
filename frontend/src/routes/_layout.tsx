import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { ErrorBoundary } from "react-error-boundary"

import { ErrorComponent } from "@/components/Common/ErrorComponent"
import { Footer } from "@/components/Common/Footer"
import { AppSidebar } from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"

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
        </header>
        <main className="flex-1 p-6 md:p-8 relative z-[1]">
          <div className="mx-auto max-w-7xl">
            <ErrorBoundary fallback={<ErrorComponent />}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
