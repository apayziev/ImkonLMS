import type { QueryClient } from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router"
import { lazy } from "react"
import { ErrorBoundary } from "react-error-boundary"

import { ErrorComponent } from "@/components/Common/ErrorComponent"
import { NotFound } from "@/components/Common/NotFound"
import { TooltipProvider } from "@/components/ui/tooltip"

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : () => null

function RootErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown
  resetErrorBoundary: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center flex-col p-4">
      <span className="text-6xl font-bold leading-none mb-4">Xatolik</span>
      <p className="text-lg text-muted-foreground mb-4 text-center">
        {error instanceof Error ? error.message : "Kutilmagan xato yuz berdi."}
      </p>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        Qayta urinish
      </button>
    </div>
  )
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: () => (
      <ErrorBoundary FallbackComponent={RootErrorFallback}>
        <TooltipProvider>
          <HeadContent />
          <Outlet />
          {import.meta.env.DEV && (
            <TanStackRouterDevtools position="bottom-right" />
          )}
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </TooltipProvider>
      </ErrorBoundary>
    ),
    notFoundComponent: () => <NotFound />,
    errorComponent: ({ error }) => <ErrorComponent error={error} />,
  },
)
