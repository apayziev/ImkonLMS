import { z } from "zod"

import { api, validated } from "./client"

export const dashboardStatsSchema = z.object({
  students: z.number(),
  teachers: z.number(),
  subjects: z.number(),
  grades: z.number(),
})
export type DashboardStats = z.infer<typeof dashboardStatsSchema>

export const statsApi = {
  dashboard: () =>
    api
      .get<unknown>("/api/v1/stats/dashboard")
      .then(validated<DashboardStats>(dashboardStatsSchema)),
}
