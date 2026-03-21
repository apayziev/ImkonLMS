/**
 * Application configuration
 */

export const ENV = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const

export const API = {
  baseUrl: import.meta.env.VITE_API_URL || "",
  timeout: 30000,
} as const

export const AUTH = {
  tokenKey: "access_token",
  loginPath: "/login",
} as const

export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100] as const,
} as const

export const APP = {
  name: "IMKON LMS",
  description: "IMKON Liderlar Maktabi — O'quv boshqaruv tizimi",
} as const
