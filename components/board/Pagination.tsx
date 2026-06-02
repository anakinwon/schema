'use client'

interface Props {
  page: number
  totalPages: number
  onPage: (p: number) => void
}

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '…')[] = [1]

  if (current > 3) pages.push('…')

  const start = Math.max(2, current - 2)
  const end   = Math.min(total - 1, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('…')

  pages.push(total)
  return pages
}

export default function Pagination({ page, totalPages, onPage }: Props) {
  if (totalPages <= 1) return null

  const items = buildPageNumbers(page, totalPages)

  return (
    <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        이전
      </button>

      {items.map((item, idx) =>
        item === '…' ? (
          <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-gray-400 select-none">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPage(item)}
            className={`px-3 py-1.5 text-sm border rounded transition-colors ${
              item === page
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        다음
      </button>
    </div>
  )
}
