import type { Metadata } from 'next'
import BoardAdmin from '@/components/admin/BoardAdmin'

export const metadata: Metadata = {
  title: '게시판 관리 — 스키마 프로그램',
}

export default function AdminBoardPage() {
  return <BoardAdmin />
}
