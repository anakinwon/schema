import Link from 'next/link'
import { CATEGORY_NAME } from '@/lib/board'

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  const categories = Object.entries(CATEGORY_NAME)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1e3a5f] text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-wide">📋 통합게시판</h1>
          <Link href="/standards" className="text-sm text-blue-200 hover:text-white transition-colors">
            ← 표준 관리로
          </Link>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 pb-0">
          {categories.map(([code, name]) => (
            <Link
              key={code}
              href={`/board/${code.toLowerCase()}`}
              className="px-4 py-2 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-t transition-colors"
            >
              {name}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
