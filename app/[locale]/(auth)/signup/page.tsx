import type { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: '회원가입 — 표준데이터 관리 프로그램',
}

export default function SignupPage() {
  return <SignupForm />
}
