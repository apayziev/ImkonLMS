import type { AxiosError } from "axios"

/** Extract a server-provided error detail from an axios error, falling back to a default. */
export function getErrorDetail(
  error: unknown,
  fallback = "Xatolik yuz berdi",
): string {
  const detail = (error as AxiosError<{ detail?: string }>)?.response?.data
    ?.detail
  return detail ?? fallback
}
