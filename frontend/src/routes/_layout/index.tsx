import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, GraduationCap, Users, Users2 } from "lucide-react"

import { AnimatedNumber } from "@/components/Common/AnimatedNumber"
import {
  PatternCard,
  PatternCardContent,
  PatternCardHeader,
  PatternCardTitle,
} from "@/components/Common/PatternCard"
import useAuth from "@/hooks/useAuth"
import { getGradesQueryOptions, getSubjectsQueryOptions } from "@/hooks/useQueryOptions"
import { studentsApi, teachersApi } from "@/lib/api"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth()

  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["dashboard-students"],
    queryFn: async () => {
      const { data } = await studentsApi.list({ limit: 1 })
      return data
    },
  })

  const { data: teachersData, isLoading: loadingTeachers } = useQuery({
    queryKey: ["dashboard-teachers"],
    queryFn: async () => {
      const { data } = await teachersApi.list({ limit: 1 })
      return data
    },
  })

  const { data: gradesData, isLoading: loadingGrades } = useQuery(getGradesQueryOptions())
  const { data: subjectsData, isLoading: loadingSubjects } = useQuery(getSubjectsQueryOptions())

  const cards = [
    {
      title: "O'quvchilar",
      value: studentsData?.count ?? 0,
      description: "Jami o'quvchilar soni",
      icon: GraduationCap,
      color: "text-[#6720FF]",
      isLoading: loadingStudents,
    },
    {
      title: "O'qituvchilar",
      value: teachersData?.count ?? 0,
      description: "Jami o'qituvchilar soni",
      icon: Users2,
      color: "text-[#00A27D]",
      isLoading: loadingTeachers,
    },
    {
      title: "Fanlar",
      value: subjectsData?.count ?? 0,
      description: "Jami fanlar soni",
      icon: BookOpen,
      color: "text-[#FF3B47]",
      isLoading: loadingSubjects,
    },
    {
      title: "Sinflar",
      value: gradesData?.count ?? 0,
      description: "Jami sinflar soni",
      icon: Users,
      color: "text-[#321A94]",
      isLoading: loadingGrades,
    },
  ]

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <PatternCard key={card.title}>
            <PatternCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <PatternCardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </PatternCardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </PatternCardHeader>
            <PatternCardContent>
              {card.isLoading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              ) : (
                <AnimatedNumber
                  value={card.value}
                  className={`text-2xl font-bold ${card.color}`}
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </PatternCardContent>
          </PatternCard>
        ))}
      </div>
    </div>
  )
}
