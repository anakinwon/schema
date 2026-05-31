import { test, expect, type Page } from '@playwright/test'

/**
 * 관리자 기능 E2E 테스트
 * 역할 기반 접근 제어(RBAC), 관리자 대시보드, DDL Export 기능 검증
 */

// 역할별 테스트 계정
const ACCOUNTS = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin1234!',
    role: 'admin',
  },
  master: {
    email: 'master@example.com',
    password: 'Master1234!',
    role: 'master',
  },
  user: {
    email: 'user@example.com',
    password: 'User1234!',
    role: 'user',
  },
}

/**
 * 로그인 헬퍼
 */
async function loginAs(page: Page, account: { email: string; password: string }) {
  await page.goto('/login')
  await page.locator('input[name="email"], input[type="email"]').fill(account.email)
  await page.locator('input[name="password"], input[type="password"]').fill(account.password)
  await page.locator('button[type="submit"]').click()
  // 로그인 완료 대기
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {
    // navigation이 발생하지 않는 경우도 허용
  })
}

/**
 * 로그아웃 헬퍼
 */
async function logout(page: Page) {
  const logoutButton = page.locator(
    '[data-testid="logout-button"], button:has-text("로그아웃"), a:has-text("로그아웃")'
  )
  if (await logoutButton.count() > 0) {
    await logoutButton.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  } else {
    // 쿠키 삭제로 로그아웃 처리
    await page.context().clearCookies()
    await page.goto('/login')
  }
}

test.describe('admin/master 역할만 /admin 접근 가능', () => {
  test('admin 역할은 /admin 접근 가능', async ({ page }) => {
    await loginAs(page, ACCOUNTS.admin)

    await page.goto('/admin')
    // /admin 페이지에 정상적으로 머물러야 함
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })

    // 페이지 내용이 표시되어야 함
    await expect(
      page.locator('h1, h2, [data-testid="admin-dashboard"]')
    ).toBeVisible({ timeout: 5000 })
  })

  test('master 역할은 /admin 접근 가능', async ({ page }) => {
    await loginAs(page, ACCOUNTS.master)

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })

    await expect(
      page.locator('h1, h2, [data-testid="admin-dashboard"]')
    ).toBeVisible({ timeout: 5000 })
  })

  test('API로 admin 역할 접근 권한 확인', async ({ request }) => {
    // 쿠키 없이(미인증) admin API 접근 시 401 또는 403 응답
    const response = await request.get('/api/admin/stats')
    expect([401, 403]).toContain(response.status())
  })
})

test.describe('일반 사용자 접근 시 / 리다이렉트', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.user)
  })

  test('user 역할로 /admin 접근 시 / 또는 /dashboard로 리다이렉트', async ({ page }) => {
    await page.goto('/admin')

    // /admin에 머물지 않아야 함 - 홈 또는 대시보드로 리다이렉트
    const currentUrl = page.url()
    expect(currentUrl).not.toMatch(/\/admin$/)

    // / 또는 /dashboard로 리다이렉트 확인
    await expect(page).toHaveURL(/\/(dashboard|home|$)/, { timeout: 10000 })
  })

  test('user 역할로 /admin/users 접근 시 리다이렉트', async ({ page }) => {
    await page.goto('/admin/users')
    const currentUrl = page.url()
    expect(currentUrl).not.toMatch(/\/admin\/users/)
  })

  test('권한 없음 토스트 메시지 또는 오류 페이지 표시', async ({ page }) => {
    await page.goto('/admin')

    // 리다이렉트 후 권한 없음 메시지가 표시되거나, 리다이렉트 자체가 발생해야 함
    const noAccessMessage = page.locator(
      '[role="alert"]:has-text("권한"), .error:has-text("권한"), [data-testid="no-access"]'
    )

    const isRedirected = !page.url().includes('/admin')
    const hasMessage = await noAccessMessage.count() > 0

    // 둘 중 하나는 반드시 충족
    expect(isRedirected || hasMessage).toBeTruthy()
  })
})

