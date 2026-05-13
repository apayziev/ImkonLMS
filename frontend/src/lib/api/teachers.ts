import { z } from "zod"

import { api, validated } from "./client"

export const teacherReadSchema = z.object({
  id: z.number(),
  document_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  middle_name: z.string().nullable(),
  full_name: z.string(),
  birth_date: z.string().nullable(),
  gender: z.string().nullable(),
  phone_number: z.string().nullable(),
  photo_url: z.string().nullable(),
  is_active: z.boolean(),
  subjects: z.array(z.string()).nullable(),
  teaching_grade_ids: z.array(z.number()).nullable(),
  class_teacher_grade_id: z.number().nullable(),
})
export type TeacherRead = z.infer<typeof teacherReadSchema>

export const teacherListSchema = z.object({
  data: z.array(teacherReadSchema),
  count: z.number(),
})
export type TeacherList = z.infer<typeof teacherListSchema>

export const teachersApi = {
  list: (params: { skip?: number; limit?: number; search?: string } = {}) =>
    api
      .get<unknown>("/api/v1/teachers/", { params })
      .then(validated<TeacherList>(teacherListSchema)),
}
