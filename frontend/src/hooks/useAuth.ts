import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { AxiosError } from "axios"

import { AUTH } from "@/config"
import {
  type LoginRequest,
  type StudentLoginRequest,
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

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const { data: response } = await loginApi.login(data)
      localStorage.setItem(AUTH.tokenKey, response.access_token)
      return response
    },
    onSuccess: () => {
      navigate({ to: "/" })
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      const message =
        error.response?.data?.detail || "Tizimga kirish muvaffaqiyatsiz"
      showErrorToast(message)
    },
  })

  const loginStudentMutation = useMutation({
    mutationFn: async (data: StudentLoginRequest) => {
      const { data: response } = await loginApi.loginStudent(data)
      localStorage.setItem(AUTH.tokenKey, response.access_token)
      return response
    },
    onSuccess: () => {
      navigate({ to: "/" })
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      const message =
        error.response?.data?.detail || "O'quvchi kirishda xatolik"
      showErrorToast(message)
    },
  })

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
