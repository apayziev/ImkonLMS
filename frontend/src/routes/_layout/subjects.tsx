import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Suspense, useState } from "react"
import { type SubjectRead } from "@/lib/api"
import { PatternCard, PatternCardHeader } from "@/components/Common/PatternCard"
import { AddSubject, DeleteSubject, EditSubject } from "@/components/Subjects"
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSubjectColor, getSubjectIcon } from "@/constants/subjects"
import useAuth from "@/hooks/useAuth"
import { getSubjectsQueryOptions } from "@/hooks/useQueryOptions"

export const Route = createFileRoute("/_layout/subjects")({
  component: SubjectsPage,
})

function SubjectsContentSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-5 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SubjectsContent({ canManage }: { canManage: boolean }) {
  const [editSubject, setEditSubject] = useState<SubjectRead | null>(null)
  const [deleteSubject, setDeleteSubject] = useState<SubjectRead | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const { data: subjects } = useSuspenseQuery(getSubjectsQueryOptions())

  const filteredSubjects = subjects.data.filter((subject: SubjectRead) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      subject.name.toLowerCase().includes(query) ||
      subject.name_uz?.toLowerCase().includes(query)
    )
  })

  if (subjects.data.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Hozircha hech qanday fan qo'shilmagan
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {subjects.data.length > 10 && (
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Fan qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          {searchQuery && (
            <span className="text-sm text-muted-foreground">
              {filteredSubjects.length} ta topildi
            </span>
          )}
        </div>
      )}

      <div
        className={`grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${subjects.data.length > 20 ? "max-h-[600px] overflow-y-auto pr-2" : ""}`}
      >
        {filteredSubjects.map((subject: SubjectRead) => {
          const displayName = subject.name_uz || subject.name
          const IconComponent = getSubjectIcon(subject.icon)
          const color = getSubjectColor(subject)

          return (
            <PatternCard
              key={subject.id}
              className="hover:bg-primary/5 hover:shadow-sm hover:border-primary/20 transition-colors"
            >
              <PatternCardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <IconComponent className="h-4 w-4" style={{ color }} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {displayName}
                      </CardTitle>
                      {subject.name_uz && subject.name !== subject.name_uz && (
                        <CardDescription className="text-xs">
                          {subject.name}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditSubject(subject)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteSubject(subject)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          O'chirish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {!canManage && (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </div>
              </PatternCardHeader>
            </PatternCard>
          )
        })}
      </div>

      {editSubject && (
        <EditSubject
          subject={editSubject}
          open={!!editSubject}
          onOpenChange={(open) => !open && setEditSubject(null)}
        />
      )}

      {deleteSubject && (
        <DeleteSubject
          subject={deleteSubject}
          open={!!deleteSubject}
          onOpenChange={(open) => !open && setDeleteSubject(null)}
        />
      )}
    </>
  )
}

function SubjectsPage() {
  const { user: currentUser } = useAuth()
  const canManage = currentUser?.is_superuser

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fanlar</h1>
          <p className="text-muted-foreground">
            O'quv fanlari ro'yxati
          </p>
        </div>
        {canManage && <AddSubject />}
      </div>

      <Suspense fallback={<SubjectsContentSkeleton />}>
        <SubjectsContent canManage={canManage || false} />
      </Suspense>
    </div>
  )
}
