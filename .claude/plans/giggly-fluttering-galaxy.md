# 모던 웹 스타터킷 개발 계획 (체계적 접근)

## Context

빠르게 모던 웹 개발을 시작할 수 있는 재사용·확장 가능한 스타터킷을 만든다.
"바퀴를 재발명하지 않는다"는 원칙에 따라 UI는 shadcnUI, 유틸리티는 검증된 라이브러리를 사용한다.

**현재 프로젝트 실측 결과 (요청 사양과 다른 점 명시):**

| 항목 | 요청 | 실제 설치됨 | 결정 |
| --- | --- | --- | --- |
| Next.js | v15 | **16.2.6** | 설치된 v16으로 진행 (다운그레이드 시 호환성 리스크) |
| React | - | 19.2.4 | 그대로 |
| Tailwind | v4 | v4 (`@import "tailwindcss"`, `@theme inline`, oklch) | 그대로 |
| shadcn | 설치 | **부분 설치됨** (`components.json` style=`radix-sera`, baseColor=`taupe`) | 1단계는 "필요 컴포넌트 추가" |
| UI 프리미티브 | @base-ui | **`radix-ui` 통합 패키지** (`Slot.Root`) | radix-ui 기준 |
| 경로 구조 | `src/` | **루트 기반** (`@/*`→`./*`) | src 없이 루트 유지 |
| 아이콘 | lucide-react | 1.17.0 설치됨 | 재사용 |
| 애니메이션 | - | `tw-animate-css` 설치됨 | 재사용 |

> **Next.js 16 주의 (AGENTS.md):** 관례가 학습 데이터와 다를 수 있다. 핵심 변경 — `middleware.ts` → **`proxy.ts`** 로 이름 변경(기능 동일). 코드 작성 시 `node_modules/next/dist/docs/01-app/` 의 해당 문서를 참조한다.

---

## 컴포넌트 계층 구조

### 1. 기초 컴포넌트 (Primitives) — 최우선
- Button *(설치됨)*, Input, Label, Textarea, Card, Badge, Separator, Avatar, Skeleton

### 2. 레이아웃 컴포넌트 — 우선
- Container *(커스텀)*, Header, Footer, Sidebar(shadcn), ScrollArea, AspectRatio

### 3. 네비게이션 컴포넌트 — 필수
- NavigationMenu, Breadcrumb, Tabs, DropdownMenu, Pagination, ThemeToggle *(커스텀)*

### 4. 피드백 컴포넌트 — 필수
- Sonner(Toast), Alert, Progress, Tooltip, Skeleton

### 5. 오버레이 컴포넌트 — 필수
- Dialog, Sheet, AlertDialog, Popover, Command(⌘K)

### 6. 데이터 표시 컴포넌트 — 보조
- Table, Accordion, Tabs, Calendar

---

## 개발 단계

### 1단계: 핵심 ShadcnUI 컴포넌트 설치
`npx shadcn@latest add <name>` 로 설치 (기존 `radix-sera` 스타일/`taupe` 컬러 유지).

```
# 기초 컴포넌트
npx shadcn@latest add input label textarea card badge separator avatar skeleton

# 레이아웃 컴포넌트
npx shadcn@latest add sidebar scroll-area aspect-ratio

# 네비게이션 컴포넌트
npx shadcn@latest add navigation-menu breadcrumb tabs dropdown-menu pagination

# 피드백 컴포넌트
npx shadcn@latest add sonner alert progress tooltip

# 오버레이 컴포넌트
npx shadcn@latest add dialog sheet alert-dialog popover command

# 폼 컴포넌트
npx shadcn@latest add form select checkbox switch radio-group

# 데이터 표시 컴포넌트 (보조)
npx shadcn@latest add table accordion calendar
```
→ 결과물은 `components/ui/*` 에 생성됨.

