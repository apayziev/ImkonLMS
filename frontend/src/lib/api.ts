import axios, { type AxiosInstance, type AxiosResponse } from "axios"

import { API, AUTH } from "@/config"
import {
  type ParentMeRead,
  type ParentTokenResponse,
  parentMeSchema,
  parentTokenResponseSchema,
  type TokenResponse,
  tokenResponseSchema,
  type UserRead,
  userReadSchema,
} from "@/lib/authSchemas"
import { type TokenScope, tokenStore } from "@/lib/tokenStore"

export type {
  ParentChildRead,
  ParentMeRead,
  ParentTokenResponse,
  TokenResponse,
  UserRead,
} from "@/lib/authSchemas"

const validated =
  <T>(schema: { parse: (v: unknown) => T }) =>
  (res: AxiosResponse<unknown>): AxiosResponse<T> => ({
    ...res,
    data: schema.parse(res.data),
  })

const REFRESH_URL = "/api/v1/login/refresh"

// Explicit set so the 401 interceptor doesn't try to silentRefresh on a login
// failure (which would loop). Substring matching ("/login/" includes) caught
// unrelated paths like a hypothetical "/login-history/" — list them explicitly.
const LOGIN_ENDPOINTS: ReadonlySet<string> = new Set([
  "/api/v1/login/",
  "/api/v1/login/student",
  "/api/v1/login/parent",
  REFRESH_URL,
])

const refreshState: Record<TokenScope, Promise<string | null> | null> = {
  admin: null,
  parent: null,
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
    } catch (error) {
      // 401 on refresh = no/expired refresh cookie; expected on first visit.
      // Other errors (5xx, network) are worth surfacing during development.
      if (import.meta.env.DEV) {
        console.warn(`[silentRefresh:${scope}] failed`, error)
      }
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
        typeof originalRequest?.url === "string" &&
        LOGIN_ENDPOINTS.has(originalRequest.url)
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
        window.location.href = loginPathGetter()
      }

      return Promise.reject(error)
    },
  )

  return instance
}

const api = buildAuthClient("admin", () => AUTH.loginPath)
const parentAxiosInstance = buildAuthClient(
  "parent",
  () => AUTH.parentLoginPath,
)

export default api

// Serialize params with array support (entry_id=1&entry_id=2). Skips null/undefined,
// URL-encodes both keys and values so values containing & = ? don't break the query.
const arrayParamsSerializer = (params: Record<string, unknown>) => {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === null || item === undefined) continue
        search.append(k, String(item))
      }
    } else {
      search.append(k, String(v))
    }
  }
  return search.toString()
}

// --- Shared Status Types ---

export type SessionStatus = "in_progress" | "completed"
export type AttendanceStatus = "unmarked" | "present" | "late" | "absent"

// --- API functions ---

// UserRead, TokenResponse — re-exported from authSchemas (z.infer-derived).

export interface LoginRequest {
  document_id: string
  password: string
}

export interface StudentLoginRequest {
  document_id: string
}

export const loginApi = {
  login: (data: LoginRequest) =>
    api
      .post<unknown>("/api/v1/login/", data)
      .then(validated<TokenResponse>(tokenResponseSchema)),

  loginStudent: (data: StudentLoginRequest) =>
    api
      .post<unknown>("/api/v1/login/student", data)
      .then(validated<TokenResponse>(tokenResponseSchema)),
}

