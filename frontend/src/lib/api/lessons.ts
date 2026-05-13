import { z } from "zod"

import { api, arrayParamsSerializer, validated } from "./client"

const sessionStatusSchema = z.enum(["in_progress", "completed"])
const attendanceStatusSchema = z.enum([
  "unmarked",
  "present",
  "late",
  "absent",
])

// ─── Today's lesson (schedule-derived) ─────────────────────────────────────

export const todayLessonReadSchema = z.object({
  schedule_entry_id: z.number(),
  grade_id: z.number(),
  grade_display: z.string(),
  subject_id: z.number(),
  subject_name: z.string(),
  period_number: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  room: z.string().nullable(),
  session_id: z.number().nullable(),
  session_status: sessionStatusSchema.nullable(),
  plan_id: z.number().nullable(),
  plan_filled_count: z.number(), // 0-8
  lesson_number: z.number(),
  total_lessons: z.number(),
})
export type TodayLessonRead = z.infer<typeof todayLessonReadSchema>

export const todayLessonsResponseSchema = z.object({
  data: z.array(todayLessonReadSchema),
  date: z.string(),
})
export type TodayLessonsResponse = z.infer<typeof todayLessonsResponseSchema>

// ─── Lesson plan ───────────────────────────────────────────────────────────

export const lessonPlanObjectiveReadSchema = z.object({
  text: z.string(),
  bloom_level: z.string().nullable(),
})
export type LessonPlanObjectiveRead = z.infer<
  typeof lessonPlanObjectiveReadSchema
>

export const lessonPlanStageReadSchema = z.object({
  title: z.string(),
  duration_min: z.number(),
  activity: z.string(),
})
export type LessonPlanStageRead = z.infer<typeof lessonPlanStageReadSchema>

export const lessonMaterialReadSchema = z.object({
  id: z.number(),
  file_url: z.string(),
  original_name: z.string(),
  file_size: z.number(),
})
export type LessonMaterialRead = z.infer<typeof lessonMaterialReadSchema>

export const lessonPlanReadSchema = z.object({
  id: z.number(),
  schedule_entry_id: z.number().nullable(),
  plan_date: z.string(),
  topic: z.string().nullable(),
  lesson_type: z.string().nullable(),
  objectives: z.array(lessonPlanObjectiveReadSchema).nullable(),
  keywords: z.array(z.string()).nullable(),
  homework: z.string().nullable(),
  homework_deadline: z.string().nullable(),
  stages: z.array(lessonPlanStageReadSchema).nullable(),
  resources: z.array(z.string()).nullable(),
  assessment_methods: z.array(z.string()).nullable(),
  homework_test_id: z.number().nullable(),
  homework_test_title: z.string().nullable(),
  materials: z.array(lessonMaterialReadSchema),
  plan_filled_count: z.number(),
})
export type LessonPlanRead = z.infer<typeof lessonPlanReadSchema>

// ─── Session / assessment / attendance ─────────────────────────────────────

export const sessionStudentAssessmentSchema = z.object({
  knowing: z.number().nullable(), // 0-4
  applying: z.number().nullable(), // 0-4
  reasoning: z.number().nullable(), // 0-2
})
export type SessionStudentAssessment = z.infer<
  typeof sessionStudentAssessmentSchema
>

export const sessionStudentReadSchema = z.object({
  attendance_id: z.number(),
  student_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  photo_url: z.string().nullable(),
  status: attendanceStatusSchema,
  marked_at: z.string().nullable(),
  assessment: sessionStudentAssessmentSchema,
})
export type SessionStudentRead = z.infer<typeof sessionStudentReadSchema>

export interface AssessmentUpdateRequest {
  student_id: number
  // Only the keys present are patched. Send `null` to clear a dimension.
  knowing?: number | null
  applying?: number | null
  reasoning?: number | null
}

export const sessionDetailReadSchema = z.object({
  id: z.number(),
  schedule_entry_id: z.number(),
  session_date: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  status: sessionStatusSchema,
  grade_display: z.string(),
  subject_name: z.string(),
  period_number: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  teacher_name: z.string(),
  plan: lessonPlanReadSchema.nullable(),
  students: z.array(sessionStudentReadSchema),
})
export type SessionDetailRead = z.infer<typeof sessionDetailReadSchema>

