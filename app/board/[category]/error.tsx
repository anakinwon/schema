'use client'

export default function CategoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="bg-white rounded border border-red-200 p-8 text-center">
      <p className="text-sm font-medium text-red-600 mb-2">게시글 목록을 불러오지 못했습니다</p>
      <p className="text-xs text-gray-400 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-[#1e3a5f] text-white text-sm rounded hover:bg-[#16304f] transition-colors"
      >
        다시 시도
      </button>
    </div>
  )
}