export const usersApi = {
  me: () =>
    api
      .get<unknown>("/api/v1/users/me")
      .then(validated<UserRead>(userReadSchema)),
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
  list: (params: { skip?: number; limit?: number; search?: string } = {}) =>
    api.get<TeacherList>("/api/v1/teachers/", { params }),
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
  list: (
    params: {
      skip?: number
      limit?: number
      grade_id?: number
      search?: string
      status?: string
    } = {},
  ) => api.get<StudentList>("/api/v1/students/", { params }),
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
  room: string | null
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
  getSettings: () => api.get<SchoolSettingsRead>("/api/v1/timetable/settings"),
  updateSettings: (data: SchoolSettingsUpdate) =>
    api.patch<SchoolSettingsRead>("/api/v1/timetable/settings", data),

  // Time Slots
  listTimeSlots: (academicYearId: number) =>
    api.get<TimeSlotList>("/api/v1/timetable/time-slots", {
      params: { academic_year_id: academicYearId },
    }),
  createTimeSlot: (data: {
    academic_year_id: number
    period_number: number
    start_time: string
    end_time: string
  }) => api.post<TimeSlotRead>("/api/v1/timetable/time-slots", data),
  deleteTimeSlot: (id: number) =>
    api.delete(`/api/v1/timetable/time-slots/${id}`),
  deleteAllTimeSlots: (academicYearId: number) =>
    api.delete(
      `/api/v1/timetable/time-slots?academic_year_id=${academicYearId}`,
    ),
  generateTimeSlots: (academicYearId: number) =>
    api.post<TimeSlotList>(
      `/api/v1/timetable/time-slots/generate?academic_year_id=${academicYearId}`,
    ),

  // Schedule
  listSchedule: (params: {
    academic_year_id: number
    grade_id?: number
    teacher_id?: number
  }) => api.get<ScheduleEntryList>("/api/v1/timetable/schedule", { params }),
  createEntry: (data: {
    academic_year_id: number
    grade_id: number
    subject_id: number
    teacher_id: number
    time_slot_id: number
    day_of_week: number
    room?: string | null
  }) => api.post<ScheduleEntryRead>("/api/v1/timetable/schedule", data),
  updateEntry: (
    id: number,
    data: { subject_id?: number; teacher_id?: number; room?: string | null },
  ) => api.patch<ScheduleEntryRead>(`/api/v1/timetable/schedule/${id}`, data),
  deleteEntry: (id: number) => api.delete(`/api/v1/timetable/schedule/${id}`),
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
  room: string | null
  session_id: number | null
  session_status: SessionStatus | null
  plan_id: number | null
  plan_filled_count: number // 0-8
  lesson_number: number
  total_lessons: number
}

// --- Lesson Plan ---

export interface LessonPlanObjectiveRead {
  text: string
  bloom_level: string | null
}

export interface LessonPlanStageRead {
  title: string
  duration_min: number
  activity: string
}

export interface LessonPlanRead {
  id: number
  schedule_entry_id: number | null
  plan_date: string
  topic: string | null
  lesson_type: string | null
  objectives: LessonPlanObjectiveRead[] | null
  keywords: string[] | null
  homework: string | null
  homework_deadline: string | null
  stages: LessonPlanStageRead[] | null
  resources: string[] | null
  assessment_methods: string[] | null
  homework_test_id: number | null
  homework_test_title: string | null
  materials: LessonMaterialRead[]
  plan_filled_count: number
}

export interface TodayLessonsResponse {
  data: TodayLessonRead[]
  date: string
}

export interface SessionStudentAssessment {
  knowing: number | null // 0-4
  applying: number | null // 0-4
  reasoning: number | null // 0-2
}

export interface SessionStudentRead {
  attendance_id: number
  student_id: number
  first_name: string
  last_name: string
  full_name: string
  photo_url: string | null
  status: AttendanceStatus
  marked_at: string | null
  assessment: SessionStudentAssessment
}

export interface AssessmentUpdateRequest {
  student_id: number
  // Only the keys present are patched. Send `null` to clear a dimension.
  knowing?: number | null
  applying?: number | null
  reasoning?: number | null
}

export interface SessionDetailRead {
  id: number
  schedule_entry_id: number
  session_date: string
  started_at: string
  ended_at: string | null
  status: SessionStatus
  grade_display: string
  subject_name: string
  period_number: number
  start_time: string
  end_time: string
  teacher_name: string
  plan: LessonPlanRead | null
  students: SessionStudentRead[]
}

export interface LessonMaterialRead {
  id: number
  file_url: string
  original_name: string
  file_size: number
}

export interface AttendanceUpdateRequest {
  student_id: number
  status: AttendanceStatus
}

// Admin attendance view
export interface AttendanceStudentRead {
  student_id: number
  full_name: string
  photo_url: string | null
  status: AttendanceStatus
  marked_at: string | null
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
  status: SessionStatus
  students: AttendanceStudentRead[]
}

export interface AttendanceDayResponse {
  date: string
  grade_display: string
  sessions: AttendanceSessionRead[]
}

export interface SessionStatusItem {
  schedule_entry_id: number
  session_date: string
  status: SessionStatus
}

export interface SessionStatusesResponse {
  data: SessionStatusItem[]
}

export interface AttendanceHistoryStudent {
  student_id: number
  full_name: string
  photo_url: string | null
  records: Record<string, AttendanceStatus>
}

export interface AttendanceHistoryResponse {
  dates: string[]
  students: AttendanceHistoryStudent[]
}

