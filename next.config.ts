import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // X-Frame-Options 제거: Pi Browser가 null origin iframe으로 앱을 로드하므로 SAMEORIGIN이 차단함
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.minepi.com",
      `connect-src 'self' ${supabaseUrl} https://open.er-api.com https://api.minepi.com`,
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // frame-ancestors 미설정: Pi Browser null origin 허용
    ].join('; '),
  },
]

// Pi Browser는 null origin WebView iframe으로 앱을 로드함.
// frame-ancestors에 어떤 origin을 명시해도 null origin은 차단되므로
// 앱 페이지는 불가피하게 frame-ancestors 미설정 (트레이드오프 인지).
// API 라우트는 HTML 임베딩 대상이 아니므로 별도로 DENY 적용.
const apiFrameHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/api/(.*)',
        headers: apiFrameHeaders,
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

export default withNextIntl(nextConfig)
