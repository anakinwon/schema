import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

interface AuditLog {
  LOG_ID:      string
  ENTITY_TYPE: string
  ENTITY_ID:   string
  ENTITY_NM:   string | null
  ACTION_TYPE: string
  BEFORE_DATA: string | null
  AFTER_DATA:  string | null
  CHANGED_BY:  string
  CHANGED_AT:  string
}

// GET /api/audit?entity=STD_DIC&id=xxx&limit=30
// GET /api/audit?limit=50  (전체 최신 이력)
// 조회 권한: ADMIN / MASTER / MANAGER (일반 USER 제외)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const sp     = req.nextUrl.searchParams
  const entity = sp.get('entity')           // STD_DIC | STD_DOM
  const id     = sp.get('id')               // 특정 엔터티 ID
  const limit  = Math.min(parseInt(sp.get('limit') ?? '30', 10), 200)

  const db = getDb()

  // STD_AUDIT_LOG 테이블이 없으면 빈 배열 반환
  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='STD_AUDIT_LOG'"
  ).get()
  if (!tableExists) return NextResponse.json([])

  let sql = 'SELECT * FROM STD_AUDIT_LOG WHERE 1=1'
  const params: (string | number)[] = []

  if (entity) { sql += ' AND ENTITY_TYPE = ?'; params.push(entity) }
  if (id)     { sql += ' AND ENTITY_ID   = ?'; params.push(id) }

  sql += ` ORDER BY CHANGED_AT DESC LIMIT ?`
  params.push(limit)

  const rows = db.prepare(sql).all(...params) as AuditLog[]
  return NextResponse.json(rows)
}
