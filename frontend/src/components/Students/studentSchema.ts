import { z } from "zod"

export const studentBaseSchema = z.object({
  document_id: z.string().min(5, "Hujjat raqami kamida 5 ta belgi"),
  first_name: z.string().min(2, "Ism kamida 2 ta belgi"),
  last_name: z.string().min(2, "Familiya kamida 2 ta belgi"),
  middle_name: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  grade_id: z.number().optional().nullable(),
  father_first_name: z.string().optional().nullable(),
  father_last_name: z.string().optional().nullable(),
  father_phone: z.string().optional().nullable(),
  mother_first_name: z.string().optional().nullable(),
  mother_last_name: z.string().optional().nullable(),
  mother_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  enrollment_date: z.string().optional().nullable(),
  monthly_fee: z.number().optional().nullable(),
})

export const studentEditSchema = studentBaseSchema

export type StudentBaseFormData = z.infer<typeof studentBaseSchema>
export type StudentEditFormData = z.infer<typeof studentEditSchema>

export const studentDefaultValues: StudentBaseFormData = {
  document_id: "",
  first_name: "",
  last_name: "",
  middle_name: "",
  birth_date: null,
  gender: null,
  phone_number: "",
  grade_id: null,
  father_first_name: "",
  father_last_name: "",
  father_phone: "",
  mother_first_name: "",
  mother_last_name: "",
  mother_phone: "",
  address: "",
  enrollment_date: null,
  monthly_fee: null,
}

export function toStudentPayload(data: StudentBaseFormData | StudentEditFormData) {
  return {
    ...data,
    middle_name: data.middle_name || null,
    birth_date: data.birth_date || null,
    gender: data.gender || null,
    phone_number: data.phone_number || null,
    father_first_name: data.father_first_name || null,
    father_last_name: data.father_last_name || null,
    father_phone: data.father_phone || null,
    mother_first_name: data.mother_first_name || null,
    mother_last_name: data.mother_last_name || null,
    mother_phone: data.mother_phone || null,
    address: data.address || null,
    enrollment_date: data.enrollment_date || null,
    monthly_fee: data.monthly_fee || null,
  }
}

export function validatePhotoFile(file: File): string | null {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return "Faqat JPG, PNG yoki WEBP formatdagi rasmlar qabul qilinadi"
  }
  if (file.size > 5 * 1024 * 1024) {
    return "Rasm hajmi 5MB dan oshmasligi kerak"
  }
  return null
}

export function getPhotoUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith("http")) return url
  return `${import.meta.env.VITE_API_URL?.replace("/api/v1", "") || ""}${url}`
}
