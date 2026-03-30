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
  { value: "present", label: "Keldi", color: "bg-[var(--imkon-teal)] text-white border-[var(--imkon-teal)]", badgeClassName: "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal-dark)]", canHaveGrade: true },
  { value: "late", label: "Kech", color: "bg-amber-100 text-amber-600 border-amber-400", badgeClassName: "bg-amber-100 text-amber-700", canHaveGrade: true },
  { value: "absent", label: "Kelmadi", color: "bg-[var(--imkon-red)]/10 text-[var(--imkon-red)] border-[var(--imkon-red)]/60", badgeClassName: "bg-[var(--imkon-red)]/10 text-[var(--imkon-red)]", canHaveGrade: false },
] as const

export const GRADED_STATUSES = new Set(
  ATTENDANCE_OPTIONS.filter((o) => o.canHaveGrade).map((o) => o.value),
)

export const GRADES = [5, 4, 3, 2, 1] as const

export const SUGGESTED_KEYWORDS = [
  "nazariya", "amaliyot", "mustaqil ish", "guruh ishi",
  "taqdimot", "test", "loyiha", "ijodiy ish",
  "mashqlar", "misol yechish", "munozara", "tahlil",
  "takrorlash", "laboratoriya", "o'yin",
] as const
