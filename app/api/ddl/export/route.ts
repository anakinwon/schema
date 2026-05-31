import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { generateDDL, type Dbms, type TermColumn } from '@/lib/ddl-generator'

// TASK-010: DDL Export API
// POST /api/ddl/export
// body: { tableName: string, termIds: string[], dbms: 'postgresql'|'mysql' }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { tableName, termIds, dbms = 'postgresql' } = body as {
    tableName: string
    termIds: string[]
    dbms: Dbms
  }

  if (!tableName || !Array.isArray(termIds) || termIds.length === 0) {
    return NextResponse.json({ error: '테이블명과 용어 목록은 필수입니다' }, { status: 400 })
  }

  const db = getDb()

  // 용어 → 컬럼 정보 조회 (도메인 데이터타입 우선, 없으면 직접 설정값)
  const columns: TermColumn[] = termIds.map(id => {
    const row = db.prepare(`
      SELECT t.DIC_ID, t.DIC_LOG_NM, t.DIC_PHY_FLL_NM,
             COALESCE(dm.DATA_TYPE_CD, t.DATA_TYPE) AS DATA_TYPE,
             COALESCE(dm.DATA_LEN,    t.DATA_LEN)   AS DATA_LEN,
             COALESCE(dm.DATA_SCALE,  t.DATA_SCALE) AS DATA_SCALE
      FROM STD_DIC t
      LEFT JOIN STD_DOM dm ON t.DOM_ID = dm.DOM_ID
      WHERE t.DIC_ID = ?
    `).get(id) as TermColumn | undefined

    if (!row) return null
    return row
  }).filter(Boolean) as TermColumn[]

  if (columns.length === 0) {
    return NextResponse.json({ error: '유효한 용어를 찾을 수 없습니다' }, { status: 404 })
  }

  // 도메인 미연결 용어 검증
  const noDomain = columns.filter(c => !c.DATA_TYPE)
  if (noDomain.length > 0) {
    return NextResponse.json({
      error: `도메인이 연결되지 않은 용어가 있습니다: ${noDomain.map(c => c.DIC_LOG_NM).join(', ')}`,
      noDomainTerms: noDomain.map(c => c.DIC_ID),
    }, { status: 422 })
  }

  const ddl = generateDDL(tableName, columns, dbms)
  return NextResponse.json({ ddl, tableName, dbms, columnCount: columns.length })
}
