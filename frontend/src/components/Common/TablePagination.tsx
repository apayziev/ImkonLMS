import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  itemLabel?: string
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "ta",
}: TablePaginationProps) {
  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalItems)

  const pageSizeSelector = onPageSizeChange ? (
    <div className="flex items-center gap-x-2">
      <p className="text-sm text-muted-foreground">Sahifadagi qatorlar</p>
      <Select
        value={String(pageSize)}
        onValueChange={(value) => onPageSizeChange(Number(value))}
      >
        <SelectTrigger className="h-8 w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="top">
          {pageSizeOptions.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-2 py-4">
        <p className="text-sm text-muted-foreground">
          Jami: {totalItems} {itemLabel}
        </p>
        {pageSizeSelector}
      </div>
    )
  }

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []
    const showEllipsisThreshold = 7

    if (totalPages <= showEllipsisThreshold) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 3) {
        pages.push("ellipsis")
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis")
      }

      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {startIndex}-{endIndex} / {totalItems} {itemLabel}
        </p>
        {pageSizeSelector}
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (currentPage > 1) onPageChange(currentPage - 1)
              }}
              className={
                currentPage === 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {getPageNumbers().map((page, index) => (
            <PaginationItem key={`page-${index}`}>
              {page === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  isActive={currentPage === page}
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(page)
                  }}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (currentPage < totalPages) onPageChange(currentPage + 1)
              }}
              className={
                currentPage === totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