export interface AttendanceUpdateRequest {
  student_id: number
  status: z.infer<typeof attendanceStatusSchema>
}

// Admin attendance view
export const attendanceStudentReadSchema = z.object({
  student_id: z.number(),
  full_name: z.string(),
  photo_url: z.string().nullable(),
  status: attendanceStatusSchema,
  marked_at: z.string().nullable(),
})
export type AttendanceStudentRead = z.infer<typeof attendanceStudentReadSchema>

export const attendanceSessionReadSchema = z.object({
  session_id: z.number(),
  subject_name: z.string(),
  period_number: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  teacher_name: z.string(),
  status: sessionStatusSchema,
  students: z.array(attendanceStudentReadSchema),
})
export type AttendanceSessionRead = z.infer<typeof attendanceSessionReadSchema>

export const attendanceDayResponseSchema = z.object({
  date: z.string(),
  grade_display: z.string(),
  sessions: z.array(attendanceSessionReadSchema),
})
export type AttendanceDayResponse = z.infer<typeof attendanceDayResponseSchema>

export const sessionStatusItemSchema = z.object({
  schedule_entry_id: z.number(),
  session_date: z.string(),
  status: sessionStatusSchema,
})
export type SessionStatusItem = z.infer<typeof sessionStatusItemSchema>

export const sessionStatusesResponseSchema = z.object({
  data: z.array(sessionStatusItemSchema),
})
export type SessionStatusesResponse = z.infer<
  typeof sessionStatusesResponseSchema
>

export const attendanceHistoryStudentSchema = z.object({
  student_id: z.number(),
  full_name: z.string(),
  photo_url: z.string().nullable(),
  records: z.record(z.string(), attendanceStatusSchema),
})
export type AttendanceHistoryStudent = z.infer<
  typeof attendanceHistoryStudentSchema
>

export const attendanceHistoryResponseSchema = z.object({
  dates: z.array(z.string()),
  students: z.array(attendanceHistoryStudentSchema),
})
export type AttendanceHistoryResponse = z.infer<
  typeof attendanceHistoryResponseSchema
>

// ─── Teacher stats ─────────────────────────────────────────────────────────

export const teacherStatReadSchema = z.object({
  teacher_id: z.number(),
  teacher_name: z.string(),
  photo_url: z.string().nullable(),
  total_expected: z.number(),
  total_conducted: z.number(),
  total_completed: z.number(),
  total_planned: z.number(),
  on_time_starts: z.number(),
  avg_duration_minutes: z.number().nullable(),
  avg_plan_score: z.number().nullable(),
})
export type TeacherStatRead = z.infer<typeof teacherStatReadSchema>

export const teacherStatsResponseSchema = z.object({
  teachers: z.array(teacherStatReadSchema),
})
export type TeacherStatsResponse = z.infer<typeof teacherStatsResponseSchema>

export interface TeacherSessionMaterial {
  id: number
  file_url: string
  original_name: string
}

export const teacherSessionDetailSchema = z.object({
  session_id: z.number(),
  session_date: z.string(),
  status: z.string(),
  subject_name: z.string(),
  grade_display: z.string(),
  period_number: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  plan_id: z.number().nullable(),
  topic: z.string().nullable(),
  lesson_type: z.string().nullable(),
  objectives: z
    .array(z.object({ text: z.string(), bloom_level: z.string().nullable() }))
    .nullable(),
  keywords: z.array(z.string()).nullable(),
  homework: z.string().nullable(),
  resources: z.array(z.string()).nullable(),
  assessment_methods: z.array(z.string()).nullable(),
  plan_filled_count: z.number(),
  lesson_number: z.number(),
})
export type TeacherSessionDetail = z.infer<typeof teacherSessionDetailSchema>

export const teacherDetailResponseSchema = z.object({
  teacher_id: z.number(),
  teacher_name: z.string(),
  photo_url: z.string().nullable(),
  sessions: z.array(teacherSessionDetailSchema),
})
export type TeacherDetailResponse = z.infer<typeof teacherDetailResponseSchema>

