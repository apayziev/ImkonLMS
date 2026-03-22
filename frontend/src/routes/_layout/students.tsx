import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertTriangle,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Snowflake,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import type { GradeRead, StudentRead } from "@/lib/api"
import { studentsApi } from "@/lib/api"
import { AddStudent } from "@/components/Students/AddStudent"
import { DeleteStudent } from "@/components/Students/DeleteStudent"
import { EditStudent } from "@/components/Students/EditStudent"
import { FreezeStudent, UnfreezeStudent } from "@/components/Students/FreezeStudent"
import { HardDeleteStudent } from "@/components/Students/HardDeleteStudent"
import { RestoreStudent } from "@/components/Students/RestoreStudent"
import { StudentDetailDrawer } from "@/components/Students/StudentDetailDrawer"
import { getPhotoUrl } from "@/components/Students/studentSchema"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useAuth from "@/hooks/useAuth"
import { getGradesQueryOptions } from "@/hooks/useQueryOptions"

export const Route = createFileRoute("/_layout/students")({
  component: StudentsPage,
  head: () => ({
    meta: [{ title: "O'quvchilar - IMKON LMS" }],
  }),
})

type ModalType = "edit" | "delete" | "freeze" | "unfreeze" | "restore" | "hardDelete" | "detail"
type ModalState = { type: ModalType; student: StudentRead } | null

function formatNumber(value: number | string | null | undefined): string {
  if (value == null) return ""
  return Number(value).toLocaleString("uz-UZ")
}

