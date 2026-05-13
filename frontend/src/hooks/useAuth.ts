import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { AUTH } from "@/config"
import { loginApi, logoutApi, type UserRead, usersApi } from "@/lib/api"
import { getErrorDetail } from "@/lib/apiError"
import { tokenStore } from "@/lib/tokenStore"

export const isLoggedIn = () => tokenStore.get("admin") !== null

const useAuth = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery<UserRead>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data } = await usersApi.me()
      return data
    },
    enabled: isLoggedIn(),
    staleTime: 5 * 60_000,
  })

  const onLoginError = (fallback: string) => (error: unknown) => {
    toast.error("Xatolik yuz berdi!", {
      description: getErrorDetail(error, fallback),
    })
  }

  const persistToken = async <T>(
    loginFn: (data: T) => Promise<{ data: { access_token: string } }>,
    data: T,
  ) => {
    const { data: response } = await loginFn(data)
    tokenStore.set("admin", response.access_token)
    return response
  }

  const loginMutation = useMutation({
    mutationFn: (data: Parameters<typeof loginApi.login>[0]) =>
      persistToken(loginApi.login, data),
    onSuccess: () => {
      navigate({ to: "/" })
    },
    onError: onLoginError("Tizimga kirish muvaffaqiyatsiz"),
  })

  const loginStudentMutation = useMutation({
    mutationFn: (data: Parameters<typeof loginApi.loginStudent>[0]) =>
      persistToken(loginApi.loginStudent, data),
    onSuccess: () => {
      navigate({ to: "/" })
    },
    onError: onLoginError("O'quvchi kirishda xatolik"),
  })

  const logout = async () => {
    try {
      await logoutApi.logout()
    } catch {
      // Ignore logout errors
    }
    tokenStore.clear("admin")
    queryClient.removeQueries({ queryKey: ["currentUser"] })
    queryClient.clear()
    navigate({ to: AUTH.loginPath })
  }

  return {
    loginMutation,
    loginStudentMutation,
    logout,
    user,
    isLoading,
  }
}

export default useAuth
