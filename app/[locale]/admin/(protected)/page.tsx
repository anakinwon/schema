import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getDb } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase'

type Props = { params: Promise<{ locale: string }> }

async function getStats() {
  const db = getDb()
  const words   = (db.prepare(`SELECT COUNT(*) as cnt FROM STD_DIC WHERE DIC_GBN_CD = '0001'`).get() as { cnt: number }).cnt
  const domains = (db.prepare(`SELECT COUNT(*) as cnt FROM STD_DOM`).get() as { cnt: number }).cnt
  const terms   = (db.prepare(`SELECT COUNT(*) as cnt FROM STD_DIC WHERE DIC_GBN_CD = '0002'`).get() as { cnt: number }).cnt
  const { count: users } = await supabaseAdmin
    .from('user_info').select('*', { count: 'exact', head: true }).eq('use_yn', 'Y')
  return { words, domains, terms, users: users ?? 0 }
}

const STAT_KEYS = [
  { key: 'words'  , tKey: 'card.words'  , icon: '📝', color: 'bg-blue-50   border-blue-200   text-blue-700'   },
  { key: 'domains', tKey: 'card.domains', icon: '🗂️', color: 'bg-green-50  border-green-200  text-green-700'  },
  { key: 'terms'  , tKey: 'card.terms'  , icon: '📋', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { key: 'users'  , tKey: 'card.users'  , icon: '👥', color: 'bg-orange-50 border-orange-200 text-orange-700' },
] as const

const QUICK_LINKS = [
  { href: '/admin/standards', tKey: 'quick.words'     , descKey: 'quick.wordsDesc'     , icon: '📝' },
  { href: '/admin/standards', tKey: 'quick.domains'   , descKey: 'quick.domainsDesc'   , icon: '📋' },
  { href: '/admin/standards', tKey: 'quick.terms'     , descKey: 'quick.termsDesc'     , icon: '🔤' },
  { href: '/admin/codes'    , tKey: 'quick.codes'     , descKey: 'quick.codesDesc'     , icon: '🗂️' },
  { href: '/admin/audit'    , tKey: 'quick.audit'     , descKey: 'quick.auditDesc'     , icon: '📋' },
  { href: '/admin/users'    , tKey: 'quick.users'     , descKey: 'quick.usersDesc'     , icon: '👥' },
  { href: '/'               , tKey: 'quick.userScreen', descKey: 'quick.userScreenDesc', icon: '🖥️' },
] as const

export default async function AdminDashboard({ params }: Props) {
  const { locale: localeRaw } = await params
  const locale = localeRaw as Locale
  setRequestLocale(locale)

  const [t, stats] = await Promise.all([
    getTranslations('admin.dashboard'),
    getStats(),
  ])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">{t('pageTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('pageSubtitle')}</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_KEYS.map(({ key, tKey, icon, color }) => (
          <div key={key} className={`rounded-xl border p-5 ${color}`}>
            <span className="text-2xl">{icon}</span>
            <div className="text-3xl font-bold mt-3">{stats[key]}</div>
            <div className="text-sm font-medium mt-1 opacity-75">{t(tKey as any)}</div>
          </div>
        ))}
      </div>

      {/* 빠른 이동 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">{t('quickMenu')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map(({ href, tKey, descKey, icon }) => (
            <Link
              key={tKey}
              href={href}
              className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
            >
              <span className="text-xl mt-0.5">{icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-800 group-hover:text-[#1e3a5f]">
                  {t(tKey as any)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{t(descKey as any)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400 text-right">{t('footer')}</div>
    </div>
  )
}
