import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// Bearer 토큰으로 현재 사용자 ID 검증
async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET /api/profile — 내 프로필 조회
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, user_id, username, full_name, bio, phone_number, avatar_url, main_role, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ...data,
    email: user.email,
  })
}

// PATCH /api/profile — 내 프로필 수정
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const body = await req.json()

  // 수정 허용 필드만 추출 (main_role 등 민감 필드 제외)
  const ALLOWED = ['full_name', 'username', 'bio', 'phone_number'] as const
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of ALLOWED) {
    if (field in body) updates[field] = (body as Record<string, unknown>)[field] ?? null
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