### 2단계: 검증된 유틸리티 라이브러리 설치
```
# 다크모드
npm i next-themes

# 폼 관리 & 검증
npm i react-hook-form zod @hookform/resolvers

# 아이콘  → 이미 설치됨 (lucide-react 1.17.0)

# 애니메이션 (선택)  → 이미 설치됨 (tw-animate-css), globals.css에서 import 중

# 날짜 처리 (선택)
npm i date-fns

# 환경변수 스키마 검증 (선택, 템플릿 env.ts용)
npm i @t3-oss/env-nextjs

# 유틸리티 훅 (7단계) — 통합형 기본 + 전문형 보강
npm i usehooks-ts                  # 통합: useMediaQuery, useLocalStorage, useDebounceValue 등
npm i react-responsive             # 전문: 미디어쿼리 (SSR/디바이스 쿼리 강점)
npm i use-local-storage-state      # 전문: 로컬스토리지 (탭 간 동기화/타입 안전)
```

> **선택 기준:** 기본은 `usehooks-ts` 하나로 충분하다. 미디어쿼리에서 디바이스 타입/방향 등 세밀한 제어가 필요하면 `react-responsive`, 로컬스토리지에서 탭 간 동기화·SSR 기본값이 필요하면 `use-local-storage-state`로 해당 영역만 교체한다.

### 3단계: 프로젝트 구조 생성 (루트 기반 — src 없음)
```
claude-nextjs-starters/
├── app/
│   ├── globals.css            # Tailwind v4 + @custom-variant dark + oklch CSS 변수 (기존)
│   ├── layout.tsx             # ThemeProvider + Header + Footer + Toaster (수정)
│   ├── page.tsx               # 랜딩 (교체)
│   ├── (marketing)/           # 마케팅 라우트 그룹 (헤더/푸터 레이아웃)
│   ├── (app)/dashboard/       # 앱 셸 라우트 그룹 (사이드바 레이아웃)
│   ├── components/page.tsx    # 컴포넌트 쇼케이스(키친싱크)
│   └── login/page.tsx         # 로그인 폼 예제
├── components/
│   ├── ui/                    # shadcn/ui (radix-ui 기반) — 1단계 산출물
│   ├── layout/
│   │   ├── header.tsx         # 로고 + NavigationMenu + ThemeToggle + 모바일 Sheet
│   │   ├── footer.tsx
│   │   ├── container.tsx      # max-w 래퍼
│   │   └── app-sidebar.tsx    # 대시보드용 사이드바
│   ├── theme-provider.tsx     # next-themes Provider ('use client')
│   └── theme-toggle.tsx       # DropdownMenu + Sun/Moon/Monitor ('use client')
├── hooks/
│   └── use-breakpoint.ts      # usehooks-ts useMediaQuery 얇은 래퍼 (재발명 X)
├── lib/
│   ├── utils.ts               # cn() = twMerge+clsx (기존)
│   ├── site.ts                # 사이트 메타/네비 설정 (단일 소스)
│   └── format.ts              # date-fns 기반 날짜 포맷 유틸
└── env.ts                     # @t3-oss/env-nextjs 환경변수 스키마
```

### 4단계: 기본 레이아웃 시스템 구현
- `components/layout/container.tsx`: 일관된 `max-w` + 패딩 래퍼.
- `components/layout/header.tsx`: 로고 + `NavigationMenu` + `ThemeToggle`, 모바일은 `Sheet` 햄버거. 네비 항목은 `lib/site.ts`에서 주입.
- `components/layout/footer.tsx`: 링크/카피라이트.
- `app/layout.tsx` 수정: 기존 폰트/`cn` 유지 + `ThemeProvider`로 감싸고 `Header`/`Footer`/`Toaster` 배치, `<html>`에 `suppressHydrationWarning` 추가(next-themes 필수).

