import 'server-only'
import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 브라우저용 (anon)
export const supabase = createClient(url, anonKey)

// 서버 API 라우트용 (RLS 우회)
export const supabaseAdmin = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
