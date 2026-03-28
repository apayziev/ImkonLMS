export const UZ_WEEKDAYS_SHORT = ["Ya", "Du", "Se", "Cho", "Pa", "Ju", "Sha"]

export const UZ_WEEKDAYS_FULL = [
  "Yakshanba", "Dushanba", "Seshanba", "Chorshanba",
  "Payshanba", "Juma", "Shanba",
]

export const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
]

export const LESSON_TYPES = [
  { value: "new_topic", label: "Yangi mavzu" },
  { value: "reinforcement", label: "Mustahkamlash" },
  { value: "assessment", label: "Nazorat" },
  { value: "practical", label: "Amaliy" },
] as const

export const ATTENDANCE_OPTIONS = [
  { value: "present", label: "Keldi", color: "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal-dark)] border-[var(--imkon-teal)]/40" },
  { value: "excused", label: "Sababli", color: "bg-[var(--imkon-purple)]/10 text-[var(--imkon-purple-dark)] border-[var(--imkon-purple)]/30" },
  { value: "unexcused", label: "Sababsiz", color: "bg-[var(--imkon-red)]/10 text-[var(--imkon-red)] border-[var(--imkon-red)]/30" },
] as const

export const GRADES = [5, 4, 3, 2, 1] as const
