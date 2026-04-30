import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ChevronRight, GraduationCap, Snowflake } from "lucide-react"
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
import { getGradesQueryOptions, getStudentsStatsQueryOptions } from "@/hooks/useQueryOptions"
import { cn, getInitials, sortGrades } from "@/lib/utils"

export const Route = createFileRoute("/_layout/students")({
  component: StudentsPage,
  head: () => ({
    meta: [{ title: "O'quvchilar - IMKON LMS" }],
  }),
})

type ModalType = "detail"
type ModalState = { type: ModalType; student: StudentRead } | null

const AVATAR_PALETTE = [
  "var(--imkon-red)",
  "var(--imkon-purple-dark)",
  "var(--imkon-teal-dark)",
  "var(--imkon-purple)",
  "var(--imkon-maroon)",
] as const

const STAT_ACCENTS = {
  total: "var(--imkon-maroon)",
  active: "var(--imkon-teal)",
  frozen: "#3B82F6", // blue — matches the existing Snowflake icon tint
  newThisMonth: "var(--imkon-red)",
} as const

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="h-9 w-1.5 rounded-full shrink-0" style={{ background: accent }} />
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className="text-2xl font-bold leading-tight" style={{ color: accent }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function AttendanceBar({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="text-xs text-muted-foreground/60">—</span>
  }
  const color =
    rate > 90
      ? "var(--imkon-teal)"
      : rate > 80
        ? "#F59E0B" // amber-500 — between teal and red
        : "var(--imkon-red)"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 max-w-[80px] h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color }}>
        {rate}%
      </span>
    </div>
  )
}

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
  const grades: GradeRead[] = sortGrades(gradesData?.data ?? [])

  const { data: stats } = useQuery(getStudentsStatsQueryOptions())

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

  const getGradeName = (id: number | null): string => {
    if (!id) return "—"
    return grades.find((g) => g.id === id)?.display_name || "—"
  }

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

  const isFiltered =
    searchQuery !== "" || gradeFilter !== "all" || statusFilter !== "all"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          O'quvchilar
        </h1>
        <p className="text-muted-foreground text-sm">
          Sinf va o'quvchilar ma'lumotlari
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Jami"
          value={stats?.total ?? "—"}
          accent={STAT_ACCENTS.total}
        />
        <StatCard
          label="Faol"
          value={stats?.active ?? "—"}
          accent={STAT_ACCENTS.active}
        />
        <StatCard
          label="Muzlatilgan"
          value={stats?.frozen ?? "—"}
          accent={STAT_ACCENTS.frozen}
        />
        <StatCard
          label="Yangi (bu oy)"
          value={stats ? `+${stats.new_this_month}` : "—"}
          accent={STAT_ACCENTS.newThisMonth}
        />
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
                <span className="h-2 w-2 rounded-full bg-[var(--imkon-teal)]" />
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
                <span className="h-2 w-2 rounded-full bg-[var(--imkon-red)]" />
                Nofaol
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {isFiltered && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {totalCount} ta natija
          </span>
        )}
      </div>

      {/* Students grid table */}
      <div className="rounded-xl border overflow-hidden">
        {/* Header row */}
        <div className="hidden md:grid grid-cols-[44px_1.6fr_80px_1.4fr_1.2fr_1fr_28px] items-center gap-3 px-5 py-3 border-b bg-muted/30 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <span />
          <span>O'quvchi</span>
          <span>Sinf</span>
          <span>Ota-ona</span>
          <span>Telefon</span>
          <span>Davomat</span>
          <span />
        </div>

        {/* Body */}
        <div className="divide-y">
          {isLoading ? (
            Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="grid grid-cols-[44px_1.6fr_80px_1.4fr_1.2fr_1fr_28px] items-center gap-3 px-5 py-3.5"
              >
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <span />
              </div>
            ))
          ) : students.length === 0 ? (
            <div className="py-16 text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">O'quvchilar topilmadi</p>
            </div>
          ) : (
            students.map((student, i) => (
              <button
                type="button"
                key={student.id}
                onClick={() => openModal("detail", student)}
                className={cn(
                  "w-full grid md:grid-cols-[44px_1.6fr_80px_1.4fr_1.2fr_1fr_28px] grid-cols-[44px_1fr_28px] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus:bg-muted/60",
                  student.is_frozen && "opacity-60",
                )}
              >
                <Avatar
                  className={cn(
                    "h-9 w-9 ring-2 ring-background",
                    i % 2 === 0 ? "rounded-full" : "rounded-xl",
                  )}
                >
                  <AvatarImage
                    src={getPhotoUrl(student.photo_url)}
                    alt={student.full_name}
                  />
                  <AvatarFallback
                    className={cn(
                      "text-white text-sm font-semibold",
                      i % 2 === 0 ? "rounded-full" : "rounded-xl",
                    )}
                    style={{
                      background: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
                    }}
                  >
                    {getInitials(student.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm truncate">
                      {student.full_name}
                    </span>
                    {student.is_frozen && (
                      <span className="shrink-0 rounded-full bg-blue-500/15 text-blue-600 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5">
                        Muzlatilgan
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    {student.student_id || student.document_id}
                  </div>
                  {/* Mobile fallback for the 3 columns hidden in narrow layout */}
                  <div className="md:hidden text-[11px] text-muted-foreground mt-0.5 truncate">
                    {getGradeName(student.grade_id)}
                    {student.father_full_name && ` · ${student.father_full_name}`}
                    {student.attendance_rate !== null &&
                      ` · ${student.attendance_rate}%`}
                  </div>
                </div>

                <span className="hidden md:inline-flex items-center justify-center rounded-full bg-muted text-xs font-medium px-2 py-0.5">
                  {getGradeName(student.grade_id)}
                </span>

                <span className="hidden md:block text-sm truncate">
                  {student.father_full_name ?? "—"}
                </span>

                <span className="hidden md:block text-xs text-muted-foreground font-mono truncate">
                  {student.father_phone ?? "—"}
                </span>

                <div className="hidden md:block">
                  <AttendanceBar rate={student.attendance_rate} />
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        itemLabel="o'quvchi"
      />

      <StudentDetailDrawer
        student={activeModal?.type === "detail" ? activeModal.student : null}
        open={activeModal?.type === "detail"}
        onOpenChange={(open) => !open && closeModal()}
        gradeName={
          activeModal?.type === "detail"
            ? getGradeName(activeModal.student.grade_id)
            : undefined
        }
      />
    </div>
  )
}
