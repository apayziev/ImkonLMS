import { z } from "zod"

import { api, validated } from "./client"

export const quarterReadSchema = z.object({
  id: z.number(),
  academic_year_id: z.number(),
  number: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  holidays: z.array(z.string()),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
})
export type QuarterRead = z.infer<typeof quarterReadSchema>

export interface QuarterCreate {
  academic_year_id: number
  number: number
  start_date: string
  end_date: string
  holidays: string[]
}

export const quarterListSchema = z.object({
  data: z.array(quarterReadSchema),
  count: z.number(),
})
export type QuarterList = z.infer<typeof quarterListSchema>

const quarterReadNullableSchema = quarterReadSchema.nullable()

export const quartersApi = {
  list: (academicYearId?: number) =>
    api
      .get<unknown>("/api/v1/quarters/", {
        params: academicYearId ? { academic_year_id: academicYearId } : {},
      })
      .then(validated<QuarterList>(quarterListSchema)),
  current: () =>
    api
      .get<unknown>("/api/v1/quarters/current")
      .then(validated<QuarterRead | null>(quarterReadNullableSchema)),
  create: (data: QuarterCreate) =>
    api
      .post<unknown>("/api/v1/quarters/", data)
      .then(validated<QuarterRead>(quarterReadSchema)),
  update: (id: number, data: Partial<Omit<QuarterCreate, "academic_year_id">>) =>
    api
      .patch<unknown>(`/api/v1/quarters/${id}`, data)
      .then(validated<QuarterRead>(quarterReadSchema)),
  delete: (id: number) => api.delete(`/api/v1/quarters/${id}`),
}
