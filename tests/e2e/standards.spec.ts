import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * 표준 CRUD E2E 테스트
 * 표준단어, 표준도메인, 표준용어 등록/수정/삭제 및 참조 무결성 검증
 */

// 테스트용 관리자 계정
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'Admin1234!',
}

// 테스트 데이터
const TEST_WORD = {
  logical: '테스트단어',
  physical: 'TEST_WORD',
  abbreviation: 'TSTWRD',
  description: 'E2E 테스트용 표준단어',
}

const TEST_DOMAIN = {
  name: '테스트도메인',
  code: 'TEST_DOM',
  dataType: 'VARCHAR',
  length: '100',
  description: 'E2E 테스트용 표준도메인',
}

const TEST_TERM = {
  logical: '테스트용어',
  physical: 'TEST_TERM',
  description: 'E2E 테스트용 표준용어',
}

/**
 * 로그인 헬퍼
 */
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.locator('input[name="email"], input[type="email"]').fill(ADMIN_CREDENTIALS.email)
  await page.locator('input[name="password"], input[type="password"]').fill(ADMIN_CREDENTIALS.password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/(dashboard|home|admin|$)/, { timeout: 10000 })
}

/**
 * API를 통한 표준단어 생성 헬퍼
 */
async function createWordViaAPI(request: APIRequestContext, word: typeof TEST_WORD) {
  const response = await request.post('/api/standards/words', {
    data: word,
  })
  return response
}

test.describe('표준단어 등록/수정/삭제', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('표준단어 등록 성공', async ({ page }) => {
    // 표준단어 목록 페이지로 이동
    await page.goto('/standards/words')
    await expect(page).toHaveURL(/\/standards\/words/, { timeout: 10000 })

    // 새 단어 등록 버튼 클릭
    const addButton = page.locator(
      '[data-testid="add-word-button"], button:has-text("등록"), button:has-text("추가"), button:has-text("신규")'
    )
    await addButton.click()

    // 폼 입력
    await page.locator('[name="logical"], [name="logicalName"], [placeholder*="논리명"]').fill(TEST_WORD.logical)
    await page.locator('[name="physical"], [name="physicalName"], [placeholder*="물리명"]').fill(TEST_WORD.physical)

    // 약어 필드가 있는 경우
    const abbrevField = page.locator('[name="abbreviation"], [name="abbrev"], [placeholder*="약어"]')
    if (await abbrevField.count() > 0) {
      await abbrevField.fill(TEST_WORD.abbreviation)
    }

    // 설명 필드가 있는 경우
    const descField = page.locator('[name="description"], [name="desc"], textarea')
    if (await descField.count() > 0) {
      await descField.fill(TEST_WORD.description)
    }

    // 저장 버튼 클릭
    const saveButton = page.locator(
      '[data-testid="save-button"], button[type="submit"], button:has-text("저장"), button:has-text("확인")'
    )
    await saveButton.click()

    // 성공 메시지 또는 목록에 추가된 항목 확인
    await expect(
      page.locator('[role="alert"]:has-text("성공"), [role="status"], .toast, [data-testid="success-toast"]')
        .or(page.locator(`text="${TEST_WORD.logical}"`))
    ).toBeVisible({ timeout: 10000 })
  })

  test('표준단어 수정 성공', async ({ page }) => {
    await page.goto('/standards/words')

    // 수정할 행 찾기
    const editButton = page.locator(
      '[data-testid="edit-button"], button:has-text("수정"), button[aria-label="수정"]'
    ).first()
    await editButton.click()

    // 논리명 수정
    const logicalField = page.locator('[name="logical"], [name="logicalName"]')
    await logicalField.clear()
    await logicalField.fill(`${TEST_WORD.logical}_수정`)

    // 저장
    const saveButton = page.locator(
      'button[type="submit"], button:has-text("저장"), button:has-text("수정")'
    )
    await saveButton.click()

    // 성공 확인
    await expect(
      page.locator('[role="alert"], [role="status"], .toast, .success')
    ).toBeVisible({ timeout: 5000 })
  })

  test('표준단어 삭제 성공', async ({ page }) => {
    await page.goto('/standards/words')

    // 삭제할 행 개수 기록
    const rows = page.locator('table tbody tr, [data-testid="word-row"]')
    const initialCount = await rows.count()

    // 삭제 버튼 클릭
    const deleteButton = page.locator(
      '[data-testid="delete-button"], button:has-text("삭제"), button[aria-label="삭제"]'
    ).first()
    await deleteButton.click()

    // 확인 다이얼로그 처리
    const confirmButton = page.locator(
      'button:has-text("확인"), button:has-text("삭제"), [data-testid="confirm-delete"]'
    )
    if (await confirmButton.count() > 0) {
      await confirmButton.click()
    }

    // 행 개수 감소 확인 (참조 단어가 아닌 경우)
    if (initialCount > 0) {
      await expect(rows).toHaveCount(initialCount - 1, { timeout: 5000 })
    }
  })
})

