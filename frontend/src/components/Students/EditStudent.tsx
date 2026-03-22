import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { toast } from "sonner"

import type { GradeRead, StudentRead } from "@/lib/api"
import { DatePicker } from "@/components/ui/date-picker"
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
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { queryKeys } from "@/hooks/useQueryOptions"

import { ParentInfoSection } from "./ParentInfoSection"
import { StudentAvatarInput } from "./StudentAvatarInput"
import {
  studentEditSchema,
  toStudentPayload,
  type StudentEditFormData,
} from "./studentSchema"

interface EditStudentProps {
  student: StudentRead
  grades: GradeRead[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditStudent({ student, grades, open, onOpenChange }: EditStudentProps) {
  const queryClient = useQueryClient()
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isPhotoUploading, setIsPhotoUploading] = useState(false)
  const [isPhotoDeleting, setIsPhotoDeleting] = useState(false)
  const [isPhotoDeleted, setIsPhotoDeleted] = useState(false)

  useEffect(() => {
    if (!open) {
      setPhotoPreview(null)
      setIsPhotoDeleted(false)
    }
  }, [open])

  const getDefaults = (): StudentEditFormData => ({
    document_id: student.document_id,
    first_name: student.first_name,
    last_name: student.last_name,
    middle_name: student.middle_name || "",
    birth_date: student.birth_date || null,
    gender: student.gender || null,
    phone_number: student.phone_number || "",
    grade_id: student.grade_id || null,
    father_first_name: student.father_first_name || "",
    father_last_name: student.father_last_name || "",
    father_phone: student.father_phone || "",
    mother_first_name: student.mother_first_name || "",
    mother_last_name: student.mother_last_name || "",
    mother_phone: student.mother_phone || "",
    address: student.address || "",
    enrollment_date: student.enrollment_date || null,
  })

  const form = useForm<StudentEditFormData>({
    resolver: zodResolver(studentEditSchema),
    defaultValues: getDefaults(),
  })

  useEffect(() => {
    form.reset(getDefaults())
  }, [student, form])

  const photoUploadMutation = useMutation({
    mutationFn: (file: File) => studentsApi.uploadPhoto(student.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      toast.success("Rasm yuklandi")
      setPhotoPreview(null)
      setIsPhotoUploading(false)
      setIsPhotoDeleted(false)
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Rasm yuklashda xatolik yuz berdi"))
      setPhotoPreview(null)
      setIsPhotoUploading(false)
    },
  })

  const photoDeleteMutation = useMutation({
    mutationFn: () => studentsApi.deletePhoto(student.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      toast.success("Rasm o'chirildi")
      setIsPhotoDeleting(false)
      setIsPhotoDeleted(true)
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Rasm o'chirishda xatolik yuz berdi"))
      setIsPhotoDeleting(false)
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: StudentEditFormData) => {
      const { data: updated } = await studentsApi.update(student.id, toStudentPayload(data))
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      toast.success("O'quvchi muvaffaqiyatli yangilandi")
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "O'quvchini yangilashda xatolik yuz berdi"))
    },
  })

  const onSubmit: SubmitHandler<StudentEditFormData> = (data) => {
    mutation.mutate(data)
  }

  const handlePhotoSelect = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setIsPhotoUploading(true)
    photoUploadMutation.mutate(file)
  }

  const handlePhotoDelete = () => {
    setIsPhotoDeleting(true)
    photoDeleteMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>O'quvchini tahrirlash</DialogTitle>
          <DialogDescription>
            {student.last_name} {student.first_name} ma'lumotlarini tahrirlang
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar */}
            <StudentAvatarInput
              photoUrl={isPhotoDeleted ? null : student.photo_url}
              previewUrl={photoPreview}
              firstName={form.watch("first_name")}
              lastName={form.watch("last_name")}
              isLoading={isPhotoUploading}
              isDeleting={isPhotoDeleting}
              onFileSelect={handlePhotoSelect}
              onPhotoDelete={handlePhotoDelete}
            />

            {/* Row 1: Familiya, Ism */}
            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Familiya *</FormLabel>
                    <FormControl>
                      <Input placeholder="Karimov" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ism *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ali" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Otasining ismi, Hujjat raqami */}
            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="middle_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Otasining ismi</FormLabel>
                    <FormControl>
                      <Input placeholder="Valiyevich" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="document_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hujjat raqami *</FormLabel>
                    <FormControl>
                      <Input placeholder="AA1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Tug'ilgan sana, Jinsi */}
            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tug'ilgan sana</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(date) => field.onChange(date ? date.toISOString().split("T")[0] : "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jinsi</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val || null)}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">O'g'il</SelectItem>
                        <SelectItem value="female">Qiz</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 4: Sinf, Telefon */}
            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="grade_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sinf</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sinf tanlang" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id.toString()}>
                            {grade.display_name}
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
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O'quvchi telefoni</FormLabel>
                    <FormControl>
                      <Input placeholder="+998901234567" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Parent Info */}
            <ParentInfoSection control={form.control} type="father" />
            <ParentInfoSection control={form.control} type="mother" />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manzil</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Toshkent shahri, Chilonzor tumani..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
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
                  <FormLabel>Qabul qilingan sana</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={(date) => field.onChange(date ? date.toISOString().split("T")[0] : "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
