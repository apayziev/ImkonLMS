import { api } from "./client"

export interface AppConfigRead {
  max_file_size_mb: number
  plan_total_fields: number
}

export const configApi = {
  get: () => api.get<AppConfigRead>("/api/v1/config/"),
}
