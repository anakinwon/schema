import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '스키마 프로그램',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <span className="text-4xl">🗃️</span>
          <h1 className="text-xl font-bold text-[#1e3a5f] mt-3">스키마 프로그램</h1>
          <p className="text-sm text-gray-500 mt-1">DA Standard Data Management · 쇼핑몰</p>
        </div>
        {children}
      </div>
    </div>
  )
}
