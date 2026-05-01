import { useEffect, useState } from "react"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Wait one frame so the initial styles paint, then trigger the transition.
    const id = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className="relative min-h-svh flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "var(--imkon-red)" }}
    >
      {/* Pattern Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/images/patterns/Patterns-01.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Top bar — logo + LMS badge */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 sm:px-10 sm:py-6 transition-all duration-500 ease-out ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}
      >
        <img
          src="/images/logo/imkon-logo-white.png"
          alt="IMKON"
          className="h-8 sm:h-10"
        />
        <div className="bg-white text-[var(--imkon-red)] px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg">
          <span className="text-xs sm:text-sm font-bold tracking-wide">
            LMS
          </span>
        </div>
      </div>

      {/* Floating Card */}
      <div
        className={`relative z-10 w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"}`}
      >
        {children}
      </div>

      {/* Bottom footer */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 text-center py-4 px-6 transition-all duration-500 ease-out delay-500 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
      >
        <p className="text-white/60 text-xs sm:text-sm">
          © {new Date().getFullYear()} IMKON Liderlar Maktabi
        </p>
      </div>
    </div>
  )
}
