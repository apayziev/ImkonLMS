import { api } from "./client"

export interface DashboardStats {
  students: number
  teachers: number
  subjects: number
  grades: number
}

export const statsApi = {
  dashboard: () => api.get<DashboardStats>("/api/v1/stats/dashboard"),
}
