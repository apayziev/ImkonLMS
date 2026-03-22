import { z } from "zod"

export const subjectFormSchema = z.object({
  name: z.string().min(1, "Fan nomi kiritilishi shart"),
  name_uz: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

export type SubjectFormData = z.infer<typeof subjectFormSchema>

export const SUBJECT_DEFAULTS: SubjectFormData = {
  name: "",
  name_uz: "",
  icon: "book",
  color: "#FF3B47",
}

export function getSubjectEditDefaults(subject: {
  name: string
  name_uz?: string | null
  icon?: string | null
  color?: string | null
}): SubjectFormData {
  return {
    name: subject.name,
    name_uz: subject.name_uz || "",
    icon: subject.icon || "book",
    color: subject.color || "#FF3B47",
  }
}
