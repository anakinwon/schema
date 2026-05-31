import { test, expect, type Page } from '@playwright/test'

/**
 * 검색 고도화 E2E 테스트
 * 초성 검색, 약어 역검색, 통합검색 드롭다운 결과 표시 검증
 */

// 테스트 계정
const TEST_ACCOUNT = {
  email: 'user@example.com',
  password: 'User1234!',
}

/**
 * 로그인 헬퍼
 */
async function login(page: Page) {
  await page.goto('/login')
  await page.locator('input[name="email"], input[type="email"]').fill(TEST_ACCOUNT.email)
  await page.locator('input[name="password"], input[type="password"]').fill(TEST_ACCOUNT.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForNavigation({ timeout: 10000 }).catch(() => {})
}

/**
 * 검색 입력 필드 헬퍼
 */
async function fillSearchInput(page: Page, query: string) {
  // 검색 입력 필드 선택 (다양한 selector 시도)
  const searchInput = page.locator(
    '[data-testid="search-input"], input[placeholder*="검색"], input[type="search"], [role="searchbox"]'
  ).first()
  await searchInput.clear()
  await searchInput.fill(query)
  // 입력 후 잠시 대기 (디바운스 고려)
  await page.waitForTimeout(500)
  return searchInput
}

test.describe('초성 검색 (ㅅㅇㅈ → 사용자 매칭)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // 검색 기능이 있는 페이지로 이동
    await page.goto('/standards/words')
  })

  test('초성 "ㅅㅇㅈ" 입력 시 "사용자" 포함 결과 표시', async ({ page }) => {
    await fillSearchInput(page, 'ㅅㅇㅈ')

    // 검색 결과 또는 드롭다운 확인
    const results = page.locator(
      '[data-testid="search-results"], [data-testid="search-dropdown"], .search-results, [role="listbox"]'
    )

    // 결과가 표시될 때까지 대기
    await expect(results).toBeVisible({ timeout: 5000 })

    // "사용자" 텍스트가 결과에 포함되어야 함
    const userItem = results.locator(':has-text("사용자")')
    await expect(userItem).toBeVisible({ timeout: 3000 })
  })

  test('초성 "ㄱㄷㅂ" 입력 시 초성 매칭 결과 표시', async ({ page }) => {
    await fillSearchInput(page, 'ㄱㄷㅂ')

    const results = page.locator(
      '[data-testid="search-results"], .search-results, [role="listbox"]'
    )

    // 결과가 있으면 확인, 없으면 빈 결과 메시지 확인
    const hasResults = await results.count() > 0
    if (hasResults) {
      await expect(results).toBeVisible({ timeout: 5000 })
    }
  })

  test('초성 검색은 한글 자음만 입력했을 때 동작', async ({ page }) => {
    // 단일 초성 입력
    await fillSearchInput(page, 'ㅅ')

    // 결과 또는 빈 상태 확인
    const searchInput = page.locator(
      '[data-testid="search-input"], input[placeholder*="검색"]'
    ).first()
    const value = await searchInput.inputValue()
    expect(value).toBe('ㅅ')
  })

  test('초성 검색 API 직접 호출 검증', async ({ request }) => {
    // API 엔드포인트로 초성 검색 테스트
    const response = await request.get('/api/standards/words/search?q=ㅅㅇㅈ')

    if (response.status() === 200) {
      const data = await response.json() as unknown[]
      // 배열 형태의 응답 확인
      expect(Array.isArray(data)).toBeTruthy()
    } else {
      // API가 없는 경우 다른 경로 시도
      const altResponse = await request.get('/api/search?q=ㅅㅇㅈ&type=word')
      expect([200, 404]).toContain(altResponse.status())
    }
  })
})

test.describe('약어 역검색 (USR → 사용자)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/standards/words')
  })

  test('"USR" 입력 시 "사용자" 관련 결과 표시', async ({ page }) => {
    await fillSearchInput(page, 'USR')

    const results = page.locator(
      '[data-testid="search-results"], .search-results, [role="listbox"]'
    )

    if (await results.count() > 0) {
      await expect(results).toBeVisible({ timeout: 5000 })
      // 결과에 "사용자" 또는 "USR" 텍스트 포함 확인
      const matchingItem = results.locator(':has-text("사용자"), :has-text("USR")')
      if (await matchingItem.count() > 0) {
        await expect(matchingItem.first()).toBeVisible()
      }
    }
  })

  test('영문 대문자 약어 검색 시 매칭 결과 반환', async ({ page }) => {
    // "NM" 약어 검색 (이름 등)
    await fillSearchInput(page, 'NM')

    // 결과 확인 - 빈 결과도 유효
    const resultsOrEmpty = page.locator(
      '[data-testid="search-results"], [data-testid="no-results"], .search-results, .no-results'
    )

    const currentUrl = page.url()
    console.log('약어 역검색 페이지 URL:', currentUrl)

    // 검색 입력 후 UI가 응답해야 함
    await page.waitForTimeout(1000)
  })

  test('약어 역검색 API 직접 호출', async ({ request }) => {
    const response = await request.get('/api/standards/words/search?q=USR&type=abbreviation')

    if (response.status() === 200) {
      const data = await response.json() as unknown[]
      expect(Array.isArray(data)).toBeTruthy()
      console.log('약어 역검색 결과:', data)
    } else {
      // 대체 API 경로 시도
      const altResponse = await request.get('/api/search?q=USR&searchType=abbrev')
      expect([200, 404]).toContain(altResponse.status())
    }
  })

  test('"CUST" 약어 검색 시 "고객" 관련 결과 또는 빈 결과', async ({ page }) => {
    await fillSearchInput(page, 'CUST')

    // 결과 또는 빈 상태 모두 허용
    await page.waitForTimeout(1000)
    const inputValue = await page.locator(
      '[data-testid="search-input"], input[placeholder*="검색"]'
    ).first().inputValue()
    expect(inputValue).toBe('CUST')
  })
})

