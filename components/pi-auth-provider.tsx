'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface PiSessionUser {
  uid: string
  displayName: string
  username: string | null
  scopesGranted: string[]
  tokenValidUntil: string
}

interface PiAuthContextValue {
  user: PiSessionUser | null
  isLoading: boolean
  isRestoring: boolean
  authError: string | null
  isInPiBrowser: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const PiAuthContext = createContext<PiAuthContextValue | null>(null)

function detectPiBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /PiBrowser/i.test(navigator.userAgent)
}

function onIncompletePaymentFound(payment: PiIncompletePayment) {
  console.warn('[Pi] 미완료 결제 발견:', payment.identifier)
}

// afterInteractive 전략으로 SDK가 hydration 후 로드되므로 준비될 때까지 폴링
function waitForPiSdk(maxMs = 5000): Promise<PiSDK> {
  return new Promise((resolve, reject) => {
    if (window.Pi) { resolve(window.Pi); return }
    const start = Date.now()
    const timer = setInterval(() => {
      if (window.Pi) {
        clearInterval(timer)
        resolve(window.Pi)
      } else if (Date.now() - start >= maxMs) {
        clearInterval(timer)
        reject(new Error('Pi SDK 로드 타임아웃 (5초)'))
      }
    }, 100)
  })
}

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PiSessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isInPiBrowser] = useState<boolean>(() =>
    typeof window !== 'undefined' ? detectPiBrowser() : false
  )
  const autoAuthAttempted = useRef(false)
  const piInitializedRef = useRef(false)

  const signIn = useCallback(async () => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const Pi = await waitForPiSdk()

      // Pi.init()은 앱 생명주기에서 1회만 호출 — 중복 호출 시 SDK가 reject함
      if (!piInitializedRef.current) {
        await Promise.resolve(
          Pi.init({
            version: '2.0',
            sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === 'true',
          })
        )
        piInitializedRef.current = true
      }

      const authResult = await Pi.authenticate(['username'], onIncompletePaymentFound)

      const res = await fetch('/api/auth/pi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: authResult.accessToken }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'Pi 인증 실패')
      }

      const data = (await res.json()) as { success: boolean; user: PiSessionUser }
      setUser(data.user)
      // Pi 인증 완료 후 로그인/회원가입 페이지이면 홈으로 이동
      if (typeof window !== 'undefined') {
        const p = window.location.pathname
        if (p.endsWith('/login') || p.endsWith('/signup')) {
          window.location.href = '/'
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Pi 인증 중 오류가 발생했습니다'
      console.error('[Pi] 인증 오류:', err)
      setAuthError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/pi', { method: 'DELETE' })
    setUser(null)
  }, [])

  // 앱 로드 시 기존 pi_session 쿠키로 세션 복원 시도
  useEffect(() => {
    fetch('/api/auth/pi')
      .then(r => r.json())
      .then((data: { user: PiSessionUser | null }) => {
        if (data.user) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => setIsRestoring(false))
  }, [])

  // Pi Browser 환경에서 세션 복원 실패 시 자동 인증
  useEffect(() => {
    if (isRestoring) return
    if (isInPiBrowser && !user && !autoAuthAttempted.current) {
      autoAuthAttempted.current = true
      void signIn()
    }
  }, [isRestoring, isInPiBrowser, user, signIn])

  return (
    <PiAuthContext.Provider value={{ user, isLoading, isRestoring, authError, isInPiBrowser, signIn, signOut }}>
      {children}
    </PiAuthContext.Provider>
  )
}

export function usePiAuth(): PiAuthContextValue {
  const ctx = useContext(PiAuthContext)
  if (!ctx) throw new Error('usePiAuth는 PiAuthProvider 내부에서만 사용 가능합니다')
  return ctx
}
