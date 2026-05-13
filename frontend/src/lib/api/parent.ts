import {
  type ParentMeRead,
  type ParentTokenResponse,
  parentMeSchema,
  parentTokenResponseSchema,
} from "@/lib/authSchemas"

import { api, type AttendanceStatus, parentAxiosInstance, validated } from "./client"

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
