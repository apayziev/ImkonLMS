import {
  api,
  arrayParamsSerializer,
  type AttendanceStatus,
  type SessionStatus,
} from "./client"

// ─── Today's lesson (schedule-derived) ─────────────────────────────────────

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

export interface TodayLessonsResponse {
  data: TodayLessonRead[]
  date: string
}

// ─── Lesson plan ───────────────────────────────────────────────────────────

export interface LessonPlanObjectiveRead {
  text: string
  bloom_level: string | null
}

export interface LessonPlanStageRead {
  title: string
  duration_min: number
  activity: string
}

export interface LessonMaterialRead {
  id: number
  file_url: string
  original_name: string
  file_size: number
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

// ─── Session / assessment / attendance ─────────────────────────────────────

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

// ─── Teacher stats ─────────────────────────────────────────────────────────

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
