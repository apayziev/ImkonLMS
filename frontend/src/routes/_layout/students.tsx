import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Edit, MoreHorizontal, Search, Trash2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import type { GradeRead, StudentRead } from "@/lib/api"
import { studentsApi } from "@/lib/api"
import { AddStudent } from "@/components/Students/AddStudent"
import { EditStudent } from "@/components/Students/EditStudent"
import { DeleteStudent } from "@/components/Students/DeleteStudent"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useAuth from "@/hooks/useAuth"
import { getGradesQueryOptions } from "@/hooks/useQueryOptions"

export const Route = createFileRoute("/_layout/students")({
  component: StudentsPage,
  head: () => ({
    meta: [{ title: "O'quvchilar - IMKON LMS" }],
  }),
})

const ALL_GRADES_VALUE = "__all__"

function StudentsPage() {
  const { user } = useAuth()
  const isAdmin = user?.is_superuser

  const [search, setSearch] = useState("")
  const [gradeFilter, setGradeFilter] = useState<string>(ALL_GRADES_VALUE)
  const [editStudent, setEditStudent] = useState<StudentRead | null>(null)
  const [deleteStudent, setDeleteStudent] = useState<StudentRead | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const { data: gradesData } = useQuery(getGradesQueryOptions())
  const grades: GradeRead[] = gradesData?.data ?? []

  const gradeId = gradeFilter !== ALL_GRADES_VALUE ? Number(gradeFilter) : undefined

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students", { grade_id: gradeId, search: debouncedSearch || undefined }],
    queryFn: async () => {
      const { data } = await studentsApi.list({
        limit: 200,
        grade_id: gradeId,
        search: debouncedSearch || undefined,
      })
      return data
    },
  })

  const students = studentsData?.data ?? []
  const totalCount = studentsData?.count ?? 0

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">O'quvchilar</h1>
          <p className="text-muted-foreground">
            Jami {totalCount} ta o'quvchi
          </p>
        </div>
        {isAdmin && <AddStudent grades={grades} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jami o'quvchilar
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Erkaklar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((s) => s.gender === "male").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ayollar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((s) => s.gender === "female").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ism, familiya yoki hujjat raqami"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Barcha sinflar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GRADES_VALUE}>Barcha sinflar</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id.toString()}>
                {g.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>O'quvchi</TableHead>
                <TableHead>Hujjat raqami</TableHead>
                <TableHead>Sinf</TableHead>
                <TableHead>Jinsi</TableHead>
                <TableHead>Tug'ilgan sana</TableHead>
                <TableHead>Ota-ona</TableHead>
                {isAdmin && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    Yuklanmoqda...
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    {search || gradeFilter !== ALL_GRADES_VALUE
                      ? "Hech qanday o'quvchi topilmadi"
                      : "Hali o'quvchi qo'shilmagan"}
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student, i) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.full_name}</p>
                        {student.student_id && (
                          <p className="text-xs text-muted-foreground">{student.student_id}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{student.document_id}</TableCell>
                    <TableCell>
                      {student.grade_name ? (
                        <Badge variant="secondary">{student.grade_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.gender === "male" ? "Erkak" : student.gender === "female" ? "Ayol" : "—"}
                    </TableCell>
                    <TableCell>
                      {student.birth_date ?? "—"}
                      {student.age != null && (
                        <span className="text-muted-foreground text-xs ml-1">({student.age})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.father_name || student.mother_name ? (
                        <div className="text-sm">
                          {student.father_name && <p>{student.father_name}</p>}
                          {student.mother_name && (
                            <p className="text-muted-foreground">{student.mother_name}</p>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditStudent(student)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteStudent(student)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {editStudent && (
        <EditStudent
          student={editStudent}
          grades={grades}
          open={!!editStudent}
          onOpenChange={(open) => !open && setEditStudent(null)}
        />
      )}
      {deleteStudent && (
        <DeleteStudent
          student={deleteStudent}
          open={!!deleteStudent}
          onOpenChange={(open) => !open && setDeleteStudent(null)}
        />
      )}
    </div>
  )
}

// Simple debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debounced
}
