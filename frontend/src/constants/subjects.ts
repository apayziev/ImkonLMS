import type { LucideIcon } from "lucide-react"
import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Languages,
  Laptop,
  Leaf,
  Microscope,
  Music,
  Palette,
  Scroll,
} from "lucide-react"

export const ICON_OPTIONS = [
  { value: "calculator", label: "Matematika" },
  { value: "atom", label: "Fizika" },
  { value: "flask", label: "Kimyo" },
  { value: "leaf", label: "Biologiya" },
  { value: "language", label: "Tillar" },
  { value: "book", label: "Kitob" },
  { value: "scroll", label: "Tarix" },
  { value: "globe", label: "Geografiya" },
  { value: "laptop", label: "Informatika" },
  { value: "microscope", label: "Fan" },
  { value: "palette", label: "San'at" },
  { value: "music", label: "Musiqa" },
] as const

export const SUBJECT_ICON_MAP: Record<string, LucideIcon> = {
  calculator: Calculator,
  atom: Atom,
  flask: FlaskConical,
  leaf: Leaf,
  language: Languages,
  book: BookOpen,
  scroll: Scroll,
  globe: Globe,
  laptop: Laptop,
  microscope: Microscope,
  palette: Palette,
  music: Music,
}

export function getSubjectIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return BookOpen
  return SUBJECT_ICON_MAP[iconName.toLowerCase()] || BookOpen
}

export const COLOR_OPTIONS = [
  { value: "#4B0924", label: "Maroon" },
  { value: "#FF3B47", label: "Qizil" },
  { value: "#321A94", label: "Binafsha" },
  { value: "#6720FF", label: "Yorqin binafsha" },
  { value: "#0D735B", label: "Teal" },
  { value: "#00A27D", label: "Yashil" },
] as const

export const DEFAULT_SUBJECT_COLORS = [
  "#FF3B47",
  "#6720FF",
  "#00A27D",
  "#321A94",
  "#0D735B",
  "#4B0924",
] as const

export function getSubjectColor(subject: {
  id: number
  color?: string | null
}): string {
  if (subject.color) return subject.color
  return DEFAULT_SUBJECT_COLORS[subject.id % DEFAULT_SUBJECT_COLORS.length]
}

export type IconOption = (typeof ICON_OPTIONS)[number]["value"]
export type ColorOption = (typeof COLOR_OPTIONS)[number]["value"]
