import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { BookOpen, GraduationCap, Users, Users2 } from "lucide-react"

import { AnimatedNumber } from "@/components/Common/AnimatedNumber"
import {
  PatternCard,
  PatternCardContent,
  PatternCardHeader,
  PatternCardTitle,
} from "@/components/Common/PatternCard"
import useAuth from "@/hooks/useAuth"
import { getDashboardStatsQueryOptions } from "@/hooks/useQueryOptions"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth()
  const isTeacher = user?.role === "teacher"

  if (isTeacher) {
    return <Navigate to="/lessons" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Salom, {user?.full_name || user?.first_name || "Foydalanuvchi"} 👋
        </h1>
        <p className="text-muted-foreground">
          IMKON LMS — O'quv boshqaruv tizimi
        </p>
      </div>

      <AdminCards />
    </div>
  )
}

function AdminCards() {
  const { data, isLoading } = useQuery(getDashboardStatsQueryOptions())

  const cards = [
    {
      title: "O'quvchilar",
      value: data?.students ?? 0,
      description: "Jami o'quvchilar soni",
      icon: GraduationCap,
      color: "text-[#6720FF]",
    },
    {
      title: "O'qituvchilar",
      value: data?.teachers ?? 0,
      description: "Jami o'qituvchilar soni",
      icon: Users2,
      color: "text-[#00A27D]",
    },
    {
      title: "Fanlar",
      value: data?.subjects ?? 0,
      description: "Jami fanlar soni",
      icon: BookOpen,
      color: "text-[#FF3B47]",
    },
    {
      title: "Sinflar",
      value: data?.grades ?? 0,
      description: "Jami sinflar soni",
      icon: Users,
      color: "text-[#321A94]",
    },
  ]

  return <StatsGrid cards={cards} isLoading={isLoading} />
}

interface StatCard {
  title: string
  value: number
  description: string
  icon: React.ElementType
  color: string
}

function StatsGrid({
  cards,
  isLoading,
}: {
  cards: StatCard[]
  isLoading: boolean
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <PatternCard key={card.title}>
          <PatternCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <PatternCardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </PatternCardTitle>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </PatternCardHeader>
          <PatternCardContent>
            {isLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <AnimatedNumber
                value={card.value}
                className={`text-2xl font-bold ${card.color}`}
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </PatternCardContent>
        </PatternCard>
      ))}
    </div>
  )
}
