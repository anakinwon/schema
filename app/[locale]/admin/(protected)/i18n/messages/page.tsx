import { Link } from '@/i18n/navigation'
import MessageMatrix from '@/components/admin/i18n/MessageMatrix'

export default function MessagesPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/i18n" className="text-sm text-gray-500 hover:text-gray-700">← 다국어 관리</Link>
        <h1 className="text-lg font-semibold text-gray-800">번역 매트릭스</h1>
        <p className="text-sm text-gray-400">셀 클릭 → 인라인 편집 · Enter 저장 · Esc 취소</p>
      </div>
      <MessageMatrix />
    </div>
  )
}
