import { z } from "zod"

import {
  type ParentMeRead,
  type ParentTokenResponse,
  parentMeSchema,
  parentTokenResponseSchema,
} from "@/lib/authSchemas"

import { api, parentAxiosInstance, validated } from "./client"

const attendanceStatusSchema = z.enum([
  "unmarked",
  "present",
  "late",
  "absent",
])

export interface ParentLoginRequest {
  phone: string
  password: string
}

export const childAttendanceRecordSchema = z.object({
  date: z.string(),
  subject_name: z.string(),
  period_number: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  status: attendanceStatusSchema,
})
export type ChildAttendanceRecord = z.infer<typeof childAttendanceRecordSchema>

export const attendanceSummarySchema = z.object({
  total: z.number(),
  present: z.number(),
  late: z.number(),
  absent: z.number(),
})
export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>

export const childAttendanceResponseSchema = z.object({
  records: z.array(childAttendanceRecordSchema),
  summary: attendanceSummarySchema,
})
export type ChildAttendanceResponse = z.infer<
  typeof childAttendanceResponseSchema
>

export const childTimetableEntrySchema = z.object({
  day_of_week: z.number(),
  period_number: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  subject_name: z.string(),
  teacher_name: z.string(),
  room: z.string().nullable(),
})
export type ChildTimetableEntry = z.infer<typeof childTimetableEntrySchema>

export const childTimetableResponseSchema = z.object({
  entries: z.array(childTimetableEntrySchema),
})
export type ChildTimetableResponse = z.infer<
  typeof childTimetableResponseSchema
>

export const childHomeworkItemSchema = z.object({
  subject_name: z.string(),
  topic: z.string().nullable(),
  homework: z.string(),
  homework_deadline: z.string().nullable(),
  plan_date: z.string(),
  teacher_name: z.string().nullable(),
})
export type ChildHomeworkItem = z.infer<typeof childHomeworkItemSchema>

export const childHomeworkResponseSchema = z.object({
  items: z.array(childHomeworkItemSchema),
})
export type ChildHomeworkResponse = z.infer<typeof childHomeworkResponseSchema>

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
    parentAxiosInstance
      .get<unknown>(`/api/v1/parent/children/${studentId}/attendance`, {
        params,
      })
      .then(validated<ChildAttendanceResponse>(childAttendanceResponseSchema)),

  timetable: (studentId: number) =>
    parentAxiosInstance
      .get<unknown>(`/api/v1/parent/children/${studentId}/timetable`)
      .then(validated<ChildTimetableResponse>(childTimetableResponseSchema)),

  homework: (studentId: number, limit = 20) =>
    parentAxiosInstance
      .get<unknown>(`/api/v1/parent/children/${studentId}/homework`, {
        params: { limit },
      })
      .then(validated<ChildHomeworkResponse>(childHomeworkResponseSchema)),
}
