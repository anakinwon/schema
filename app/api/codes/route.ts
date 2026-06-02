import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { writeAudit } from '@/lib/audit'

const NOW = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

// GET /api/codes — 코드 그룹 전체 목록 (코드값 건수 포함)
export async function GET() {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT
        g.CODE_GRP_ID,
        g.CODE_GRP_NM,
        g.CODE_GRP_DESC,
        g.USE_YN,
        g.SORT_SN,
        COUNT(c.CODE_VAL) AS CODE_CNT
      FROM SYS_CODE_GRP g
      LEFT JOIN SYS_CODE_VAL c ON c.CODE_GRP_ID = g.CODE_GRP_ID
      GROUP BY g.CODE_GRP_ID
      ORDER BY g.SORT_SN, g.CODE_GRP_ID
    `).all()
    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/codes — 코드 그룹 생성 (ADMIN/MASTER)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { CODE_GRP_ID, CODE_GRP_NM, CODE_GRP_DESC, SORT_SN } = await req.json()
  if (!CODE_GRP_ID?.trim() || !CODE_GRP_NM?.trim()) {
    return NextResponse.json({ error: 'CODE_GRP_ID, CODE_GRP_NM 필수' }, { status: 400 })
  }

  // 코드 그룹 ID: 대문자+숫자+언더스코어만 허용 (DA 물리명 표준)
  if (!/^[A-Z0-9_]+$/.test(CODE_GRP_ID)) {
    return NextResponse.json({ error: 'CODE_GRP_ID는 대문자·숫자·언더스코어만 허용' }, { status: 400 })
  }

  try {
    const db = getDb()
    const grpId = CODE_GRP_ID.toUpperCase()
    db.prepare(`
      INSERT INTO SYS_CODE_GRP
        (CODE_GRP_ID, CODE_GRP_NM, CODE_GRP_DESC, USE_YN, SORT_SN, REG_USR_ID, REG_DT)
      VALUES (?, ?, ?, 'Y', ?, ?, ?)
    `).run(grpId, CODE_GRP_NM, CODE_GRP_DESC ?? null, SORT_SN ?? 0, auth.email, NOW())

    writeAudit({
      entityType: 'SYS_CODE_GRP',
      entityId:   grpId,
      entityNm:   CODE_GRP_NM,
      actionType: 'INSERT',
      after: { CODE_GRP_ID: grpId, CODE_GRP_NM, CODE_GRP_DESC: CODE_GRP_DESC ?? null, USE_YN: 'Y', SORT_SN: SORT_SN ?? 0 },
      changedBy: auth.email,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: '이미 존재하는 코드 그룹 ID' }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT /api/codes — 코드 그룹 수정 (ADMIN/MASTER)
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { CODE_GRP_ID, CODE_GRP_NM, CODE_GRP_DESC, USE_YN, SORT_SN } = await req.json()
  if (!CODE_GRP_ID?.trim()) {
    return NextResponse.json({ error: 'CODE_GRP_ID 필수' }, { status: 400 })
  }

  try {
    const db = getDb()
    const before = db.prepare('SELECT * FROM SYS_CODE_GRP WHERE CODE_GRP_ID = ?').get(CODE_GRP_ID) as Record<string, unknown> | undefined
    db.prepare(`
      UPDATE SYS_CODE_GRP
      SET CODE_GRP_NM   = COALESCE(?, CODE_GRP_NM),
          CODE_GRP_DESC = COALESCE(?, CODE_GRP_DESC),
          USE_YN        = COALESCE(?, USE_YN),
          SORT_SN       = COALESCE(?, SORT_SN),
          MOD_USR_ID    = ?,
          MOD_DT        = ?
      WHERE CODE_GRP_ID = ?
    `).run(CODE_GRP_NM ?? null, CODE_GRP_DESC ?? null, USE_YN ?? null, SORT_SN ?? null, auth.email, NOW(), CODE_GRP_ID)

    writeAudit({
      entityType: 'SYS_CODE_GRP',
      entityId:   CODE_GRP_ID,
      entityNm:   CODE_GRP_NM ?? String(before?.CODE_GRP_NM ?? CODE_GRP_ID),
      actionType: 'UPDATE',
      before,
      after: { CODE_GRP_ID, CODE_GRP_NM, CODE_GRP_DESC, USE_YN, SORT_SN },
      changedBy: auth.email,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
