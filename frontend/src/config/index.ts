/**
 * Application configuration
 */

export const API = {
  baseUrl: import.meta.env.VITE_API_URL || "",
  timeout: 30000,
} as const

export const AUTH = {
  tokenKey: "access_token",
  loginPath: "/login",
} as const
