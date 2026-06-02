import { Link } from '@/i18n/navigation'
import LangManager from '@/components/admin/i18n/LangManager'

export default function LanguagesPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/i18n" className="text-sm text-gray-500 hover:text-gray-700">← 다국어 관리</Link>
        <h1 className="text-lg font-semibold text-gray-800">언어 관리</h1>
      </div>
      <LangManager />
    </div>
  )
}
