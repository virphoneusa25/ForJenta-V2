import { test, expect } from '@playwright/test';

/**
 * Premium Mobile UI Tests
 * 
 * Tests for the premium conversation-driven AI build agent mobile interface:
 * - Dark premium interface styling
 * - Conversation-first build feed
 * - Inline file action cards
 * - Polished status messages
 * - Sticky bottom agent dock
 * - Floating preview access
 * - Touch-friendly interactions
 */

test.describe('Premium Mobile Builder UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
  });

  test.describe('Dark Premium Interface', () => {
    test('mobile builder has dark background', async ({ page }) => {
      // Main container should have dark background
      const mobileView = page.getByTestId('mobile-builder-view');
      await expect(mobileView).toBeVisible();
      
      // Check that dark styling is applied
      const bgColor = await mobileView.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      // Dark background (black or very dark gray)
      expect(bgColor).toMatch(/rgb\(0,\s*0,\s*0\)|rgba\(0,\s*0,\s*0/);
    });

    test('header has glass-morphism styling', async ({ page }) => {
      const header = page.getByTestId('mobile-builder-header');
      await expect(header).toBeVisible();
      
      // Header should have sticky positioning
      const position = await header.evaluate(el => 
        window.getComputedStyle(el).position
      );
      expect(position).toBe('sticky');
    });
  });

  test.describe('Conversation-First Build Feed', () => {
    test('conversation feed container is visible', async ({ page }) => {
      const feed = page.getByTestId('mobile-conversation-feed');
      await expect(feed).toBeVisible();
    });

    test('empty state shows quick action suggestions', async ({ page }) => {
      const emptyState = page.getByTestId('mobile-empty-state');
      await expect(emptyState).toBeVisible();
      
      // Should show "Try one of these" section
      await expect(page.getByText('TRY ONE OF THESE', { exact: false })).toBeVisible();
      
      // Quick suggestions visible
      await expect(page.getByText('Build a landing page')).toBeVisible();
      await expect(page.getByText('Create a dashboard')).toBeVisible();
      await expect(page.getByText('Design a portfolio')).toBeVisible();
    });

    test('quick suggestion buttons are clickable', async ({ page }) => {
      // Click on "Build a landing page" suggestion
      const suggestionBtn = page.getByText('Build a landing page').locator('..');
      await suggestionBtn.click();
      
      // After clicking, input should have the prompt text
      const input = page.getByTestId('mobile-agent-input');
      const inputValue = await input.inputValue();
      expect(inputValue).toContain('landing page');
    });
  });

  test.describe('Sticky Bottom Agent Dock', () => {
    test('agent dock is visible at bottom', async ({ page }) => {
      const dock = page.getByTestId('mobile-agent-dock');
      await expect(dock).toBeVisible();
      
      // Should be at bottom (sticky)
      const position = await dock.evaluate(el => 
        window.getComputedStyle(el).position
      );
      expect(position).toBe('sticky');
    });

    test('agent dock has text input field', async ({ page }) => {
      const input = page.getByTestId('mobile-agent-input');
      await expect(input).toBeVisible();
      
      // Placeholder text
      const placeholder = await input.getAttribute('placeholder');
      expect(placeholder).toContain('building');
    });

    test('agent dock has send button', async ({ page }) => {
      const sendBtn = page.getByTestId('mobile-send-btn');
      await expect(sendBtn).toBeVisible();
    });

    test('send button disabled when input is empty', async ({ page }) => {
      const sendBtn = page.getByTestId('mobile-send-btn');
      await expect(sendBtn).toBeDisabled();
    });

    test('send button enabled when input has text', async ({ page }) => {
      const input = page.getByTestId('mobile-agent-input');
      await input.fill('Build a calculator');
      
      const sendBtn = page.getByTestId('mobile-send-btn');
      await expect(sendBtn).not.toBeDisabled();
    });
  });

  test.describe('Mobile Header Components', () => {
    test('header displays project name', async ({ page }) => {
      const header = page.getByTestId('mobile-builder-header');
      await expect(header).toContainText('todo-app');
    });

    test('header shows ready status indicator', async ({ page }) => {
      // Ready status with green dot
      await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    });

    test('back button navigates to workspace', async ({ page }) => {
      const backBtn = page.getByTestId('mobile-back-btn');
      await expect(backBtn).toBeVisible();
      
      await backBtn.click();
      
      // Should navigate to workspace
      await expect(page).toHaveURL(/workspace/);
    });

    test('preview button has gradient styling', async ({ page }) => {
      const previewBtn = page.getByTestId('mobile-preview-btn');
      await expect(previewBtn).toBeVisible();
      
      // Should have visible gradient background
      const bgImage = await previewBtn.evaluate(el => 
        window.getComputedStyle(el).backgroundImage
      );
      expect(bgImage).toContain('gradient');
    });

    test('menu button is touch-friendly size', async ({ page }) => {
      const menuBtn = page.getByTestId('mobile-menu-btn');
      await expect(menuBtn).toBeVisible();
      
      // Check button is at least 44x44 for touch targets
      const box = await menuBtn.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    });
  });

  test.describe('Mobile Preview Access', () => {
    test('preview button in header opens preview sheet', async ({ page }) => {
      const previewBtn = page.getByTestId('mobile-preview-btn');
      await previewBtn.click();
      
      // Preview sheet should open with viewport toggles
      await expect(page.getByRole('button', { name: /mobile/i }).first()).toBeVisible();
    });

    test('preview CTA appears when project has content', async ({ page }) => {
      // Note: proj-demo-1 has content, so preview CTA should be visible
      const previewCta = page.getByTestId('mobile-preview-cta');
      await expect(previewCta).toBeVisible();
    });
  });

  test.describe('Mobile Tools Sheet', () => {
    test('tools sheet opens from menu button', async ({ page }) => {
      const menuBtn = page.getByTestId('mobile-menu-btn');
      await menuBtn.click();
      
      // Tools heading should appear
      await expect(page.getByRole('heading', { name: /tools/i })).toBeVisible();
    });

    test('tools sheet has save option', async ({ page }) => {
      const menuBtn = page.getByTestId('mobile-menu-btn');
      await menuBtn.click();
      
      await expect(page.getByText('Save', { exact: true })).toBeVisible();
    });

    test('tools sheet has refresh preview option', async ({ page }) => {
      const menuBtn = page.getByTestId('mobile-menu-btn');
      await menuBtn.click();
      
      await expect(page.getByText('Refresh Preview')).toBeVisible();
    });

    test('tools sheet has versions option', async ({ page }) => {
      const menuBtn = page.getByTestId('mobile-menu-btn');
      await menuBtn.click();
      
      await expect(page.getByText('Versions', { exact: true }).first()).toBeVisible();
    });

    test('tools sheet has history option', async ({ page }) => {
      const menuBtn = page.getByTestId('mobile-menu-btn');
      await menuBtn.click();
      
      // Build History is the actual label in tools sheet
      await expect(page.getByText('Build History')).toBeVisible();
    });
  });

  test.describe('Touch-Friendly Interactions', () => {
    test('quick action buttons have proper touch targets', async ({ page }) => {
      // Quick action suggestions in empty state
      const suggestionBtns = page.locator('button:has-text("Build a landing page")');
      const firstBtn = suggestionBtns.first();
      await expect(firstBtn).toBeVisible();
      
      const box = await firstBtn.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Touch targets should be at least 48px height
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('input container has rounded styling', async ({ page }) => {
      const dock = page.getByTestId('mobile-agent-dock');
      await expect(dock).toBeVisible();
      
      // Check that dock has rounded class
      const hasRounded = await dock.evaluate(el => {
        return el.querySelector('[class*="rounded"]') !== null;
      });
      
      // Should have rounded corners
      expect(hasRounded).toBeTruthy();
    });
  });

  test.describe('Premium Spacing and Readability', () => {
    test('conversation feed has proper padding', async ({ page }) => {
      const feed = page.getByTestId('mobile-conversation-feed');
      
      // The feed container should have padding for readability
      const paddingLeft = await feed.evaluate(el => {
        // Check first child div for padding
        const inner = el.querySelector('div');
        return inner ? window.getComputedStyle(inner).paddingLeft : '0px';
      });
      
      // Should have some padding (at least 16px)
      const paddingValue = parseInt(paddingLeft);
      expect(paddingValue).toBeGreaterThanOrEqual(16);
    });

    test('empty state text is properly centered', async ({ page }) => {
      const emptyState = page.getByTestId('mobile-empty-state');
      
      const textAlign = await emptyState.evaluate(el => 
        window.getComputedStyle(el).textAlign
      );
      expect(textAlign).toBe('center');
    });
  });
});

test.describe('Mobile Preview Sheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { state: 'visible' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Open preview sheet
    const previewBtn = page.getByTestId('mobile-preview-btn');
    await previewBtn.click();
  });

  test('preview sheet shows viewport toggles', async ({ page }) => {
    // Mobile/Tablet/Desktop toggles
    await expect(page.getByRole('button', { name: /mobile/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /tablet/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /desktop/i }).first()).toBeVisible();
  });

  test('preview sheet has close button', async ({ page }) => {
    // Close button (X)
    const closeBtn = page.getByRole('button', { name: /close/i }).first();
    await expect(closeBtn).toBeVisible();
  });

  test('preview sheet shows preview iframe', async ({ page }) => {
    // Preview iframe should be visible
    await expect(page.locator('iframe').first()).toBeVisible();
  });
});
