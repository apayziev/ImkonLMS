import { z } from "zod"

import { api, validated } from "./client"

export const subjectReadSchema = z.object({
  id: z.number(),
  name: z.string(),
  name_uz: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
})
export type SubjectRead = z.infer<typeof subjectReadSchema>

export const subjectListSchema = z.object({
  data: z.array(subjectReadSchema),
  count: z.number(),
})
export type SubjectList = z.infer<typeof subjectListSchema>

export const subjectsApi = {
  list: (skip = 0, limit = 100) =>
    api
      .get<unknown>("/api/v1/subjects/", { params: { skip, limit } })
      .then(validated<SubjectList>(subjectListSchema)),
}
