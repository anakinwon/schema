import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// 빌드 타임에 env가 없어도 모듈 평가가 실패하지 않도록 Proxy로 lazy 초기화.
// 첫 property 접근 시점(= 실제 요청 처리)에 createClient가 호출됨.
// bind(instance) 필수: 메서드 내부에서 this가 Proxy가 아닌 실제 인스턴스를 가리키도록 함.
function makeLazyClient(factory: () => SupabaseClient): SupabaseClient {
  let instance: SupabaseClient | undefined
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      instance ??= factory()
      const val = (instance as unknown as Record<string | symbol, unknown>)[prop as string | symbol]
      return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(instance) : val
    },
  })
}

// anon client
export const supabase = makeLazyClient(() =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
)

// service role client (RLS 우회)
export const supabaseAdmin = makeLazyClient(() =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
)
