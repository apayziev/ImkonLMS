import { z } from "zod"

import { api, validated } from "./client"

export const studentReadSchema = z.object({
  id: z.number(),
  document_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  middle_name: z.string().nullable(),
  full_name: z.string(),
  student_id: z.string().nullable(),
  grade_id: z.number().nullable(),
  birth_date: z.string().nullable(),
  gender: z.string().nullable(),
  phone_number: z.string().nullable(),
  photo_url: z.string().nullable(),
  father_first_name: z.string().nullable(),
  father_last_name: z.string().nullable(),
  father_phone: z.string().nullable(),
  father_full_name: z.string().nullable(),
  mother_first_name: z.string().nullable(),
  mother_last_name: z.string().nullable(),
  mother_phone: z.string().nullable(),
  mother_full_name: z.string().nullable(),
  address: z.string().nullable(),
  enrollment_date: z.string().nullable(),
  withdrawal_date: z.string().nullable(),
  is_active: z.boolean(),
  is_frozen: z.boolean(),
  frozen_at: z.string().nullable(),
  frozen_reason: z.string().nullable(),
  departure_date: z.string().nullable(),
  return_date: z.string().nullable(),
  is_deleted: z.boolean(),
  deleted_at: z.string().nullable(),
})
export type StudentRead = z.infer<typeof studentReadSchema>

export const studentListSchema = z.object({
  data: z.array(studentReadSchema),
  count: z.number(),
})
export type StudentList = z.infer<typeof studentListSchema>

export const studentsApi = {
  list: (
    params: {
      skip?: number
      limit?: number
      grade_id?: number
      search?: string
      status?: string
    } = {},
  ) =>
    api
      .get<unknown>("/api/v1/students/", { params })
      .then(validated<StudentList>(studentListSchema)),
}
