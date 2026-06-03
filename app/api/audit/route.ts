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

// GET /api/audit
//   entity  — STD_DIC | STD_DOM | APPROVAL | SYS_CODE_GRP | SYS_CODE_VAL
//   id      — 특정 엔터티 ID
//   action  — INSERT | UPDATE | DELETE
//   q       — 이름 / 변경자 / ID 검색어
//   from    — YYYY-MM-DD (시작일 포함)
//   to      — YYYY-MM-DD (종료일 포함)
//   limit   — 기본 50, 최대 200
//   offset  — 기본 0
// 조회 권한: ADMIN / MASTER / MANAGER
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const sp     = req.nextUrl.searchParams
  const entity = sp.get('entity')
  const id     = sp.get('id')
  const action = sp.get('action')
  const q      = sp.get('q')?.trim().slice(0, 100)
  const from   = sp.get('from')   // YYYY-MM-DD
  const to     = sp.get('to')     // YYYY-MM-DD
  const limit  = Math.min(parseInt(sp.get('limit')  ?? '50', 10), 200)
  const offset = Math.max(0, parseInt(sp.get('offset') ?? '0',  10))

  const db = getDb()

  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='STD_AUDIT_LOG'"
  ).get()
  if (!tableExists) {
    return NextResponse.json([], { headers: { 'X-Total-Count': '0' } })
  }

  // WHERE 조건 누적
  const conditions: string[] = ['1=1']
  const params: (string | number)[] = []

  if (entity) { conditions.push('ENTITY_TYPE = ?');  params.push(entity) }
  if (id)     { conditions.push('ENTITY_ID   = ?');  params.push(id) }
  if (action) { conditions.push('ACTION_TYPE = ?');  params.push(action) }
  if (q) {
    conditions.push('(ENTITY_NM LIKE ? OR CHANGED_BY LIKE ? OR ENTITY_ID LIKE ?)')
    const kw = `%${q}%`
    params.push(kw, kw, kw)
  }
  if (from) { conditions.push("CHANGED_AT >= ?"); params.push(`${from} 00:00:00`) }
  if (to)   { conditions.push("CHANGED_AT <= ?"); params.push(`${to} 23:59:59`) }

  const where = conditions.join(' AND ')

  // 전체 건수 (페이지네이션용)
  const { cnt } = db.prepare(
    `SELECT COUNT(*) as cnt FROM STD_AUDIT_LOG WHERE ${where}`
  ).get(...params) as { cnt: number }

  // 데이터 조회
  const rows = db.prepare(
    `SELECT * FROM STD_AUDIT_LOG WHERE ${where} ORDER BY CHANGED_AT DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as AuditLog[]

  return NextResponse.json(rows, {
    headers: { 'X-Total-Count': String(cnt) },
  })
}
