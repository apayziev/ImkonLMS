import { gradesApi, subjectsApi } from "@/lib/api"

const MAX_GRADES = 100
const MAX_SUBJECTS = 500

export const queryKeys = {
  grades: ["grades"] as const,
  subjects: ["subjects"] as const,
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
