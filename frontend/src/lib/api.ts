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

// --- Grade Types & API ---

export interface GradeRead {
  id: number
  level: number
  section: string
  display_name: string
  created_at: string
  updated_at: string | null
}

export interface GradeList {
  data: GradeRead[]
  count: number
}

export interface GradeCreate {
  level: number
  section: string
}

export interface GradeUpdate {
  level?: number
  section?: string
}

export const gradesApi = {
  list: (skip = 0, limit = 100) =>
    api.get<GradeList>("/api/v1/grades/", { params: { skip, limit } }),
  get: (id: number) => api.get<GradeRead>(`/api/v1/grades/${id}`),
  create: (data: GradeCreate) => api.post<GradeRead>("/api/v1/grades/", data),
  update: (id: number, data: GradeUpdate) =>
    api.patch<GradeRead>(`/api/v1/grades/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/grades/${id}`),
}

// --- Subject Types & API ---

export interface SubjectRead {
  id: number
  name: string
  name_uz: string | null
  icon: string | null
  color: string | null
  created_at: string
  updated_at: string | null
}

export interface SubjectList {
  data: SubjectRead[]
  count: number
}

export interface SubjectCreate {
  name: string
  name_uz?: string | null
  icon?: string | null
  color?: string | null
}

export interface SubjectUpdate {
  name?: string
  name_uz?: string | null
  icon?: string | null
  color?: string | null
}

export const subjectsApi = {
  list: (skip = 0, limit = 100) =>
    api.get<SubjectList>("/api/v1/subjects/", { params: { skip, limit } }),
  get: (id: number) => api.get<SubjectRead>(`/api/v1/subjects/${id}`),
  create: (data: SubjectCreate) =>
    api.post<SubjectRead>("/api/v1/subjects/", data),
  update: (id: number, data: SubjectUpdate) =>
    api.patch<SubjectRead>(`/api/v1/subjects/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/subjects/${id}`),
}

// --- Student Types & API ---

export interface StudentRead {
  id: number
  document_id: string
  first_name: string
  last_name: string
  full_name: string | null
  student_id: string | null
  grade_id: number | null
  grade_name: string | null
  birth_date: string | null
  gender: string | null
  phone_number: string | null
  photo_url: string | null
  father_name: string | null
  father_phone: string | null
  mother_name: string | null
  mother_phone: string | null
  address: string | null
  enrollment_date: string | null
  is_active: boolean
  age: number | null
  created_at: string
  updated_at: string | null
}

export interface StudentList {
  data: StudentRead[]
  count: number
}

export interface StudentCreate {
  document_id: string
  first_name: string
  last_name: string
  student_id?: string | null
  grade_id?: number | null
  birth_date?: string | null
  gender?: string | null
  phone_number?: string | null
  father_name?: string | null
  father_phone?: string | null
  mother_name?: string | null
  mother_phone?: string | null
  address?: string | null
  enrollment_date?: string | null
}

export interface StudentUpdate {
  first_name?: string
  last_name?: string
  student_id?: string | null
  grade_id?: number | null
  birth_date?: string | null
  gender?: string | null
  phone_number?: string | null
  father_name?: string | null
  father_phone?: string | null
  mother_name?: string | null
  mother_phone?: string | null
  address?: string | null
  enrollment_date?: string | null
  is_active?: boolean
}

export const studentsApi = {
  list: (params: { skip?: number; limit?: number; grade_id?: number | null; search?: string | null } = {}) =>
    api.get<StudentList>("/api/v1/students/", { params }),
  get: (id: number) => api.get<StudentRead>(`/api/v1/students/${id}`),
  create: (data: StudentCreate) =>
    api.post<StudentRead>("/api/v1/students/", data),
  update: (id: number, data: StudentUpdate) =>
    api.patch<StudentRead>(`/api/v1/students/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/students/${id}`),
}

// --- Error utility ---

export function extractErrorMessage(error: unknown, fallback = "Xatolik yuz berdi"): string {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return detail || fallback
}
