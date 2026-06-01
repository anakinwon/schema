import AuditLogViewer from '@/components/admin/AuditLogViewer'

export default function AdminAuditPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-white">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <span className="text-lg">📋</span>
        <h1 className="text-sm font-semibold text-gray-700">전체 변경 이력</h1>
        <span className="ml-auto text-xs text-gray-400">STD_AUDIT_LOG · STD_DIC / STD_DOM</span>
      </div>
      <main className="flex-1 overflow-hidden">
        <AuditLogViewer />
      </main>
    </div>
  )
}
