'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

interface Props {
  userName: string
  isAdminSession: boolean
}

export default function BoardUserMenu({ userName, isAdminSession }: Props) {
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  const handleLogout = async () => {
    setLoading(true)
    if (isAdminSession) {
      await fetch('/api/admin/logout', { method: 'POST' })
      window.location.href = '/admin/login'
    } else {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href="/profile"
        className="text-blue-200 hover:text-white transition-colors hidden sm:inline"
      >
        👤 {userName}
      </Link>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="px-2.5 py-1 rounded text-blue-200 border border-blue-400/40 hover:text-white hover:bg-white/10 hover:border-white/30 transition-colors disabled:opacity-50 text-xs"
      >
        {loading ? '...' : '로그아웃'}
      </button>
    </div>
  )
}
