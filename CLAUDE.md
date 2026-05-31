@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 개발 서버 실행 (Turbopack 기본)
npm run build    # 프로덕션 빌드 (Turbopack 기본)
npm start        # 프로덕션 서버 실행
npm run lint     # ESLint 실행 (eslint 직접 호출)
```

**중요**: `next lint` 명령어는 Next.js 16에서 제거되었습니다. 린트는 반드시 `eslint` CLI 직접 호출 또는 `npm run lint`를 사용하세요.

## 개발 가이드

- **📋 프로젝트 요구사항**: `@/docs/PRD.md`
- **🛠️ PRD 생성 메타 프롬프트**: `@/docs/PRD_PROMPT.md`

## 기술 스택

- **Next.js 16.2.6** (App Router) + **React 19.2**
- **Tailwind CSS v4** — `@import "tailwindcss"` 구문 사용 (v3와 다름)
- **shadcn** 컴포넌트 — `radix-ui` 단일 패키지 사용 (`@radix-ui/*` 개별 패키지 아님)
- **class-variance-authority** (cva) + **clsx** + **tailwind-merge** — 컴포넌트 변형 및 클래스 조합
- **TypeScript strict mode**

## 아키텍처

### 폴더 구조

- `app/` — App Router 페이지 및 레이아웃 (파일시스템 라우팅)
- `components/ui/` — shadcn 스타일 재사용 UI 컴포넌트
- `lib/utils.ts` — `cn()` 유틸리티 (clsx + tailwind-merge)
- `public/` — 정적 에셋

### 경로 별칭

`tsconfig.json`의 `"@/*": ["./*"]` 설정으로 프로젝트 루트를 `@/`로 참조합니다.

### 폰트 시스템

`app/layout.tsx`에서 4개의 Google Font를 CSS 변수로 등록합니다:
- `--font-heading` (Playfair Display)
- `--font-sans` (Noto Sans)
- `--font-geist-sans`, `--font-geist-mono`

### CSS 시스템

`app/globals.css`는 Tailwind v4 방식으로 구성됩니다:
- `@import "tailwindcss"` — v3의 `@tailwind` 지시어 대신 사용
- `@theme inline { ... }` — CSS 변수를 Tailwind 토큰에 매핑
- 색상은 **OKLCH** 색공간 사용
- 다크 모드: `@custom-variant dark (&:is(.dark *))` — `class` 전략

## Next.js 16 Breaking Changes (필독)

### 1. Async Request APIs (완전 변경)

`cookies()`, `headers()`, `draftMode()`, `params`, `searchParams`는 이제 반드시 `await`해야 합니다. 동기 접근은 완전히 제거되었습니다.

```tsx
// ✅ Next.js 16
export default async function Page({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params
  const cookieStore = await cookies()
  const headersList = await headers()
}

// ❌ 구버전 - 컴파일 에러
export default function Page({ params }) {
  const slug = params.slug  // 동기 접근 불가
}
```

타입 생성: `npx next typegen`으로 `PageProps`, `LayoutProps`, `RouteContext` 타입 헬퍼를 자동 생성할 수 있습니다.

### 2. `middleware.ts` → `proxy.ts`로 이름 변경

```bash
mv middleware.ts proxy.ts
```

함수명도 `middleware`에서 `proxy`로 변경, `edge` 런타임 미지원 (Node.js 런타임만).

```ts
// ✅ Next.js 16
export function proxy(request: Request) { ... }
```

### 3. Turbopack 기본 번들러

`next dev`와 `next build` 모두 Turbopack이 기본입니다. Webpack을 유지하려면 `--webpack` 플래그를 사용하세요. Webpack 커스텀 설정이 있으면 빌드가 실패합니다.

### 4. Caching API 변경

- `revalidateTag`는 두 번째 인수(cacheLife 프로필)가 필수: `revalidateTag('posts', 'max')`
- `cacheLife`, `cacheTag` — `unstable_` 접두사 제거됨
- `updateTag` — Server Actions 전용, 즉시 갱신 (read-your-writes)
- `refresh` — Server Action에서 클라이언트 라우터 새로고침

### 5. Parallel Routes

모든 병렬 라우트 슬롯에 `default.js`가 필수입니다. 없으면 빌드 실패.

### 6. 제거된 기능

- `serverRuntimeConfig` / `publicRuntimeConfig` — 환경 변수(`process.env`, `NEXT_PUBLIC_*`)로 대체
- AMP 지원 완전 제거
- `next/legacy/image` 제거 (`next/image` 사용)
- `images.domains` deprecated → `images.remotePatterns` 사용

## ESLint 설정

ESLint v9 Flat Config 형식을 사용합니다 (`eslint.config.mjs`). 레거시 `.eslintrc` 형식은 사용하지 않습니다.

## 컴포넌트 작성 패턴

`components/ui/button.tsx`를 참고하여 `cva` + `Slot.Root`(radix-ui) 패턴을 따릅니다:

```tsx
import { Slot } from 'radix-ui'  // @radix-ui/* 아닌 'radix-ui' 단일 패키지
const variants = cva('base-classes', { variants: { ... } })
const Comp = asChild ? Slot.Root : 'button'
```
