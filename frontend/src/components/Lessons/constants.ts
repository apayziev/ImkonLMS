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
  { value: "late", label: "Kech", color: "bg-amber-400 text-white border-amber-400", badgeClassName: "bg-amber-100 text-amber-700", canHaveGrade: true },
  { value: "absent", label: "Kelmadi", color: "bg-[var(--imkon-red)] text-white border-[var(--imkon-red)]", badgeClassName: "bg-[var(--imkon-red)]/10 text-[var(--imkon-red)]", canHaveGrade: false },
] as const

export const PLAN_TOTAL_FIELDS = 9

export const ASSESSMENT_METHODS = [
  { value: "oral", label: "Og'zaki so'rov" },
  { value: "written", label: "Yozma ish" },
  { value: "test", label: "Test" },
  { value: "project", label: "Loyiha" },
  { value: "observation", label: "Kuzatish" },
  { value: "self_assessment", label: "O'z-o'zini baholash" },
] as const




export const GRADES = [5, 4, 3, 2, 1] as const

export const SUGGESTED_KEYWORDS = [
  "nazariya", "amaliyot", "mustaqil ish", "guruh ishi",
  "taqdimot", "test", "loyiha", "ijodiy ish",
  "mashqlar", "misol yechish", "munozara", "tahlil",
  "takrorlash", "laboratoriya", "o'yin",
] as const
