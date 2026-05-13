import axios, { type AxiosInstance, type AxiosResponse } from "axios"

import { API, AUTH } from "@/config"
import { type TokenScope, tokenStore } from "@/lib/tokenStore"

const REFRESH_URL = "/api/v1/login/refresh"

const refreshState: Record<TokenScope, Promise<string | null> | null> = {
  admin: null,
  parent: null,
}

/**
 * Handler invoked when a request fails with 401 and silent refresh cannot
 * recover. Wired from main.tsx so the router can perform an SPA navigation
 * to the login page instead of a full page reload.
 */
type UnauthorizedHandler = (loginPath: string) => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export const setUnauthorizedHandler = (handler: UnauthorizedHandler): void => {
  unauthorizedHandler = handler
}

/**
 * Mint a fresh access token from the httpOnly refresh cookie. Idempotent across
 * concurrent calls — all callers share the same in-flight promise per scope.
 */
export const silentRefresh = async (
  scope: TokenScope = "admin",
): Promise<string | null> => {
  if (refreshState[scope]) return refreshState[scope]

  refreshState[scope] = (async () => {
    try {
      const { data } = await axios.post(REFRESH_URL, null, {
        withCredentials: true,
      })
      const newToken: string | undefined = data?.access_token
      if (newToken) {
        tokenStore.set(scope, newToken)
        return newToken
      }
      return null
    } catch {
      return null
    } finally {
      refreshState[scope] = null
    }
  })()

  return refreshState[scope]
}

const buildAuthClient = (
  scope: TokenScope,
  loginPathGetter: () => string,
): AxiosInstance => {
  const instance = axios.create({
    baseURL: API.baseUrl,
    timeout: API.timeout,
    withCredentials: true,
  })

  instance.interceptors.request.use((config) => {
    const token = tokenStore.get(scope)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config
      const isUnauthorized = error.response?.status === 401
      const isLoginEndpoint =
        originalRequest?.url?.includes("/login/") ||
        originalRequest?.url?.endsWith("/login")
      const isOnLoginPage = window.location.pathname === loginPathGetter()

      if (
        isUnauthorized &&
        !isLoginEndpoint &&
        !isOnLoginPage &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true
        const newToken = await silentRefresh(scope)
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return instance(originalRequest)
        }
        tokenStore.clear(scope)
        const loginPath = loginPathGetter()
        if (unauthorizedHandler) {
          unauthorizedHandler(loginPath)
        } else {
          // Fallback if router isn't wired yet (very early bootstrap).
          window.location.href = loginPath
        }
      }

      return Promise.reject(error)
    },
  )

  return instance
}

export const api = buildAuthClient("admin", () => AUTH.loginPath)
export const parentAxiosInstance = buildAuthClient(
  "parent",
  () => AUTH.parentLoginPath,
)

/** Run a parsed zod schema over a response and forward the AxiosResponse. */
export const validated =
  <T>(schema: { parse: (v: unknown) => T }) =>
  (res: AxiosResponse<unknown>): AxiosResponse<T> => ({
    ...res,
    data: schema.parse(res.data),
  })

/** Serialize params with array support (entry_id=1&entry_id=2). */
export const arrayParamsSerializer = (params: Record<string, unknown>) => {
  const parts: string[] = []
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${k}=${item}`)
    } else {
      parts.push(`${k}=${v}`)
    }
  }
  return parts.join("&")
}

// ─── Shared status types ───────────────────────────────────────────────────

export type SessionStatus = "in_progress" | "completed"
export type AttendanceStatus = "unmarked" | "present" | "late" | "absent"
