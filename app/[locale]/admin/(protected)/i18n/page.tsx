import { Link } from '@/i18n/navigation'
import I18nDashboard from '@/components/admin/i18n/I18nDashboard'

export default function I18nAdminPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">🌐 다국어 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">번역 현황 대시보드</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/i18n/languages" className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-600">
            언어 관리
          </Link>
          <Link href="/admin/i18n/messages" className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-600">
            번역 편집
          </Link>
          <Link href="/admin/i18n/sync" className="px-3 py-1.5 text-sm bg-[#1e3a5f] text-white rounded hover:bg-[#16304f] transition-colors">
            DB→JSON 동기화
          </Link>
        </div>
      </div>
      <I18nDashboard />
    </div>
  )
}
