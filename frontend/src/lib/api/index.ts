/**
 * Barrel for the domain-split API modules. Existing callers use
 * `import { ... } from "@/lib/api"` — this re-export keeps them working.
 *
 * Canonical homes:
 *   client.ts          axios instances, silentRefresh, validated, types
 *   auth.ts            loginApi, logoutApi, usersApi, LoginRequest
 *   grades.ts          gradesApi + GradeRead / GradeList
 *   subjects.ts        subjectsApi + SubjectRead / SubjectList
 *   teachers.ts        teachersApi + TeacherRead / TeacherList
 *   students.ts        studentsApi + StudentRead / StudentList
 *   academic-years.ts  academicYearsApi + AcademicYearRead
 *   timetable.ts       timetableApi + SchoolSettings*, TimeSlot*, ScheduleEntry*
 *   lessons.ts         lessonsApi + plan/session/attendance/teacher-stats types
 *   quarters.ts        quartersApi + QuarterRead / QuarterCreate / QuarterList
 *   tms.ts             tmsApi + TMSTokenResponse
 *   parent.ts          parentApi + Child* types, ParentLoginRequest
 *   sync.ts            syncApi
 *   config.ts          configApi + AppConfigRead
 *   stats.ts           statsApi + DashboardStats
 */

export type {
  ParentChildRead,
  ParentMeRead,
  ParentTokenResponse,
  TokenResponse,
  UserRead,
} from "@/lib/authSchemas"

export {
  api,
  arrayParamsSerializer,
  type AttendanceStatus,
  parentAxiosInstance,
  type SessionStatus,
  setUnauthorizedHandler,
  silentRefresh,
  validated,
} from "./client"
export { default } from "./client-default"

export * from "./academic-years"
export * from "./auth"
export * from "./config"
export * from "./grades"
export * from "./lessons"
export * from "./parent"
export * from "./quarters"
export * from "./stats"
export * from "./students"
export * from "./subjects"
export * from "./sync"
export * from "./teachers"
export * from "./timetable"
export * from "./tms"
