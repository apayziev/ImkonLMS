import { redirect } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"

import { type UserRead, usersApi } from "@/lib/api"

const CURRENT_USER_KEY = ["currentUser"]
const TEACHER_HOME = "/lessons"

const fetchCurrentUser = (queryClient: QueryClient) =>
  queryClient.ensureQueryData<UserRead>({
    queryKey: CURRENT_USER_KEY,
    queryFn: async () => (await usersApi.me()).data,
    staleTime: 5 * 60_000,
  })

/**
 * `beforeLoad` guard that allows only admins/academic_head/superusers.
 * Teachers are bounced to /lessons. Anyone unauthenticated falls through to the
 * existing /_layout login redirect.
 */
export const requireAdmin = async ({
  context,
}: {
  context: { queryClient: QueryClient }
}) => {
  let user: UserRead
  try {
    user = await fetchCurrentUser(context.queryClient)
  } catch {
    return // /_layout beforeLoad already handles unauthenticated redirects.
  }
  if (user.role === "teacher") {
    throw redirect({ to: TEACHER_HOME })
  }
}

/**
 * `beforeLoad` guard that allows only teachers (and admins, who can view teacher
 * surfaces too). Students/parents land here by mistake → bounced home.
 */
export const requireTeacherOrAdmin = async ({
  context,
}: {
  context: { queryClient: QueryClient }
}) => {
  let user: UserRead
  try {
    user = await fetchCurrentUser(context.queryClient)
  } catch {
    return
  }
  if (user.role !== "teacher" && user.role !== "admin" && user.role !== "academic_head" && !user.is_superuser) {
    throw redirect({ to: "/" })
  }
}
