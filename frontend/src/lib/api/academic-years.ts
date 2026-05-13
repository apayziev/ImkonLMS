import { api } from "./client"

export interface AcademicYearRead {
  id: number
  name: string
  start_year: number
  end_year: number
  start_month: number
  end_month: number
  is_current: boolean
  created_at: string
  updated_at: string | null
}

export const academicYearsApi = {
  current: () => api.get<AcademicYearRead>("/api/v1/academic-years/current"),
}
