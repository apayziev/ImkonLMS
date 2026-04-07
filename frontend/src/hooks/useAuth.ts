import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { AxiosError } from "axios"
import { toast } from "sonner"

import { AUTH } from "@/config"
import {
  type UserRead,
  loginApi,
  logoutApi,
  usersApi,
} from "@/lib/api"

export const isLoggedIn = () => {
  return localStorage.getItem(AUTH.tokenKey) !== null
}

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

  const createLoginMutation = <T,>(
    loginFn: (data: T) => Promise<{ data: { access_token: string } }>,
    errorMsg: string,
  ) =>
    useMutation({
      mutationFn: async (data: T) => {
        const { data: response } = await loginFn(data)
        localStorage.setItem(AUTH.tokenKey, response.access_token)
        return response
      },
      onSuccess: () => {
        navigate({ to: "/" })
      },
      onError: (error: AxiosError<{ detail?: string }>) => {
        toast.error("Xatolik yuz berdi!", {
          description: error.response?.data?.detail || errorMsg,
        })
      },
    })

  const loginMutation = createLoginMutation(
    loginApi.login,
    "Tizimga kirish muvaffaqiyatsiz",
  )
  const loginStudentMutation = createLoginMutation(
    loginApi.loginStudent,
    "O'quvchi kirishda xatolik",
  )

  const logout = async () => {
    try {
      await logoutApi.logout()
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem(AUTH.tokenKey)
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
