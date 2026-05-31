import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: '로그인 — 표준데이터 관리 프로그램',
}

export default function LoginPage() {
  return <LoginForm />
}
