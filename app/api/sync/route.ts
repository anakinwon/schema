import { NextRequest, NextResponse } from 'next/server'
import { isAdminSession } from '@/lib/admin-auth'
import { runFullSync, getSyncHistory } from '@/lib/sync'

// GET /api/sync — 최근 동기화 이력
export async function GET(request: NextRequest) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 인증 필요' }, { status: 401 })
  }
  const history = await getSyncHistory(20)
  return NextResponse.json(history)
}

// POST /api/sync — 전체 동기화 실행
export async function POST(request: NextRequest) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 인증 필요' }, { status: 401 })
  }

  try {
    const results = await runFullSync()
    const totalSynced = results.reduce((s, r) => s + r.inserted + r.updated, 0)
    const totalErrors = results.reduce((s, r) => s + r.errors, 0)
    return NextResponse.json({ ok: true, results, totalSynced, totalErrors })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
