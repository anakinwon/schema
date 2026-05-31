/**
 * /admin/login 은 proxy.ts에서 역할 검증 후 항상 리다이렉트됩니다:
 *   - 미인증 → /login
 *   - admin/master → /admin
 *   - 그 외 역할 → /
 * 이 페이지는 직접 접근 시 fallback 안내용입니다.
 */
export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">
        <span className="text-4xl">🔄</span>
        <p className="mt-3 text-gray-400 text-sm">리다이렉트 중...</p>
      </div>
    </div>
  )
}
