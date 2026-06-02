// next-intl as-needed 설정에서 기본 locale(ko)은 URL prefix가 없음
// next-intl middleware가 / 를 /ko 로 rewrite하지 않으면
// app/[locale]/page.tsx 가 아닌 이 파일이 실행됨
// → /notice 로 fallback redirect (proxy.ts 에서 인증 후 최종 목적지 결정)
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/notice')
}
