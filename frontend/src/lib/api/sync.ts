import { api } from "./client"

export const syncApi = {
  runSync: () => api.post<Record<string, unknown>>("/api/v1/sync/all"),
  status: () => api.get<Record<string, unknown>>("/api/v1/sync/status"),
}
