'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'

interface Profile {
  id: string
  user_id: string
  email: string
  username: string | null
  full_name: string | null
  bio: string | null
  phone_number: string | null
  avatar_url: string | null
  main_role: string
  created_at: string | null
  updated_at: string | null
}

const ROLE_LABEL: Record<string, string> = {
  admin:     '시스템관리자',
  master:    '데이터관리자',
  manager:   '표준관리자',
  sub_admin: '부표준관리자',
  user:      '일반사용자',
}

const ROLE_COLOR: Record<string, string> = {
  admin:     'bg-rose-100 text-rose-700',
  master:    'bg-purple-100 text-purple-700',
  manager:   'bg-blue-100 text-blue-700',
  sub_admin: 'bg-teal-100 text-teal-700',
  user:      'bg-gray-100 text-gray-600',
}

export default function ProfilePage() {
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState<{ text: string; ok: boolean } | null>(null)

  // 프로필 폼
  const [fullName, setFullName]       = useState('')
  const [username, setUsername]       = useState('')
  const [bio, setBio]                 = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  // 아바타
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 비밀번호 변경
  const [newPw, setNewPw]       = useState('')
  const [newPwCfm, setNewPwCfm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ), [])

  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }

    const res = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return
    const data: Profile = await res.json()
    setProfile(data)
    setFullName(data.full_name ?? '')
    setUsername(data.username ?? '')
    setBio(data.bio ?? '')
    setPhoneNumber(data.phone_number ?? '')
    setAvatarUrl(data.avatar_url ?? null)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ── 아바타 파일 선택 ──────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하여야 합니다', false)
      return
    }
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다', false)
      return
    }

    // 즉시 미리보기
    const reader = new FileReader()
    reader.onload = e => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    uploadAvatar(file)
  }

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    })

    setUploading(false)
    if (res.ok) {
      const { avatar_url } = await res.json()
      setAvatarUrl(avatar_url)
      setAvatarPreview(null)   // 서버 URL로 대체
      showToast('프로필 사진이 변경됐습니다', true)
    } else {
      setAvatarPreview(null)
      const e = await res.json()
      showToast(e.error ?? '업로드 실패', false)
    }
    // 파일 input 초기화 (같은 파일 재선택 가능)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const deleteAvatar = async () => {
    if (!confirm('프로필 사진을 삭제하시겠습니까?')) return
    setUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/profile/avatar', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    setUploading(false)
    if (res.ok) {
      setAvatarUrl(null)
      setAvatarPreview(null)
      showToast('프로필 사진이 삭제됐습니다', true)
    }
  }

  // ── 프로필 저장 ───────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ full_name: fullName, username, bio, phone_number: phoneNumber }),
    })
    setSaving(false)
    res.ok ? showToast('프로필이 저장됐습니다', true) : showToast((await res.json()).error ?? '저장 실패', false)
  }

  // ── 비밀번호 변경 ─────────────────────────────────────
  const changePassword = async () => {
    if (newPw.length < 8) { showToast('비밀번호는 8자 이상이어야 합니다', false); return }
    if (newPw !== newPwCfm) { showToast('비밀번호가 일치하지 않습니다', false); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)
    if (error) {
      showToast(error.message, false)
    } else {
      setNewPw(''); setNewPwCfm('')
      showToast('비밀번호가 변경됐습니다', true)
    }
  }

  // ── 현재 표시할 아바타 소스 ───────────────────────────
  const displayAvatar = avatarPreview ?? avatarUrl
  const initials = (profile?.full_name ?? profile?.email ?? '?')[0].toUpperCase()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400 animate-pulse">
        로딩 중…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <header className="bg-[#1e3a5f] text-white px-6 py-3 flex items-center gap-3 shadow">
        <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xl">🗃️</span>
          <span className="text-sm font-bold">스키마 프로그램</span>
        </a>
        <span className="text-blue-400 text-sm">/ 내 프로필</span>
        <div className="ml-auto">
          <a href="/" className="text-xs text-blue-300 hover:text-white transition-colors">← 메인으로</a>
        </div>
      </header>

      {/* 토스트 */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all
          ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? '✓' : '✗'} {toast.text}
        </div>
      )}

      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">

        {/* ── 프로필 사진 + 요약 카드 ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-6">

          {/* 아바타 영역 */}
          <div className="relative shrink-0 group">
            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* 아바타 이미지 */}
            <button
              type="button"
              onClick={() => !uploading && fileInputRef.current?.click()}
              disabled={uploading}
              className="relative w-24 h-24 rounded-full overflow-hidden block focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2"
              title="클릭하여 사진 변경"
            >
              {displayAvatar ? (
                <Image
                  src={displayAvatar}
                  alt="프로필 사진"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-[#1e3a5f] flex items-center justify-center text-white text-3xl font-bold">
                  {initials}
                </div>
              )}

              {/* 호버 오버레이 */}
              {!uploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-lg">📷</span>
                  <span className="text-white text-[11px] mt-0.5 font-medium">사진 변경</span>
                </div>
              )}

              {/* 업로드 중 스피너 */}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>

            {/* 삭제 버튼 — 사진이 있을 때만 */}
            {(displayAvatar) && !uploading && (
              <button
                type="button"
                onClick={deleteAvatar}
                title="프로필 사진 삭제"
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center shadow transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* 사용자 정보 */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-gray-800 truncate">
              {profile?.full_name ?? profile?.email}
            </div>
            <div className="text-sm text-gray-500 mt-0.5 truncate">{profile?.email}</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${ROLE_COLOR[profile?.main_role ?? 'user']}`}>
                {ROLE_LABEL[profile?.main_role ?? 'user']}
              </span>
              {profile?.username && (
                <span className="text-xs text-gray-400 font-mono">@{profile.username}</span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              사진을 클릭하거나 드래그하여 변경 · JPG · PNG · GIF · WEBP · 최대 5MB
            </p>
          </div>

          <div className="ml-auto text-xs text-gray-400 text-right shrink-0">
            <div>가입일</div>
            <div>{profile?.created_at?.slice(0, 10) ?? '—'}</div>
          </div>
        </div>

        {/* ── 기본 정보 수정 ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>👤</span> 기본 정보 수정
          </h2>
          <div className="space-y-4">
            <Field label="이름 (실명)">
              <input className={inputCls} value={fullName}
                onChange={e => setFullName(e.target.value)} placeholder="홍길동" />
            </Field>
            <Field label="사용자명">
              <input className={inputCls} value={username}
                onChange={e => setUsername(e.target.value)} placeholder="hong_gildong" />
            </Field>
            <Field label="연락처">
              <input className={inputCls} value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)} placeholder="010-0000-0000" />
            </Field>
            <Field label="자기소개">
              <textarea className={`${inputCls} resize-none h-20`} value={bio}
                onChange={e => setBio(e.target.value)} placeholder="간단한 소개를 입력하세요" />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={saveProfile} disabled={saving}
              className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7f] disabled:opacity-50 transition-colors">
              {saving ? '저장 중…' : '프로필 저장'}
            </button>
          </div>
        </div>

        {/* ── 역할 정보 (읽기 전용) ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>🔐</span> 역할 및 권한
            <span className="text-[11px] text-gray-400 font-normal ml-1">(관리자만 변경 가능)</span>
          </h2>
          <div className="flex items-center gap-3 py-1">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${ROLE_COLOR[profile?.main_role ?? 'user']}`}>
              {ROLE_LABEL[profile?.main_role ?? 'user']}
            </span>
            <span className="text-xs text-gray-400 font-mono">{(profile?.main_role ?? 'user').toUpperCase()}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">역할 변경이 필요한 경우 시스템 관리자에게 문의하세요.</p>
        </div>

        {/* ── 비밀번호 변경 ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🔑</span> 비밀번호 변경
          </h2>
          <div className="space-y-4">
            <Field label="새 비밀번호 (8자 이상)">
              <input type="password" className={inputCls} value={newPw}
                onChange={e => setNewPw(e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="새 비밀번호 확인">
              <input type="password" className={inputCls} value={newPwCfm}
                onChange={e => setNewPwCfm(e.target.value)} placeholder="••••••••" />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={changePassword} disabled={pwSaving || !newPw || !newPwCfm}
              className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 transition-colors">
              {pwSaving ? '변경 중…' : '비밀번호 변경'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          마지막 수정: {profile?.updated_at ? new Date(profile.updated_at).toLocaleString('ko-KR') : '—'}
        </p>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
