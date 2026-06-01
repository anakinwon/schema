import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-guard'
import { isOwnerOrAdmin, VALID_CATEGORIES } from '@/lib/board'
import { randomUUID } from 'crypto'

type Params = { params: Promise<{ category: string; id: string }> }

const BUCKET       = 'board-attachments'
const MAX_FILE_MB  = 20
const MAX_FILES    = 5

// GET /api/board/[category]/posts/[id]/attachments
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id } = await params

  if (!VALID_CATEGORIES.includes(category.toUpperCase())) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('brd_attch')
    .select('attch_id, fl_nm, fl_url, fl_sz, fl_tp, reg_dts')
    .eq('post_id', id)
    .order('reg_dts', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/board/[category]/posts/[id]/attachments  (multipart/form-data)
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req, ['USER', 'SUBMANAGER', 'MANAGER', 'MASTER', 'ADMIN'])
  if (!auth.ok) return auth.response

  const { category, id } = await params
  const ctgrCd = category.toUpperCase()

  if (!VALID_CATEGORIES.includes(ctgrCd)) {
    return NextResponse.json({ error: '존재하지 않는 게시판입니다' }, { status: 404 })
  }

  // 게시글 소유권 확인
  const { data: post } = await supabaseAdmin
    .from('brd_post')
    .select('rgst_usr_id')
    .eq('post_id', id)
    .eq('ctgr_cd', ctgrCd)
    .single()

  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 })
  }

  if (!auth.user_id || !isOwnerOrAdmin(post.rgst_usr_id, auth.user_id, auth.role_cd)) {
    return NextResponse.json({ error: '첨부파일 업로드 권한이 없습니다' }, { status: 403 })
  }

  // 현재 첨부파일 수 확인
  const { count } = await supabaseAdmin
    .from('brd_attch')
    .select('attch_id', { count: 'exact', head: true })
    .eq('post_id', id)

  if ((count ?? 0) >= MAX_FILES) {
    return NextResponse.json(
      { error: `첨부파일은 최대 ${MAX_FILES}개까지 가능합니다` },
      { status: 400 },
    )
  }

  // multipart 파싱
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'file 필드가 필요합니다' }, { status: 400 })
  }

  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `파일 크기는 ${MAX_FILE_MB}MB 이하여야 합니다` },
      { status: 400 },
    )
  }

  // Storage 업로드
  const ext      = file.name.split('.').pop() ?? 'bin'
  const fileUuid = randomUUID()
  const fl_pth   = `${id}/${fileUuid}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fl_pth, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  // Public URL 생성
  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fl_pth)

  // brd_attch INSERT
  const { data: attch, error: dbErr } = await supabaseAdmin
    .from('brd_attch')
    .insert({
      post_id:    id,
      fl_nm:      file.name,
      fl_pth,
      fl_url:     urlData.publicUrl,
      fl_sz:      file.size,
      fl_tp:      file.type,
      reg_usr_id: auth.email,
      mod_usr_id: auth.email,
    })
    .select('attch_id, fl_nm, fl_url, fl_sz, fl_tp, reg_dts')
    .single()

  if (dbErr) {
    // DB 실패 시 Storage 롤백
    await supabaseAdmin.storage.from(BUCKET).remove([fl_pth])
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json(attch, { status: 201 })
}
