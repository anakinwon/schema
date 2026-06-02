import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// DELETE /api/audit/cleanup?days=90
// 보존 기간(days) 이전의 이력 물리 삭제
// 권한: ADMIN만 허용
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return auth.response

  const days = Math.max(1, parseInt(req.nextUrl.searchParams.get('days') ?? '90', 10))

  const db = getDb()

  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='STD_AUDIT_LOG'"
  ).get()
  if (!tableExists) return NextResponse.json({ deleted: 0, days })

  // 삭제 대상 건수 먼저 조회 (확인용)
  const { cnt } = db.prepare(
    `SELECT COUNT(*) as cnt FROM STD_AUDIT_LOG
     WHERE CHANGED_AT < datetime('now', ?, 'localtime')`
  ).get(`-${days} days`) as { cnt: number }

  if (cnt === 0) return NextResponse.json({ deleted: 0, days })

  const result = db.prepare(
    `DELETE FROM STD_AUDIT_LOG
     WHERE CHANGED_AT < datetime('now', ?, 'localtime')`
  ).run(`-${days} days`)

  return NextResponse.json({ deleted: result.changes, days })
}
