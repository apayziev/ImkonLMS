import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Calendar, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChildSelector } from "@/components/Common/ChildSelector"
import { useSelectedChild } from "@/hooks/useSelectedChild"
import { parentApi } from "@/lib/api"

export const Route = createFileRoute("/parent/_parent/homework")({
  component: HomeworkPage,
  head: () => ({
    meta: [{ title: "Uyga vazifa - Ota-ona paneli" }],
  }),
})

function HomeworkPage() {
  const { children, selectedChildId, setSelectedChildId } = useSelectedChild()

  const { data, isLoading } = useQuery({
    queryKey: ["parent-homework-full", selectedChildId],
    queryFn: async () => {
      const { data } = await parentApi.homework(selectedChildId, 50)
      return data
    },
    enabled: selectedChildId > 0,
  })

  const items = data?.items ?? []

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date(new Date().toDateString())
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Uyga vazifa</h1>
          <p className="text-muted-foreground text-sm">Farzandingizga berilgan vazifalar</p>
        </div>

        <ChildSelector children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="size-12 mx-auto mb-3 opacity-50" />
            <p>Uyga vazifalar topilmadi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    {item.subject_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {item.homework_deadline && (
                      <Badge
                        variant={isOverdue(item.homework_deadline) ? "destructive" : "secondary"}
                        className="gap-1"
                      >
                        <Calendar className="size-3" />
                        {new Date(item.homework_deadline).toLocaleDateString("uz-UZ")}
                        {isOverdue(item.homework_deadline) && " (muddati o'tgan)"}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(item.plan_date).toLocaleDateString("uz-UZ")}
                  </span>
                  {item.teacher_name && (
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {item.teacher_name}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {item.topic && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Mavzu:</span> {item.topic}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{item.homework}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
