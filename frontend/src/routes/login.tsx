import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { ArrowRight, Lock, Phone } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { AuthLayout } from "@/components/Common/AuthLayout"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
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

const loginSchema = z.object({
  phone_number: z
    .string()
    .min(9, { message: "Telefon raqamni kiriting" })
    .regex(/^[\d+ ]+$/, { message: "Faqat raqamlar kiriting" }),
  password: z
    .string()
    .min(1, { message: "Parol kiritilishi shart" }),
})

type LoginFormData = z.infer<typeof loginSchema>

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "")
  if (digits.length <= 3) return `+${digits}`
  if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 8) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`
  if (digits.length <= 10) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
}

function LoginPage() {
  const { loginMutation } = useAuth()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      phone_number: "+998",
      password: "",
    },
  })

  const onSubmit = (data: LoginFormData) => {
    if (loginMutation.isPending) return
    loginMutation.mutate({
      document_id: data.phone_number.replace(/\s/g, ""),
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Telefon raqam
                  </FormLabel>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+998 90 123 45 67"
                        autoComplete="username"
                        className="pl-12 h-12"
                        autoFocus
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Parol
                  </FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                    <FormControl>
                      <PasswordInput
                        placeholder="Parolingizni kiriting"
                        autoComplete="current-password"
                        className="pl-12 h-12"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              loading={loginMutation.isPending}
              className="w-full h-12 text-base font-semibold rounded-xl"
            >
              Tizimga kirish
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </Form>
      </div>
    </AuthLayout>
  )
}
