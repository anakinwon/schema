import { test, expect, type Page } from '@playwright/test'

/**
 * TASK-044: 다국어 E2E 테스트
 *
 * Layer 1 (인증 불필요): URL prefix · html[lang] · 미인증 리다이렉트 · 로그인 페이지 번역
 * Layer 2 (인증 필요) : 번역 텍스트 · CountrySelector 전환 · MISSING_MESSAGE 점검
 *   - 기본 계정: test1004@example.com / test1004
 *   - 오버라이드: 환경변수 TEST_MASTER_EMAIL / TEST_MASTER_PW
 */

// ─── 공통 상수 ────────────────────────────────────────────────────────────────

const TEST_EMAIL = process.env.TEST_MASTER_EMAIL ?? 'test1004@example.com'
const TEST_PW    = process.env.TEST_MASTER_PW    ?? 'test1004'

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/(notice|admin)/, { timeout: 15000 })
}

// ─── Layer 0: ko 기본 locale 번역 (파일 최초 실행 — 순수 신선 컨텍스트 필요) ──

test.describe('Layer 0: ko 기본 locale 번역 (브라우저 컨텍스트 신선 상태)', () => {

  // Playwright Chromium의 기본 Accept-Language(en-US)가 extraHTTPHeaders에 추가되어
  // next-intl이 "en"을 먼저 매칭함. URL prefix 없는 /login(ko as-needed)에서만 발생.
  // 해결: NEXT_LOCALE=ko 쿠키 삽입 — 쿠키가 Accept-Language보다 우선순위 높음.
  test('/login — ko 기본 locale, 버튼 텍스트 "로그인"', async ({ page }) => {
    await page.context().addCookies([{
      name: 'NEXT_LOCALE', value: 'ko',
      domain: 'localhost', path: '/',
    }])
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button[type="submit"]')).toContainText('로그인', { timeout: 6000 })
  })
})

// ─── Layer 1-A: URL prefix 라우팅 ────────────────────────────────────────────

test.describe('Layer 1-A: locale URL prefix 라우팅', () => {

  test('루트 / → /login 도달 (공개경로 아님)', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    expect(page.url()).not.toMatch(/\/ko\//)
  })

  test('/login — ko 기본 locale, URL에 /ko/ prefix 없음', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    expect(page.url()).not.toMatch(/\/ko\//)
  })

  test('/ko/login → /login 리다이렉트 (as-needed prefix 제거)', async ({ page }) => {
    await page.goto('/ko/login')
    await page.waitForURL(url => !url.pathname.startsWith('/ko/'), { timeout: 10000 })
    expect(page.url()).not.toMatch(/\/ko\//)
  })

  const PREFIX_LOCALES = ['en', 'zh', 'ja', 'fr', 'es', 'it', 'de', 'vi', 'id', 'ms', 'hi']
  for (const loc of PREFIX_LOCALES) {
    test(`/${loc}/login — URL prefix 정상 접근`, async ({ page }) => {
      await page.goto(`/${loc}/login`)
      await expect(page).toHaveURL(new RegExp(`\\/${loc}\\/login`), { timeout: 10000 })
    })
  }
})

// ─── Layer 1-B: html[lang] 속성 ──────────────────────────────────────────────

test.describe('Layer 1-B: html[lang] 속성으로 locale 검증', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  const LANG_CASES: [string, string][] = [
    ['/en/login', 'en'],
    ['/zh/login', 'zh'],
    ['/ja/login', 'ja'],
    ['/fr/login', 'fr'],
    ['/es/login', 'es'],
    ['/it/login', 'it'],
    ['/de/login', 'de'],
    ['/vi/login', 'vi'],
    ['/id/login', 'id'],
  ]

  for (const [path, lang] of LANG_CASES) {
    test(`${path} → html[lang="${lang}"]`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('html')).toHaveAttribute('lang', lang, { timeout: 8000 })
    })
  }

  test('/login — ko 기본 locale, /ko/ prefix 없음 + 폼 로드 확인', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/\/ko\//)
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })
  })
})

// ─── Layer 1-C: 미인증 /admin → locale prefix 보존 리다이렉트 ────────────────

test.describe('Layer 1-C: 미인증 /admin → /login locale prefix 보존', () => {

  test('/admin 미인증 → /login (ko 기본, prefix 없음)', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    expect(page.url()).not.toMatch(/\/ko\//)
  })

  const REDIRECT_CASES = ['en', 'fr', 'es', 'it', 'zh', 'ja', 'de']
  for (const loc of REDIRECT_CASES) {
    test(`/${loc}/admin 미인증 → /${loc}/login`, async ({ page }) => {
      await page.goto(`/${loc}/admin`)
      await expect(page).toHaveURL(new RegExp(`\\/${loc}\\/login`), { timeout: 10000 })
    })
  }
})

