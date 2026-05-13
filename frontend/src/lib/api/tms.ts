import { z } from "zod"

import { api, validated } from "./client"

export const tmsTokenResponseSchema = z.object({
  access_token: z.string(),
  embed_url: z.string(),
})
export type TMSTokenResponse = z.infer<typeof tmsTokenResponseSchema>

export const tmsApi = {
  getEmbedToken: () =>
    api
      .post<unknown>("/api/v1/tms/embed-token")
      .then(validated<TMSTokenResponse>(tmsTokenResponseSchema)),
}
