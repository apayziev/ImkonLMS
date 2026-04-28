import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type PatternType = "green" | "purple" | "maroon"

const PATTERN_MAP: Record<PatternType, string> = {
  green: "/images/patterns/Patterns-03.png",
  purple: "/images/patterns/Patterns-02.png",
  maroon: "/images/patterns/Patterns-01.png",
}

interface PatternCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  pattern?: PatternType
}

export function PatternCard({ children, className, onClick, pattern = "green" }: PatternCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)} onClick={onClick}>
      <div
        className="absolute -top-4 -right-4 w-28 h-28 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `url(${PATTERN_MAP[pattern]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {children}
    </Card>
  )
}

export function PatternCardHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <CardHeader className={cn("relative z-10", className)}>{children}</CardHeader>
}

export function PatternCardContent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <CardContent className={cn("relative z-10", className)}>{children}</CardContent>
}

export function PatternCardTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <CardTitle className={cn(className)}>{children}</CardTitle>
}
