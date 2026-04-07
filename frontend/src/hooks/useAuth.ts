import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { AxiosError } from "axios"

import { AUTH } from "@/config"
import {
  type UserRead,
  loginApi,
  logoutApi,
  usersApi,
} from "@/lib/api"
import useCustomToast from "./useCustomToast"

export const isLoggedIn = () => {
  return localStorage.getItem(AUTH.tokenKey) !== null
}

const useAuth = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const { data: user, isLoading } = useQuery<UserRead>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data } = await usersApi.me()
      return data
    },
    enabled: isLoggedIn(),
    staleTime: 5 * 60_000,
  })

  const createLoginMutation = (
    loginFn: (data: never) => Promise<{ data: { access_token: string } }>,
    errorMsg: string,
  ) =>
    useMutation({
      mutationFn: async (data: never) => {
        const { data: response } = await loginFn(data)
        localStorage.setItem(AUTH.tokenKey, response.access_token)
        return response
      },
      onSuccess: () => {
        navigate({ to: "/" })
      },
      onError: (error: AxiosError<{ detail?: string }>) => {
        showErrorToast(error.response?.data?.detail || errorMsg)
      },
    })

  const loginMutation = createLoginMutation(
    loginApi.login as never,
    "Tizimga kirish muvaffaqiyatsiz",
  )
  const loginStudentMutation = createLoginMutation(
    loginApi.loginStudent as never,
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
