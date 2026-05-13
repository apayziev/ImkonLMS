import { z } from "zod"

import { api, validated } from "./client"

export const gradeReadSchema = z.object({
  id: z.number(),
  level: z.number(),
  section: z.string(),
  display_name: z.string(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
})
export type GradeRead = z.infer<typeof gradeReadSchema>

export const gradeListSchema = z.object({
  data: z.array(gradeReadSchema),
  count: z.number(),
})
export type GradeList = z.infer<typeof gradeListSchema>

export const gradesApi = {
  list: (skip = 0, limit = 100) =>
    api
      .get<unknown>("/api/v1/grades/", { params: { skip, limit } })
      .then(validated<GradeList>(gradeListSchema)),
}