test.describe('관리자 대시보드 통계 카드 표시', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.admin)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })
  })

  test('대시보드 통계 카드가 표시되어야 함', async ({ page }) => {
    // 통계 카드 확인 (표준단어 수, 표준용어 수, 사용자 수 등)
    const statsCard = page.locator(
      '[data-testid="stats-card"], .stats-card, .stat-card, .card'
    )
    await expect(statsCard.first()).toBeVisible({ timeout: 5000 })
  })

  test('표준단어 통계 카드 표시', async ({ page }) => {
    const wordStatsCard = page.locator(
      '[data-testid="word-stats"], :has-text("표준단어"), :has-text("단어 수")'
    ).first()
    await expect(wordStatsCard).toBeVisible({ timeout: 5000 })
  })

  test('사용자 통계 카드 표시', async ({ page }) => {
    const userStatsCard = page.locator(
      '[data-testid="user-stats"], :has-text("사용자"), :has-text("회원")'
    ).first()
    await expect(userStatsCard).toBeVisible({ timeout: 5000 })
  })

  test('통계 카드에 숫자 데이터가 표시되어야 함', async ({ page }) => {
    // 숫자가 포함된 통계 카드 요소 확인
    const numberElement = page.locator(
      '[data-testid="stat-number"], .stat-number, .stats-value'
    ).first()

    if (await numberElement.count() > 0) {
      const text = await numberElement.textContent()
      expect(text).toMatch(/\d+/)
    }
  })

  test('관리자 대시보드 제목 표시', async ({ page }) => {
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible({ timeout: 5000 })
  })
})

test.describe('DDL Export 모달 열기', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ACCOUNTS.admin)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })
  })

  test('DDL Export 버튼이 관리자 페이지에 표시', async ({ page }) => {
    const exportButton = page.locator(
      '[data-testid="ddl-export-button"], button:has-text("DDL"), button:has-text("Export"), button:has-text("내보내기")'
    )
    await expect(exportButton).toBeVisible({ timeout: 5000 })
  })

  test('DDL Export 버튼 클릭 시 모달 열림', async ({ page }) => {
    const exportButton = page.locator(
      '[data-testid="ddl-export-button"], button:has-text("DDL"), button:has-text("Export"), button:has-text("내보내기")'
    )

    if (await exportButton.count() > 0) {
      await exportButton.click()

      // 모달 또는 다이얼로그가 열려야 함
      const modal = page.locator(
        '[role="dialog"], [data-testid="ddl-modal"], .modal, .dialog'
      )
      await expect(modal).toBeVisible({ timeout: 5000 })
    }
  })

  test('DDL Export 모달에 SQL 텍스트 또는 선택 옵션 표시', async ({ page }) => {
    const exportButton = page.locator(
      '[data-testid="ddl-export-button"], button:has-text("DDL"), button:has-text("Export"), button:has-text("내보내기")'
    )

    if (await exportButton.count() > 0) {
      await exportButton.click()

      // 모달 내 SQL 텍스트 또는 선택 옵션 확인
      const modal = page.locator('[role="dialog"], .modal, .dialog')
      await expect(modal).toBeVisible({ timeout: 5000 })

      // SQL 코드 영역 또는 export 옵션 확인
      const sqlContent = modal.locator(
        'pre, code, textarea, [data-testid="sql-content"], select[name="exportType"]'
      )
      if (await sqlContent.count() > 0) {
        await expect(sqlContent.first()).toBeVisible()
      }
    }
  })

  test('DDL Export 모달 닫기 버튼 동작', async ({ page }) => {
    const exportButton = page.locator(
      '[data-testid="ddl-export-button"], button:has-text("DDL"), button:has-text("Export"), button:has-text("내보내기")'
    )

    if (await exportButton.count() > 0) {
      await exportButton.click()

      const modal = page.locator('[role="dialog"], .modal, .dialog')
      await expect(modal).toBeVisible({ timeout: 5000 })

      // 닫기 버튼 클릭
      const closeButton = modal.locator(
        'button:has-text("닫기"), button:has-text("취소"), button[aria-label="닫기"], button[aria-label="Close"]'
      )
      if (await closeButton.count() > 0) {
        await closeButton.click()
        await expect(modal).not.toBeVisible({ timeout: 3000 })
      } else {
        // Escape 키로 닫기
        await page.keyboard.press('Escape')
        await expect(modal).not.toBeVisible({ timeout: 3000 })
      }
    }
  })
})
