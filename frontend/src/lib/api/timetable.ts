import { api } from "./client"

// ─── School Settings ───────────────────────────────────────────────────────

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

// ─── TimeSlot ──────────────────────────────────────────────────────────────

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

// ─── ScheduleEntry ─────────────────────────────────────────────────────────

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
