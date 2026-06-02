---
name: multi-lang
description: >
  Next.js App Router 프로젝트의 다국어(i18n) 처리 가이드.
  next-intl 기반으로 11개 언어(ko/en/zh/ja/hi/vi/id/ms/en-ZA/fil/th) 번역 키 추가,
  messages JSON 구조, locale 라우팅, 폰트 서브셋 대응 규칙을 제공한다.
  하드코딩된 한글 문자열을 번역 키로 치환하거나, 새 화면의 다국어 키를 설계할 때 사용한다.
triggers:
  - "다국어"
  - "i18n"
  - "번역"
  - "locale"
  - "언어 추가"
  - "다국어 키"
references:
  - lang_cd/lang_map.json
  - lang_cd/supported_locales.json
  - lang_cd/references/currency_countries.csv
---

# 다국어(i18n) 처리 가이드

## 기준 정보

| 항목 | 값 |
|---|---|
| 라이브러리 | `next-intl ^4.13.0` |
| 기본 locale | `ko` (prefix 없음, `/notice` 등 기존 URL 유지) |
| localePrefix | `as-needed` (ko 생략, 나머지 `/en/notice` 형태) |
| locale 목록 | `lang_cd/supported_locales.json` |
| locale↔국가 매핑 | `lang_cd/lang_map.json` |
| 번역 파일 위치 | `messages/{locale}.json` |
| i18n 설정 | `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts` |

## 지원 언어 11개

| seq | locale | 언어명 | 국가코드 | 통화 | 폰트 서브셋 |
|---|---|---|---|---|---|
| 1 | ko | 한국어 | KR | KRW | Noto_Sans_KR |
| 2 | en | English | US | USD | Noto_Sans (latin) |
| 3 | zh | 中文 | CN | CNY | Noto_Sans_SC |
| 4 | ja | 日本語 | JP | JPY | Noto_Sans_JP |
| 5 | hi | हिन्दी | IN | INR | Noto_Sans_Devanagari |
| 6 | vi | Tiếng Việt | VN | VND | Noto_Sans (latin) |
| 7 | id | Bahasa Indonesia | ID | IDR | Noto_Sans (latin) |
| 8 | ms | Bahasa Melayu | MY | MYR | Noto_Sans (latin) |
| 9 | en-ZA | English (SA) | ZA | ZAR | Noto_Sans (latin) |
| 10 | fil | Filipino | PH | PHP | Noto_Sans (latin) |
| 11 | th | ไทย | TH | THB | Noto_Sans_Thai |

## 번역 키 네임스페이스 (섹션)

| 섹션 | 대상 |
|---|---|
| `common` | 앱명, 저장/취소/삭제/검색 등 공통 UI |
| `auth` | 로그인/로그아웃/회원가입, 에러 메시지 |
| `board` | 게시판 카테고리명, 목록·작성·수정 UI |
| `admin` | 관리자 메뉴, Back Office 레이블 |
| `profile` | 내 정보, 사용자 프로필 |
| `validation` | 필수입력, 형식오류, 길이 제한 메시지 |
| `languageSwitcher` | 11개 언어 레이블 |

## 번역 키 작성 규칙

1. **키 형식**: camelCase, 의미 기반 (`loginButton` O, `btn1` X)
2. **한글 원문**: `ko.json`에만 작성, 나머지 10개 파일은 동일 키에 번역값
3. **보간**: `{name}` 형태 ICU MessageFormat (`{count, plural, ...}` 복수형)
4. **모든 locale 동기화**: 키 추가 시 11개 파일 동시 업데이트 — 누락 시 컴파일 에러 (`global.d.ts` AppConfig 타입 등록)
5. **중첩 구조**: 2단계까지 권장 (`board.categories.NOTICE`, `admin.menu.users`)

## 신규 문자열 추가 절차

```
1. messages/ko.json 해당 섹션에 키·한글값 추가
2. 나머지 10개 messages/{locale}.json에 동일 키 추가 (초기엔 ko 값 복사 허용)
3. 서버 컴포넌트: const t = await getTranslations('섹션')
   클라이언트 컴포넌트: const t = useTranslations('섹션')
4. JSX에서 t('키') 로 참조
5. npm run build 로 타입 검증
```

## 컴포넌트별 사용법

### 서버 컴포넌트 (page.tsx, layout.tsx 등)
```tsx
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('board')
  return <h1>{t('categories.NOTICE')}</h1>
}
```

### 클라이언트 컴포넌트 ('use client')
```tsx
import { useTranslations } from 'next-intl'

export default function Button() {
  const t = useTranslations('common')
  return <button>{t('save')}</button>
}
```

### metadata (generateMetadata)
```tsx
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('loginTitle', { appName: t('common.appName') }) }
}
```

### 내부 링크 (locale-aware)
```tsx
// next/link 대신 반드시 아래 사용
import { Link } from '@/i18n/navigation'

<Link href="/notice">공지사항</Link>  // locale prefix 자동 적용
```

## 폰트 서브셋 규칙

- `lib/fonts.ts`의 `getFontClass(locale)` 함수가 locale별 Noto 서브셋 CSS 변수 반환
- CJK(zh/ja)·Thai·Devanagari는 별도 Noto 서브셋 패키지 사용
- 라틴 계열(en/vi/id/ms/en-ZA/fil): `Noto_Sans` latin
- **금지**: 모든 폰트 동시 로딩 (용량 과부하) — locale별 단일 패밀리만 active

## 금지 사항

```
❌ JSX에 한글/외국어 직접 작성 (반드시 t() 경유)
❌ locale 값 하드코딩 (routing.defaultLocale 참조)
❌ next/link 직접 사용 → @/i18n/navigation Link 사용
❌ 751건 일괄 치환 (섹션 단위 PR 분리 필수)
❌ app/api/ 에 locale 세그먼트 적용 (locale 무관 경로)
```

## 주요 파일 경로

| 역할 | 경로 |
|---|---|
| locale 라우팅 설정 | `i18n/routing.ts` |
| 서버 messages 로딩 | `i18n/request.ts` |
| locale-aware 네비게이션 | `i18n/navigation.ts` |
| locale 목록 (런타임) | `lib/i18n/locales.ts` |
| 폰트 스왑 | `lib/fonts.ts` |
| 번역 파일 | `messages/{locale}.json` |
| 타입 등록 | `global.d.ts` |
| 미들웨어 (인증+i18n) | `proxy.ts` |
