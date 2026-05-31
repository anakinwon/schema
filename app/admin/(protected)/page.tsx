import { getDb } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase'

async function getStats() {
  const db = getDb()

  const words   = (db.prepare(`SELECT COUNT(*) as cnt FROM STD_DIC WHERE DIC_GBN_CD = '0001'`).get() as { cnt: number }).cnt
  const domains = (db.prepare(`SELECT COUNT(*) as cnt FROM STD_DOM`).get() as { cnt: number }).cnt
  const terms   = (db.prepare(`SELECT COUNT(*) as cnt FROM STD_DIC WHERE DIC_GBN_CD = '0002'`).get() as { cnt: number }).cnt

  const { count: users } = await supabaseAdmin
    .from('user_info')
    .select('*', { count: 'exact', head: true })
    .eq('use_yn', 'Y')

  return { words, domains, terms, users: users ?? 0 }
}

const STAT_CARDS = [
  { key: 'words'  , label: '표준단어'  , icon: '📝', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { key: 'domains', label: '표준도메인', icon: '🗂️', color: 'bg-green-50 border-green-200 text-green-700' },
  { key: 'terms'  , label: '표준용어'  , icon: '📋', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { key: 'users'  , label: '활성 사용자', icon: '👥', color: 'bg-orange-50 border-orange-200 text-orange-700' },
] as const

export default async function AdminDashboard() {
  const stats = await getStats()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">관리자 대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">표준데이터 관리 시스템 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ key, label, icon, color }) => (
          <div key={key} className={`rounded-xl border p-5 ${color}`}>
            <span className="text-2xl">{icon}</span>
            <div className="text-3xl font-bold mt-3">{stats[key]}</div>
            <div className="text-sm font-medium mt-1 opacity-75">{label}</div>
          </div>
        ))}
      </div>

      {/* 빠른 이동 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">빠른 이동</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { href: '/admin/standards', label: '표준단어 관리'  , desc: 'STD_DIC 등록/수정/삭제', icon: '📝' },
            { href: '/admin/standards', label: '표준도메인 관리', desc: 'STD_DOM 등록/수정/삭제', icon: '🗂️' },
            { href: '/admin/standards', label: '표준용어 관리'  , desc: 'DA_TERM 등록/수정/삭제', icon: '📋' },
            { href: '/admin/users'    , label: '사용자 목록'    , desc: '역할 부여 및 권한 관리' , icon: '👥' },
            { href: '/'               , label: '일반 사용자 화면', desc: '표준 데이터 조회/편집'  , icon: '🖥️' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
            >
              <span className="text-xl mt-0.5">{item.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-800 group-hover:text-[#1e3a5f]">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400 text-right">
        DA#5 SQLiteDB_for_META · Supabase PostgreSQL
      </div>
    </div>
  )
}
