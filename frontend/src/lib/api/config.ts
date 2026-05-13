import { z } from "zod"

import { api, validated } from "./client"

export const appConfigReadSchema = z.object({
  max_file_size_mb: z.number(),
  plan_total_fields: z.number(),
})
export type AppConfigRead = z.infer<typeof appConfigReadSchema>

export const configApi = {
  get: () =>
    api
      .get<unknown>("/api/v1/config/")
      .then(validated<AppConfigRead>(appConfigReadSchema)),
}
