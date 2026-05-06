import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Lock, Phone } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { AuthLayout } from "@/components/Common/AuthLayout"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"

const loginSchema = z.object({
  phone: z
    .string()
    .min(5, { message: "Telefon yoki hujjat raqamini kiriting" })
    .regex(/^[A-Za-z0-9+\- ]+$/, { message: "Faqat raqam yoki hujjat raqami" }),
  password: z.string().min(1, { message: "Parol kiritilishi shart" }),
})

export type LoginFormData = z.infer<typeof loginSchema>

const isPhoneInput = (value: string) => /^[\d+ ]*$/.test(value)

const formatPhone = (value: string) => {
  // Document IDs (alphanumeric like "ADMIN000") pass through uppercased
  if (!isPhoneInput(value)) return value.toUpperCase()
  const digits = value.replace(/\D/g, "")
  if (digits.length === 0) return ""
  if (digits.length <= 3) return `+${digits}`
  if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 8)
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`
  if (digits.length <= 10)
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
}

interface LoginFormProps {
  isPending: boolean
  onSubmit: (data: LoginFormData) => void
}

export function LoginForm({ isPending, onSubmit }: LoginFormProps) {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      phone: "+998",
      password: "",
    },
  })

  const handleSubmit = (data: LoginFormData) => {
    if (isPending) return
    onSubmit(data)
  }

  return (
    <AuthLayout>
      <div className="flex flex-col w-full mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-[#FF3B47]/10 flex items-center justify-center border-2 border-[#FF3B47]/20">
              <img
                src="/images/icons/red-icon.png"
                alt="IMKON"
                className="w-8 h-8"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Xush kelibsiz!
          </h1>
          <p className="text-muted-foreground text-sm">
            IMKON O'quv boshqaruv tizimiga kirish
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Telefon yoki hujjat raqami
                  </FormLabel>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="+998 90 123 45 67 yoki ADMIN000"
                        autoComplete="username"
                        className="pl-12 h-12"
                        autoFocus
                        {...field}
                        onChange={(e) =>
                          field.onChange(formatPhone(e.target.value))
                        }
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
              loading={isPending}
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