// ─── Layer 1-D: 로그인 페이지 번역 텍스트 (인증 불필요) ──────────────────────

test.describe('Layer 1-D: 로그인 페이지 번역 텍스트 표시', () => {
  // storageState 격리하지 않음:
  // test.use({ storageState }) 가 별도 컨텍스트를 생성하면 Next.js 클라이언트 라우터 캐시가
  // 리셋되지 않아 /login(ko as-needed)이 en locale로 표시되는 문제 발생.
  // 공유 컨텍스트에서 각 goto()가 full HTTP 요청을 발생시키므로 서버 로케일은 정상 반영됨.

  // DB auth.loginButton 실측값 기반 케이스 (ko /login 제외 — 별도 테스트로 격리)
  const BUTTON_CASES: [string, string][] = [
    ['/en/login', 'Login'],
    ['/zh/login', '登录'],
    ['/ja/login', 'ログイン'],
    ['/fr/login', 'Se connecter'],
    ['/de/login', 'Anmelden'],
    ['/es/login', 'Iniciar sesión'],
    ['/it/login', 'Accedi'],
    ['/vi/login', 'Đăng nhập'],
    ['/id/login', 'Masuk'],
  ]

  for (const [path, btnText] of BUTTON_CASES) {
    test(`${path} — 버튼 텍스트 "${btnText}"`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('button[type="submit"]')).toContainText(btnText, { timeout: 6000 })
    })
  }

  // ko 버튼 텍스트는 Layer 0에서 신선한 컨텍스트로 검증

  // FORMATTING_ERROR/MISSING_MESSAGE 없어야 함
  const MISSING_CHECK_LOCALES = ['ko', 'en', 'zh', 'ja', 'fr', 'es', 'de', 'it']
  for (const loc of MISSING_CHECK_LOCALES) {
    test(`/${loc === 'ko' ? '' : loc + '/'}login — MISSING_MESSAGE 없음`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error' &&
            (msg.text().includes('MISSING_MESSAGE') || msg.text().includes('FORMATTING_ERROR'))) {
          errors.push(msg.text())
        }
      })
      await page.goto(loc === 'ko' ? '/login' : `/${loc}/login`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      expect(errors, `[${loc}] 번역 오류:\n${errors.join('\n')}`).toHaveLength(0)
    })
  }
})

// ─── Layer 2: 인증 필요 테스트 ───────────────────────────────────────────────

