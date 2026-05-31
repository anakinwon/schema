import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server Component / API Route / Server Action 전용 Supabase 클라이언트
// 쿠키 기반 세션을 읽고 갱신함
export async function createSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키 쓰기 불가 → 무시 (proxy.ts가 처리)
          }
        },
      },
    }
  )
}
