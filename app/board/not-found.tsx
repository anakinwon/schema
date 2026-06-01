import Link from 'next/link'

export default function BoardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl font-bold text-gray-200 mb-4">404</p>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">존재하지 않는 게시판입니다</h2>
      <p className="text-sm text-gray-400 mb-6">요청하신 게시판 카테고리를 찾을 수 없습니다.</p>
      <Link
        href="/board/notice"
        className="px-4 py-2 bg-[#1e3a5f] text-white text-sm rounded hover:bg-[#16304f] transition-colors"
      >
        공지사항으로 이동
      </Link>
    </div>
  )
}
