import CodesPage from '@/components/admin/CodesPage'

export default function AdminCodesPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-white">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <span className="text-lg">🗂️</span>
        <h1 className="text-sm font-semibold text-gray-700">공통코드 관리</h1>
        <span className="ml-auto text-xs text-gray-400">DA §40 표준코드 · STD_CODE_GRP / STD_CODE</span>
      </div>
      <main className="flex-1 overflow-hidden">
        <CodesPage />
      </main>
    </div>
  )
}
