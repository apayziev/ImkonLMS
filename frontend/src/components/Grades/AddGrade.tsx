import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { type GradeCreate, gradesApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GRADE_LEVELS } from "@/constants/grades"
import useCustomToast from "@/hooks/useCustomToast"

interface AddGradeProps {
  defaultLevel?: number
  variant?: "default" | "compact"
}

export function AddGrade({
  defaultLevel,
  variant = "default",
}: AddGradeProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<GradeCreate>({
    defaultValues: {
      level: defaultLevel ?? 1,
      section: "A",
    },
  })

  useEffect(() => {
    if (defaultLevel !== undefined) {
      form.setValue("level", defaultLevel)
    }
  }, [defaultLevel, form])

  const mutation = useMutation({
    mutationFn: (data: GradeCreate) => gradesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      showSuccessToast("Sinf muvaffaqiyatli qo'shildi")
      setOpen(false)
      form.reset({ level: defaultLevel ?? 1, section: "A" })
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { detail?: string }; status?: number } }
      const detail = apiError?.response?.data?.detail
      let message = "Sinf qo'shishda xatolik yuz berdi"
      if (detail?.includes("already exists") || apiError?.response?.status === 409) {
        message = "Bu sinf allaqachon mavjud! Boshqa bo'lim tanlang (E, F, G, H)"
      } else if (detail) {
        message = detail
      }
      showErrorToast(message)
    },
  })

  const onSubmit: SubmitHandler<GradeCreate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "compact" ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Bo'lim qo'shish
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Sinf qo'shish
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Yangi sinf qo'shish</DialogTitle>
          <DialogDescription>Maktabga yangi sinf qo'shing</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daraja</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(Number.parseInt(value, 10))
                    }
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Darajani tanlang" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GRADE_LEVELS.map((level) => (
                        <SelectItem
                          key={level.value}
                          value={level.value.toString()}
                        >
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bo'lim</FormLabel>
                  <FormControl>
                    <Input placeholder="A, B, Farobiy, Navoiy..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Qo'shilmoqda..." : "Qo'shish"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
