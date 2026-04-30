import * as React from "react"

const MOBILE_BREAKPOINT = 768

const readIsMobile = () =>
  typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT

export function useIsMobile() {
  // Initialize from the current viewport so the first paint matches the
  // device. The previous undefined → false → real-value flow caused a
  // visible layout shift on mobile (sidebar briefly rendering desktop).
  const [isMobile, setIsMobile] = React.useState<boolean>(readIsMobile)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(readIsMobile())
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