test.describe('Layer 2: 번역 텍스트 · CountrySelector (인증 필요)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_EMAIL, TEST_PW)
  })

  // ── 로그인 성공 확인 ────────────────────────────────────────────────────────

  test('로그인 성공 — /notice 도달', async ({ page }) => {
    await expect(page).toHaveURL(/\/notice/, { timeout: 10000 })
  })

  // ── 게시판 MISSING_MESSAGE 점검 ─────────────────────────────────────────────

  const NOTICE_LOCALES: [string, string][] = [
    ['ko',  '/notice'],
    ['en',  '/en/notice'],
    ['zh',  '/zh/notice'],
    ['ja',  '/ja/notice'],
    ['fr',  '/fr/notice'],
    ['es',  '/es/notice'],
    ['de',  '/de/notice'],
    ['it',  '/it/notice'],
    ['vi',  '/vi/notice'],
    ['id',  '/id/notice'],
  ]

  for (const [loc, path] of NOTICE_LOCALES) {
    test(`${path} — MISSING_MESSAGE 없음`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error' &&
            (msg.text().includes('MISSING_MESSAGE') || msg.text().includes('FORMATTING_ERROR'))) {
          errors.push(msg.text())
        }
      })
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)
      expect(errors, `[${loc}] 번역 오류:\n${errors.join('\n')}`).toHaveLength(0)
    })
  }

  // ── admin 접근 가능 시 표준관리 MISSING_MESSAGE 점검 ─────────────────────────

  const ADMIN_LOCALES: [string, string][] = [
    ['ko',  '/admin/standards'],
    ['en',  '/en/admin/standards'],
    ['zh',  '/zh/admin/standards'],
    ['ja',  '/ja/admin/standards'],
    ['fr',  '/fr/admin/standards'],
    ['es',  '/es/admin/standards'],
    ['de',  '/de/admin/standards'],
    ['it',  '/it/admin/standards'],
  ]

  for (const [loc, path] of ADMIN_LOCALES) {
    test(`${path} — MISSING_MESSAGE 없음 (admin 권한 시)`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error' &&
            (msg.text().includes('MISSING_MESSAGE') || msg.text().includes('FORMATTING_ERROR'))) {
          errors.push(msg.text())
        }
      })

      await page.goto(path)
      await page.waitForLoadState('networkidle')
      // 권한 없으면 /login redirect → 스킵
      if (page.url().includes('/login')) {
        test.skip()
        return
      }
      await page.waitForTimeout(2000)
      expect(errors, `[${loc}] admin/standards 번역 오류:\n${errors.join('\n')}`).toHaveLength(0)
    })
  }

  // ── CountrySelector locale 전환 ───────────────────────────────────────────

  test('CountrySelector — United States 선택 → /en/ URL로 전환', async ({ page }) => {
    await page.goto('/notice')
    await page.waitForLoadState('networkidle')

    await page.locator('button[title="국가·언어 선택"]').click()
    await page.waitForSelector('input[placeholder*="국가명"]', { timeout: 5000 })
    await page.locator('input[placeholder*="국가명"]').fill('United States')
    await page.waitForTimeout(300)
    await page.locator('button').filter({ hasText: /United States/i }).first().click()

    await expect(page).toHaveURL(/\/en\//, { timeout: 10000 })
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 6000 })
  })

  test('CountrySelector — España 선택 → /es/ URL로 전환', async ({ page }) => {
    await page.goto('/en/notice')
    await page.waitForLoadState('networkidle')

    await page.locator('button[title="국가·언어 선택"]').click()
    await page.waitForSelector('input[placeholder*="국가명"]', { timeout: 5000 })
    await page.locator('input[placeholder*="국가명"]').fill('Spain')
    await page.waitForTimeout(300)
    await page.locator('button').filter({ hasText: /Spain|España/i }).first().click()

    await expect(page).toHaveURL(/\/es\//, { timeout: 10000 })
  })

  test('CountrySelector — 한국 선택 → /ko/ prefix 없는 URL 전환', async ({ page }) => {
    await page.goto('/en/notice')
    await page.waitForLoadState('networkidle')

    await page.locator('button[title="국가·언어 선택"]').click()
    await page.waitForSelector('input[placeholder*="국가명"]', { timeout: 5000 })
    await page.locator('input[placeholder*="국가명"]').fill('Korea')
    await page.waitForTimeout(300)
    await page.locator('button').filter({ hasText: /Korea|한국/i }).first().click()

    await page.waitForURL(url => !url.pathname.startsWith('/en/'), { timeout: 10000 })
    expect(page.url()).not.toMatch(/\/ko\//)   // as-needed: ko prefix 없어야 함
  })

  test('CountrySelector — Australia 선택 → localStorage AU 저장 + en locale', async ({ page }) => {
    await page.goto('/notice')
    await page.waitForLoadState('networkidle')

    await page.locator('button[title="국가·언어 선택"]').click()
    await page.waitForSelector('input[placeholder*="국가명"]', { timeout: 5000 })
    await page.locator('input[placeholder*="국가명"]').fill('Australia')
    await page.waitForTimeout(300)
    await page.locator('button').filter({ hasText: /Australia/i }).first().click()

    await page.waitForTimeout(500)
    const saved = await page.evaluate(() => localStorage.getItem('selectedCountryCd'))
    expect(saved).toBe('AU')
    await expect(page).toHaveURL(/\/en\//, { timeout: 10000 })
  })

  // ── 게시판 번역 텍스트 UI 표시 ───────────────────────────────────────────────

  test('/notice — 한국어 "글쓰기" 또는 "공지사항" 텍스트 포함', async ({ page }) => {
    await page.goto('/notice')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('body').innerText()
    expect(content).toMatch(/공지|글쓰기|로그아웃/)
  })

  test('/en/notice — 영어 "Write" 또는 "Notice" 텍스트 포함', async ({ page }) => {
    await page.goto('/en/notice')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('body').innerText()
    expect(content).toMatch(/Notice|Write|Logout/)
  })

  test('/zh/notice — 중국어 "通知" 또는 "退出" 텍스트 포함', async ({ page }) => {
    await page.goto('/zh/notice')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('body').innerText()
    expect(content).toMatch(/通知|退出|公告/)
  })

  test('/ja/notice — 일본어 텍스트 포함 (ログアウト 등)', async ({ page }) => {
    await page.goto('/ja/notice')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('body').innerText()
    expect(content).toMatch(/ログアウト|お知らせ|通知/)
  })
})
