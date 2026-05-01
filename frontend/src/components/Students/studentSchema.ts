import { API } from "@/config"

export function getPhotoUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined
  if (url.startsWith("http")) return url
  return `${API.baseUrl}${url}`
}
