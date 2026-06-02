import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminSession } from '@/lib/admin-auth'
import { writeAudit, getChangedBy, type EntityType } from '@/lib/audit'
import { applyApprovalToDb } from '@/lib/apply-approval'

// PUT /api/approval/[id] — 승인 또는 반려
// body: { action: 'APPROVE' | 'REJECT', reason?: string }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 인증 필요' }, { status: 401 })
  }

  const { id } = await params
  const { action, reason } = await request.json()

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return NextResponse.json({ error: 'action은 APPROVE 또는 REJECT' }, { status: 400 })
  }

  // 변경 전 상태 조회 (req_data 포함)
  const { data: current } = await supabaseAdmin
    .from('approval_queue')
    .select('entity_nm, entity_type, entity_id, apv_status, req_data')
    .eq('apv_id', id)
    .single()

  // ── APPROVE: 원본 테이블 반영 (SQLite) ──────────────────────────────
  // SQLite 반영 먼저 → 성공 시에만 Supabase approval_queue 업데이트
  let applyBefore: Record<string, unknown> | null = null

  if (action === 'APPROVE' && current?.req_data && current?.entity_type && current?.entity_id) {
    const applyResult = applyApprovalToDb(
      current.entity_type,
      current.entity_id,
      current.req_data as Record<string, unknown>,
    )
    if (!applyResult.ok) {
      return NextResponse.json(
        { error: `DB 반영 실패 — 승인 취소됨: ${applyResult.error}` },
        { status: 500 },
      )
    }
    applyBefore = applyResult.before
  }

  // ── approval_queue 상태 업데이트 ────────────────────────────────────
  const decidedAt = new Date().toISOString()
  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

  const { error } = await supabaseAdmin
    .from('approval_queue')
    .update({
      apv_status:    newStatus,
      decided_by:    'ADMIN',
      decided_at:    decidedAt,
      reject_reason: action === 'REJECT' ? (reason ?? null) : null,
    })
    .eq('apv_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const changedBy = await getChangedBy(request)

  // ── Audit: 원본 엔티티 변경 이력 (APPROVE + STD_DIC / STD_DOM) ─────
  if (action === 'APPROVE' && applyBefore !== null && current?.entity_type && current?.entity_id) {
    const entityType = current.entity_type as EntityType
    if (entityType === 'STD_DIC' || entityType === 'STD_DOM') {
      writeAudit({
        entityType,
        entityId:   current.entity_id,
        entityNm:   current.entity_nm ?? current.entity_id,
        actionType: 'UPDATE',
        before:     applyBefore,
        after:      current.req_data as Record<string, unknown>,
        changedBy:  `승인반영(${changedBy})`,
      })
    }
  }

  // ── Audit: 승인/반려 결정 이력 ──────────────────────────────────────
  writeAudit({
    entityType: 'APPROVAL',
    entityId:   id,
    entityNm:   current?.entity_nm ?? id,
    actionType: 'UPDATE',
    before: {
      apv_status:  current?.apv_status ?? 'PENDING',
      entity_type: current?.entity_type ?? null,
      entity_id:   current?.entity_id   ?? null,
    },
    after: {
      apv_status:    newStatus,
      decided_by:    'ADMIN',
      decided_at:    decidedAt,
      reject_reason: action === 'REJECT' ? (reason ?? null) : null,
    },
    changedBy,
  })

  return NextResponse.json({ ok: true, applied: action === 'APPROVE' && applyBefore !== null })
}

// DELETE /api/approval/[id] — 승인 요청 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 인증 필요' }, { status: 401 })
  }

  const { id } = await params
  const { error } = await supabaseAdmin
    .from('approval_queue')
    .delete()
    .eq('apv_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
