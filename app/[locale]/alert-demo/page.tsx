'use client'

import * as React from 'react'
import { CustomAlert } from '@/components/custom-alert'

function DeleteConfirmScenario() {
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [showSuccess, setShowSuccess] = React.useState(false)

  const handleDeleteClick = () => {
    setShowConfirm(true)
    setShowSuccess(false)
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    setShowSuccess(true)
  }

  const handleCancel = () => setShowConfirm(false)

  return (
    <div className='space-y-4'>
      <button
        type='button'
        onClick={handleDeleteClick}
        disabled={showConfirm}
        className='inline-flex items-center gap-2 rounded-none border border-red-500/30 bg-red-50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60'
      >
        게시글 삭제
      </button>

      {/* 삭제 확인 — 레이어 팝업 */}
      {showConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='w-full max-w-sm px-4'>
            <CustomAlert
              variant='destructive'
              title='게시글을 삭제하시겠습니까?'
              description='삭제된 게시글은 복구할 수 없습니다.'
              dismissible
              onDismiss={handleCancel}
              onConfirm={handleConfirm}
              confirmLabel='삭제'
              onCancel={handleCancel}
              cancelLabel='취소'
            />
          </div>
        </div>
      )}

      {/* 삭제 완료 — 레이어 팝업 */}
      {showSuccess && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='w-full max-w-sm px-4'>
            <CustomAlert
              variant='success'
              title='게시글이 삭제되었습니다.'
              description='게시글이 성공적으로 삭제되었습니다.'
              dismissible
              onDismiss={() => setShowSuccess(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className='mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
      {children}
    </h2>
  )
}

export default function AlertDemoPage() {
  return (
    <main className='mx-auto max-w-2xl space-y-12 px-4 py-12'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>
          CustomAlert 컴포넌트 데모
        </h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          shadcn/ui New York 프리셋 기반 확장 Alert 컴포넌트 — 5가지 variant
        </p>
      </div>

      <section>
        <SectionHeading>인터랙티브 삭제 확인 시나리오</SectionHeading>
        <p className='mb-4 text-sm text-muted-foreground'>
          &ldquo;게시글 삭제&rdquo; 버튼을 클릭하면 destructive alert가 나타납니다.
        </p>
        <DeleteConfirmScenario />
      </section>

      <section>
        <SectionHeading>Default</SectionHeading>
        <div className='space-y-3'>
          <CustomAlert
            variant='default'
            title='시스템 알림'
            description='시스템 점검이 오늘 자정에 예정되어 있습니다.'
          />
          <CustomAlert
            variant='default'
            title='제목만 있는 기본 알림'
            dismissible
          />
        </div>
      </section>

      <section>
        <SectionHeading>Info</SectionHeading>
        <div className='space-y-3'>
          <CustomAlert
            variant='info'
            title='새로운 기능이 추가되었습니다.'
            description='대시보드에서 실시간 분석 기능을 사용해 보세요.'
          />
          <CustomAlert
            variant='info'
            title='업데이트 안내'
            description='v2.0.0 버전으로 업그레이드하면 성능이 개선됩니다.'
            dismissible
          />
        </div>
      </section>

      <section>
        <SectionHeading>Success</SectionHeading>
        <div className='space-y-3'>
          <CustomAlert
            variant='success'
            title='저장이 완료되었습니다.'
            description='변경사항이 성공적으로 저장되었습니다.'
          />
          <CustomAlert
            variant='success'
            title='이메일 인증이 완료되었습니다.'
            dismissible
          />
        </div>
      </section>

      <section>
        <SectionHeading>Warning</SectionHeading>
        <div className='space-y-3'>
          <CustomAlert
            variant='warning'
            title='비밀번호 만료 예정'
            description='7일 후 비밀번호가 만료됩니다. 지금 변경해 주세요.'
          />
          <CustomAlert
            variant='warning'
            title='저장 공간이 부족합니다.'
            description='현재 사용량이 90%를 초과했습니다.'
            dismissible
          />
        </div>
      </section>

      <section>
        <SectionHeading>Destructive</SectionHeading>
        <div className='space-y-3'>
          <CustomAlert
            variant='destructive'
            title='계정이 잠겼습니다.'
            description='보안 정책에 의해 계정이 일시적으로 잠겼습니다. 고객센터에 문의하세요.'
          />
          <CustomAlert
            variant='destructive'
            title='결제가 실패했습니다.'
            description='카드 정보를 확인하고 다시 시도해 주세요.'
            dismissible
          />
          <CustomAlert
            variant='destructive'
            title='게시글을 삭제하시겠습니까?'
            description='삭제된 게시글은 복구할 수 없습니다.'
            dismissible
            onConfirm={() => alert('삭제 확인됨')}
            confirmLabel='삭제'
            onCancel={() => alert('취소됨')}
            cancelLabel='취소'
          />
        </div>
      </section>
    </main>
  )
}
