import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'

import AdminLogoutButton from './AdminLogoutButton'
import CountrySelector from '@/components/i18n/CountrySelector'
import { createSupabaseServer } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth'

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'common' })
  return { title: `관리자 — ${t('appName')}` }
}

const NAV_KEYS = [
  { href: '/admin',           key: 'dashboard', icon: '📊' },
  { href: '/admin/board',     key: 'board',     icon: '📢' },
  { href: '/admin/users',     key: 'users',     icon: '👥' },
  { href: '/admin/codes',     key: 'codes',     icon: '🗂️' },
  { href: '/admin/audit',     key: 'audit',     icon: '📋' },
  { href: '/admin/approval',  key: 'approval',  icon: '✅' },
  { href: '/admin/standards', key: 'standards', icon: '📝' },
  { href: '/admin/sync',      key: 'sync',      icon: '🔄' },
  { href: '/admin/i18n',      key: 'i18n',      icon: '🌐' },
] as const

async function getAdminUserInfo(): Promise<{ userName: string; isAdminSession: boolean }> {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin-session')?.value
  const isAdminSession = !!(adminToken && verifyAdminToken(adminToken))

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', user.id)
      .maybeSingle()
    const userName = profile?.full_name ?? profile?.username ?? user.email?.split('@')[0] ?? '관리자'
    return { userName, isAdminSession }
  }

  return { userName: '관리자', isAdminSession }
}

export default async function AdminProtectedLayout({ children, params }: Props) {
  const { locale: localeRaw } = await params
  const locale = localeRaw as Locale
  setRequestLocale(locale)

  const [t, { userName, isAdminSession }] = await Promise.all([
    getTranslations('admin'),
    getAdminUserInfo(),
  ])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center gap-4 shadow shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔐</span>
          <div>
            <div className="text-sm font-bold leading-tight">스키마 · 관리자</div>
            <div className="text-[11px] text-gray-400 leading-tight">Back Office · Admin</div>
          </div>
        </div>

        <nav className="ml-8 flex gap-1">
          {NAV_KEYS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="text-xs">{link.icon}</span>
              {t(`menu.${link.key}` as any)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <CountrySelector
            triggerClass="text-gray-300 border-gray-600 hover:text-white hover:bg-white/10 hover:border-gray-400"
          />
          <AdminLogoutButton userName={userName} isAdminSession={isAdminSession} />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
