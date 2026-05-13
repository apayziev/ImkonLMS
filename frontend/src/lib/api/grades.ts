import { api } from "./client"

export interface GradeRead {
  id: number
  level: number
  section: string
  display_name: string
  created_at: string
  updated_at: string | null
}

export interface GradeList {
  data: GradeRead[]
  count: number
}

export const gradesApi = {
  list: (skip = 0, limit = 100) =>
    api.get<GradeList>("/api/v1/grades/", { params: { skip, limit } }),
}