### 5단계: 테마 시스템 구현
- `theme-provider.tsx`: `next-themes`의 `ThemeProvider` 래핑(`attribute="class"`, `defaultTheme="system"`, `enableSystem`). globals.css의 `@custom-variant dark (&:is(.dark *))` 와 정합.
- `theme-toggle.tsx`: `DropdownMenu` + lucide `Sun`/`Moon`/`Monitor`로 라이트/다크/시스템 전환.

### 6단계: 페이지 템플릿 생성
- `app/(marketing)/page.tsx`(또는 루트 `page.tsx` 교체): Hero + 기능 카드 섹션 랜딩.
- `app/components/page.tsx`: 설치된 모든 컴포넌트를 카테고리별로 보여주는 쇼케이스.
- `app/(app)/dashboard/`: `app-sidebar` + 통계 카드 + 테이블 예제(앱 셸 레이아웃).
- `app/login/page.tsx`: `react-hook-form` + `zod` + shadcn `Form` 검증 예제.

### 7단계: 유틸리티 기능 추가 (검증된 라이브러리 활용)
모든 훅은 직접 구현하지 않고 검증된 라이브러리를 래핑한다.

- **미디어쿼리** — `usehooks-ts`의 `useMediaQuery`를 `hooks/use-breakpoint.ts`로 얇게 래핑(`useIsMobile()`, `useIsDesktop()` 등 Tailwind 브레이크포인트와 정합). 헤더 모바일 `Sheet`, 사이드바 접힘 제어에 사용.
  - 보강 옵션: 디바이스 타입/방향 등 세밀 제어 필요 시 `react-responsive`의 `useMediaQuery`로 교체.
- **로컬스토리지** — `usehooks-ts`의 `useLocalStorage`로 사이드바 접힘/최근 본 항목 등 영속 상태 관리.
  - 보강 옵션: 탭 간 동기화·SSR 기본값이 필요하면 `use-local-storage-state`로 교체.
- **기타 통합 훅** — `usehooks-ts`의 `useDebounceValue`(검색 입력), `useCopyToClipboard`(코드 복사 버튼), `useCopyToClipboard`를 쇼케이스/대시보드에서 활용.
- `env.ts`: `@t3-oss/env-nextjs` + zod로 환경변수 타입 안전 검증.
- `lib/site.ts`: 사이트명/설명/네비 링크 등 설정 단일 소스.
- `lib/format.ts`: `date-fns` 기반 `formatDate` 등.
- (선택) `proxy.ts`: Next 16 프록시(구 미들웨어) 최소 예제 — 필요 시에만.

---

## 우선순위 요약
1. **즉시 필요**: Button·Card·Input·Form + 기본 레이아웃(Container/Header/Footer)
2. **곧 필요**: Navigation·Dialog·Sheet·Toast + 다크모드(테마 시스템)
3. **나중에 추가**: Table·Calendar·Command(⌘K)·고급 애니메이션

---

## 코드 스타일 규칙 (전역 CLAUDE.md)
- 들여쓰기 2칸, **세미콜론 미사용**, **작은따옴표**, 주석/문서 **한국어**.
- 단, `components/ui/*` 는 shadcn CLI 생성 산출물이므로 생성된 스타일(쌍따옴표 등) 그대로 둔다 — 직접 작성하는 `layout/`, `lib/`, `hooks/`, 페이지 파일에만 위 스타일 적용.

## 검증 방법 (End-to-End)
1. `npm run dev` → `http://localhost:3000` 접속, 랜딩 정상 렌더 확인.
2. 헤더 테마 토글로 라이트/다크/시스템 전환 → `<html class="dark">` 토글 및 oklch 색상 반영 확인.
3. `/components` 에서 각 컴포넌트 렌더 + Toast/Dialog/Sheet 상호작용 확인.
4. `/login` 에서 빈 제출 시 zod 검증 에러, 정상 입력 시 통과(Toast) 확인.
5. `/dashboard` 에서 사이드바 접힘/모바일 반응형 확인.
6. `npm run build` 성공 (타입/린트 통과) — 최종 게이트.