export const lessonsApi = {
  today: (date?: string) =>
    api.get<TodayLessonsResponse>("/api/v1/lessons/today", {
      params: date ? { date } : undefined,
    }),
  sessionStatuses: (entryIds: number[], startDate: string, endDate: string) =>
    api.get<SessionStatusesResponse>("/api/v1/lessons/sessions/statuses", {
      params: { entry_id: entryIds, start_date: startDate, end_date: endDate },
      paramsSerializer: arrayParamsSerializer,
    }),
  // Plans
  createPlan: (schedule_entry_id: number, target_date?: string) =>
    api.post<LessonPlanRead>("/api/v1/lessons/plans", {
      schedule_entry_id,
      target_date,
    }),
  getPlan: (planId: number) =>
    api.get<LessonPlanRead>(`/api/v1/lessons/plans/${planId}`),
  updatePlan: (
    planId: number,
    data: Partial<{
      topic: string | null
      homework: string | null
      homework_deadline: string | null
      lesson_type: string | null
      objectives: LessonPlanObjectiveRead[] | null
      keywords: string[] | null
      stages: LessonPlanStageRead[] | null
      resources: string[] | null
      assessment_methods: string[] | null
      homework_test_id: number | null
      homework_test_title: string | null
    }>,
  ) => api.patch<LessonPlanRead>(`/api/v1/lessons/plans/${planId}`, data),
  // Sessions
  startSession: (schedule_entry_id: number, target_date?: string) =>
    api.post<SessionDetailRead>("/api/v1/lessons/sessions", {
      schedule_entry_id,
      target_date,
    }),
  getSession: (sessionId: number) =>
    api.get<SessionDetailRead>(`/api/v1/lessons/sessions/${sessionId}`),
  updateAttendance: (sessionId: number, data: AttendanceUpdateRequest) =>
    api.patch<SessionStudentRead>(
      `/api/v1/lessons/sessions/${sessionId}/attendance`,
      data,
    ),
  updateAssessment: (sessionId: number, data: AssessmentUpdateRequest) =>
    api.patch<SessionStudentAssessment>(
      `/api/v1/lessons/sessions/${sessionId}/assessment`,
      data,
    ),
  endSession: (sessionId: number) =>
    api.post(`/api/v1/lessons/sessions/${sessionId}/end`),
  uploadMaterial: (
    planId: number,
    file: File,
    onProgress?: (percent: number) => void,
  ) => {
    const formData = new FormData()
    formData.append("file", file)
    return api.post<LessonMaterialRead>(
      `/api/v1/lessons/plans/${planId}/materials`,
      formData,
      {
        onUploadProgress: onProgress
          ? (e) => {
              if (e.total) onProgress(Math.round((e.loaded / e.total) * 100))
            }
          : undefined,
      },
    )
  },
  deleteMaterial: (planId: number, materialId: number) =>
    api.delete(`/api/v1/lessons/plans/${planId}/materials/${materialId}`),
  getAttendance: (gradeId: number, date?: string) =>
    api.get<AttendanceDayResponse>("/api/v1/lessons/attendance", {
      params: { grade_id: gradeId, ...(date ? { date } : {}) },
    }),
  attendanceHistory: (entryIds: number[], startDate: string, endDate: string) =>
    api.get<AttendanceHistoryResponse>("/api/v1/lessons/attendance/history", {
      params: { entry_id: entryIds, start_date: startDate, end_date: endDate },
      paramsSerializer: arrayParamsSerializer,
    }),
  teacherStats: (startDate: string, endDate: string) =>
    api.get<TeacherStatsResponse>("/api/v1/lessons/teacher-stats", {
      params: { start_date: startDate, end_date: endDate },
    }),
  teacherDetail: (teacherId: number, startDate: string, endDate: string) =>
    api.get<TeacherDetailResponse>(
      `/api/v1/lessons/teacher-stats/${teacherId}`,
      {
        params: { start_date: startDate, end_date: endDate },
      },
    ),
}

// Teacher stats types
export interface TeacherStatRead {
  teacher_id: number
  teacher_name: string
  photo_url: string | null
  total_expected: number
  total_conducted: number
  total_completed: number
  total_planned: number
  on_time_starts: number
  avg_duration_minutes: number | null
  avg_plan_score: number | null
}

export interface TeacherStatsResponse {
  teachers: TeacherStatRead[]
}

export interface TeacherSessionMaterial {
  id: number
  file_url: string
  original_name: string
}

