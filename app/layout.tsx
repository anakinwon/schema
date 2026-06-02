import type { ReactNode } from 'react'

// [locale]/layout.tsx 가 <html> 태그를 포함하므로 여기서는 children만 통과시킴
// next-intl 권장 패턴: root layout은 단순 passthrough
// (not-found.tsx 등 root 레벨 파일이 있으면 layout이 필요함)
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
