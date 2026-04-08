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
import useParentAuth, { isParentLoggedIn } from "@/hooks/useParentAuth"
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

const loginSchema = z.object({
  phone: z
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

function ParentLoginPage() {
  const { loginMutation } = useParentAuth()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      phone: "+998",
      password: "",
    },
  })

  const onSubmit = (data: LoginFormData) => {
    if (loginMutation.isPending) return
    loginMutation.mutate({
      phone: data.phone.replace(/\s/g, ""),
      password: data.password,
    })
  }

  return (
    <AuthLayout>
      <div className="flex flex-col w-full mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-[#FF3B47]/10 flex items-center justify-center border-2 border-[#FF3B47]/20">
              <img src="/images/icons/red-icon.png" alt="IMKON" className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Ota-ona paneli</h1>
          <p className="text-muted-foreground text-sm">
            Farzandingiz haqida ma'lumotlarni kuzating
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Telefon raqam</FormLabel>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+998 90 123 45 67"
                        autoComplete="tel"
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
                  <FormLabel className="text-sm font-medium">Parol</FormLabel>
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
              Kirish
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </Form>
      </div>
    </AuthLayout>
  )
}
