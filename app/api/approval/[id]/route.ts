import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminSession } from '@/lib/admin-auth'

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

  const { error } = await supabaseAdmin
    .from('approval_queue')
    .update({
      apv_status:    action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      decided_by:    'ADMIN',
      decided_at:    new Date().toISOString(),
      reject_reason: action === 'REJECT' ? (reason ?? null) : null,
    })
    .eq('apv_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
