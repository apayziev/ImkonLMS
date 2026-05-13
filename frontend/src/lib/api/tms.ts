import { api } from "./client"

export interface TMSTokenResponse {
  access_token: string
  embed_url: string
}

export const tmsApi = {
  getEmbedToken: () => api.post<TMSTokenResponse>("/api/v1/tms/embed-token"),
}
