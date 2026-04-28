import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { AUTH } from "@/config"
import {
  type ParentLoginRequest,
  type ParentMeRead,
  parentApi,
} from "@/lib/api"
import { getErrorDetail } from "@/lib/apiError"
import { tokenStore } from "@/lib/tokenStore"

export const isParentLoggedIn = () => tokenStore.get("parent") !== null

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
      tokenStore.set("parent", response.access_token)
      return response
    },
    onSuccess: () => {
      navigate({ to: "/parent" })
    },
    onError: (error) => {
      toast.error("Xatolik!", {
        description: getErrorDetail(error, "Tizimga kirish muvaffaqiyatsiz"),
      })
    },
  })

  const logout = () => {
    tokenStore.clear("parent")
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
