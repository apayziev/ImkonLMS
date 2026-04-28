import { useEffect, useState } from "react"

import useParentAuth from "@/hooks/useParentAuth"
import type { ParentChildRead } from "@/lib/api"

export function useSelectedChild() {
  const { parent } = useParentAuth()
  const children = parent?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState<number>(0)

  // Default to first child once children load (parent.me is async).
  useEffect(() => {
    if (selectedChildId !== 0) return
    const first = children[0]?.id
    if (first) setSelectedChildId(first)
  }, [children, selectedChildId])

  const selectedChild: ParentChildRead | null =
    children.find((c) => c.id === selectedChildId) ?? null

  return { children, selectedChildId, setSelectedChildId, selectedChild, parent }
}
