import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { writeAudit } from '@/lib/audit'

type Params = { params: Promise<{ grpId: string }> }
const NOW = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

// GET /api/codes/[grpId] — 특정 그룹의 코드값 목록
export async function GET(_req: NextRequest, { params }: Params) {
  const { grpId } = await params
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT CODE_GRP_ID, CODE_VAL, CODE_VAL_NM, CODE_VAL_ENG, CODE_VAL_DESC,
             USE_YN, SORT_SN, REG_USR_ID, REG_DT, MOD_USR_ID, MOD_DT
      FROM SYS_CODE_VAL
      WHERE CODE_GRP_ID = ?
      ORDER BY SORT_SN, CODE_VAL
    `).all(grpId)
    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/codes/[grpId] — 코드값 추가 (ADMIN/MASTER)
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { grpId } = await params
  const { CODE_VAL, CODE_VAL_NM, CODE_VAL_ENG, CODE_VAL_DESC, SORT_SN } = await req.json()

  if (!CODE_VAL?.trim() || !CODE_VAL_NM?.trim()) {
    return NextResponse.json({ error: 'CODE_VAL, CODE_VAL_NM 필수' }, { status: 400 })
  }

  try {
    const db = getDb()

    // 코드 그룹 존재 여부 확인
    const grp = db.prepare(`SELECT CODE_GRP_ID FROM SYS_CODE_GRP WHERE CODE_GRP_ID = ?`).get(grpId)
    if (!grp) return NextResponse.json({ error: '존재하지 않는 코드 그룹' }, { status: 404 })

    db.prepare(`
      INSERT INTO SYS_CODE_VAL
        (CODE_GRP_ID, CODE_VAL, CODE_VAL_NM, CODE_VAL_ENG, CODE_VAL_DESC, USE_YN, SORT_SN, REG_USR_ID, REG_DT)
      VALUES (?, ?, ?, ?, ?, 'Y', ?, ?, ?)
    `).run(grpId, CODE_VAL, CODE_VAL_NM, CODE_VAL_ENG ?? null, CODE_VAL_DESC ?? null, SORT_SN ?? 0, auth.email, NOW())

    writeAudit({
      entityType: 'SYS_CODE_VAL',
      entityId:   `${grpId}:${CODE_VAL}`,
      entityNm:   `${grpId} · ${CODE_VAL_NM}`,
      actionType: 'INSERT',
      after: { CODE_GRP_ID: grpId, CODE_VAL, CODE_VAL_NM, CODE_VAL_ENG: CODE_VAL_ENG ?? null, CODE_VAL_DESC: CODE_VAL_DESC ?? null, USE_YN: 'Y', SORT_SN: SORT_SN ?? 0 },
      changedBy: auth.email,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: '이미 존재하는 코드값' }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT /api/codes/[grpId] — 코드값 수정 (ADMIN/MASTER)
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { grpId } = await params
  const { CODE_VAL, CODE_VAL_NM, CODE_VAL_ENG, CODE_VAL_DESC, USE_YN, SORT_SN } = await req.json()

  if (!CODE_VAL?.trim()) {
    return NextResponse.json({ error: 'CODE_VAL 필수' }, { status: 400 })
  }

  try {
    const db = getDb()
    const before = db.prepare('SELECT * FROM SYS_CODE_VAL WHERE CODE_GRP_ID = ? AND CODE_VAL = ?').get(grpId, CODE_VAL) as Record<string, unknown> | undefined
    const result = db.prepare(`
      UPDATE SYS_CODE_VAL
      SET CODE_VAL_NM   = COALESCE(?, CODE_VAL_NM),
          CODE_VAL_ENG  = COALESCE(?, CODE_VAL_ENG),
          CODE_VAL_DESC = COALESCE(?, CODE_VAL_DESC),
          USE_YN        = COALESCE(?, USE_YN),
          SORT_SN       = COALESCE(?, SORT_SN),
          MOD_USR_ID    = ?,
          MOD_DT        = ?
      WHERE CODE_GRP_ID = ? AND CODE_VAL = ?
    `).run(
      CODE_VAL_NM ?? null, CODE_VAL_ENG ?? null, CODE_VAL_DESC ?? null,
      USE_YN ?? null, SORT_SN ?? null,
      auth.email, NOW(),
      grpId, CODE_VAL,
    )

    if (result.changes === 0) return NextResponse.json({ error: '코드값 없음' }, { status: 404 })

    writeAudit({
      entityType: 'SYS_CODE_VAL',
      entityId:   `${grpId}:${CODE_VAL}`,
      entityNm:   `${grpId} · ${CODE_VAL_NM ?? String(before?.CODE_VAL_NM ?? CODE_VAL)}`,
      actionType: 'UPDATE',
      before,
      after: { CODE_GRP_ID: grpId, CODE_VAL, CODE_VAL_NM, CODE_VAL_ENG, CODE_VAL_DESC, USE_YN, SORT_SN },
      changedBy: auth.email,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE /api/codes/[grpId]?codeVal=XXX — 논리 삭제 (USE_YN='N')
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['ADMIN', 'MASTER'])
  if (!auth.ok) return auth.response

  const { grpId } = await params
  const codeVal = req.nextUrl.searchParams.get('codeVal')

  if (!codeVal) return NextResponse.json({ error: 'codeVal 쿼리 파라미터 필수' }, { status: 400 })

  try {
    const db = getDb()
    const before = db.prepare('SELECT * FROM SYS_CODE_VAL WHERE CODE_GRP_ID = ? AND CODE_VAL = ?').get(grpId, codeVal) as Record<string, unknown> | undefined
    // 물리 삭제 대신 USE_YN='N' 처리 (DA §40: 코드 이력 보존)
    const result = db.prepare(`
      UPDATE SYS_CODE_VAL
      SET USE_YN = 'N', MOD_USR_ID = ?, MOD_DT = ?
      WHERE CODE_GRP_ID = ? AND CODE_VAL = ?
    `).run(auth.email, NOW(), grpId, codeVal)

    if (result.changes === 0) return NextResponse.json({ error: '코드값 없음' }, { status: 404 })

    writeAudit({
      entityType: 'SYS_CODE_VAL',
      entityId:   `${grpId}:${codeVal}`,
      entityNm:   `${grpId} · ${String(before?.CODE_VAL_NM ?? codeVal)}`,
      actionType: 'DELETE',
      before,
      after: { USE_YN: 'N' },
      changedBy: auth.email,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
