import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

interface AuditRow {
  LOG_ID:      string
  ENTITY_TYPE: string
  ENTITY_ID:   string
  ENTITY_NM:   string | null
  ACTION_TYPE: string
  CHANGED_BY:  string
  CHANGED_AT:  string
}

const CSV_HEADERS: (keyof AuditRow)[] = [
  'LOG_ID', 'ENTITY_TYPE', 'ENTITY_ID', 'ENTITY_NM',
  'ACTION_TYPE', 'CHANGED_BY', 'CHANGED_AT',
]

function escapeCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

// GET /api/audit/export — 현재 필터 조건 그대로 CSV 다운로드 (최대 10,000건)
// 권한: ADMIN / MASTER / MANAGER
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER', 'MANAGER'])
  if (!auth.ok) return auth.response

  const sp     = req.nextUrl.searchParams
  const entity = sp.get('entity')
  const action = sp.get('action')
  const q      = sp.get('q')?.trim()
  const from   = sp.get('from')
  const to     = sp.get('to')

  const db = getDb()

  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='STD_AUDIT_LOG'"
  ).get()

  const emptyHeader = CSV_HEADERS.join(',')
  if (!tableExists) {
    return csvResponse(`﻿${emptyHeader}\n`, 'audit_empty.csv')
  }

  const conditions: string[] = ['1=1']
  const params: (string | number)[] = []

  if (entity) { conditions.push('ENTITY_TYPE = ?'); params.push(entity) }
  if (action) { conditions.push('ACTION_TYPE = ?'); params.push(action) }
  if (q) {
    conditions.push('(ENTITY_NM LIKE ? OR CHANGED_BY LIKE ? OR ENTITY_ID LIKE ?)')
    const kw = `%${q}%`
    params.push(kw, kw, kw)
  }
  if (from) { conditions.push("CHANGED_AT >= ?"); params.push(`${from} 00:00:00`) }
  if (to)   { conditions.push("CHANGED_AT <= ?"); params.push(`${to} 23:59:59`) }

  const rows = db.prepare(
    `SELECT ${CSV_HEADERS.join(', ')}
     FROM STD_AUDIT_LOG
     WHERE ${conditions.join(' AND ')}
     ORDER BY CHANGED_AT DESC
     LIMIT 10000`
  ).all(...params) as AuditRow[]

  const lines = [
    emptyHeader,
    ...rows.map(r => CSV_HEADERS.map(h => escapeCell(r[h])).join(',')),
  ]

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return csvResponse(`﻿${lines.join('\n')}`, `audit_${date}.csv`)
}

function csvResponse(body: string, filename: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
