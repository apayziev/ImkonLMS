import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

import { Toaster } from "@/components/ui/sonner"
import { setUnauthorizedHandler, silentRefresh } from "@/lib/api"
import { isParentDomain } from "@/lib/subdomain"
import "./index.css"
import { routeTree } from "./routeTree.gen"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
  defaultPendingMs: 200,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Route 401s through the SPA router so we don't lose query cache & state.
setUnauthorizedHandler((loginPath) => {
  router.navigate({ to: loginPath, replace: true })
})

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element not found.")
}

const bootstrap = async () => {
  // Mint a fresh access token from the httpOnly refresh cookie before rendering,
  // so initial queries fire with auth instead of bouncing through 401.
  await silentRefresh(isParentDomain() ? "parent" : "admin")

  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster closeButton visibleToasts={3} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

bootstrap()
