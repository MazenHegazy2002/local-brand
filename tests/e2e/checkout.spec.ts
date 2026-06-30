import { test, expect } from '@playwright/test';

test.describe('E2E Checkout Flow', () => {
  test('should log in, add product to cart, and place COD order', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('#email-input', 'user@user.com');
    await page.fill('#password-input', 'user1234');
    await page.waitForTimeout(1000); // Wait for React hydration/event handlers to attach
    await page.click('#signin-submit-btn');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Go to shop page
    await page.goto('/shop');

    // Wait for at least one product card to load and click its enabled Add to Cart button
    const addToCartButton = page.locator('.product-card button.w-full').first();
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    // Verify it changed to added state (usually says "Added" or "✓" or similar)
    await expect(addToCartButton).toHaveText(/added|✓/i);

    // 3. Navigate directly to checkout
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/checkout/);

    // 4. Fill in shipping address form
    await page.fill('input[placeholder*="Ahmed Mohamed"]', 'Test Buyer');
    await page.fill('input[placeholder*="0123456789"]', '01234567890');
    await page.fill('input[placeholder*="El Nasr St"]', '123 Test Street');
    await page.fill('input[placeholder*="Maadi"]', 'Test District');

    // Select governorate
    await page.selectOption('select:has-text("Governorate"), select:has-text("محافظة")', {
      value: 'Cairo',
    });

    // 5. Submit order (paymentMethod is CASH_ON_DELIVERY by default)
    // Find the place order / submit button
    const submitBtn = page.locator(
      'button[type="submit"]:has-text("Order"), button[type="submit"]:has-text("طلب")'
    );
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 6. Verify checkout success
    await expect(page).toHaveURL(/\/checkout\/success/);
    await expect(page.locator('h1')).toContainText(/Order Confirmed!|Thank You|شكراً|تم تأكيد/i);
  });
});
