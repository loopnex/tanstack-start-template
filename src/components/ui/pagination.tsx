import type { MetaSchemaType } from '#/schema/paginationSchema'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

interface PaginationProps {
  meta: MetaSchemaType
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

const PAGE_SIZES = [10, 25, 50, 100]

export const Pagination = ({
  meta,
  onPageChange,
  onLimitChange,
}: PaginationProps) => {
  const { limit, total } = meta

  if (total <= PAGE_SIZES[0]) return null

  const totalPages = Math.max(1, Math.ceil(total / limit))
  // Clamp a possibly-stale page (e.g. a hand-edited URL) back into range
  const page = Math.min(Math.max(meta.page, 1), totalPages)

  const firstItem = (page - 1) * limit + 1
  const lastItem = Math.min(total, page * limit)

  // Changing the page size resets to page 1 (the consumer's onLimitChange owns
  // the reset, so we don't also call onPageChange — that would double-navigate)
  const handleLimitChange = (value: string | null) => {
    if (!value) return
    onLimitChange(Number(value))
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-6 pt-6 sm:flex-row">
      <div className="text-sm">
        {`Showing ${firstItem} - ${lastItem} of ${total}`}
      </div>

      <div className="flex items-center gap-3">
        <Select value={String(limit)} onValueChange={handleLimitChange}>
          <SelectTrigger>
            <SelectValue placeholder="Items per page" />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / Page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
