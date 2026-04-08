import { useState } from "react"

import useParentAuth from "@/hooks/useParentAuth"
import type { ParentChildRead } from "@/lib/api"

export function useSelectedChild() {
  const { parent } = useParentAuth()
  const children = parent?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState<number>(
    children[0]?.id ?? 0,
  )

  const selectedChild: ParentChildRead | null =
    children.find((c) => c.id === selectedChildId) ?? null

  return { children, selectedChildId, setSelectedChildId, selectedChild, parent }
}