function StudentsPage() {
  const { user } = useAuth()
  const isAdmin = user?.is_superuser

  const [gradeFilter, setGradeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  const [activeModal, setActiveModal] = useState<ModalState>(null)
  const [activeTab, setActiveTab] = useState("active")

  const [deletedSearchQuery, setDeletedSearchQuery] = useState("")
  const [deletedCurrentPage, setDeletedCurrentPage] = useState(1)

  const debouncedSearch = useDebounce(searchQuery, 300)
  const debouncedDeletedSearch = useDebounce(deletedSearchQuery, 300)

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

  const { data: deletedData, isLoading: isLoadingDeleted } = useQuery({
    queryKey: ["deleted-students", debouncedDeletedSearch, deletedCurrentPage, pageSize],
    queryFn: async () => {
      const { data } = await studentsApi.deletedList({
        skip: (deletedCurrentPage - 1) * pageSize,
        limit: pageSize,
        search: debouncedDeletedSearch || undefined,
      })
      return data
    },
    enabled: activeTab === "deleted" && !!isAdmin,
    placeholderData: keepPreviousData,
  })

  const students = studentsData?.data ?? []
  const totalCount = studentsData?.count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  const deletedStudents = deletedData?.data ?? []
  const deletedCount = deletedData?.count ?? 0
  const deletedTotalPages = Math.ceil(deletedCount / pageSize)

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
  const handleDeletedSearchChange = (value: string) => {
    setDeletedSearchQuery(value)
    setDeletedCurrentPage(1)
  }

  return (
    <div className="space-y-6 p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                O'quvchilar
              </h1>
              <p className="text-muted-foreground text-sm">
                Sinf va o'quvchilar ma'lumotlari
              </p>
            </div>
            <TabsList>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Faol o'quvchilar
                {totalCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {totalCount}
                  </span>
                )}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="deleted" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  O'chirilganlar
                  {deletedCount > 0 && (
                    <span className="ml-1 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive">
                      {deletedCount}
                    </span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          {isAdmin && <AddStudent grades={grades} />}
        </div>

        {/* Active students tab */}
        <TabsContent value="active" className="space-y-4 mt-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ism, hujjat raqami yoki telefon..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
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
                    Oylik to'lov
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Holat
                  </th>
                  {isAdmin && (
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                      Amallar
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-muted-foreground">
                      Yuklanmoqda...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="text-center py-12">
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
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
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
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                            O'g'il
                          </span>
                        ) : student.gender === "female" ? (
                          <span className="inline-flex items-center rounded-full bg-pink-500/10 px-2.5 py-0.5 text-xs font-medium text-pink-600">
                            Qiz
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4 align-middle text-sm text-muted-foreground">
                        {student.birth_date ?? "—"}
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
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
                      <td className="p-4 align-middle text-sm">
                        {student.monthly_fee ? (
                          <span className="font-medium">
                            {formatNumber(student.monthly_fee)}
                            <span className="text-muted-foreground font-normal"> so'm</span>
                          </span>
                        ) : (
                          "—"
                        )}
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
                      {isAdmin && (
                        <td className="p-4 align-middle text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openModal("edit", student)
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Tahrirlash
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {student.is_frozen ? (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openModal("unfreeze", student)
                                  }}
                                  className="text-green-600"
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Faollashtirish
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openModal("freeze", student)
                                  }}
                                  className="text-blue-600"
                                >
                                  <Snowflake className="mr-2 h-4 w-4" />
                                  Muzlatish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openModal("delete", student)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                O'chirish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Jami {totalCount} ta o'quvchi
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Oldingi
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Keyingi
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Deleted students tab */}
        {isAdmin && (
          <TabsContent value="deleted" className="space-y-4 mt-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="O'chirilgan o'quvchini qidirish..."
                  value={deletedSearchQuery}
                  onChange={(e) => handleDeletedSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoadingDeleted ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Yuklanmoqda...</p>
              </div>
            ) : deletedStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Trash2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">O'chirilgan o'quvchilar topilmadi</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          O'quvchi
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Hujjat raqami
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Sinf
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          O'chirilgan sana
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                          Amallar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={getPhotoUrl(student.photo_url)} alt={student.full_name} />
                                <AvatarFallback className="bg-gray-400 text-white text-sm">
                                  {student.full_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-muted-foreground">{student.full_name}</p>
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
                            <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                              <GraduationCap className="mr-1 h-3 w-3" />
                              {getGradeName(student.grade_id)}
                            </span>
                          </td>
                          <td className="p-4 align-middle text-sm text-muted-foreground">
                            {student.deleted_at ?? "—"}
                          </td>
                          <td className="p-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => openModal("restore", student)}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Tiklash
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => openModal("hardDelete", student)}
                              >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                O'chirish
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Deleted pagination */}
                {deletedTotalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Jami {deletedCount} ta o'chirilgan o'quvchi
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletedCurrentPage <= 1}
                        onClick={() => setDeletedCurrentPage((p) => p - 1)}
                      >
                        Oldingi
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {deletedCurrentPage} / {deletedTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletedCurrentPage >= deletedTotalPages}
                        onClick={() => setDeletedCurrentPage((p) => p + 1)}
                      >
                        Keyingi
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
      {activeModal?.type === "edit" && (
        <EditStudent
          student={activeModal.student}
          grades={grades}
          open
          onOpenChange={(open) => !open && closeModal()}
        />
      )}
      {activeModal?.type === "delete" && (
        <DeleteStudent
          student={activeModal.student}
          open
          onOpenChange={(open) => !open && closeModal()}
        />
      )}
      {activeModal?.type === "freeze" && (
        <FreezeStudent
          student={activeModal.student}
          open
          onOpenChange={(open) => !open && closeModal()}
        />
      )}
      {activeModal?.type === "unfreeze" && (
        <UnfreezeStudent
          student={activeModal.student}
          open
          onOpenChange={(open) => !open && closeModal()}
        />
      )}
      {activeModal?.type === "restore" && (
        <RestoreStudent
          student={activeModal.student}
          open
          onOpenChange={(open) => !open && closeModal()}
        />
      )}
      {activeModal?.type === "hardDelete" && (
        <HardDeleteStudent
          student={activeModal.student}
          open
          onOpenChange={(open) => !open && closeModal()}
        />
      )}
      <StudentDetailDrawer
        student={activeModal?.type === "detail" ? activeModal.student : null}
        open={activeModal?.type === "detail"}
        onOpenChange={(open) => !open && closeModal()}
        gradeName={activeModal?.type === "detail" ? getGradeName(activeModal.student.grade_id) : undefined}
      />
    </div>
  )
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debounced
}
