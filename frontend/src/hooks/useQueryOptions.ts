import { academicYearsApi, gradesApi, lessonsApi, quartersApi, studentsApi, subjectsApi, teachersApi, timetableApi, violationsApi, yellowCardsApi } from "@/lib/api"

const MAX_GRADES = 100
const MAX_SUBJECTS = 500
const MAX_STUDENTS = 200

export const queryKeys = {
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
  quarters: (academicYearId?: number) => ["quarters", academicYearId ?? null] as const,
  attendance: (gradeId: number, date: string) => ["attendance", gradeId, date] as const,
  yellowCards: (sessionId: number) => ["yellow-cards", sessionId] as const,
  violationTypes: ["violation-types"] as const,
  violationReports: (sessionId: number) => ["violation-reports", sessionId] as const,
  sessionStatuses: (entryIds: number[], startDate: string, endDate: string) =>
    ["session-statuses", entryIds.join(","), startDate, endDate] as const,
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

export function getStudentsQueryOptions(params?: { grade_id?: number; search?: string }) {
  return {
    queryKey: [...queryKeys.students, params ?? {}] as const,
    queryFn: async () => {
      const { data } = await studentsApi.list({ limit: MAX_STUDENTS, ...params })
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
      const { data } = await lessonsApi.sessionStatuses(entryIds, startDate, endDate)
      return data
    },
    enabled: entryIds.length > 0 && !!startDate && !!endDate,
    staleTime: 60 * 1000,
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

export function getAttendanceQueryOptions(gradeId: number, date: string) {
  const isToday = date === new Date().toISOString().split("T")[0]
  return {
    queryKey: queryKeys.attendance(gradeId, date),
    queryFn: async () => {
      const { data } = await lessonsApi.getAttendance(gradeId, date)
      return data
    },
    enabled: gradeId > 0,
    // Auto-refresh every 30s on today's date for live attendance updates
    refetchInterval: isToday ? 30_000 : false as const,
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

export function getYellowCardsQueryOptions(sessionId: number) {
  return {
    queryKey: queryKeys.yellowCards(sessionId),
    queryFn: async () => {
      const { data } = await yellowCardsApi.getBySession(sessionId)
      return data
    },
    enabled: sessionId > 0,
  }
}

export function getViolationTypesQueryOptions() {
  return {
    queryKey: queryKeys.violationTypes,
    queryFn: async () => {
      const { data } = await violationsApi.getTypes()
      return data
    },
    staleTime: 5 * 60 * 1000,
  }
}

export function getViolationReportsQueryOptions(sessionId: number) {
  return {
    queryKey: queryKeys.violationReports(sessionId),
    queryFn: async () => {
      const { data } = await violationsApi.getBySession(sessionId)
      return data
    },
    enabled: sessionId > 0,
  }
}
