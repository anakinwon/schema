'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// -----------------------------------------------------------------------
// CustomAlert variant 정의
// 기본 구조는 shadcn New York alert 패턴을 따르되,
// info / success / warning / destructive 색상 variant를 추가 확장
// -----------------------------------------------------------------------
const customAlertVariants = cva(
  // 기본 클래스: shadcn New York 스타일 grid 레이아웃
  'group/alert relative grid w-full gap-1 border px-4 py-3 text-left text-sm after:absolute after:-inset-y-px after:-left-px after:w-0.5 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*=\'size-\'])]:size-4',
  {
    variants: {
      variant: {
        // 기본 variant
        default: 'bg-card text-card-foreground after:bg-foreground',
        // 정보 알림 — 파란색 계열
        info: [
          'border-blue-500/30 bg-blue-50/80 text-blue-900 after:bg-blue-500',
          'dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-500/30 dark:after:bg-blue-400',
          '*:[svg]:text-blue-600 dark:*:[svg]:text-blue-400',
        ].join(' '),
        // 성공 알림 — 초록색 계열
        success: [
          'border-green-500/30 bg-green-50/80 text-green-900 after:bg-green-500',
          'dark:bg-green-950/40 dark:text-green-100 dark:border-green-500/30 dark:after:bg-green-400',
          '*:[svg]:text-green-600 dark:*:[svg]:text-green-400',
        ].join(' '),
        // 경고 알림 — 노란색 계열
        warning: [
          'border-yellow-500/30 bg-yellow-50/80 text-yellow-900 after:bg-yellow-500',
          'dark:bg-yellow-950/40 dark:text-yellow-100 dark:border-yellow-500/30 dark:after:bg-yellow-400',
          '*:[svg]:text-yellow-600 dark:*:[svg]:text-yellow-400',
        ].join(' '),
        // 위험/삭제 알림 — 빨간색 계열
        destructive: [
          'border-red-500/30 bg-red-50/80 text-red-900 after:bg-red-500',
          'dark:bg-red-950/40 dark:text-red-100 dark:border-red-500/30 dark:after:bg-red-400',
          '*:[svg]:text-red-600 dark:*:[svg]:text-red-400',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

// variant별 아이콘 자동 매핑 상수
const VARIANT_ICONS = {
  default: null,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
} as const

// -----------------------------------------------------------------------
// CustomAlert Props 인터페이스
// -----------------------------------------------------------------------
interface CustomAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof customAlertVariants> {
  // 알림 제목 (필수)
  title: string
  // 알림 설명 (선택)
  description?: string
  // 닫기 버튼 표시 여부
  dismissible?: boolean
  // 닫기 버튼 클릭 시 콜백
  onDismiss?: () => void
  // 확인 버튼 클릭 시 콜백 (제공 시 확인 버튼 렌더링)
  onConfirm?: () => void
  // 확인 버튼 레이블
  confirmLabel?: string
  // 취소 버튼 클릭 시 콜백 (제공 시 취소 버튼 렌더링)
  onCancel?: () => void
  // 취소 버튼 레이블
  cancelLabel?: string
}

// -----------------------------------------------------------------------
// CustomAlert 컴포넌트
// -----------------------------------------------------------------------
function CustomAlert({
  className,
  variant = 'default',
  title,
  description,
  dismissible = false,
  onDismiss,
  onConfirm,
  confirmLabel = '확인',
  onCancel,
  cancelLabel = '취소',
  ...props
}: CustomAlertProps) {
  // 닫힘 상태 관리
  const [visible, setVisible] = React.useState(true)
  // 애니메이션 종료 추적 (fade-out 완료 후 DOM에서 제거)
  const [animatingOut, setAnimatingOut] = React.useState(false)

  // 닫기 핸들러 — 애니메이션 후 숨김 처리
  const handleDismiss = React.useCallback(() => {
    setAnimatingOut(true)
  }, [])

  // 애니메이션 종료 이벤트 핸들러
  const handleAnimationEnd = React.useCallback(() => {
    if (animatingOut) {
      setVisible(false)
      onDismiss?.()
    }
  }, [animatingOut, onDismiss])

  // 완전히 숨겨진 경우 DOM에서 제거
  if (!visible) {
    return null
  }

  // 현재 variant에 해당하는 아이콘 컴포넌트
  const IconComponent = VARIANT_ICONS[variant ?? 'default']

  // destructive variant는 더 긴급한 역할(assertive), 나머지는 polite
  const ariaLive = variant === 'destructive' ? 'assertive' : 'polite'

  // 확인/취소 버튼 표시 여부
  const hasActions = Boolean(onConfirm || onCancel)

  return (
    <div
      role='alert'
      aria-live={ariaLive}
      aria-hidden={!visible}
      data-slot='alert'
      className={cn(
        customAlertVariants({ variant }),
        // 닫힘 애니메이션: tw-animate-css 클래스 활용
        animatingOut && 'animate-out fade-out slide-out-to-top-1 duration-200',
        // 확인/취소 버튼이 있을 경우 하단 패딩 추가
        hasActions && 'pb-4',
        className
      )}
      onAnimationEnd={handleAnimationEnd}
      {...props}
    >
      {/* variant에 해당하는 아이콘 자동 렌더링 */}
      {IconComponent && <IconComponent />}

      {/* 본문 영역 */}
      <div className='group-has-[>svg]/alert:col-start-2'>
        {/* 제목 */}
        <div
          data-slot='alert-title'
          className='font-semibold leading-snug tracking-tight'
        >
          {title}
        </div>

        {/* 설명 (선택) */}
        {description && (
          <div
            data-slot='alert-description'
            className='mt-1 text-sm opacity-90'
          >
            {description}
          </div>
        )}

        {/* 확인 / 취소 버튼 영역 */}
        {hasActions && (
          <div className='mt-3 flex items-center gap-2'>
            {onConfirm && (
              <Button
                size='sm'
                variant={variant === 'destructive' ? 'destructive' : 'default'}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            )}
            {onCancel && (
              <Button
                size='sm'
                variant='outline'
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 닫기 버튼 (dismissible=true 일 때만 표시) */}
      {dismissible && (
        <button
          type='button'
          aria-label='알림 닫기'
          onClick={handleDismiss}
          className={cn(
            'absolute top-3 right-3',
            'rounded-sm p-0.5 opacity-60 transition-opacity',
            'hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1',
          )}
        >
          <X className='size-3.5' />
          <span className='sr-only'>닫기</span>
        </button>
      )}
    </div>
  )
}

export { CustomAlert, customAlertVariants }
export type { CustomAlertProps }