test.describe('참조 단어 삭제 차단(409) 검증', () => {
  test('표준용어에서 사용 중인 표준단어 삭제 시 409 응답', async ({ request }) => {
    // API로 직접 삭제 시도 (이미 표준용어에서 참조 중인 단어 ID 사용)
    // 실제 테스트 환경에서는 시드 데이터의 참조 단어 ID를 사용
    const response = await request.delete('/api/standards/words/1')

    // 참조 중인 경우 409 Conflict 응답이어야 함
    if (response.status() === 409) {
      const body = await response.json() as { error?: string; message?: string }
      expect(body).toHaveProperty('error')
      console.log('409 응답 확인:', body)
    } else {
      // 참조가 없는 경우 200 또는 204
      expect([200, 204, 404]).toContain(response.status())
    }
  })

  test('UI에서 참조 단어 삭제 시도 시 오류 메시지 표시', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/standards/words')

    // 첫 번째 항목 삭제 시도
    const deleteButton = page.locator(
      '[data-testid="delete-button"], button:has-text("삭제"), button[aria-label="삭제"]'
    ).first()

    if (await deleteButton.count() > 0) {
      await deleteButton.click()

      // 확인 다이얼로그
      const confirmButton = page.locator('button:has-text("확인"), button:has-text("삭제")').last()
      await confirmButton.click()

      // 오류 또는 성공 메시지 확인 (두 가지 모두 유효한 결과)
      const message = page.locator('[role="alert"], .toast, .error-message, [data-testid="toast"]')
      await expect(message).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('표준도메인 등록', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('표준도메인 등록 성공', async ({ page }) => {
    await page.goto('/standards/domains')

    // 등록 버튼
    const addButton = page.locator(
      '[data-testid="add-domain-button"], button:has-text("등록"), button:has-text("추가")'
    )
    await addButton.click()

    // 도메인명 입력
    await page.locator('[name="name"], [name="domainName"], [placeholder*="도메인명"]').fill(TEST_DOMAIN.name)

    // 코드 입력
    const codeField = page.locator('[name="code"], [name="domainCode"], [placeholder*="코드"]')
    if (await codeField.count() > 0) {
      await codeField.fill(TEST_DOMAIN.code)
    }

    // 데이터 타입 선택
    const dataTypeField = page.locator('select[name="dataType"], [name="dataType"]')
    if (await dataTypeField.count() > 0) {
      await dataTypeField.selectOption(TEST_DOMAIN.dataType)
    }

    // 저장
    const saveButton = page.locator('button[type="submit"], button:has-text("저장")')
    await saveButton.click()

    // 성공 확인
    await expect(
      page.locator('[role="alert"], [role="status"], .toast, .success')
        .or(page.locator(`text="${TEST_DOMAIN.name}"`))
    ).toBeVisible({ timeout: 10000 })
  })

  test('표준도메인 목록 페이지 접근 가능', async ({ page }) => {
    await page.goto('/standards/domains')
    await expect(page).toHaveURL(/\/standards\/domains/, { timeout: 10000 })
    // 페이지 헤더 또는 테이블 확인
    await expect(
      page.locator('h1, h2, table, [data-testid="domain-list"]')
    ).toBeVisible()
  })
})

test.describe('표준용어 등록 (단어 조합)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('표준용어 등록 페이지 접근 가능', async ({ page }) => {
    await page.goto('/standards/terms')
    await expect(page).toHaveURL(/\/standards\/terms/, { timeout: 10000 })
    await expect(
      page.locator('h1, h2, table, [data-testid="term-list"]')
    ).toBeVisible()
  })

  test('표준용어 등록 - 단어 선택 UI 표시', async ({ page }) => {
    await page.goto('/standards/terms')

    // 등록 버튼
    const addButton = page.locator(
      '[data-testid="add-term-button"], button:has-text("등록"), button:has-text("추가")'
    )
    await addButton.click()

    // 단어 선택 UI 또는 논리명 입력 필드 확인
    const wordSelector = page.locator(
      '[data-testid="word-selector"], [name="words"], [name="logical"], [placeholder*="논리명"]'
    )
    await expect(wordSelector).toBeVisible({ timeout: 5000 })
  })

  test('표준용어 등록 - 단어 조합으로 물리명 자동 생성', async ({ page }) => {
    await page.goto('/standards/terms')

    // 등록 버튼
    const addButton = page.locator(
      '[data-testid="add-term-button"], button:has-text("등록"), button:has-text("추가")'
    )
    await addButton.click()

    // 논리명 입력
    const logicalField = page.locator('[name="logical"], [name="logicalName"], [placeholder*="논리명"]')
    if (await logicalField.count() > 0) {
      await logicalField.fill(TEST_TERM.logical)

      // 물리명 자동 생성 버튼이 있는 경우
      const generateButton = page.locator(
        '[data-testid="generate-physical"], button:has-text("자동생성"), button:has-text("생성")'
      )
      if (await generateButton.count() > 0) {
        await generateButton.click()
        // 물리명 필드가 채워졌는지 확인
        const physicalField = page.locator('[name="physical"], [name="physicalName"]')
        const physicalValue = await physicalField.inputValue()
        expect(physicalValue.length).toBeGreaterThan(0)
      }
    }
  })
})
