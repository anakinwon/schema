'use client'
import { useState } from 'react'
import WordTab from './WordTab'
import DomainTab from './DomainTab'
import TermTab from './TermTab'

type Tab = 'word' | 'domain' | 'term'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'word',   label: '표준단어 관리',   icon: '📝' },
  { key: 'domain', label: '표준도메인 관리',  icon: '🗂️' },
  { key: 'term',   label: '표준용어 관리',   icon: '📋' },
]

export default function StandardsPage() {
  const [tab, setTab] = useState<Tab>('word')

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 상단 헤더 */}
      <header className="bg-[#1e3a5f] text-white px-6 py-3 flex items-center gap-4 shrink-0 shadow">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗃️</span>
          <div>
            <div className="text-base font-bold leading-tight">표준데이터 관리 프로그램</div>
            <div className="text-[11px] text-blue-200 leading-tight">DA Standard Data Management · 쇼핑몰</div>
          </div>
        </div>
        <div className="ml-auto text-xs text-blue-300">
          DA#5 SQLiteDB_for_META_v5
        </div>
      </header>

      {/* 탭 메뉴 */}
      <div className="flex gap-0 border-b border-gray-300 bg-white shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t.key
                ? 'border-[#1e3a5f] text-[#1e3a5f] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}

        {/* 우측 정보 */}
        <div className="ml-auto flex items-center px-4 text-xs text-gray-400 gap-3">
          <span>STD_DIC · STD_DOM · STD_WORD_COMBI</span>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <main className="flex-1 overflow-hidden bg-white">
        {tab === 'word'   && <WordTab />}
        {tab === 'domain' && <DomainTab />}
        {tab === 'term'   && <TermTab />}
      </main>
    </div>
  )
}
