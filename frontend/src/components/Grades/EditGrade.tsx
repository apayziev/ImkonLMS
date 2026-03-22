import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { type GradeRead, type GradeUpdate, gradesApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

interface EditGradeProps {
  grade: GradeRead
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditGrade({ grade, open, onOpenChange }: EditGradeProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<GradeUpdate>({
    defaultValues: {
      level: grade.level,
      section: grade.section,
    },
  })

  useEffect(() => {
    form.reset({
      level: grade.level,
      section: grade.section,
    })
  }, [grade, form])

  const mutation = useMutation({
    mutationFn: (data: GradeUpdate) => gradesApi.update(grade.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      showSuccessToast("Sinf muvaffaqiyatli yangilandi")
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Sinf yangilashda xatolik yuz berdi"
      showErrorToast(message)
    },
  })

  const onSubmit: SubmitHandler<GradeUpdate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sinfni tahrirlash</DialogTitle>
          <DialogDescription>
            Sinf ma'lumotlarini o'zgartiring
          </DialogDescription>
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
                    <Input
                      placeholder="A, B, Farobiy, Navoiy..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
