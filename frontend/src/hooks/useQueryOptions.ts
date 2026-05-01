import {
  academicYearsApi,
  gradesApi,
  lessonsApi,
  quartersApi,
  subjectsApi,
  teachersApi,
  timetableApi,
} from "@/lib/api"
import { todayStr } from "@/lib/utils"

const MAX_GRADES = 100
const MAX_SUBJECTS = 500

const MINUTE = 60_000
const TWO_MINUTES = 2 * MINUTE
const FIVE_MINUTES = 5 * MINUTE
const THIRTY_SECONDS = 30_000

export const queryKeys = {
  currentUser: ["currentUser"] as const,
  parentUser: ["parentUser"] as const,
  grades: ["grades"] as const,
  subjects: ["subjects"] as const,
  students: ["students"] as const,
  teachers: ["teachers"] as const,
  currentAcademicYear: ["academic-years", "current"] as const,
  schoolSettings: ["school-settings"] as const,
  timeSlots: ["time-slots"] as const,
  schedule: ["schedule"] as const,
  todayLessons: ["today-lessons"] as const,
  lessonsForDate: (date: string) => ["lessons-for-date", date] as const,
  lessonSession: (id: number) => ["lesson-session", id] as const,
  lessonPlan: (id: number) => ["lesson-plan", id] as const,
  quarters: (academicYearId?: number) =>
    ["quarters", academicYearId ?? null] as const,
  attendance: (gradeId: number, date: string) =>
    ["attendance", gradeId, date] as const,
  sessionStatuses: (entryIds: number[], startDate: string, endDate: string) =>
    ["session-statuses", entryIds.join(","), startDate, endDate] as const,
  attendanceHistory: (entryIds: number[], startDate: string, endDate: string) =>
    ["attendance-history", entryIds.join(","), startDate, endDate] as const,
  teacherStats: (startDate: string, endDate: string) =>
    ["teacher-stats", startDate, endDate] as const,
} as const

export function getGradesQueryOptions() {
  return {
    queryKey: queryKeys.grades,
    queryFn: async () => {
      const { data } = await gradesApi.list(0, MAX_GRADES)
      return data
    },
  }
}

export function getSubjectsQueryOptions() {
  return {
    queryKey: queryKeys.subjects,
    queryFn: async () => {
      const { data } = await subjectsApi.list(0, MAX_SUBJECTS)
      return data
    },
  }
}

export function getTeachersQueryOptions(params?: { search?: string }) {
  return {
    queryKey: [...queryKeys.teachers, params ?? {}] as const,
    queryFn: async () => {
      const { data } = await teachersApi.list({ limit: 200, ...params })
      return data
    },
  }
}

export function getCurrentAcademicYearQueryOptions() {
  return {
    queryKey: queryKeys.currentAcademicYear,
    queryFn: async () => {
      const { data } = await academicYearsApi.current()
      return data
    },
    staleTime: FIVE_MINUTES, // academic year changes very rarely
    retry: false,
  }
}

export function getSchoolSettingsQueryOptions() {
  return {
    queryKey: queryKeys.schoolSettings,
    queryFn: async () => {
      const { data } = await timetableApi.getSettings()
      return data
    },
    staleTime: FIVE_MINUTES,
  }
}

export function getTimeSlotsQueryOptions(academicYearId: number) {
  return {
    queryKey: [...queryKeys.timeSlots, academicYearId] as const,
    queryFn: async () => {
      const { data } = await timetableApi.listTimeSlots(academicYearId)
      return data
    },
    enabled: academicYearId > 0,
    staleTime: FIVE_MINUTES,
  }
}

export function getScheduleQueryOptions(params: {
  academic_year_id: number
  grade_id?: number
  teacher_id?: number
}) {
  return {
    queryKey: [...queryKeys.schedule, params] as const,
    queryFn: async () => {
      const { data } = await timetableApi.listSchedule(params)
      return data
    },
    enabled: params.academic_year_id > 0,
    staleTime: FIVE_MINUTES,
  }
}

