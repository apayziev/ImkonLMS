import { useEffect, useRef, useState } from "react"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>("idle")
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  const onMutate = () => {
    clearTimeout(timerRef.current)
    setStatus("saving")
  }

  const onSuccess = () => {
    setStatus("saved")
    timerRef.current = setTimeout(() => setStatus("idle"), 2000)
  }

  const onError = () => {
    setStatus("error")
  }

  return { status, onMutate, onSuccess, onError }
}
