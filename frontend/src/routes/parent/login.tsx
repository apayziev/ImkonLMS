import { createFileRoute, redirect } from "@tanstack/react-router"

import { ParentLoginForm } from "@/components/Auth/ParentLoginForm"
import { isParentLoggedIn } from "@/hooks/useParentAuth"
import { isParentDomain } from "@/lib/subdomain"

export const Route = createFileRoute("/parent/login")({
  component: ParentLoginPage,
  beforeLoad: async () => {
    if (isParentDomain()) {
      throw redirect({ to: "/login" })
    }
    if (isParentLoggedIn()) {
      throw redirect({ to: "/parent" })
    }
  },
  head: () => ({
    meta: [{ title: "Ota-ona paneli - Kirish" }],
  }),
})

function ParentLoginPage() {
  return <ParentLoginForm />
}
