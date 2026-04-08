import { createFileRoute, redirect } from "@tanstack/react-router"

import { LoginForm, type LoginFormData } from "@/components/Auth/LoginForm"
import useParentAuth, { isParentLoggedIn } from "@/hooks/useParentAuth"
import { isParentDomain } from "@/lib/subdomain"

export const Route = createFileRoute("/parent/login")({
  component: ParentLoginPage,
  beforeLoad: async () => {
    if (isParentDomain()) throw redirect({ to: "/login" })
    if (isParentLoggedIn()) throw redirect({ to: "/parent" })
  },
  head: () => ({
    meta: [{ title: "Kirish - IMKON LMS" }],
  }),
})

function ParentLoginPage() {
  const { loginMutation } = useParentAuth()
  return (
    <LoginForm
      isPending={loginMutation.isPending}
      onSubmit={(data: LoginFormData) =>
        loginMutation.mutate({
          phone: data.phone.replace(/\s/g, ""),
          password: data.password,
        })
      }
    />
  )
}
