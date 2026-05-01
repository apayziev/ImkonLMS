/**
 * Single source for Uzbek calendar locale.
 *
 * Weekday arrays are Sun-first to match `Date.prototype.getDay()` indexing,
 * so callers can do `UZ_WEEKDAYS_SHORT[d.getDay()]` directly. For Mon-first
 * grids (like the calendar header) use the explicit `*_MON_FIRST` variant.
 */

export const UZ_MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
] as const

export const UZ_MONTHS_SHORT = [
  "Yan",
  "Fev",
  "Mar",
  "Apr",
  "May",
  "Iyn",
  "Iyl",
  "Avg",
  "Sen",
  "Okt",
  "Noy",
  "Dek",
] as const

export const UZ_MONTHS_LOWER = UZ_MONTHS.map((m) => m.toLowerCase())

export const UZ_WEEKDAYS_FULL = [
  "Yakshanba",
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
] as const

export const UZ_WEEKDAYS_SHORT = [
  "Ya",
  "Du",
  "Se",
  "Cho",
  "Pa",
  "Ju",
  "Sha",
] as const

export const UZ_WEEKDAYS_SHORT_MON_FIRST = [
  "Du",
  "Se",
  "Cho",
  "Pa",
  "Ju",
  "Sha",
  "Ya",
] as const

/**
 * Backend `day_of_week` (1=Mon … 7=Sun) → full Uzbek name.
 * Use this instead of redefining `{ 1: "Dushanba", … }` in components.
 */
export const UZ_WEEKDAY_BY_DOW: Record<number, string> = {
  1: "Dushanba",
  2: "Seshanba",
  3: "Chorshanba",
  4: "Payshanba",
  5: "Juma",
  6: "Shanba",
  7: "Yakshanba",
}

/** Backend `day_of_week` (1=Mon … 7=Sun) → short Uzbek name. */
export const UZ_WEEKDAY_SHORT_BY_DOW: Record<number, string> = {
  1: "Dush",
  2: "Sesh",
  3: "Chor",
  4: "Pay",
  5: "Jum",
  6: "Shan",
  7: "Yak",
}
