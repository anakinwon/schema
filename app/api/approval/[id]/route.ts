import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminSession } from '@/lib/admin-auth'
import { writeAudit, getChangedBy } from '@/lib/audit'

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

  // 변경 전 상태 조회 (before 스냅샷)
  const { data: current } = await supabaseAdmin
    .from('approval_queue')
    .select('entity_nm, entity_type, entity_id, apv_status')
    .eq('apv_id', id)
    .single()

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

  // 승인/반려 결정 이력 기록
  writeAudit({
    entityType: 'APPROVAL',
    entityId:   id,
    entityNm:   current?.entity_nm ?? id,
    actionType: 'UPDATE',
    before: {
      apv_status:   current?.apv_status ?? 'PENDING',
      entity_type:  current?.entity_type ?? null,
      entity_id:    current?.entity_id   ?? null,
    },
    after: {
      apv_status:    newStatus,
      decided_by:    'ADMIN',
      decided_at:    decidedAt,
      reject_reason: action === 'REJECT' ? (reason ?? null) : null,
    },
    changedBy: await getChangedBy(request),
  })

  return NextResponse.json({ ok: true })
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
