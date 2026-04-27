import { isParentDomain } from "@/lib/subdomain"

export const API = {
  baseUrl: import.meta.env.VITE_API_URL || "",
  timeout: 30000,
} as const

export const AUTH = {
  loginPath: "/login",
  get parentLoginPath() {
    return isParentDomain() ? "/login" : "/parent/login"
  },
} as const

export const TMS = {
  origin: import.meta.env.VITE_TMS_ORIGIN || "https://tms.imkonschool.uz",
} as const
