import { gradesApi, subjectsApi } from "@/lib/api"

export const queryKeys = {
  grades: ["grades"] as const,
  subjects: ["subjects"] as const,
} as const

export function getGradesQueryOptions() {
  return {
    queryKey: queryKeys.grades,
    queryFn: async () => {
      const { data } = await gradesApi.list(0, 100)
      return data
    },
  }
}

export function getSubjectsQueryOptions() {
  return {
    queryKey: queryKeys.subjects,
    queryFn: async () => {
      const { data } = await subjectsApi.list(0, 500)
      return data
    },
  }
}
