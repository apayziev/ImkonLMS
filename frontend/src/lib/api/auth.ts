import {
  type TokenResponse,
  tokenResponseSchema,
  type UserRead,
  userReadSchema,
} from "@/lib/authSchemas"

import { api, validated } from "./client"

export interface LoginRequest {
  document_id: string
  password: string
}

export interface StudentLoginRequest {
  document_id: string
}

export const loginApi = {
  login: (data: LoginRequest) =>
    api
      .post<unknown>("/api/v1/login/", data)
      .then(validated<TokenResponse>(tokenResponseSchema)),

  loginStudent: (data: StudentLoginRequest) =>
    api
      .post<unknown>("/api/v1/login/student", data)
      .then(validated<TokenResponse>(tokenResponseSchema)),
}

export const usersApi = {
  me: () =>
    api
      .get<unknown>("/api/v1/users/me")
      .then(validated<UserRead>(userReadSchema)),
}

export const logoutApi = {
  logout: () => api.post("/api/v1/logout/"),
}