export function getTodayLessonsQueryOptions(date?: string) {
  return {
    queryKey: date ? queryKeys.lessonsForDate(date) : queryKeys.todayLessons,
    queryFn: async () => {
      const { data } = await lessonsApi.today(date)
      return data
    },
  }
}

export function getSessionStatusesQueryOptions(
  entryIds: number[],
  startDate: string,
  endDate: string,
) {
  return {
    queryKey: queryKeys.sessionStatuses(entryIds, startDate, endDate),
    queryFn: async () => {
      const { data } = await lessonsApi.sessionStatuses(
        entryIds,
        startDate,
        endDate,
      )
      return data
    },
    enabled: entryIds.length > 0 && !!startDate && !!endDate,
    staleTime: MINUTE,
  }
}

export function getAttendanceHistoryQueryOptions(
  entryIds: number[],
  startDate: string,
  endDate: string,
) {
  return {
    queryKey: queryKeys.attendanceHistory(entryIds, startDate, endDate),
    queryFn: async () => {
      const { data } = await lessonsApi.attendanceHistory(
        entryIds,
        startDate,
        endDate,
      )
      return data
    },
    enabled: entryIds.length > 0 && !!startDate && !!endDate,
    staleTime: FIVE_MINUTES,
  }
}

export function getLessonSessionQueryOptions(sessionId: number) {
  return {
    queryKey: queryKeys.lessonSession(sessionId),
    queryFn: async () => {
      const { data } = await lessonsApi.getSession(sessionId)
      return data
    },
    enabled: sessionId > 0,
  }
}

export function getLessonPlanQueryOptions(planId: number) {
  return {
    queryKey: queryKeys.lessonPlan(planId),
    queryFn: async () => {
      const { data } = await lessonsApi.getPlan(planId)
      return data
    },
    enabled: planId > 0,
  }
}

export function getAttendanceQueryOptions(gradeId: number, date: string) {
  // Compare against local YYYY-MM-DD; toISOString() is UTC, which can flip
  // the day around midnight in zones east of UTC (e.g., 22:00 UTC+5 = next-day UTC).
  const isToday = date === todayStr()
  return {
    queryKey: queryKeys.attendance(gradeId, date),
    queryFn: async () => {
      const { data } = await lessonsApi.getAttendance(gradeId, date)
      return data
    },
    enabled: gradeId > 0,
    // Auto-refresh every 30s on today's date for live attendance updates
    refetchInterval: isToday ? THIRTY_SECONDS : (false as const),
  }
}

export function getQuartersQueryOptions(academicYearId?: number) {
  return {
    queryKey: queryKeys.quarters(academicYearId),
    queryFn: async () => {
      const { data } = await quartersApi.list(academicYearId)
      return data
    },
  }
}

export function getCurrentQuarterQueryOptions() {
  return {
    queryKey: ["quarters", "current"] as const,
    queryFn: async () => {
      const { data } = await quartersApi.current()
      return data
    },
    staleTime: FIVE_MINUTES,
  }
}

export function getTeacherStatsQueryOptions(
  startDate: string,
  endDate: string,
) {
  return {
    queryKey: queryKeys.teacherStats(startDate, endDate),
    queryFn: async () => {
      const { data } = await lessonsApi.teacherStats(startDate, endDate)
      return data
    },
    enabled: !!startDate && !!endDate,
    staleTime: TWO_MINUTES,
  }
}

export function getTeacherDetailQueryOptions(
  teacherId: number,
  startDate: string,
  endDate: string,
) {
  return {
    queryKey: [
      ...queryKeys.teacherStats(startDate, endDate),
      "detail",
      teacherId,
    ],
    queryFn: async () => {
      const { data } = await lessonsApi.teacherDetail(
        teacherId,
        startDate,
        endDate,
      )
      return data
    },
    enabled: !!teacherId && !!startDate && !!endDate,
    staleTime: TWO_MINUTES,
  }
}
