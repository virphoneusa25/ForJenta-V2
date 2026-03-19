import { Page, expect } from '@playwright/test';

export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function dismissToasts(page: Page) {
  await page.addLocatorHandler(
    page.locator('[data-sonner-toast], .Toastify__toast, [role="status"].toast, .MuiSnackbar-root'),
    async () => {
      const close = page.locator('[data-sonner-toast] [data-close], [data-sonner-toast] button[aria-label="Close"], .Toastify__close-button, .MuiSnackbar-root button');
      await close.first().click({ timeout: 2000 }).catch(() => {});
    },
    { times: 10, noWaitAfter: true }
  );
}

export async function checkForErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const errorElements = Array.from(
      document.querySelectorAll('.error, [class*="error"], [id*="error"]')
    );
    return errorElements.map(el => el.textContent || '').filter(Boolean);
  });
}

/**
 * Navigate to project builder with mobile viewport
 */
export async function navigateToMobileBuilder(page: Page, projectId: string = 'proj-demo-1') {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/project/${projectId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to project builder with desktop viewport
 */
export async function navigateToDesktopBuilder(page: Page, projectId: string = 'proj-demo-1') {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/project/${projectId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}
