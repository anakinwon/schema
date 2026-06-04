'use client'

import { usePiAuth } from './pi-auth-provider'

const PiIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#6C3DE0" />
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fontSize="13"
      fontWeight="bold"
      fill="white"
      fontFamily="serif"
    >
      π
    </text>
  </svg>
)

export function PiLoginButton() {
  const { user, isLoading, isRestoring, signIn, signOut } = usePiAuth()

  if (user) {
    return (
      <div className="w-full space-y-2">
        <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
          <p className="font-medium text-purple-900">{user.displayName}</p>
          <p className="text-purple-500 text-xs font-mono">{user.uid.slice(0, 16)}…</p>
        </div>
        <button
          onClick={() => void signOut()}
          className="w-full py-2 px-4 border border-purple-300 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
        >
          <PiIcon />
          Pi 로그아웃
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => void signIn()}
      disabled={isLoading || isRestoring}
      className="w-full py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
    >
      <PiIcon />
      {isRestoring ? '세션 확인 중...' : isLoading ? 'Pi 인증 중...' : 'Pi Network로 로그인'}
    </button>
  )
}
