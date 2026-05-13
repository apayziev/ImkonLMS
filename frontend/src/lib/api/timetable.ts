import { z } from "zod"

import { api, validated } from "./client"

// ─── School Settings ───────────────────────────────────────────────────────

export const breakItemSchema = z.object({
  start_time: z.string(),
  end_time: z.string(),
  name: z.string(),
})
export type BreakItem = z.infer<typeof breakItemSchema>

export const schoolSettingsReadSchema = z.object({
  id: z.number(),
  day_start_time: z.string(),
  day_end_time: z.string(),
  lesson_duration_minutes: z.number(),
  default_break_minutes: z.number(),
  working_days: z.array(z.number()),
  breaks: z.array(breakItemSchema),
  created_at: z.string(),
  updated_at: z.string().nullable(),
})
export type SchoolSettingsRead = z.infer<typeof schoolSettingsReadSchema>

export interface SchoolSettingsUpdate {
  day_start_time?: string
  day_end_time?: string
  lesson_duration_minutes?: number
  default_break_minutes?: number
  working_days?: number[]
  breaks?: BreakItem[]
}

// ─── TimeSlot ──────────────────────────────────────────────────────────────

export const timeSlotReadSchema = z.object({
  id: z.number(),
  academic_year_id: z.number(),
  period_number: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
})
export type TimeSlotRead = z.infer<typeof timeSlotReadSchema>

export const timeSlotListSchema = z.object({
  data: z.array(timeSlotReadSchema),
  count: z.number(),
})
export type TimeSlotList = z.infer<typeof timeSlotListSchema>

// ─── ScheduleEntry ─────────────────────────────────────────────────────────

export const scheduleEntryReadSchema = z.object({
  id: z.number(),
  academic_year_id: z.number(),
  grade_id: z.number(),
  subject_id: z.number(),
  teacher_id: z.number(),
  time_slot_id: z.number(),
  day_of_week: z.number(),
  room: z.string().nullable(),
  subject_name: z.string().nullable(),
  teacher_name: z.string().nullable(),
  grade_display: z.string().nullable(),
  period_number: z.number().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
})
export type ScheduleEntryRead = z.infer<typeof scheduleEntryReadSchema>

export const scheduleEntryListSchema = z.object({
  data: z.array(scheduleEntryReadSchema),
  count: z.number(),
})
export type ScheduleEntryList = z.infer<typeof scheduleEntryListSchema>

export const timetableApi = {
  // Settings
  getSettings: () =>
    api
      .get<unknown>("/api/v1/timetable/settings")
      .then(validated<SchoolSettingsRead>(schoolSettingsReadSchema)),
  updateSettings: (data: SchoolSettingsUpdate) =>
    api
      .patch<unknown>("/api/v1/timetable/settings", data)
      .then(validated<SchoolSettingsRead>(schoolSettingsReadSchema)),

  // Time Slots
  listTimeSlots: (academicYearId: number) =>
    api
      .get<unknown>("/api/v1/timetable/time-slots", {
        params: { academic_year_id: academicYearId },
      })
      .then(validated<TimeSlotList>(timeSlotListSchema)),
  createTimeSlot: (data: {
    academic_year_id: number
    period_number: number
    start_time: string
    end_time: string
  }) =>
    api
      .post<unknown>("/api/v1/timetable/time-slots", data)
      .then(validated<TimeSlotRead>(timeSlotReadSchema)),
  deleteTimeSlot: (id: number) =>
    api.delete(`/api/v1/timetable/time-slots/${id}`),
  deleteAllTimeSlots: (academicYearId: number) =>
    api.delete(
      `/api/v1/timetable/time-slots?academic_year_id=${academicYearId}`,
    ),
  generateTimeSlots: (academicYearId: number) =>
    api
      .post<unknown>(
        `/api/v1/timetable/time-slots/generate?academic_year_id=${academicYearId}`,
      )
      .then(validated<TimeSlotList>(timeSlotListSchema)),

  // Schedule
  listSchedule: (params: {
    academic_year_id: number
    grade_id?: number
    teacher_id?: number
  }) =>
    api
      .get<unknown>("/api/v1/timetable/schedule", { params })
      .then(validated<ScheduleEntryList>(scheduleEntryListSchema)),
  createEntry: (data: {
    academic_year_id: number
    grade_id: number
    subject_id: number
    teacher_id: number
    time_slot_id: number
    day_of_week: number
    room?: string | null
  }) =>
    api
      .post<unknown>("/api/v1/timetable/schedule", data)
      .then(validated<ScheduleEntryRead>(scheduleEntryReadSchema)),
  updateEntry: (
    id: number,
    data: { subject_id?: number; teacher_id?: number; room?: string | null },
  ) =>
    api
      .patch<unknown>(`/api/v1/timetable/schedule/${id}`, data)
      .then(validated<ScheduleEntryRead>(scheduleEntryReadSchema)),
  deleteEntry: (id: number) => api.delete(`/api/v1/timetable/schedule/${id}`),
}