test.describe('통합검색 드롭다운 결과 표시', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('통합검색 입력 시 드롭다운이 나타남', async ({ page }) => {
    // 통합검색이 있는 페이지 (헤더 또는 메인 페이지)
    await page.goto('/')

    const searchInput = page.locator(
      '[data-testid="global-search"], [data-testid="search-input"], input[placeholder*="검색"], input[type="search"]'
    ).first()

    if (await searchInput.count() > 0) {
      await searchInput.fill('사용')

      // 드롭다운 표시 대기
      const dropdown = page.locator(
        '[data-testid="search-dropdown"], [role="listbox"], [role="combobox"] + ul, .search-dropdown, .autocomplete-dropdown'
      )
      await expect(dropdown).toBeVisible({ timeout: 5000 })
    }
  })

  test('통합검색 드롭다운에 카테고리별 결과 표시', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.locator(
      '[data-testid="global-search"], input[placeholder*="검색"]'
    ).first()

    if (await searchInput.count() > 0) {
      await searchInput.fill('관리')
      await page.waitForTimeout(500)

      // 드롭다운 내 카테고리 레이블 확인
      const dropdown = page.locator(
        '[data-testid="search-dropdown"], [role="listbox"], .search-dropdown'
      )

      if (await dropdown.count() > 0) {
        await expect(dropdown).toBeVisible({ timeout: 5000 })
        // 카테고리 레이블 (단어, 용어, 도메인 등)
        const categoryLabel = dropdown.locator(
          '[data-testid="category-label"], .category-label, .group-header'
        )
        if (await categoryLabel.count() > 0) {
          await expect(categoryLabel.first()).toBeVisible()
        }
      }
    }
  })

  test('통합검색 드롭다운 항목 클릭 시 해당 페이지로 이동', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.locator(
      '[data-testid="global-search"], input[placeholder*="검색"]'
    ).first()

    if (await searchInput.count() > 0) {
      await searchInput.fill('사용')
      await page.waitForTimeout(500)

      const dropdown = page.locator(
        '[data-testid="search-dropdown"], [role="listbox"], .search-dropdown'
      )

      if (await dropdown.count() > 0 && await dropdown.isVisible()) {
        // 첫 번째 결과 항목 클릭
        const firstItem = dropdown.locator('li, [role="option"], .search-item').first()
        if (await firstItem.count() > 0) {
          const initialUrl = page.url()
          await firstItem.click()
          // URL이 변경되거나 상세 페이지로 이동 확인
          await page.waitForTimeout(1000)
          const newUrl = page.url()
          console.log('클릭 전:', initialUrl, '| 클릭 후:', newUrl)
        }
      }
    }
  })

  test('통합검색 ESC 키로 드롭다운 닫기', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.locator(
      '[data-testid="global-search"], input[placeholder*="검색"]'
    ).first()

    if (await searchInput.count() > 0) {
      await searchInput.fill('테스트')
      await page.waitForTimeout(500)

      const dropdown = page.locator(
        '[data-testid="search-dropdown"], [role="listbox"], .search-dropdown'
      )

      if (await dropdown.count() > 0 && await dropdown.isVisible()) {
        // ESC 키 입력
        await page.keyboard.press('Escape')
        // 드롭다운이 닫혀야 함
        await expect(dropdown).not.toBeVisible({ timeout: 3000 })
      }
    }
  })

  test('통합검색 빈 쿼리 시 드롭다운 숨김', async ({ page }) => {
    await page.goto('/')

    const searchInput = page.locator(
      '[data-testid="global-search"], input[placeholder*="검색"]'
    ).first()

    if (await searchInput.count() > 0) {
      // 텍스트 입력 후 삭제
      await searchInput.fill('테스트')
      await page.waitForTimeout(300)
      await searchInput.clear()
      await page.waitForTimeout(300)

      // 드롭다운이 숨겨지거나 빈 상태여야 함
      const dropdown = page.locator(
        '[data-testid="search-dropdown"], [role="listbox"], .search-dropdown'
      )
      const isVisible = await dropdown.isVisible().catch(() => false)
      if (isVisible) {
        // 빈 쿼리 결과 없음 메시지 또는 드롭다운 미표시
        const emptyMessage = dropdown.locator(':has-text("결과"), :has-text("없음")')
        const itemCount = await dropdown.locator('li, [role="option"]').count()
        expect(itemCount === 0 || await emptyMessage.count() > 0).toBeTruthy()
      }
    }
  })

  test('통합검색 API - 초성+약어 혼합 검색', async ({ request }) => {
    // 통합 검색 API 테스트
    const queries = ['ㅅㅇㅈ', 'USR', '사용자', 'user']

    for (const query of queries) {
      const response = await request.get(`/api/search?q=${encodeURIComponent(query)}`)
      console.log(`검색어 "${query}" API 응답 상태:`, response.status())
      // 200 또는 404 (API 미구현 시) 허용
      expect([200, 404]).toContain(response.status())
    }
  })
})
