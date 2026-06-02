'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function SyncPage() {
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState<Record<string, number> | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  const runSync = useCallback(async () => {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/i18n/sync', { method: 'POST', headers })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '동기화 실패'); return }
      setResult(data.synced)
    } catch (e) {
      setError('네트워크 오류')
    } finally {
      setRunning(false)
    }
  }, [supabase])

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/admin/i18n" className="text-sm text-gray-500 hover:text-gray-700">← 다국어 관리</Link>
        <h1 className="text-lg font-semibold text-gray-800">DB → JSON 동기화</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Supabase <code className="bg-gray-100 px-1 rounded">i18n_msg</code> 테이블의 번역 데이터를
          <br />
          <code className="bg-gray-100 px-1 rounded">messages/{'{locale}'}.json</code> 파일로 재생성합니다.
        </p>
        <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
          <li>실행 후 next-intl 캐시(unstable_cache)가 자동 무효화됩니다</li>
          <li>11개 활성 언어 파일이 모두 재생성됩니다</li>
          <li>기존 messages/*.json 파일을 덮어씁니다</li>
        </ul>

        <button
          onClick={runSync}
          disabled={running}
          className="w-full py-2.5 bg-[#1e3a5f] text-white text-sm rounded hover:bg-[#16304f] disabled:opacity-50 transition-colors"
        >
          {running ? '동기화 중...' : '🔄 지금 동기화 실행'}
        </button>
      </div>

      {/* 결과 */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700 mb-3">✅ 동기화 완료</p>
          <div className="space-y-1">
            {Object.entries(result).sort().map(([lang, count]) => (
              <div key={lang} className="flex justify-between text-xs text-green-600">
                <span className="font-mono">{lang}.json</span>
                <span>{count}건 반영</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">❌ {error}</p>
        </div>
      )}
    </div>
  )
}
