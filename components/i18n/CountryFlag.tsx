import { cn } from '@/lib/utils'

// flag-icons 라이브러리(SVG) 기반 국기 — 모든 OS에서 동일하게 렌더링
// 이모지 국기는 Windows에서 'KR' 텍스트로 표시되는 문제가 있어 SVG 사용

type FlagSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASS: Record<FlagSize, string> = {
  sm: 'w-5  h-[15px]',   // 20 × 15
  md: 'w-6  h-[18px]',   // 24 × 18
  lg: 'w-8  h-6',        // 32 × 24
  xl: 'w-10 h-[30px]',   // 40 × 30
}

interface Props {
  countryCd: string         // ISO 3166-1 alpha-2 (대문자/소문자 무관)
  size?: FlagSize
  grayscale?: boolean       // 비활성 국가 회색 처리
  className?: string
}

export function CountryFlag({ countryCd, size = 'md', grayscale = false, className }: Props) {
  const cc = countryCd.toLowerCase()

  return (
    <span
      className={cn(
        'fi', `fi-${cc}`,
        'inline-block shrink-0 rounded-[3px] ring-1 ring-black/10 bg-cover bg-center',
        'transition-all',
        SIZE_CLASS[size],
        grayscale && 'opacity-50',
        !grayscale && 'shadow-sm',
        className,
      )}
      style={{ backgroundSize: 'cover' }}
      role="img"
      aria-label={`${countryCd} 국기`}
    />
  )
}
