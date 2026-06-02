'use client'

import { Link } from '@/i18n/navigation'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Props {
  userName: string
  isAdminSession: boolean
}

export default function AdminLogoutButton({ userName, isAdminSession }: Props) {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )
    await supabase.auth.signOut()
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {!isAdminSession ? (
        <Link
          href="/profile"
          className="text-gray-300 hover:text-white transition-colors"
        >
          👤 {userName}
        </Link>
      ) : (
        <span className="text-gray-400">👤 {userName}</span>
      )}
      <button
        onClick={handleLogout}
        disabled={loading}
        className="px-3 py-1.5 text-xs bg-red-900/60 hover:bg-red-800 text-red-300 rounded transition-colors disabled:opacity-50"
      >
        {loading ? '로그아웃 중…' : '로그아웃'}
      </button>
    </div>
  )
}
