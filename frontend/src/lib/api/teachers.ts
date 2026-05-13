import { api } from "./client"

export interface TeacherRead {
  id: number
  document_id: string
  first_name: string
  last_name: string
  middle_name: string | null
  full_name: string
  birth_date: string | null
  gender: string | null
  phone_number: string | null
  photo_url: string | null
  is_active: boolean
  subjects: string[] | null
  teaching_grade_ids: number[] | null
  class_teacher_grade_id: number | null
}

export interface TeacherList {
  data: TeacherRead[]
  count: number
}

export const teachersApi = {
  list: (params: { skip?: number; limit?: number; search?: string } = {}) =>
    api.get<TeacherList>("/api/v1/teachers/", { params }),
}
