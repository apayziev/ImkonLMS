import { api } from "./client"

export interface QuarterRead {
  id: number
  academic_year_id: number
  number: number
  start_date: string
  end_date: string
  holidays: string[]
  created_at: string | null
  updated_at: string | null
}

export interface QuarterCreate {
  academic_year_id: number
  number: number
  start_date: string
  end_date: string
  holidays: string[]
}

export interface QuarterList {
  data: QuarterRead[]
  count: number
}

export const quartersApi = {
  list: (academicYearId?: number) =>
    api.get<QuarterList>("/api/v1/quarters/", {
      params: academicYearId ? { academic_year_id: academicYearId } : {},
    }),
  current: () => api.get<QuarterRead | null>("/api/v1/quarters/current"),
  create: (data: QuarterCreate) =>
    api.post<QuarterRead>("/api/v1/quarters/", data),
  update: (id: number, data: Partial<Omit<QuarterCreate, "academic_year_id">>) =>
    api.patch<QuarterRead>(`/api/v1/quarters/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/quarters/${id}`),
}
