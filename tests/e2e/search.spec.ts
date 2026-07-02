import { test, expect } from '@playwright/test';

test.describe('E2E Search & Product Discovery Flow', () => {
  test('should allow users to search for products and view product details', async ({ page }) => {
    // 1. Go to shop page
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    // 2. Find search input and search for a term (e.g. "shirt" or "dress")
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Classic');
    await searchInput.press('Enter');

    // 3. Verify that search results are displayed
    await page.waitForTimeout(1000); // wait for dynamic search results
    const productCard = page.locator('.product-card').first();
    await expect(productCard).toBeVisible();

    // 4. Click the product to view its details page
    const productLink = page.locator('.product-card a').first();
    await expect(productLink).toBeVisible();
    await productLink.click();

    // 5. Verify detail page loads successfully
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/product\//);
  });
});
