import type { QueryClient } from "@tanstack/react-query"
import { redirect } from "@tanstack/react-router"

import { type UserRead, usersApi } from "@/lib/api"

const CURRENT_USER_KEY = ["currentUser"]
const TEACHER_HOME = "/lessons"
const DEFAULT_HOME = "/"

const fetchCurrentUser = (queryClient: QueryClient) =>
  queryClient.ensureQueryData<UserRead>({
    queryKey: CURRENT_USER_KEY,
    queryFn: async () => (await usersApi.me()).data,
    staleTime: 5 * 60_000,
  })

type GuardCtx = { context: { queryClient: QueryClient } }

/**
 * `beforeLoad` factory — bounce users whose role isn't in `allowed`.
 * Unauthenticated/fetch-failure cases fall through to the parent /_layout
 * login redirect.
 */
const requireRoles = (allowed: ReadonlyArray<string>, fallback = DEFAULT_HOME) =>
  async ({ context }: GuardCtx) => {
    const user = await fetchCurrentUser(context.queryClient).catch(() => null)
    if (!user) return
    if (!allowed.includes(user.role) && !user.is_superuser) {
      throw redirect({ to: user.role === "teacher" ? TEACHER_HOME : fallback })
    }
  }

export const requireAdmin = requireRoles(["admin", "academic_head"])
export const requireTeacherOrAdmin = requireRoles([
  "admin",
  "academic_head",
  "teacher",
])
