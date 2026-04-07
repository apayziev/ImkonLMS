import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { AxiosError } from "axios"
import { toast } from "sonner"

import { AUTH } from "@/config"
import {
  type ParentLoginRequest,
  type ParentMeRead,
  parentApi,
} from "@/lib/api"

export const isParentLoggedIn = () => {
  return localStorage.getItem(AUTH.parentTokenKey) !== null
}

const useParentAuth = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: parent, isLoading } = useQuery<ParentMeRead>({
    queryKey: ["parentUser"],
    queryFn: async () => {
      const { data } = await parentApi.me()
      return data
    },
    enabled: isParentLoggedIn(),
    staleTime: 5 * 60_000,
  })

  const loginMutation = useMutation({
    mutationFn: async (data: ParentLoginRequest) => {
      const { data: response } = await parentApi.login(data)
      localStorage.setItem(AUTH.parentTokenKey, response.access_token)
      return response
    },
    onSuccess: () => {
      navigate({ to: "/parent" })
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      toast.error("Xatolik!", {
        description: error.response?.data?.detail || "Tizimga kirish muvaffaqiyatsiz",
      })
    },
  })

  const logout = () => {
    localStorage.removeItem(AUTH.parentTokenKey)
    queryClient.removeQueries({ queryKey: ["parentUser"] })
    navigate({ to: AUTH.parentLoginPath })
  }

  return {
    loginMutation,
    logout,
    parent,
    isLoading,
  }
}

export default useParentAuth
