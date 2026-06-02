import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  experimental: {
    // React 19 Scheduler Profiler가 Turbopack HMR과 타이밍 충돌을 일으키는 문제 완화
    reactOwnerStack: false,
  },
}

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

export default withNextIntl(nextConfig)
