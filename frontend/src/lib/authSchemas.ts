/**
 * Runtime schemas for auth-critical API responses.
 *
 * Why only auth: a silently-corrupted login or /me response means the user gets
 * stuck in a broken session. Catching shape drift loudly (parse → throw) here
 * is cheap insurance. Non-auth endpoints stay TS-typed only.
 */

import { z } from "zod"

export const userReadSchema = z.object({
  id: z.number(),
  document_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string().nullable(),
  birth_date: z.string().nullable(),
  photo_url: z.string().nullable(),
  phone_number: z.string().nullable(),
  is_active: z.boolean(),
  is_superuser: z.boolean(),
  role: z.string(),
  teaching_grade_ids: z.array(z.number()).nullable(),
  age: z.number().nullable(),
})

export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  user: userReadSchema,
})

const parentChildSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  photo_url: z.string().nullable(),
  grade_id: z.number().nullable(),
  grade_display: z.string().nullable(),
  is_active: z.boolean(),
  is_frozen: z.boolean(),
})

export const parentMeSchema = z.object({
  phone: z.string(),
  name: z.string(),
  children: z.array(parentChildSchema),
})

export const parentTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  parent: parentMeSchema,
})
