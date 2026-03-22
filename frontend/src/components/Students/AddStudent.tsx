import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { UserPlus } from "lucide-react"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { toast } from "sonner"

import type { GradeRead } from "@/lib/api"
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
  studentBaseSchema,
  studentDefaultValues,
  toStudentPayload,
  type StudentBaseFormData,
} from "./studentSchema"

interface AddStudentProps {
  grades: GradeRead[]
}

export function AddStudent({ grades }: AddStudentProps) {
  const [open, setOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const form = useForm<StudentBaseFormData>({
    resolver: zodResolver(studentBaseSchema),
    defaultValues: studentDefaultValues,
  })

  const mutation = useMutation({
    mutationFn: async (data: StudentBaseFormData) => {
      const { data: created } = await studentsApi.create(toStudentPayload(data))
      return created
    },
    onSuccess: async (createdStudent) => {
      if (selectedPhoto && createdStudent.id) {
        try {
          await studentsApi.uploadPhoto(createdStudent.id, selectedPhoto)
        } catch {
          toast.error("Rasm yuklanmadi, keyinroq urinib ko'ring")
        }
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.students })
      toast.success("O'quvchi muvaffaqiyatli qo'shildi")
      setOpen(false)
      form.reset()
      setSelectedPhoto(null)
      setPhotoPreview(null)
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "O'quvchi qo'shishda xatolik yuz berdi"))
    },
  })

  const onSubmit: SubmitHandler<StudentBaseFormData> = (data) => {
    mutation.mutate(data)
  }

  const handlePhotoSelect = (file: File) => {
    setSelectedPhoto(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handlePhotoDelete = () => {
    setSelectedPhoto(null)
    setPhotoPreview(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Yangi o'quvchi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yangi o'quvchi qo'shish</DialogTitle>
          <DialogDescription>O'quvchi ma'lumotlarini kiriting</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar */}
            <StudentAvatarInput
              previewUrl={photoPreview}
              firstName={form.watch("first_name")}
              lastName={form.watch("last_name")}
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <LoadingButton type="submit" loading={mutation.isPending}>
                Qo'shish
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
