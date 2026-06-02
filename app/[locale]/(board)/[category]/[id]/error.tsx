'use client'

import { useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'

export default function PostDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()

  return (
    <div className="bg-white rounded border border-red-200 p-8 text-center">
      <p className="text-sm font-medium text-red-600 mb-2">게시글을 불러오지 못했습니다</p>
      <p className="text-xs text-gray-400 mb-4">{error.message}</p>
      <div className="flex justify-center gap-2">
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#1e3a5f] text-white text-sm rounded hover:bg-[#16304f] transition-colors"
        >
          다시 시도
        </button>
        <Link
          href={`/${params.category}`}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
        >
          목록으로
        </Link>
      </div>
    </div>
  )
}
