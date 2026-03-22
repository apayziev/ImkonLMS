import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import type { GradeRead, StudentRead, StudentUpdate } from "@/lib/api"
import { extractErrorMessage, studentsApi } from "@/lib/api"
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
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { queryKeys } from "@/hooks/useQueryOptions"

interface EditStudentProps {
  student: StudentRead
  grades: GradeRead[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditStudent({ student, grades, open, onOpenChange }: EditStudentProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<StudentUpdate>({
    defaultValues: {
      first_name: student.first_name,
      last_name: student.last_name,
      student_id: student.student_id ?? "",
      grade_id: student.grade_id,
      birth_date: student.birth_date ?? "",
      gender: student.gender,
      phone_number: student.phone_number ?? "",
      father_name: student.father_name ?? "",
      father_phone: student.father_phone ?? "",
      mother_name: student.mother_name ?? "",
      mother_phone: student.mother_phone ?? "",
      address: student.address ?? "",
      enrollment_date: student.enrollment_date ?? "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        first_name: student.first_name,
        last_name: student.last_name,
        student_id: student.student_id ?? "",
        grade_id: student.grade_id,
        birth_date: student.birth_date ?? "",
        gender: student.gender,
        phone_number: student.phone_number ?? "",
        father_name: student.father_name ?? "",
        father_phone: student.father_phone ?? "",
        mother_name: student.mother_name ?? "",
        mother_phone: student.mother_phone ?? "",
        address: student.address ?? "",
        enrollment_date: student.enrollment_date ?? "",
      })
    }
  }, [open, student, form])

  const mutation = useMutation({
    mutationFn: (data: StudentUpdate) => studentsApi.update(student.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      showSuccessToast("O'quvchi muvaffaqiyatli yangilandi")
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      showErrorToast(extractErrorMessage(error, "O'quvchi yangilashda xatolik yuz berdi"))
    },
  })

  const onSubmit: SubmitHandler<StudentUpdate> = (data) => {
    const payload: StudentUpdate = {
      ...data,
      student_id: data.student_id || null,
      grade_id: data.grade_id || null,
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      phone_number: data.phone_number || null,
      father_name: data.father_name || null,
      father_phone: data.father_phone || null,
      mother_name: data.mother_name || null,
      mother_phone: data.mother_phone || null,
      address: data.address || null,
      enrollment_date: data.enrollment_date || null,
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>O'quvchini tahrirlash</DialogTitle>
          <DialogDescription>{student.full_name}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                rules={{ required: "Ism kiritilishi shart" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ism</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                rules={{ required: "Familiya kiritilishi shart" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Familiya</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="student_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O'quvchi IDsi</FormLabel>
                    <FormControl>
                      <Input placeholder="2026-001" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grade_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sinf</FormLabel>
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grades.map((g) => (
                          <SelectItem key={g.id} value={g.id.toString()}>
                            {g.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jinsi</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Erkak</SelectItem>
                        <SelectItem value="female">Ayol</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tug'ilgan sana</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="+998..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-3">Ota-ona ma'lumotlari</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="father_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Otasi F.I.O</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="father_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Otasi telefoni</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mother_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onasi F.I.O</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mother_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onasi telefoni</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manzil</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enrollment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qabul sanasi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Bekor qilish
              </Button>
              <LoadingButton type="submit" loading={mutation.isPending}>
                Saqlash
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
