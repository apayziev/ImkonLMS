import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardList,
  GraduationCap,
  Shield,
  XCircle,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChildSelector } from "@/components/Common/ChildSelector"
import { useSelectedChild } from "@/hooks/useSelectedChild"
import { parentApi, type ParentChildRead } from "@/lib/api"
import { getInitials } from "@/lib/utils"

export const Route = createFileRoute("/parent/_parent/")({
  component: ParentDashboard,
  head: () => ({
    meta: [{ title: "Ota-ona paneli - IMKON LMS" }],
  }),
})

function ParentDashboard() {
  const { children, selectedChildId, setSelectedChildId, selectedChild, parent } = useSelectedChild()

  if (!parent) return null

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Assalomu alaykum, {parent.name}!
        </h1>
        <p className="text-muted-foreground text-sm">
          Farzandingiz haqida ma'lumotlar
        </p>
      </div>

      <ChildSelector children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} showGrade className="w-full sm:w-72" />

      {selectedChild && <ChildOverview child={selectedChild} />}
    </div>
  )
}

function ChildOverview({ child }: { child: ParentChildRead }) {
  // Fetch recent attendance
  const { data: attendance } = useQuery({
    queryKey: ["parent-attendance", child.id],
    queryFn: async () => {
      const { data } = await parentApi.attendance(child.id)
      return data
    },
  })

  // Fetch homework
  const { data: homework } = useQuery({
    queryKey: ["parent-homework", child.id],
    queryFn: async () => {
      const { data } = await parentApi.homework(child.id, 5)
      return data
    },
  })

  // Fetch discipline
  const { data: discipline } = useQuery({
    queryKey: ["parent-discipline", child.id],
    queryFn: async () => {
      const { data } = await parentApi.discipline(child.id)
      return data
    },
  })

  const summary = attendance?.summary

  return (
    <div className="space-y-6">
      {/* Child info card */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="size-16">
            <AvatarImage src={child.photo_url || undefined} />
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {getInitials(child.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{child.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {child.grade_display && (
                <Badge variant="secondary" className="gap-1">
                  <GraduationCap className="size-3" />
                  {child.grade_display}
                </Badge>
              )}
              <Badge variant={child.is_frozen ? "destructive" : child.is_active ? "default" : "secondary"}>
                {child.is_frozen ? "Muzlatilgan" : child.is_active ? "Faol" : "Nofaol"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/parent/attendance" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-green-600" />
                Kelgan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{summary?.present ?? 0}</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/parent/attendance" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Clock className="size-4 text-yellow-600" />
                Kechikkan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{summary?.late ?? 0}</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/parent/attendance" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <XCircle className="size-4 text-red-600" />
                Kelmagan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{summary?.absent ?? 0}</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/parent/discipline" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Shield className="size-4 text-orange-600" />
                Qoidabuzarlik
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {discipline?.total_violation_points ?? 0} ball
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/parent/attendance">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-5 text-primary" />
                Davomat
              </CardTitle>
              <CardDescription>
                Jami {summary?.total ?? 0} ta dars qayd etilgan
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/parent/homework">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="size-5 text-primary" />
                Uyga vazifa
              </CardTitle>
              <CardDescription>
                {homework?.items.length ?? 0} ta vazifa mavjud
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/parent/timetable">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-5 text-primary" />
                Dars jadvali
              </CardTitle>
              <CardDescription>
                Haftalik dars jadvali
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
