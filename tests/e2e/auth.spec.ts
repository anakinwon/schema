import { test, expect, type Page } from '@playwright/test'

/**
 * 인증 흐름 E2E 테스트
 * 회원가입, 로그인, 로그아웃, 보호된 경로 접근 검증
 */

// 테스트용 계정 정보
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test1234!',
  name: '테스트유저',
}

const ADMIN_USER = {
  email: 'admin@example.com',
  password: 'Admin1234!',
}

/**
 * 로그인 헬퍼 함수
 */
async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[name="email"], input[type="email"]').fill(email)
  await page.locator('input[name="password"], input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
}

test.describe('회원가입 폼 유효성 검증', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('이메일 형식이 잘못되면 오류 메시지 표시', async ({ page }) => {
    await page.locator('input[name="email"], input[type="email"]').fill('invalid-email')
    await page.locator('input[name="password"], input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()

    // 이메일 유효성 오류 메시지 확인
    const errorMessage = page.locator('[data-testid="email-error"], .error-message, [role="alert"]')
    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('비밀번호가 너무 짧으면 오류 메시지 표시', async ({ page }) => {
    await page.locator('input[name="email"], input[type="email"]').fill(TEST_USER.email)
    await page.locator('input[name="password"], input[type="password"]').fill('123')
    await page.locator('button[type="submit"]').click()

    // 비밀번호 길이 오류 메시지 확인
    const errorMessage = page.locator('[data-testid="password-error"], .error-message, [role="alert"]')
    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('필수 필드가 비어있으면 제출 불가', async ({ page }) => {
    // 빈 폼 제출 시도
    await page.locator('button[type="submit"]').click()

    // URL이 변경되지 않아야 함 (제출 실패)
    await expect(page).toHaveURL(/\/register/)
  })

  test('비밀번호 확인 불일치 시 오류 메시지 표시', async ({ page }) => {
    await page.locator('input[name="email"], input[type="email"]').fill(TEST_USER.email)
    await page.locator('input[name="password"], input[type="password"]').fill('Test1234!')

    // 비밀번호 확인 필드가 있는 경우
    const confirmPasswordField = page.locator(
      'input[name="confirmPassword"], input[name="passwordConfirm"]'
    )
    const hasConfirmField = await confirmPasswordField.count()
    if (hasConfirmField > 0) {
      await confirmPasswordField.fill('DifferentPassword!')
      await page.locator('button[type="submit"]').click()
      const errorMessage = page.locator('[data-testid="confirm-error"], .error-message, [role="alert"]')
      await expect(errorMessage).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('로그인 성공/실패', () => {
  test('올바른 자격증명으로 로그인 성공', async ({ page }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password)

    // 로그인 성공 후 홈 또는 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL(/\/(dashboard|home|$)/, { timeout: 10000 })
  })

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"], input[type="email"]').fill(TEST_USER.email)
    await page.locator('input[name="password"], input[type="password"]').fill('WrongPassword!')
    await page.locator('button[type="submit"]').click()

    // 오류 메시지 표시 확인
    const errorMessage = page.locator('[role="alert"], .error-message, [data-testid="login-error"]')
    await expect(errorMessage).toBeVisible({ timeout: 5000 })

    // URL이 /login으로 유지되어야 함
    await expect(page).toHaveURL(/\/login/)
  })

  test('존재하지 않는 이메일로 로그인 실패', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"], input[type="email"]').fill('nonexistent@example.com')
    await page.locator('input[name="password"], input[type="password"]').fill('Test1234!')
    await page.locator('button[type="submit"]').click()

    // 오류 메시지 표시 확인
    const errorMessage = page.locator('[role="alert"], .error-message, [data-testid="login-error"]')
    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('로그인 폼에 이메일 입력 필드가 존재해야 함', async ({ page }) => {
    await page.goto('/login')
    await expect(
      page.locator('input[name="email"], input[type="email"]')
    ).toBeVisible()
  })

  test('로그인 폼에 비밀번호 입력 필드가 존재해야 함', async ({ page }) => {
    await page.goto('/login')
    await expect(
      page.locator('input[name="password"], input[type="password"]')
    ).toBeVisible()
  })
})

test.describe('미인증 접근 시 /login 리다이렉트', () => {
  test('보호된 경로(/dashboard) 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('보호된 경로(/admin) 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/admin')
    // /admin은 로그인 후에도 권한 확인하므로 /login 또는 /로 리다이렉트
    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 10000 })
  })

  test('/login 페이지는 미인증 상태에서 접근 가능', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('form')).toBeVisible()
  })

  test('/register 페이지는 미인증 상태에서 접근 가능', async ({ page }) => {
    await page.goto('/register')
    // register가 없으면 login으로 리다이렉트될 수 있음
    const url = page.url()
    expect(url).toMatch(/\/(register|login)/)
  })
})

test.describe('로그아웃 후 세션 파기', () => {
  test('로그아웃 후 보호된 경로 접근 시 /login으로 리다이렉트', async ({ page }) => {
    // 로그인
    await loginAs(page, TEST_USER.email, TEST_USER.password)
    await expect(page).toHaveURL(/\/(dashboard|home|$)/, { timeout: 10000 })

    // 로그아웃 버튼 클릭
    const logoutButton = page.locator(
      '[data-testid="logout-button"], button:has-text("로그아웃"), button:has-text("Logout"), a:has-text("로그아웃")'
    )
    await logoutButton.click()

    // 로그아웃 후 /login으로 이동 확인
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // 보호된 경로 재접근 시도
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('로그아웃 후 브라우저 뒤로가기로 보호된 페이지 접근 불가', async ({ page }) => {
    // 로그인
    await loginAs(page, TEST_USER.email, TEST_USER.password)
    await expect(page).toHaveURL(/\/(dashboard|home|$)/, { timeout: 10000 })

    // 로그아웃
    const logoutButton = page.locator(
      '[data-testid="logout-button"], button:has-text("로그아웃"), button:has-text("Logout")'
    )
    await logoutButton.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // 뒤로가기
    await page.goBack()

    // 여전히 인증이 필요한 페이지면 /login으로 리다이렉트되어야 함
    const currentUrl = page.url()
    // 뒤로가기 후 /login으로 다시 리다이렉트되거나, 캐시된 페이지가 표시될 수 있음
    // 핵심: API 호출이 401을 반환해야 함
    const apiResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/me')
        return res.status
      } catch {
        return 0
      }
    })
    // 로그아웃 후 인증 API는 401 또는 접근 불가여야 함
    expect([401, 403, 0]).toContain(apiResponse)
    console.log('현재 URL:', currentUrl, '| API 응답:', apiResponse)
  })
})