export interface TeacherSessionDetail {
  session_id: number
  session_date: string
  status: string
  subject_name: string
  grade_display: string
  period_number: number
  start_time: string
  end_time: string
  started_at: string | null
  ended_at: string | null
  plan_id: number | null
  topic: string | null
  lesson_type: string | null
  objectives: { text: string; bloom_level: string | null }[] | null
  keywords: string[] | null
  homework: string | null
  resources: string[] | null
  assessment_methods: string[] | null
  plan_filled_count: number
  lesson_number: number
}

export interface TeacherDetailResponse {
  teacher_id: number
  teacher_name: string
  photo_url: string | null
  sessions: TeacherSessionDetail[]
}

// ─── Quarters ───────────────────────────────────────────────────────────────

export interface QuarterRead {
  id: number
  academic_year_id: number
  number: number
  start_date: string
  end_date: string
  holidays: string[]
  created_at: string | null
  updated_at: string | null
}

export interface QuarterCreate {
  academic_year_id: number
  number: number
  start_date: string
  end_date: string
  holidays: string[]
}

export interface QuarterList {
  data: QuarterRead[]
  count: number
}

export const quartersApi = {
  list: (academicYearId?: number) =>
    api.get<QuarterList>("/api/v1/quarters/", {
      params: academicYearId ? { academic_year_id: academicYearId } : {},
    }),
  current: () => api.get<QuarterRead | null>("/api/v1/quarters/current"),
  create: (data: QuarterCreate) =>
    api.post<QuarterRead>("/api/v1/quarters/", data),
  update: (
    id: number,
    data: Partial<Omit<QuarterCreate, "academic_year_id">>,
  ) => api.patch<QuarterRead>(`/api/v1/quarters/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/quarters/${id}`),
}

// ────────────── TMS Integration ──────────────────────────────────────────

export interface TMSTokenResponse {
  access_token: string
  embed_url: string
}

export const tmsApi = {
  getEmbedToken: () => api.post<TMSTokenResponse>("/api/v1/tms/embed-token"),
}

// ────────────── Parent Portal ──────────────────────────────────────────

// ParentChildRead, ParentMeRead, ParentTokenResponse — re-exported from authSchemas.

export interface ParentLoginRequest {
  phone: string
  password: string
}

export interface ChildAttendanceRecord {
  date: string
  subject_name: string
  period_number: number
  start_time: string
  end_time: string
  status: AttendanceStatus
}

export interface AttendanceSummary {
  total: number
  present: number
  late: number
  absent: number
}

export interface ChildAttendanceResponse {
  records: ChildAttendanceRecord[]
  summary: AttendanceSummary
}

export interface ChildTimetableEntry {
  day_of_week: number
  period_number: number
  start_time: string
  end_time: string
  subject_name: string
  teacher_name: string
  room: string | null
}

export interface ChildTimetableResponse {
  entries: ChildTimetableEntry[]
}

export interface ChildHomeworkItem {
  subject_name: string
  topic: string | null
  homework: string
  homework_deadline: string | null
  plan_date: string
  teacher_name: string | null
}

export interface ChildHomeworkResponse {
  items: ChildHomeworkItem[]
}

// ─── Sync ───────────────────────────────────────────────────────────────────

export const syncApi = {
  runSync: () => api.post<Record<string, unknown>>("/api/v1/sync/all"),
  status: () => api.get<Record<string, unknown>>("/api/v1/sync/status"),
}

export const parentApi = {
  login: (data: ParentLoginRequest) =>
    api
      .post<unknown>("/api/v1/login/parent", data)
      .then(validated<ParentTokenResponse>(parentTokenResponseSchema)),

  me: () =>
    parentAxiosInstance
      .get<unknown>("/api/v1/parent/me")
      .then(validated<ParentMeRead>(parentMeSchema)),

  attendance: (
    studentId: number,
    params?: { start_date?: string; end_date?: string },
  ) =>
    parentAxiosInstance.get<ChildAttendanceResponse>(
      `/api/v1/parent/children/${studentId}/attendance`,
      { params },
    ),

  timetable: (studentId: number) =>
    parentAxiosInstance.get<ChildTimetableResponse>(
      `/api/v1/parent/children/${studentId}/timetable`,
    ),

  homework: (studentId: number, limit = 20) =>
    parentAxiosInstance.get<ChildHomeworkResponse>(
      `/api/v1/parent/children/${studentId}/homework`,
      { params: { limit } },
    ),
}
