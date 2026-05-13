import type { GradeRead } from "@/lib/api"

/**
 * Sort grades by (level asc, section asc). Returns a new array; original
 * is not mutated. Used by every grade-picker UI so the order stays
 * consistent.
 */
export function sortGrades(grades: readonly GradeRead[]): GradeRead[] {
  return [...grades].sort((a, b) =>
    a.level !== b.level ? a.level - b.level : a.section.localeCompare(b.section),
  )
}
