import type { Metadata } from 'next'
import AdminLogoutButton from './AdminLogoutButton'

export const metadata: Metadata = {
  title: '관리자 — 표준데이터 관리 프로그램',
}

const NAV_LINKS = [
  { href: '/admin',            label: '대시보드',  icon: '📊' },
  { href: '/admin/standards',  label: '표준관리',  icon: '📝' },
  { href: '/admin/approval',   label: '승인관리',  icon: '✅' },
  { href: '/admin/sync',       label: '동기화',    icon: '🔄' },
  { href: '/admin/users',      label: '사용자관리', icon: '👥' },
]

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center gap-4 shadow shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔐</span>
          <div>
            <div className="text-sm font-bold leading-tight">표준데이터 관리 · 관리자</div>
            <div className="text-[11px] text-gray-400 leading-tight">Back Office · Admin</div>
          </div>
        </div>

        <nav className="ml-8 flex gap-1">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <span className="text-xs">{link.icon}</span>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <AdminLogoutButton />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
