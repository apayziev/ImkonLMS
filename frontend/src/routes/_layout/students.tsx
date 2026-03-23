import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  GraduationCap,
  Snowflake,
} from "lucide-react"
import { useCallback, useState } from "react"

import type { GradeRead, StudentRead } from "@/lib/api"
import { studentsApi } from "@/lib/api"
import { SearchInput } from "@/components/Common/SearchInput"
import { TablePagination } from "@/components/Common/TablePagination"
import { Skeleton } from "@/components/ui/skeleton"
import { StudentDetailDrawer } from "@/components/Students/StudentDetailDrawer"
import { getPhotoUrl } from "@/components/Students/studentSchema"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getGradesQueryOptions } from "@/hooks/useQueryOptions"
import { formatDate } from "@/lib/utils"

export const Route = createFileRoute("/_layout/students")({
  component: StudentsPage,
  head: () => ({
    meta: [{ title: "O'quvchilar - IMKON LMS" }],
  }),
})

type ModalType = "detail"
type ModalState = { type: ModalType; student: StudentRead } | null

function StudentsPage() {
  const [gradeFilter, setGradeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeModal, setActiveModal] = useState<ModalState>(null)

  const debouncedSearch = useDebouncedValue(searchQuery, 300)

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  const openModal = useCallback((type: ModalType, student: StudentRead) => {
    setActiveModal({ type, student })
  }, [])
  const closeModal = useCallback(() => setActiveModal(null), [])

  const { data: gradesData } = useQuery(getGradesQueryOptions())
  const grades: GradeRead[] = gradesData?.data ?? []

  const gradeId = gradeFilter !== "all" ? Number(gradeFilter) : undefined
  const status = statusFilter !== "all" ? statusFilter : undefined

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students", gradeId, status, debouncedSearch, currentPage, pageSize],
    queryFn: async () => {
      const { data } = await studentsApi.list({
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
        grade_id: gradeId,
        search: debouncedSearch || undefined,
        status,
      })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const students = studentsData?.data ?? []
  const totalCount = studentsData?.count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  const getGradeName = (gradeId: number | null): string => {
    if (!gradeId) return "—"
    const grade = grades.find((g) => g.id === gradeId)
    return grade?.display_name || "—"
  }

  // Reset page on filter change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }
  const handleGradeFilterChange = (value: string) => {
    setGradeFilter(value)
    setCurrentPage(1)
  }
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          O'quvchilar
          {totalCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
              {totalCount}
            </span>
          )}
        </h1>
        <p className="text-muted-foreground text-sm">
          Sinf va o'quvchilar ma'lumotlari
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
        <Select value={gradeFilter} onValueChange={handleGradeFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sinf tanlang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha sinflar</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id.toString()}>
                {g.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha holatlar</SelectItem>
            <SelectItem value="active">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#00A27D]" />
                Faol
              </span>
            </SelectItem>
            <SelectItem value="frozen">
              <span className="flex items-center gap-1.5">
                <Snowflake className="h-3 w-3 text-blue-500" />
                Muzlatilgan
              </span>
            </SelectItem>
            <SelectItem value="inactive">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#FF3B47]" />
                Nofaol
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || gradeFilter !== "all" || statusFilter !== "all") && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {totalCount} ta natija
          </span>
        )}
      </div>

      {/* Students Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                O'quvchi
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Hujjat raqami
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Jinsi
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Tug'ilgan sana
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Sinf
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Ota-ona
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
                  <td className="p-4"><Skeleton className="h-4 w-8" /></td>
                  <td className="p-4"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 w-32" /></div></td>
                  <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-4"><Skeleton className="h-5 w-14 rounded-full" /></td>
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <GraduationCap className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">O'quvchilar topilmadi</p>
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr
                  key={student.id}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => openModal("detail", student)}
                >
                  <td className="p-4 align-middle">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={getPhotoUrl(student.photo_url)} alt={student.full_name} />
                        <AvatarFallback className="bg-[#6720FF] text-white text-sm">
                          {student.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.full_name}</p>
                        {student.phone_number && (
                          <span className="text-xs text-muted-foreground">{student.phone_number}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle font-mono text-sm text-muted-foreground">
                    {student.document_id}
                  </td>
                  <td className="p-4 align-middle">
                    {student.gender === "male" ? (
                      <span className="inline-flex items-center rounded-full bg-[#6720FF]/10 px-2.5 py-0.5 text-xs font-medium text-[#6720FF]">
                        O'g'il
                      </span>
                    ) : student.gender === "female" ? (
                      <span className="inline-flex items-center rounded-full bg-[#4B0924]/10 px-2.5 py-0.5 text-xs font-medium text-[#4B0924]">
                        Qiz
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-4 align-middle text-sm text-muted-foreground">
                    {student.birth_date
                      ? formatDate(student.birth_date)
                      : "—"}
                  </td>
                  <td className="p-4 align-middle">
                    <span className="inline-flex items-center rounded-full bg-[#6720FF]/20 px-2.5 py-0.5 text-xs font-medium text-[#6720FF]">
                      <GraduationCap className="mr-1 h-3 w-3" />
                      {getGradeName(student.grade_id)}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-sm">
                    {(() => {
                      const parentName =
                        student.father_first_name || student.father_last_name
                          ? [student.father_last_name, student.father_first_name].filter(Boolean).join(" ")
                          : student.mother_first_name || student.mother_last_name
                            ? [student.mother_last_name, student.mother_first_name].filter(Boolean).join(" ")
                            : null
                      const parentPhone = student.father_phone || student.mother_phone
                      return parentName ? (
                        <div>
                          <p className="text-muted-foreground">{parentName}</p>
                          {parentPhone && (
                            <p className="text-xs text-muted-foreground">{parentPhone}</p>
                          )}
                        </div>
                      ) : (
                        "—"
                      )
                    })()}
                  </td>
                  <td className="p-4 align-middle">
                    {student.is_frozen ? (
                      <div className="flex flex-col">
                        <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                          <Snowflake className="mr-1 h-3 w-3" />
                          Muzlatilgan
                        </span>
                        {student.departure_date && (
                          <span className="text-xs text-muted-foreground mt-1">
                            {student.departure_date}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          student.is_active
                            ? "bg-[#00A27D]/20 text-[#00A27D]"
                            : "bg-[#FF3B47]/20 text-[#FF3B47]"
                        }`}
                      >
                        {student.is_active ? "Faol" : "Nofaol"}
                      </span>
                    )}
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
        itemLabel="o'quvchi"
      />

      {/* Modals */}
      <StudentDetailDrawer
        student={activeModal?.type === "detail" ? activeModal.student : null}
        open={activeModal?.type === "detail"}
        onOpenChange={(open) => !open && closeModal()}
        gradeName={activeModal?.type === "detail" ? getGradeName(activeModal.student.grade_id) : undefined}
      />
    </div>
  )
}
