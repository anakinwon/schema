import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { randomUUID } from 'crypto'

// GET /api/approval?status=PENDING
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN'])
  if (!auth.ok) return auth.response

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
  const auth = await requireAuth(request, ['ADMIN'])
  if (!auth.ok) return auth.response

  const body = await request.json()
  const { entity_type, entity_id, entity_nm, req_data } = body

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
      req_by:     auth.email,   // requireAuth에서 검증된 이메일 사용
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
