import {
  academicYearsApi,
  configApi,
  gradesApi,
  lessonsApi,
  quartersApi,
  statsApi,
  subjectsApi,
  teachersApi,
  timetableApi,
} from "@/lib/api"
import { fetchAll } from "@/lib/paginate"
import { todayStr } from "@/lib/utils"

export const queryKeys = {
  appConfig: ["app-config"] as const,
  dashboardStats: ["dashboard-stats"] as const,
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

export function getAppConfigQueryOptions() {
  return {
    queryKey: queryKeys.appConfig,
    queryFn: async () => (await configApi.get()).data,
    staleTime: 60 * 60 * 1000, // 1h — static between deploys
    retry: false,
  }
}

export function getDashboardStatsQueryOptions() {
  return {
    queryKey: queryKeys.dashboardStats,
    queryFn: async () => (await statsApi.dashboard()).data,
    staleTime: 60_000,
  }
}

export function getGradesQueryOptions() {
  return {
    queryKey: queryKeys.grades,
    queryFn: () => fetchAll((skip, limit) => gradesApi.list(skip, limit)),
  }
}

export function getSubjectsQueryOptions() {
  return {
    queryKey: queryKeys.subjects,
    queryFn: () => fetchAll((skip, limit) => subjectsApi.list(skip, limit)),
  }
}

export function getTeachersQueryOptions(params?: { search?: string }) {
  return {
    queryKey: [...queryKeys.teachers, params ?? {}] as const,
    queryFn: () =>
      fetchAll((skip, limit) => teachersApi.list({ skip, limit, ...params })),
  }
}

export function getCurrentAcademicYearQueryOptions() {
  return {
    queryKey: queryKeys.currentAcademicYear,
    queryFn: async () => {
      const { data } = await academicYearsApi.current()
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 min — changes very rarely
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
  const isToday = date === todayStr()
  return {
    queryKey: queryKeys.attendance(gradeId, date),
    queryFn: async () => {
      const { data } = await lessonsApi.getAttendance(gradeId, date)
      return data
    },
    enabled: gradeId > 0,
    // Auto-refresh every 30s on today's date for live attendance updates
    refetchInterval: isToday ? 30_000 : (false as const),
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 2 * 60 * 1000,
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
    staleTime: 2 * 60 * 1000,
  }
}
