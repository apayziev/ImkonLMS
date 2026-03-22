import { createFileRoute, redirect } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { ArrowRight, Eye, EyeOff, Lock, Phone, Loader2 } from "lucide-react"
import { useState } from "react"

import { AuthLayout } from "@/components/Common/AuthLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "Kirish - IMKON LMS" }],
  }),
})

interface LoginForm {
  phone_number: string
  password: string
}

function LoginPage() {
  const { loginMutation } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: {
      phone_number: "+998",
      password: "",
    },
  })

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({
      document_id: data.phone_number,
      password: data.password,
    })
  }

  return (
    <AuthLayout>
      <div className="flex flex-col w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-[#FF3B47]/10 flex items-center justify-center border-2 border-[#FF3B47]/20">
              <img src="/images/icons/red-icon.png" alt="IMKON" className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Xush kelibsiz!</h1>
          <p className="text-muted-foreground text-sm">
            IMKON O'quv boshqaruv tizimiga kirish
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone_number" className="text-sm font-medium">
              Telefon raqam
            </Label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="phone_number"
                type="tel"
                placeholder="+998 90 123 45 67"
                autoComplete="username"
                className="pl-12 h-12"
                autoFocus
                {...register("phone_number", {
                  required: "Telefon raqamni kiriting",
                  minLength: { value: 9, message: "Kamida 9 ta belgi" },
                  pattern: { value: /^[0-9+]+$/, message: "Faqat raqamlar kiriting" },
                })}
              />
            </div>
            {errors.phone_number && (
              <p className="text-sm text-destructive">{errors.phone_number.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Parol
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Parolingizni kiriting"
                autoComplete="current-password"
                className="pl-12 pr-12 h-12"
                {...register("password", {
                  required: "Parol kiritilishi shart",
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold rounded-xl"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kirish...
              </>
            ) : (
              <>
                Tizimga kirish
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}
