import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { runFullSync, getSyncHistory } from '@/lib/sync'

// GET /api/sync — 최근 동기화 이력
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN'])
  if (!auth.ok) return auth.response

  const history = await getSyncHistory(20)
  return NextResponse.json(history)
}

// POST /api/sync — 전체 동기화 실행
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN'])
  if (!auth.ok) return auth.response

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
