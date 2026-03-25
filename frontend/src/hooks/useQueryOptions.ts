import { academicYearsApi, gradesApi, lessonsApi, studentsApi, subjectsApi, teachersApi, timetableApi } from "@/lib/api"

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
  lessonSession: ["lesson-session"] as const,
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

export function getTodayLessonsQueryOptions() {
  return {
    queryKey: queryKeys.todayLessons,
    queryFn: async () => {
      const { data } = await lessonsApi.today()
      return data
    },
  }
}

export function getLessonSessionQueryOptions(sessionId: number) {
  return {
    queryKey: [...queryKeys.lessonSession, sessionId] as const,
    queryFn: async () => {
      const { data } = await lessonsApi.getSession(sessionId)
      return data
    },
    enabled: sessionId > 0,
  }
}
