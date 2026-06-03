import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { writeAudit, type EntityType } from '@/lib/audit'
import { applyApprovalToDb } from '@/lib/apply-approval'

// PUT /api/approval/[id] — 승인 또는 반려
// body: { action: 'APPROVE' | 'REJECT', reason?: string }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['ADMIN'])
  if (!auth.ok) return auth.response

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
      decided_by:    auth.email,   // requireAuth에서 검증된 이메일 사용
      decided_at:    decidedAt,
      reject_reason: action === 'REJECT' ? (reason ?? null) : null,
    })
    .eq('apv_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
        changedBy:  `승인반영(${auth.email})`,
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
      decided_by:    auth.email,
      decided_at:    decidedAt,
      reject_reason: action === 'REJECT' ? (reason ?? null) : null,
    },
    changedBy: auth.email,
  })

  return NextResponse.json({ ok: true, applied: action === 'APPROVE' && applyBefore !== null })
}

// DELETE /api/approval/[id] — 승인 요청 취소 (논리삭제: apv_status='CANCELLED')
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['ADMIN'])
  if (!auth.ok) return auth.response

  const { id } = await params

  // PENDING 상태만 취소 가능 — 이미 결정된 건 취소 불가
  const { data: existing } = await supabaseAdmin
    .from('approval_queue')
    .select('apv_status')
    .eq('apv_id', id)
    .single()

  if (!existing) return NextResponse.json({ error: '승인 요청을 찾을 수 없습니다' }, { status: 404 })
  if (existing.apv_status !== 'PENDING') {
    return NextResponse.json(
      { error: `이미 처리된 요청입니다 (상태: ${existing.apv_status})` },
      { status: 409 },
    )
  }

  const { error } = await supabaseAdmin
    .from('approval_queue')
    .update({
      apv_status:  'CANCELLED',
      decided_by:  auth.email,
      decided_at:  new Date().toISOString(),
    })
    .eq('apv_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
