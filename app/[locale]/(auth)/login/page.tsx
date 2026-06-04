import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: '로그인 — 스키마 프로그램',
}

type Props = { searchParams: Promise<{ error?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams
  return <LoginForm errorCode={error} />
}
