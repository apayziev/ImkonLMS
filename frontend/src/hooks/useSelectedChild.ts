import { useEffect, useState } from "react"

import useParentAuth from "@/hooks/useParentAuth"
import type { ParentChildRead } from "@/lib/api"

export function useSelectedChild() {
  const { parent } = useParentAuth()
  const children = parent?.children ?? []
  const [selectedChildId, setSelectedChildId] = useState<number>(0)

  // Sync the selection to the current children list:
  //   - on first load, default to the first child;
  //   - if the selected child disappears (deleted/moved), fall back to the
  //     first remaining one (or 0 if the list is empty).
  useEffect(() => {
    const exists = children.some((c) => c.id === selectedChildId)
    if (!exists) setSelectedChildId(children[0]?.id ?? 0)
  }, [children, selectedChildId])

  const selectedChild: ParentChildRead | null =
    children.find((c) => c.id === selectedChildId) ?? null

  return {
    children,
    selectedChildId,
    setSelectedChildId,
    selectedChild,
    parent,
  }
}
