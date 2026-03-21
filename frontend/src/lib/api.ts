import axios from "axios"

import { API, AUTH } from "@/config"

const api = axios.create({
  baseURL: API.baseUrl,
  timeout: API.timeout,
  headers: { "Content-Type": "application/json" },
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH.tokenKey)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Token refresh state
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

const refreshAccessToken = async (): Promise<string | null> => {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const { data } = await axios.post("/api/v1/login/refresh", null, {
        withCredentials: true,
      })
      const newToken: string = data.access_token
      if (newToken) {
        localStorage.setItem(AUTH.tokenKey, newToken)
        return newToken
      }
      return null
    } catch {
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Handle 401 errors — try refresh, then redirect
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isUnauthorized = error.response?.status === 401
    const isLoginEndpoint =
      originalRequest?.url?.includes("/login/") ||
      originalRequest?.url?.endsWith("/login")
    const isOnLoginPage = window.location.pathname === AUTH.loginPath

    if (isUnauthorized && !isLoginEndpoint && !isOnLoginPage && !originalRequest._retry) {
      originalRequest._retry = true
      const newToken = await refreshAccessToken()

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      }

      localStorage.removeItem(AUTH.tokenKey)
      window.location.href = AUTH.loginPath
    }

    return Promise.reject(error)
  },
)

export default api

// --- API functions ---

export interface UserRead {
  id: number
  document_id: string
  first_name: string
  last_name: string
  full_name: string | null
  birth_date: string | null
  photo_url: string | null
  phone_number: string | null
  is_active: boolean
  is_superuser: boolean
  role: string
  age: number | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: UserRead
}

export interface LoginRequest {
  document_id: string
  password: string
}

export interface StudentLoginRequest {
  document_id: string
}

export const loginApi = {
  login: (data: LoginRequest) =>
    api.post<TokenResponse>("/api/v1/login/", data),

  loginStudent: (data: StudentLoginRequest) =>
    api.post<TokenResponse>("/api/v1/login/student", data),

  refresh: () =>
    api.post<{ access_token: string }>("/api/v1/login/refresh"),
}

export const usersApi = {
  me: () => api.get<UserRead>("/api/v1/users/me"),
}

export const logoutApi = {
  logout: () => api.post("/api/v1/logout/"),
}
