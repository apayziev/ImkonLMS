import { api } from "./client"

export interface StudentRead {
  id: number
  document_id: string
  first_name: string
  last_name: string
  middle_name: string | null
  full_name: string
  student_id: string | null
  grade_id: number | null
  birth_date: string | null
  gender: string | null
  phone_number: string | null
  photo_url: string | null
  father_first_name: string | null
  father_last_name: string | null
  father_phone: string | null
  father_full_name: string | null
  mother_first_name: string | null
  mother_last_name: string | null
  mother_phone: string | null
  mother_full_name: string | null
  address: string | null
  enrollment_date: string | null
  withdrawal_date: string | null
  is_active: boolean
  is_frozen: boolean
  frozen_at: string | null
  frozen_reason: string | null
  departure_date: string | null
  return_date: string | null
  is_deleted: boolean
  deleted_at: string | null
}

export interface StudentList {
  data: StudentRead[]
  count: number
}

export const studentsApi = {
  list: (
    params: {
      skip?: number
      limit?: number
      grade_id?: number
      search?: string
      status?: string
    } = {},
  ) => api.get<StudentList>("/api/v1/students/", { params }),
}