export const lessonsApi = {
  today: (date?: string) =>
    api
      .get<unknown>("/api/v1/lessons/today", {
        params: date ? { date } : undefined,
      })
      .then(validated<TodayLessonsResponse>(todayLessonsResponseSchema)),
  sessionStatuses: (entryIds: number[], startDate: string, endDate: string) =>
    api
      .get<unknown>("/api/v1/lessons/sessions/statuses", {
        params: {
          entry_id: entryIds,
          start_date: startDate,
          end_date: endDate,
        },
        paramsSerializer: arrayParamsSerializer,
      })
      .then(validated<SessionStatusesResponse>(sessionStatusesResponseSchema)),
  // Plans
  createPlan: (schedule_entry_id: number, target_date?: string) =>
    api
      .post<unknown>("/api/v1/lessons/plans", {
        schedule_entry_id,
        target_date,
      })
      .then(validated<LessonPlanRead>(lessonPlanReadSchema)),
  getPlan: (planId: number) =>
    api
      .get<unknown>(`/api/v1/lessons/plans/${planId}`)
      .then(validated<LessonPlanRead>(lessonPlanReadSchema)),
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
  ) =>
    api
      .patch<unknown>(`/api/v1/lessons/plans/${planId}`, data)
      .then(validated<LessonPlanRead>(lessonPlanReadSchema)),
  // Sessions
  startSession: (schedule_entry_id: number, target_date?: string) =>
    api
      .post<unknown>("/api/v1/lessons/sessions", {
        schedule_entry_id,
        target_date,
      })
      .then(validated<SessionDetailRead>(sessionDetailReadSchema)),
  getSession: (sessionId: number) =>
    api
      .get<unknown>(`/api/v1/lessons/sessions/${sessionId}`)
      .then(validated<SessionDetailRead>(sessionDetailReadSchema)),
  updateAttendance: (sessionId: number, data: AttendanceUpdateRequest) =>
    api
      .patch<unknown>(
        `/api/v1/lessons/sessions/${sessionId}/attendance`,
        data,
      )
      .then(validated<SessionStudentRead>(sessionStudentReadSchema)),
  updateAssessment: (sessionId: number, data: AssessmentUpdateRequest) =>
    api
      .patch<unknown>(
        `/api/v1/lessons/sessions/${sessionId}/assessment`,
        data,
      )
      .then(
        validated<SessionStudentAssessment>(sessionStudentAssessmentSchema),
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
    return api
      .post<unknown>(
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
      .then(validated<LessonMaterialRead>(lessonMaterialReadSchema))
  },
  deleteMaterial: (planId: number, materialId: number) =>
    api.delete(`/api/v1/lessons/plans/${planId}/materials/${materialId}`),
  getAttendance: (gradeId: number, date?: string) =>
    api
      .get<unknown>("/api/v1/lessons/attendance", {
        params: { grade_id: gradeId, ...(date ? { date } : {}) },
      })
      .then(validated<AttendanceDayResponse>(attendanceDayResponseSchema)),
  attendanceHistory: (entryIds: number[], startDate: string, endDate: string) =>
    api
      .get<unknown>("/api/v1/lessons/attendance/history", {
        params: {
          entry_id: entryIds,
          start_date: startDate,
          end_date: endDate,
        },
        paramsSerializer: arrayParamsSerializer,
      })
      .then(
        validated<AttendanceHistoryResponse>(attendanceHistoryResponseSchema),
      ),
  teacherStats: (startDate: string, endDate: string) =>
    api
      .get<unknown>("/api/v1/lessons/teacher-stats", {
        params: { start_date: startDate, end_date: endDate },
      })
      .then(validated<TeacherStatsResponse>(teacherStatsResponseSchema)),
  teacherDetail: (teacherId: number, startDate: string, endDate: string) =>
    api
      .get<unknown>(`/api/v1/lessons/teacher-stats/${teacherId}`, {
        params: { start_date: startDate, end_date: endDate },
      })
      .then(validated<TeacherDetailResponse>(teacherDetailResponseSchema)),
}
