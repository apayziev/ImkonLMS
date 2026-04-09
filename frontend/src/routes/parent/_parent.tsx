import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorComponent } from "@/components/Common/ErrorComponent";
import { Footer } from "@/components/Common/Footer";
import { ParentSidebar } from "@/components/Sidebar/ParentSidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { AUTH } from "@/config";
import { isParentLoggedIn } from "@/hooks/useParentAuth";

export const Route = createFileRoute("/parent/_parent")({
  component: ParentLayout,
  beforeLoad: async () => {
    if (!isParentLoggedIn()) {
      throw redirect({ to: AUTH.parentLoginPath });
    }
  },
  errorComponent: ({ error }) => (
    <ErrorComponent error={error} homePath="/parent" />
  ),
});

function ParentLayout() {
  return (
    <SidebarProvider>
      <ParentSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-sm">
          <SidebarTrigger
            className="-ml-1 text-muted-foreground"
            aria-label="Sidebar ochish/yopish"
          />
        </header>
        <main className="flex-1 p-6 md:p-8">
          <ErrorBoundary fallback={<ErrorComponent homePath="/parent" />}>
            <Outlet />
          </ErrorBoundary>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
