import { academicYearsApi, gradesApi, studentsApi, subjectsApi } from "@/lib/api"

const MAX_GRADES = 100
const MAX_SUBJECTS = 500
const MAX_STUDENTS = 200

export const queryKeys = {
  grades: ["grades"] as const,
  subjects: ["subjects"] as const,
  students: ["students"] as const,
  currentAcademicYear: ["academic-years", "current"] as const,
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
