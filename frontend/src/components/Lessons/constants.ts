export const LESSON_TYPES = [
  { value: "new_topic", label: "Yangi mavzu" },
  { value: "reinforcement", label: "Mustahkamlash" },
  { value: "assessment", label: "Nazorat" },
  { value: "practical", label: "Amaliy" },
] as const

export const ATTENDANCE_OPTIONS = [
  {
    value: "present",
    label: "Keldi",
    color: "bg-[var(--imkon-teal)] text-white border-[var(--imkon-teal)]",
    badgeClassName: "bg-[var(--imkon-teal)]/15 text-[var(--imkon-teal-dark)]",
    canHaveGrade: true,
  },
  {
    value: "late",
    label: "Kech",
    color: "bg-amber-400 text-white border-amber-400",
    badgeClassName: "bg-amber-100 text-amber-700",
    canHaveGrade: true,
  },
  {
    value: "absent",
    label: "Kelmadi",
    color: "bg-[var(--imkon-red)] text-white border-[var(--imkon-red)]",
    badgeClassName: "bg-[var(--imkon-red)]/10 text-[var(--imkon-red)]",
    canHaveGrade: false,
  },
] as const

export const PLAN_TOTAL_FIELDS = 8

export const RESOURCE_TYPES = [
  { value: "textbook", label: "Darslik" },
  { value: "handout", label: "Tarqatma material" },
  { value: "projector", label: "Proyektor" },
  { value: "whiteboard", label: "Doska" },
  { value: "video_audio", label: "Video/Audio" },
  { value: "internet", label: "Internet" },
  { value: "lab", label: "Laboratoriya" },
  { value: "posters", label: "Plakatlar" },
] as const

export const ASSESSMENT_METHODS = [
  { value: "oral", label: "Og'zaki" },
  { value: "written", label: "Yozma" },
  { value: "test", label: "Test" },
  { value: "project", label: "Loyiha" },
  { value: "practical", label: "Amaliy" },
  { value: "homework", label: "Uy vazifasi" },
] as const

export const BLOOM_LEVELS = [
  {
    value: "biladi",
    label: "Biladi",
    description: "Eslab qoladi, takrorlaydi",
  },
  {
    value: "tushunadi",
    label: "Tushunadi va qo'llaydi",
    description: "Amalda ishlatadi",
  },
  {
    value: "tahlil",
    label: "Tahlil qiladi",
    description: "Solishtiradi, baholaydi",
  },
] as const

export const SUGGESTED_KEYWORDS = [
  "nazariya",
  "amaliyot",
  "mustaqil ish",
  "guruh ishi",
  "taqdimot",
  "test",
  "loyiha",
  "ijodiy ish",
  "mashqlar",
  "misol yechish",
  "munozara",
  "tahlil",
  "takrorlash",
  "laboratoriya",
  "o'yin",
] as const
