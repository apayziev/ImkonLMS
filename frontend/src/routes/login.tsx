import { createFileRoute, redirect } from "@tanstack/react-router"

import { LoginForm, type LoginFormData } from "@/components/Auth/LoginForm"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import useParentAuth, { isParentLoggedIn } from "@/hooks/useParentAuth"
import { isParentDomain } from "@/lib/subdomain"

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    if (isParentDomain()) {
      if (isParentLoggedIn()) throw redirect({ to: "/parent" })
      return
    }
    if (isLoggedIn()) throw redirect({ to: "/" })
  },
  head: () => ({
    meta: [{ title: "Kirish - IMKON LMS" }],
  }),
})

function LoginPage() {
  return isParentDomain() ? <ParentLogin /> : <AdminLogin />
}

function AdminLogin() {
  const { loginMutation } = useAuth()
  return (
    <LoginForm
      isPending={loginMutation.isPending}
      onSubmit={(data: LoginFormData) =>
        loginMutation.mutate({
          document_id: data.phone.replace(/\s/g, ""),
          password: data.password,
        })
      }
    />
  )
}

function ParentLogin() {
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
