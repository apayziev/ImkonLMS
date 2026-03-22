import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  Edit,
  GraduationCap,
  MoreHorizontal,
  Trash2,
  Users,
} from "lucide-react"
import { Suspense, useState } from "react"
import { type GradeRead } from "@/lib/api"
import { AnimatedNumber } from "@/components/Common/AnimatedNumber"
import {
  PatternCard,
  PatternCardContent,
  PatternCardHeader,
  PatternCardTitle,
} from "@/components/Common/PatternCard"
import { AddGrade } from "@/components/Grades/AddGrade"
import { DeleteGrade } from "@/components/Grades/DeleteGrade"
import { EditGrade } from "@/components/Grades/EditGrade"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import useAuth from "@/hooks/useAuth"
import { getGradesQueryOptions } from "@/hooks/useQueryOptions"

const PATTERN_GREEN = "/images/patterns/Patterns-03.png"

export const Route = createFileRoute("/_layout/grades")({
  component: GradesPage,
  head: () => ({
    meta: [{ title: "Sinflar - IMKON LMS" }],
  }),
})

function GradesContentSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function GradesContent({ isAdmin }: { isAdmin: boolean }) {
  const [editingGrade, setEditingGrade] = useState<GradeRead | null>(null)
  const [deletingGrade, setDeletingGrade] = useState<GradeRead | null>(null)

  const { data: grades } = useSuspenseQuery(getGradesQueryOptions())

  if (grades.data.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Hozircha hech qanday sinf qo'shilmagan
          </p>
        </CardContent>
      </Card>
    )
  }

  const gradesByLevel = grades.data.reduce(
    (acc, grade) => {
      const level = grade.level
      if (!acc[level]) acc[level] = []
      acc[level].push(grade)
      return acc
    },
    {} as Record<number, GradeRead[]>,
  )

  const sortedLevels = Object.keys(gradesByLevel)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <PatternCard>
          <PatternCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <PatternCardTitle className="text-base font-medium">
              Jami sinflar
            </PatternCardTitle>
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
          </PatternCardHeader>
          <PatternCardContent>
            <AnimatedNumber
              value={grades.count}
              className="text-3xl font-bold"
            />
          </PatternCardContent>
        </PatternCard>

        <PatternCard>
          <PatternCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <PatternCardTitle className="text-base font-medium">
              Darajalar
            </PatternCardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </PatternCardHeader>
          <PatternCardContent>
            <AnimatedNumber
              value={sortedLevels.length}
              className="text-3xl font-bold"
            />
            <p className="text-sm text-muted-foreground">ta turli daraja</p>
          </PatternCardContent>
        </PatternCard>
      </div>

      {/* Compact Grades Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Sinflar ro'yxati</CardTitle>
          <CardDescription>Darajalar bo'yicha guruhlangan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedLevels.map((level) => {
              const levelGrades = gradesByLevel[level]
              const levelName = level === 0 ? "Bog'cha" : `${level}-sinf`

              return (
                <div
                  key={level}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-primary/5 hover:shadow-sm hover:border-primary/20 transition-colors relative overflow-hidden"
                >
                  <div
                    className="absolute -top-2 -right-2 w-20 h-20 opacity-[0.08] pointer-events-none"
                    style={{
                      backgroundImage: `url(${PATTERN_GREEN})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {level === 0 ? "K" : level}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{levelName}</p>
                      <p className="text-xs text-muted-foreground">
                        {levelGrades.length} ta bo'lim
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[120px] relative z-10">
                    {levelGrades
                      .sort((a, b) =>
                        (a.section || "").localeCompare(b.section || ""),
                      )
                      .map((grade) => (
                        <Badge
                          key={grade.id}
                          variant="secondary"
                          className="text-xs px-2 py-0.5"
                        >
                          {grade.section}
                        </Badge>
                      ))}
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <AddGrade defaultLevel={level} variant="compact" />
                        <DropdownMenuSeparator />
                        {levelGrades.map((grade) => {
                          const sectionName =
                            level === 0
                              ? `Bog'cha ${grade.section}`
                              : `${level}-${grade.section}`
                          return (
                            <div
                              key={grade.id}
                              className="flex items-center px-2 py-1 gap-1"
                            >
                              <span className="text-sm font-medium w-16">
                                {sectionName}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditingGrade(grade)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeletingGrade(grade)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingGrade && (
        <EditGrade
          grade={editingGrade}
          open={!!editingGrade}
          onOpenChange={(open) => !open && setEditingGrade(null)}
        />
      )}

      {/* Delete Dialog */}
      {deletingGrade && (
        <DeleteGrade
          grade={deletingGrade}
          open={!!deletingGrade}
          onOpenChange={(open) => !open && setDeletingGrade(null)}
        />
      )}
    </>
  )
}

function GradesPage() {
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.is_superuser

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sinflar</h1>
          <p className="text-muted-foreground">
            Maktab sinflari va o'quvchilar soni
          </p>
        </div>
        {isAdmin && <AddGrade />}
      </div>

      <Suspense fallback={<GradesContentSkeleton />}>
        <GradesContent isAdmin={isAdmin || false} />
      </Suspense>
    </div>
  )
}
