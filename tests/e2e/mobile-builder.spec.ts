import { test, expect } from '@playwright/test';

/**
 * Mobile Builder View Tests
 * 
 * Tests for the mobile-first redesign of the ForJenta AI Code Builder:
 * - Responsive breakpoint switching (< 768px mobile, >= 768px desktop)
 * - Mobile builder header with project name, status, preview and menu buttons
 * - Mobile agent dock with input and quick actions
 * - Mobile conversation feed with empty state
 * - Mobile preview CTA visibility
 * - Desktop IDE layout
 */

test.describe('Mobile Builder View (< 768px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('renders mobile builder view at mobile viewport', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to render - use a more reliable wait
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Mobile header should be visible
    await expect(page.locator('header').first()).toBeVisible();
    
    // Should NOT show desktop file sidebar
    await expect(page.getByText('FILES').first()).not.toBeVisible();
    
    // Mobile agent dock should be visible
    await expect(page.locator('textarea[placeholder*="Continue building"]')).toBeVisible();
  });

  test('mobile header displays project name and ready status', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Header should contain project name
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    
    // Status indicator "Ready" should be visible (premium redesign shows "Ready" instead of "Connected")
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
  });

  test('mobile header has preview button', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    const previewBtn = page.getByTestId('mobile-preview-btn');
    await expect(previewBtn).toBeVisible();
    await expect(previewBtn).toContainText('Preview');
  });

  test('mobile header has menu button', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    const menuBtn = page.getByTestId('mobile-menu-btn');
    await expect(menuBtn).toBeVisible();
  });

  test('mobile agent dock displays at bottom with input and send button', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Input field for prompts
    const inputField = page.locator('textarea[placeholder*="Continue building"]');
    await expect(inputField).toBeVisible();
    
    // Verify it's at the bottom of the screen
    const inputBox = await inputField.boundingBox();
    expect(inputBox).toBeTruthy();
    if (inputBox) {
      // Input should be in bottom half of screen (812px viewport)
      expect(inputBox.y).toBeGreaterThan(400);
    }
    
    // Send button
    const sendBtn = page.getByRole('button', { name: /send/i });
    await expect(sendBtn).toBeVisible();
  });

  test('mobile conversation feed shows empty state initially', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    await page.waitForSelector('header', { state: 'visible' });
    
    // Empty state: "Ready to build" text
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Empty state description
    await expect(page.getByText(/describe what you want to create/i)).toBeVisible();
  });

  test('mobile menu button opens tools sheet', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Click menu button
    const menuBtn = page.getByTestId('mobile-menu-btn');
    await menuBtn.click();
    
    // Tools sheet should open with heading
    await expect(page.getByRole('heading', { name: /tools/i })).toBeVisible();
    
    // Should show tool options
    await expect(page.getByText('Save').first()).toBeVisible();
    await expect(page.getByText('Refresh Preview').first()).toBeVisible();
  });

  test('mobile preview button opens preview sheet', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Click preview button
    const previewBtn = page.getByTestId('mobile-preview-btn');
    await previewBtn.click();
    
    // Preview sheet should open with viewport toggles
    await expect(page.getByRole('button', { name: /mobile/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /tablet/i }).first()).toBeVisible();
  });

  test('mobile input field accepts text', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    const inputField = page.locator('textarea[placeholder*="Continue building"]');
    await inputField.fill('Build a calculator app');
    
    await expect(inputField).toHaveValue('Build a calculator app');
  });

  test('quick actions button shows options', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Click sparkles button (quick actions)
    const quickActionsBtn = page.getByRole('button', { name: /quick actions/i });
    await quickActionsBtn.click();
    
    // Quick actions panel should appear with premium styling
    await expect(page.getByText('QUICK ACTIONS', { exact: false })).toBeVisible();
    // Premium UI shows "Add feature" without "a"
    await expect(page.getByText('Add feature')).toBeVisible();
  });
});

test.describe('Desktop Builder View (>= 768px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('renders desktop IDE layout at desktop viewport', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for desktop layout to fully load - check for file in sidebar
    await expect(page.locator('text=index.html').first()).toBeVisible();
    
    // Desktop shows "Files" label (case-sensitive check)
    await expect(page.getByText('Files', { exact: true }).first()).toBeVisible();
    
    // Should show Code/App tabs in header
    await expect(page.getByRole('button', { name: 'Code' })).toBeVisible();
  });

  test('desktop view shows file sidebar', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for desktop layout
    await expect(page.locator('text=index.html').first()).toBeVisible();
    
    // File sidebar should be visible with "Files" label
    await expect(page.getByText('Files', { exact: true }).first()).toBeVisible();
  });

  test('desktop view shows terminal panel', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for desktop layout
    await expect(page.locator('text=index.html').first()).toBeVisible();
    
    // Terminal panel - use first() to avoid strict mode error
    await expect(page.getByText('Terminal').first()).toBeVisible();
  });

  test('desktop view has save and run buttons', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for desktop layout
    await expect(page.locator('text=index.html').first()).toBeVisible();
    
    // Save button in header
    await expect(page.getByRole('button', { name: /save/i }).first()).toBeVisible();
    
    // Run button
    await expect(page.getByRole('button', { name: /run/i })).toBeVisible();
  });

  test('desktop view has AI panel toggle', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for desktop layout
    await expect(page.locator('text=index.html').first()).toBeVisible();
    
    // AI button
    await expect(page.getByRole('button', { name: /ai/i }).first()).toBeVisible();
  });
});

test.describe('Responsive Breakpoint Switching', () => {
  test('switches from desktop to mobile view on resize', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Verify desktop layout (Files visible)
    await expect(page.locator('text=index.html').first()).toBeVisible();
    await expect(page.getByText('Files', { exact: true }).first()).toBeVisible();
    
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForLoadState('domcontentloaded');
    
    // Verify mobile layout
    await expect(page.getByText('Ready to build')).toBeVisible();
    await expect(page.getByText('Files', { exact: true }).first()).not.toBeVisible();
  });

  test('switches from mobile to desktop view on resize', async ({ page }) => {
    // Start with mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Verify mobile layout
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Resize to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForLoadState('domcontentloaded');
    
    // Verify desktop layout
    await expect(page.getByText('Files', { exact: true }).first()).toBeVisible();
  });

  test('breakpoint at exactly 768px shows desktop view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for the page to render - check for file in sidebar
    await expect(page.locator('text=index.html').first()).toBeVisible();
    
    // Should show desktop layout
    await expect(page.getByText('Files', { exact: true }).first()).toBeVisible();
  });

  test('breakpoint at 767px shows mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 767, height: 1024 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for the page to render
    await page.waitForSelector('header', { state: 'visible' });
    
    // Should show mobile layout
    await expect(page.getByText('Ready to build')).toBeVisible();
  });
});
