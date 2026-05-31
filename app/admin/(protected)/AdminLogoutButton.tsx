'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
    await supabase.auth.signOut()
    // admin-session 쿠키도 서버에서 삭제
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-3 py-1.5 text-xs bg-red-900/60 hover:bg-red-800 text-red-300 rounded transition-colors disabled:opacity-50"
    >
      {loading ? '로그아웃 중…' : '로그아웃'}
    </button>
  )
}
