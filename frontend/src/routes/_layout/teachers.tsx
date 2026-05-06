import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { GraduationCap, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { SearchInput } from "@/components/Common/SearchInput"
import { TablePagination } from "@/components/Common/TablePagination"
import { getPhotoUrl } from "@/components/Students/studentSchema"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getGradesQueryOptions } from "@/hooks/useQueryOptions"
import type { GradeRead, TeacherRead } from "@/lib/api"
import { teachersApi } from "@/lib/api"
import { requireAdmin } from "@/lib/routeGuards"
import { formatDate, getInitials } from "@/lib/utils"

export const Route = createFileRoute("/_layout/teachers")({
  beforeLoad: requireAdmin,
  component: TeachersPage,
  head: () => ({
    meta: [{ title: "O'qituvchilar - IMKON LMS" }],
  }),
})

function TeachersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const debouncedSearch = useDebouncedValue(searchQuery, 300)

  const { data: gradesData } = useQuery(getGradesQueryOptions())
  const grades: GradeRead[] = gradesData?.data ?? []

  const { data: teachersData, isLoading } = useQuery({
    queryKey: ["teachers", debouncedSearch, currentPage, pageSize],
    queryFn: async () => {
      const { data } = await teachersApi.list({
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
        search: debouncedSearch || undefined,
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const teachers = teachersData?.data ?? []
  const totalCount = teachersData?.count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  const getGradeName = (gradeId: number | null): string => {
    if (!gradeId) return "—"
    const grade = grades.find((g) => g.id === gradeId)
    return grade?.display_name || "—"
  }

  const gradeMap = useMemo(
    () => new Map(grades.map((g) => [g.id, g.display_name])),
    [grades],
  )

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          O'qituvchilar
          {totalCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
              {totalCount}
            </span>
          )}
        </h1>
        <p className="text-muted-foreground text-sm">
          O'qituvchilar ma'lumotlari
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Ism, familiya yoki hujjat raqami..."
          className="flex-1"
        />
        {searchQuery && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {totalCount} ta natija
          </span>
        )}
      </div>

      {/* Teachers Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                O'qituvchi
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Hujjat raqami
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Fanlar
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Dars beradi
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Sinf rahbari
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Tug'ilgan sana
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Holat
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-4">
                    <Skeleton className="h-4 w-8" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </td>
                </tr>
              ))
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    O'qituvchilar topilmadi
                  </p>
                </td>
              </tr>
            ) : (
              teachers.map((teacher: TeacherRead) => (
                <tr
                  key={teacher.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="p-4 align-middle">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={getPhotoUrl(teacher.photo_url)}
                          alt={teacher.full_name}
                        />
                        <AvatarFallback className="bg-[#6720FF] text-white text-sm">
                          {getInitials(teacher.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{teacher.full_name}</p>
                        {teacher.phone_number && (
                          <span className="text-xs text-muted-foreground">
                            {teacher.phone_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle font-mono text-sm text-muted-foreground">
                    {teacher.document_id}
                  </td>
                  <td className="p-4 align-middle">
                    {teacher.subjects && teacher.subjects.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {teacher.subjects.slice(0, 2).map((name, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {name}
                          </Badge>
                        ))}
                        {teacher.subjects.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{teacher.subjects.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 align-middle">
                    {teacher.teaching_grade_ids &&
                    teacher.teaching_grade_ids.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {teacher.teaching_grade_ids.slice(0, 3).map((id) => (
                          <Badge key={id} variant="outline" className="text-xs">
                            {gradeMap.get(id) || id}
                          </Badge>
                        ))}
                        {teacher.teaching_grade_ids.length > 3 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-muted"
                              >
                                +{teacher.teaching_grade_ids.length - 3} ta
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-2"
                              align="start"
                            >
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {teacher.teaching_grade_ids
                                  .slice(3)
                                  .map((id) => (
                                    <Badge
                                      key={id}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {gradeMap.get(id) || id}
                                    </Badge>
                                  ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 align-middle">
                    {teacher.class_teacher_grade_id ? (
                      <Badge variant="default" className="text-xs gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {getGradeName(teacher.class_teacher_grade_id)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 align-middle text-sm text-muted-foreground">
                    {formatDate(teacher.birth_date)}
                  </td>
                  <td className="p-4 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        teacher.is_active
                          ? "bg-[#00A27D]/20 text-[#00A27D]"
                          : "bg-[#FF3B47]/20 text-[#FF3B47]"
                      }`}
                    >
                      {teacher.is_active ? "Faol" : "Nofaol"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="o'qituvchi"
      />
    </div>
  )
}
