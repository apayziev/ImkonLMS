import { z } from "zod"

import { api, validated } from "./client"

export const academicYearReadSchema = z.object({
  id: z.number(),
  name: z.string(),
  start_year: z.number(),
  end_year: z.number(),
  start_month: z.number(),
  end_month: z.number(),
  is_current: z.boolean(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
})
export type AcademicYearRead = z.infer<typeof academicYearReadSchema>

export const academicYearsApi = {
  current: () =>
    api
      .get<unknown>("/api/v1/academic-years/current")
      .then(validated<AcademicYearRead>(academicYearReadSchema)),
}
