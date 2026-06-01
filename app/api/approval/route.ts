import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminSession } from '@/lib/admin-auth'
import { getChangedBy } from '@/lib/audit'
import { randomUUID } from 'crypto'

// GET /api/approval?status=PENDING
export async function GET(request: NextRequest) {
  // Fix 1: 인증 없이 승인 대기 목록 노출 차단
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 인증 필요' }, { status: 401 })
  }

  const status = request.nextUrl.searchParams.get('status') ?? 'PENDING'

  const { data, error } = await supabaseAdmin
    .from('approval_queue')
    .select('*')
    .eq('apv_status', status)
    .order('req_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/approval — 승인 요청 등록
export async function POST(request: NextRequest) {
  if (!isAdminSession(request)) {
    return NextResponse.json({ error: '관리자 인증 필요' }, { status: 401 })
  }

  const requester = await getChangedBy(request)  // 'ADMIN' | email | 'SYSTEM'

  const body = await request.json()
  const { entity_type, entity_id, entity_nm, req_data } = body  // req_by 클라이언트 입력 무시

  if (!entity_type || !entity_id) {
    return NextResponse.json({ error: 'entity_type, entity_id 필수' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('approval_queue')
    .insert({
      apv_id:     randomUUID(),
      entity_type,
      entity_id,
      entity_nm:  entity_nm ?? null,
      apv_status: 'PENDING',
      req_data:   req_data ?? null,
      req_by:     requester,           // 서버 측 검증된 요청자
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
