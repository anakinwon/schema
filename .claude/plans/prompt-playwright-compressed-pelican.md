# Playwright MCP 기반 웹앱 오류 수집·분석·해결 계획

## Context (왜 이 작업을 하는가)

사용자는 현재 웹 애플리케이션(`claude-nextjs-starters`, Next.js 16.2.6 + React 19 + Tailwind v4 + shadcn)에서
발생하는 런타임 오류를 **Playwright MCP로 경험적으로 수집 → 분석 → 해결 → 재테스트**하고,
오류가 사라질 때까지 반복하기를 원한다.

플랜 단계에서 read-only 진단을 수행한 결과 두 가지 핵심 사실을 확인했다:

1. **정적 코드/의존성에는 명백한 치명 오류가 보이지 않는다.**
   - `app/layout.tsx` → `@/lib/utils`의 `cn` import: `lib/utils.ts` 존재 ✅
   - `app/globals.css`의 `@import "shadcn/tailwind.css"`, `@import "tw-animate-css"`:
     두 패키지 모두 `package.json` `exports`에 `"style"` 조건이 있어 Tailwind v4 번들러가 정상 해석 ✅
   - `components/ui/button.tsx`의 `radix-ui` / `cva` import: 의존성 설치됨 ✅
2. **포트 3000에는 이 프로젝트가 아닌 다른 앱이 떠 있다.** (PID 2564)
   - `:3000` 스냅샷 = "테마 변경" 버튼, "포함된 기술 스택", `next-themes`, `base-nova 스타일` 페이지
   - 반면 이 레포 `app/page.tsx` = 기본 create-next-app 템플릿("To get started, edit the page.tsx file." + Deploy Now)
   - ⇒ **`:3000`을 검사하면 엉뚱한 앱을 디버깅하게 되므로, 반드시 이 프로젝트를 별도 포트(예: 3001)로 띄워야 한다.**

따라서 오류를 단정하지 않고, **실제 서버를 띄워 Playwright로 관찰한 결과에 따라 고치는 반복 루프**로 진행한다.

## 정적 분석에서 도출한 유력 오류 후보 (실행 중 우선 확인)

| 후보 | 위치 | 근거 |
|------|------|------|
| Google Fonts fetch 실패 | `app/layout.tsx:2,6-18` | `next/font/google`로 Geist·Geist_Mono·Noto_Sans·Playfair_Display 4종 로드. 오프라인/샌드박스 시 빌드 단계에서 `Failed to fetch font` 류 오류 발생 가능 |
| `radix-ui` Slot 네임스페이스 | `components/ui/button.tsx:3,52` | `import { Slot } from "radix-ui"` 후 `Slot.Root` 사용. 통합 `radix-ui` 패키지의 export 형태가 버전에 따라 다를 수 있음(현재 page는 미사용이라 런타임 미발현 가능) |
| lucide-react `^1.17.0` | `package.json:14` | 비표준 버전. 현재 `page.tsx`/`layout.tsx`는 미사용이라 즉시 오류는 아님 |
| metadata 불일치 | `app/layout.tsx:20-23` | title "Create Next App" — 기능 오류 아님(범위 외) |

> 위 표는 가설일 뿐이며, **실제 수집된 콘솔/터미널 오류가 최종 근거**다.

## 실행 단계 (사용자 요청 4단계 + 반복 루프)

### 1. 오류 정보 수집
- 별도 포트로 이 프로젝트 dev 서버 기동(백그라운드):
  - `npm run dev -- -p 3001` (Bash `run_in_background: true`)
- 서버 준비 대기 후 Playwright로 탐색:
  - `mcp__playwright__browser_navigate` → `http://localhost:3001`
  - `mcp__playwright__browser_console_messages` (level=`error`, all=true) — 브라우저 콘솔 오류
  - `mcp__playwright__browser_network_requests` (static=false) — 실패한 요청(404/500)
  - `mcp__playwright__browser_snapshot` — 페이지 렌더 상태(에러 오버레이/빈 화면 여부)
- **터미널(서버) 로그도 함께 수집**: `BashOutput`으로 dev 서버 stdout/stderr 확인 — Next.js의 빌드/컴파일 오류는 브라우저가 아닌 터미널·에러 오버레이에 나타나는 경우가 많음.

### 2. 오류 원인 분석
- 수집한 메시지를 스택트레이스/파일·라인 기준으로 분류(빌드 오류 vs 런타임 vs 네트워크).
- 필요 시 `node_modules/next/dist/docs/` 해당 가이드 확인 (AGENTS.md 지침: "이 Next.js는 기존과 다르다 — 코드 작성 전 문서 확인").
  - 폰트: `01-app/01-getting-started/13-fonts.md`
  - 메타데이터/레이아웃: `01-app/01-getting-started/03-layouts-and-pages.md`, `14-metadata-and-og-images.md`
- 근본 원인 1개를 특정 (가장 상위 stack frame부터).

### 3. 오류 해결
- 원인에 해당하는 **최소 변경**을 적용. 예상 시나리오별 대응:
  - **폰트 fetch 실패** → 불필요한 폰트 제거(예: Playfair_Display/Noto_Sans 미사용 시 정리)하거나 `next/font/local`로 대체, 또는 fetch 실패에 견디는 구성.
  - **radix-ui Slot export 형태 오류** → 문서 확인 후 올바른 import 형태로 수정.
  - **기타** → 수집된 실제 메시지에 맞춰 대응.
- CLAUDE.md 코드 컨벤션 준수: 세미콜론 없음, 작은따옴표, 스페이스 2칸, 한국어 주석.
- 한 번에 너무 많은 파일을 고치지 않고 원인 1건씩 처리.

### 4. 테스트 (검증)
- 수정 후 dev 서버가 자동 리컴파일되면 Playwright로 재탐색:
  - 콘솔 error 0건 + 네트워크 실패 0건 + 스냅샷에 에러 오버레이 없음 확인.
  - 핵심 UI 요소(로고 이미지, 제목, 링크) 정상 렌더 확인.
- 가능하면 `npm run build`로 프로덕션 빌드까지 통과하는지 확인(빌드 전용 오류 포착).

### 반복(Loop)
- 4단계 테스트에서 여전히 오류가 있으면 **1단계로 복귀**하여 다음 원인 처리.
- **콘솔/네트워크/빌드 오류가 모두 0건이 될 때까지 반복.**

## 수정 대상(예상) 파일
- `app/layout.tsx` — 폰트 구성 정리 가능성 높음
- `components/ui/button.tsx` — radix-ui import 형태(필요 시)
- `package.json` — 비정상 의존성 버전(필요 시, 신중히)
- 그 외 실제 수집 오류에 따라 결정

## 검증 방법 (End-to-End)
1. `npm run dev -- -p 3001` 백그라운드 기동, `BashOutput`으로 컴파일 성공 확인
2. Playwright: `browser_navigate` → `browser_console_messages(error)` → `browser_network_requests` → `browser_snapshot`
3. 오류 0건 + 페이지 정상 렌더 확인
4. (선택) `npm run build` 통과 확인

## 메모
- `:3000`은 다른 앱 점유 → 이 프로젝트는 `3001` 사용.
- 플랜 단계에서 Playwright 브라우저가 `Target page ... has been closed`로 닫힌 적 있음 → 실행 시 navigate 직후 곧바로 console/snapshot 수집, 필요 시 `browser_close` 후 재기동으로 세션 안정화.
