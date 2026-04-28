/**
 * Single source for Uzbek calendar locale.
 *
 * Weekday arrays are Sun-first to match `Date.prototype.getDay()` indexing,
 * so callers can do `UZ_WEEKDAYS_SHORT[d.getDay()]` directly. For Mon-first
 * grids (like the calendar header) use the explicit `*_MON_FIRST` variant.
 */

export const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
] as const

export const UZ_MONTHS_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
] as const

export const UZ_MONTHS_LOWER = UZ_MONTHS.map((m) => m.toLowerCase())

export const UZ_WEEKDAYS_FULL = [
  "Yakshanba", "Dushanba", "Seshanba", "Chorshanba",
  "Payshanba", "Juma", "Shanba",
] as const

export const UZ_WEEKDAYS_SHORT = [
  "Ya", "Du", "Se", "Cho", "Pa", "Ju", "Sha",
] as const

export const UZ_WEEKDAYS_SHORT_MON_FIRST = [
  "Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya",
] as const
