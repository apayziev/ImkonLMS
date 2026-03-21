import { createFileRoute, redirect } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react"
import { useState } from "react"

import useAuth, { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
})

interface LoginForm {
  document_id: string
  password: string
}

function LoginPage() {
  const { loginMutation } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({
      document_id: data.document_id.toUpperCase(),
      password: data.password,
    })
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-12">
        <div className="text-center">
          <BookOpen className="h-20 w-20 text-primary mx-auto mb-6" />
          <h1 className="font-display text-6xl text-white tracking-wider mb-4">
            IMKON LMS
          </h1>
          <p className="text-white/70 text-lg max-w-md">
            IMKON Liderlar Maktabi — O'quv boshqaruv tizimi
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <BookOpen className="h-12 w-12 text-primary mx-auto mb-3" />
            <h1 className="font-display text-4xl text-primary tracking-wider">
              IMKON LMS
            </h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Tizimga kirish</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Hujjat raqamingiz va parolingizni kiriting
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Document ID */}
            <div className="space-y-2">
              <label
                htmlFor="document_id"
                className="text-sm font-medium leading-none"
              >
                Hujjat raqami
              </label>
              <input
                id="document_id"
                type="text"
                placeholder="AA1234567"
                autoComplete="username"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("document_id", {
                  required: "Hujjat raqami kiritilishi shart",
                  minLength: {
                    value: 5,
                    message: "Kamida 5 ta belgi",
                  },
                })}
              />
              {errors.document_id && (
                <p className="text-sm text-destructive">
                  {errors.document_id.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none"
              >
                Parol
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("password", {
                    required: "Parol kiritilishi shart",
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kirish...
                </>
              ) : (
                "Kirish"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
