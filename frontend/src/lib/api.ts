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
  teaching_grade_ids: number[] | null
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

export const gradesApi = {
  list: (skip = 0, limit = 100) =>
    api.get<GradeList>("/api/v1/grades/", { params: { skip, limit } }),
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

export const subjectsApi = {
  list: (skip = 0, limit = 100) =>
    api.get<SubjectList>("/api/v1/subjects/", { params: { skip, limit } }),
}

// --- Teacher Types & API ---

export interface TeacherRead {
  id: number
  document_id: string
  first_name: string
  last_name: string
  middle_name: string | null
  full_name: string
  birth_date: string | null
  gender: string | null
  phone_number: string | null
  photo_url: string | null
  is_active: boolean
  subjects: string[] | null
  teaching_grade_ids: number[] | null
  class_teacher_grade_id: number | null
}

export interface TeacherList {
  data: TeacherRead[]
  count: number
}

export const teachersApi = {
  list: (params: {
    skip?: number
    limit?: number
    search?: string
  } = {}) => api.get<TeacherList>("/api/v1/teachers/", { params }),
}

// --- Student Types & API ---

export interface StudentRead {
  id: number
  document_id: string
  first_name: string
  last_name: string
  middle_name: string | null
  full_name: string
  student_id: string | null
  grade_id: number | null
  birth_date: string | null
  gender: string | null
  phone_number: string | null
  photo_url: string | null
  father_first_name: string | null
  father_last_name: string | null
  father_phone: string | null
  father_full_name: string | null
  mother_first_name: string | null
  mother_last_name: string | null
  mother_phone: string | null
  mother_full_name: string | null
  address: string | null
  enrollment_date: string | null
  withdrawal_date: string | null
  is_active: boolean
  is_frozen: boolean
  frozen_at: string | null
  frozen_reason: string | null
  departure_date: string | null
  return_date: string | null
  is_deleted: boolean
  deleted_at: string | null
}

export interface StudentList {
  data: StudentRead[]
  count: number
}

export const studentsApi = {
  list: (params: {
    skip?: number
    limit?: number
    grade_id?: number
    search?: string
    status?: string
  } = {}) => api.get<StudentList>("/api/v1/students/", { params }),
}

// --- Academic Year Types & API ---

export interface AcademicYearRead {
  id: number
  name: string
  start_year: number
  end_year: number
  start_month: number
  end_month: number
  is_current: boolean
  created_at: string
  updated_at: string | null
}

export const academicYearsApi = {
  current: () => api.get<AcademicYearRead>("/api/v1/academic-years/current"),
}

// --- School Settings Types & API ---

export interface BreakItem {
  start_time: string
  end_time: string
  name: string
}

export interface SchoolSettingsRead {
  id: number
  day_start_time: string
  day_end_time: string
  lesson_duration_minutes: number
  default_break_minutes: number
  working_days: number[]
  breaks: BreakItem[]
  created_at: string
  updated_at: string | null
}

export interface SchoolSettingsUpdate {
  day_start_time?: string
  day_end_time?: string
  lesson_duration_minutes?: number
  default_break_minutes?: number
  working_days?: number[]
  breaks?: BreakItem[]
}

// --- TimeSlot Types & API ---

export interface TimeSlotRead {
  id: number
  academic_year_id: number
  period_number: number
  start_time: string
  end_time: string
  created_at: string
  updated_at: string | null
}

export interface TimeSlotList {
  data: TimeSlotRead[]
  count: number
}

// --- ScheduleEntry Types & API ---

export interface ScheduleEntryRead {
  id: number
  academic_year_id: number
  grade_id: number
  subject_id: number
  teacher_id: number
  time_slot_id: number
  day_of_week: number
  subject_name: string | null
  teacher_name: string | null
  grade_display: string | null
  period_number: number | null
  start_time: string | null
  end_time: string | null
  created_at: string
  updated_at: string | null
}

export interface ScheduleEntryList {
  data: ScheduleEntryRead[]
  count: number
}

// --- Timetable API ---

export const timetableApi = {
  // Settings
  getSettings: () =>
    api.get<SchoolSettingsRead>("/api/v1/timetable/settings"),
  updateSettings: (data: SchoolSettingsUpdate) =>
    api.patch<SchoolSettingsRead>("/api/v1/timetable/settings", data),

  // Time Slots
  listTimeSlots: (academicYearId: number) =>
    api.get<TimeSlotList>("/api/v1/timetable/time-slots", {
      params: { academic_year_id: academicYearId },
    }),
  createTimeSlot: (data: { academic_year_id: number; period_number: number; start_time: string; end_time: string }) =>
    api.post<TimeSlotRead>("/api/v1/timetable/time-slots", data),
  deleteTimeSlot: (id: number) =>
    api.delete(`/api/v1/timetable/time-slots/${id}`),
  deleteAllTimeSlots: (academicYearId: number) =>
    api.delete(`/api/v1/timetable/time-slots?academic_year_id=${academicYearId}`),
  generateTimeSlots: (academicYearId: number) =>
    api.post<TimeSlotList>(`/api/v1/timetable/time-slots/generate?academic_year_id=${academicYearId}`),

  // Schedule
  listSchedule: (params: { academic_year_id: number; grade_id?: number; teacher_id?: number }) =>
    api.get<ScheduleEntryList>("/api/v1/timetable/schedule", { params }),
  createEntry: (data: { academic_year_id: number; grade_id: number; subject_id: number; teacher_id: number; time_slot_id: number; day_of_week: number }) =>
    api.post<ScheduleEntryRead>("/api/v1/timetable/schedule", data),
  updateEntry: (id: number, data: { subject_id?: number; teacher_id?: number }) =>
    api.patch<ScheduleEntryRead>(`/api/v1/timetable/schedule/${id}`, data),
  deleteEntry: (id: number) =>
    api.delete(`/api/v1/timetable/schedule/${id}`),
}

// --- Lesson Session Types & API ---

export interface TodayLessonRead {
  schedule_entry_id: number
  grade_id: number
  grade_display: string
  subject_id: number
  subject_name: string
  period_number: number
  start_time: string
  end_time: string
  session_id: number | null
  session_status: string | null // in_progress | completed
}

export interface TodayLessonsResponse {
  data: TodayLessonRead[]
  date: string
}

export interface SessionStudentRead {
  attendance_id: number
  student_id: number
  first_name: string
  last_name: string
  full_name: string
  photo_url: string | null
  status: string // unmarked | present | excused | unexcused
  marked_at: string | null
  grade: number | null
}

export interface SessionDetailRead {
  id: number
  schedule_entry_id: number
  session_date: string
  started_at: string
  ended_at: string | null
  status: string
  grade_display: string
  subject_name: string
  period_number: number
  start_time: string
  end_time: string
  teacher_name: string
  topic: string | null
  homework: string | null
  homework_deadline: string | null
  students: SessionStudentRead[]
  materials: LessonMaterialRead[]
}

export interface LessonMaterialRead {
  id: number
  file_url: string
  original_name: string
  file_size: number
}

export interface AttendanceUpdateRequest {
  student_id: number
  status: string
  grade: number | null
}

// Admin attendance view
export interface AttendanceStudentRead {
  student_id: number
  full_name: string
  photo_url: string | null
  status: string // unmarked | present | excused | unexcused
  marked_at: string | null
  grade: number | null
}

export interface AttendanceSessionRead {
  session_id: number
  subject_name: string
  period_number: number
  start_time: string
  end_time: string
  started_at: string
  ended_at: string | null
  teacher_name: string
  status: string // in_progress | completed
  students: AttendanceStudentRead[]
}

export interface AttendanceDayResponse {
  date: string
  grade_display: string
  sessions: AttendanceSessionRead[]
}

export const lessonsApi = {
  today: (date?: string) =>
    api.get<TodayLessonsResponse>("/api/v1/lessons/today", { params: date ? { date } : undefined }),
  startSession: (schedule_entry_id: number) =>
    api.post<SessionDetailRead>("/api/v1/lessons/sessions", { schedule_entry_id }),
  getSession: (sessionId: number) =>
    api.get<SessionDetailRead>(`/api/v1/lessons/sessions/${sessionId}`),
  updateAttendance: (sessionId: number, data: AttendanceUpdateRequest) =>
    api.patch<SessionStudentRead>(`/api/v1/lessons/sessions/${sessionId}/attendance`, data),
  markAllPresent: (sessionId: number) =>
    api.post<{ updated: number }>(`/api/v1/lessons/sessions/${sessionId}/attendance/mark-all-present`),
  unmarkAll: (sessionId: number) =>
    api.post<{ updated: number }>(`/api/v1/lessons/sessions/${sessionId}/attendance/unmark-all`),
  updateSession: (sessionId: number, data: { topic?: string | null; homework?: string | null; homework_deadline?: string | null }) =>
    api.patch<SessionDetailRead>(`/api/v1/lessons/sessions/${sessionId}`, data),
  endSession: (sessionId: number) =>
    api.post(`/api/v1/lessons/sessions/${sessionId}/end`),
  uploadMaterial: (sessionId: number, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return api.post<LessonMaterialRead>(`/api/v1/lessons/sessions/${sessionId}/materials`, formData)
  },
  deleteMaterial: (sessionId: number, materialId: number) =>
    api.delete(`/api/v1/lessons/sessions/${sessionId}/materials/${materialId}`),
  getAttendance: (gradeId: number, date?: string) =>
    api.get<AttendanceDayResponse>("/api/v1/lessons/attendance", {
      params: { grade_id: gradeId, ...(date ? { date } : {}) },
    }),
}

// ─── Quarters ───────────────────────────────────────────────────────────────

export interface QuarterRead {
  id: number
  academic_year_id: number
  name: string
  quarter_number: number
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string | null
  updated_at: string | null
}

export interface QuarterCreate {
  academic_year_id: number
  name: string
  quarter_number: number
  start_date: string
  end_date: string
}

export interface QuarterList {
  data: QuarterRead[]
  count: number
}

export const quartersApi = {
  list: (academicYearId?: number) =>
    api.get<QuarterList>("/api/v1/quarters/", { params: academicYearId ? { academic_year_id: academicYearId } : {} }),
  current: () =>
    api.get<QuarterRead>("/api/v1/quarters/current"),
  create: (data: QuarterCreate) =>
    api.post<QuarterRead>("/api/v1/quarters/", data),
  update: (id: number, data: Partial<QuarterCreate>) =>
    api.patch<QuarterRead>(`/api/v1/quarters/${id}`, data),
}

// ─── Behavior Points ────────────────────────────────────────────────────────

export interface PointCategoryRead {
  id: number
  name: string
  group: string
  description: string | null
  default_points: number
  icon: string | null
  is_active: boolean
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

export interface PointCategoryCreate {
  name: string
  group?: string
  description?: string | null
  default_points: number
  icon?: string | null
  sort_order?: number
}

export interface PointCategoryList {
  data: PointCategoryRead[]
  count: number
}

export interface PointTransactionRead {
  id: number
  student_id: number
  teacher_id: number
  quarter_id: number
  category_id: number
  points: number
  lesson_session_id: number | null
  note: string | null
  teacher_name: string | null
  category_name: string | null
  category_icon: string | null
  created_at: string | null
  updated_at: string | null
}

export interface PointGiveRequest {
  student_id: number
  category_id: number
  points?: number | null
  lesson_session_id?: number | null
  note?: string | null
}

export interface StudentPointSummary {
  student_id: number
  full_name: string
  photo_url: string | null
  starting_points: number
  total_earned: number
  total_deducted: number
  current_points: number
  transaction_count: number
}

export interface GradePointsSummaryResponse {
  quarter_id: number
  quarter_name: string
  grade_id: number
  grade_display: string
  default_points: number
  students: StudentPointSummary[]
}

export interface StudentPointsDetailResponse {
  student_id: number
  full_name: string
  quarter_id: number
  quarter_name: string
  starting_points: number
  current_points: number
  transactions: PointTransactionRead[]
}

export const pointsApi = {
  // Categories
  listCategories: (activeOnly = true) =>
    api.get<PointCategoryList>("/api/v1/points/categories", { params: { active_only: activeOnly } }),
  createCategory: (data: PointCategoryCreate) =>
    api.post<PointCategoryRead>("/api/v1/points/categories", data),
  updateCategory: (id: number, data: Partial<PointCategoryCreate & { is_active: boolean }>) =>
    api.patch<PointCategoryRead>(`/api/v1/points/categories/${id}`, data),
  deleteCategory: (id: number) =>
    api.delete(`/api/v1/points/categories/${id}`),

  // Give points
  give: (data: PointGiveRequest) =>
    api.post<PointTransactionRead>("/api/v1/points/give", data),
  giveBulk: (data: { student_ids: number[]; category_id: number; points?: number; lesson_session_id?: number; note?: string }) =>
    api.post("/api/v1/points/give/bulk", data),

  // View
  summary: (gradeId: number, quarterId?: number) =>
    api.get<GradePointsSummaryResponse>("/api/v1/points/summary", {
      params: { grade_id: gradeId, ...(quarterId ? { quarter_id: quarterId } : {}) },
    }),
  studentDetail: (studentId: number, quarterId?: number) =>
    api.get<StudentPointsDetailResponse>(`/api/v1/points/student/${studentId}`, {
      params: quarterId ? { quarter_id: quarterId } : {},
    }),
}

