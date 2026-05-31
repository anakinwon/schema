import AuthTab from '@/components/auth/AuthTab'

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-white">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <span className="text-lg">👥</span>
        <h1 className="text-sm font-semibold text-gray-700">사용자 & 권한 관리</h1>
        <span className="ml-auto text-xs text-gray-400">RBAC · 5계층 역할 시스템</span>
      </div>
      <main className="flex-1 overflow-hidden">
        <AuthTab />
      </main>
    </div>
  )
}
