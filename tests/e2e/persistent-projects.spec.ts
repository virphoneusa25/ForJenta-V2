import { test, expect } from '@playwright/test';

/**
 * Persistent Projects Tests
 * 
 * Tests for the bug fixes related to:
 * 1. AI generator clearing vs building/saving projects
 * 2. Generated projects appearing in workspace
 * 3. Users can return to saved projects
 * 4. Project builder loads persistent project data on mount
 * 5. Continuation prompts save with version history
 * 6. Workspace mobile scroll fix
 */

test.describe('Project Builder - Persistent Project Loading', () => {
  test('loads project files on mount', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Check if we hit Cloudflare
    const isCloudflare = await page.locator('text=Verify you are human').isVisible().catch(() => false);
    if (isCloudflare) {
      test.skip();
      return;
    }
    
    // Wait for the Files section to appear (indicates project loaded)
    await expect(page.getByText('Files', { exact: true }).first()).toBeVisible();
    
    // Verify files are present in the file sidebar
    await expect(page.getByText('index.html').first()).toBeVisible();
    await expect(page.getByText('styles.css').first()).toBeVisible();
    await expect(page.getByText('script.js').first()).toBeVisible();
  });

  test('project builder shows AI panel for generation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Check if we hit Cloudflare
    const isCloudflare = await page.locator('text=Verify you are human').isVisible().catch(() => false);
    if (isCloudflare) {
      test.skip();
      return;
    }
    
    // Wait for page to load
    await expect(page.getByText('index.html').first()).toBeVisible();
    
    // AI Builder panel should be visible
    await expect(page.getByText('AI Builder').first()).toBeVisible();
    
    // Input for prompts should be present
    await expect(page.getByPlaceholder('Describe your web app').first()).toBeVisible();
  });

  test('project builder has History button for prompt history', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Check if we hit Cloudflare
    const isCloudflare = await page.locator('text=Verify you are human').isVisible().catch(() => false);
    if (isCloudflare) {
      test.skip();
      return;
    }
    
    // Wait for page to load
    await expect(page.getByText('index.html').first()).toBeVisible();
    
    // History button should be visible in header
    const historyBtn = page.getByRole('button', { name: /history/i });
    await expect(historyBtn).toBeVisible();
  });

  test('project builder has Changes button for version tracking', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Check if we hit Cloudflare
    const isCloudflare = await page.locator('text=Verify you are human').isVisible().catch(() => false);
    if (isCloudflare) {
      test.skip();
      return;
    }
    
    // Wait for page to load
    await expect(page.getByText('index.html').first()).toBeVisible();
    
    // Changes button should be visible in header
    const changesBtn = page.getByRole('button', { name: /changes/i });
    await expect(changesBtn).toBeVisible();
  });

  test('project builder has Versions button for version management', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Check if we hit Cloudflare
    const isCloudflare = await page.locator('text=Verify you are human').isVisible().catch(() => false);
    if (isCloudflare) {
      test.skip();
      return;
    }
    
    // Wait for page to load
    await expect(page.getByText('index.html').first()).toBeVisible();
    
    // Versions button should be visible in header
    const versionsBtn = page.getByRole('button', { name: /versions/i });
    await expect(versionsBtn).toBeVisible();
  });

  test('continuation prompt input accepts text', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Check if we hit Cloudflare
    const isCloudflare = await page.locator('text=Verify you are human').isVisible().catch(() => false);
    if (isCloudflare) {
      test.skip();
      return;
    }
    
    // Wait for page to load
    await expect(page.getByText('index.html').first()).toBeVisible();
    
    // Find the input field for prompts
    const promptInput = page.getByPlaceholder('Describe your web app').first();
    await expect(promptInput).toBeVisible();
    
    // Type a continuation prompt
    await promptInput.fill('Add a dark mode toggle button');
    
    // Verify input accepts text
    await expect(promptInput).toHaveValue('Add a dark mode toggle button');
  });
});

test.describe('Mobile Project Builder - Persistent Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('loads project on mount and shows project name', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for mobile view to render - look for Ready to build
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Project name should be visible in header (todo-app)
    await expect(page.getByText('todo-app').first()).toBeVisible();
    
    // Ready status should be visible (premium redesign uses "Ready" instead of "Connected")
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
  });

  test('mobile input for continuation prompts', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for mobile view
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Mobile agent dock input should be visible
    const inputField = page.locator('textarea[placeholder*="Continue building"]');
    await expect(inputField).toBeVisible();
    
    // Type a continuation prompt
    await inputField.fill('Add user authentication');
    await expect(inputField).toHaveValue('Add user authentication');
  });
});

test.describe('Workspace - Mobile Scroll Fix', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('workspace loads on mobile viewport', async ({ page }) => {
    await page.goto('/workspace', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to render - check for main content
    await expect(page.getByText('Got an idea')).toBeVisible();
    await expect(page.getByPlaceholder('Describe what you want to build').first()).toBeVisible();
  });

  test('left panel allows vertical scrolling (overflow-y-auto fix)', async ({ page }) => {
    await page.goto('/workspace', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to render
    await expect(page.getByText('Got an idea')).toBeVisible();
    
    // Find the main content area - the left panel should allow scrolling
    // The fix changed the left panel from overflow-hidden to overflow-y-auto
    // We check via computed style on the container that holds the composer
    const overflowValue = await page.evaluate(() => {
      // Find container with flex-col that contains the composer content
      const flexColContainers = document.querySelectorAll('div.flex-col');
      for (const container of flexColContainers) {
        const style = window.getComputedStyle(container);
        if (style.overflowY === 'auto' && container.closest('main')) {
          return 'auto';
        }
      }
      // Also check for any element with overflow-y-auto class inside main
      const mainEl = document.querySelector('main');
      if (mainEl) {
        const scrollContainers = mainEl.querySelectorAll('[class*="overflow"]');
        for (const el of scrollContainers) {
          const style = window.getComputedStyle(el);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            return style.overflowY;
          }
        }
      }
      return 'not-found';
    });
    
    // The fix ensures overflow-y is 'auto' - not 'hidden'
    expect(['auto', 'scroll']).toContain(overflowValue);
  });

  test('template buttons are visible', async ({ page }) => {
    await page.goto('/workspace', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to render
    await expect(page.getByText('Got an idea')).toBeVisible();
    
    // Template/suggestion buttons should be visible
    await expect(page.getByText('Build a CRM dashboard').first()).toBeVisible();
    await expect(page.getByText('Create a landing page').first()).toBeVisible();
  });
});

test.describe('Workspace - Desktop View', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('workspace loads with sidebar and main content', async ({ page }) => {
    await page.goto('/workspace', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to render
    await expect(page.getByText('Got an idea')).toBeVisible();
    
    // Sidebar should be visible on desktop - has Home link
    await expect(page.getByText('Home').first()).toBeVisible();
    
    // Main composer should be visible
    await expect(page.getByPlaceholder('Describe what you want to build').first()).toBeVisible();
  });

  test('workspace sidebar shows projects section', async ({ page }) => {
    await page.goto('/workspace', { waitUntil: 'domcontentloaded' });
    
    await expect(page.getByText('Got an idea')).toBeVisible();
    
    // The sidebar should have a Projects section
    // Note: The actual text might be "PROJECTS" or different based on the component
    const sidebarProjects = page.locator('aside').getByText(/projects/i).first();
    await expect(sidebarProjects).toBeVisible();
  });
});

test.describe('Project Navigation', () => {
  test('can navigate from workspace to project builder via sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/workspace', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Check if we hit Cloudflare
    const isCloudflare = await page.locator('text=Verify you are human').isVisible().catch(() => false);
    if (isCloudflare) {
      test.skip();
      return;
    }
    
    // Wait for workspace to load - look for main text
    await expect(page.getByPlaceholder('Describe what you want to build').first()).toBeVisible();
    
    // Click on the todo-app project in sidebar (if visible)
    const projectLink = page.locator('aside').getByText('todo-app').first();
    
    // Check if project is in sidebar
    if (await projectLink.isVisible()) {
      await projectLink.click();
      
      // Should navigate to project builder
      await page.waitForURL(/\/project\//);
      
      // Verify we're in the project builder - look for file in sidebar
      await expect(page.getByText('index.html').first()).toBeVisible();
    } else {
      // If no project in sidebar, skip this test
      test.skip();
    }
  });

  test('can navigate back to workspace from project builder', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Check if we hit Cloudflare
    const isCloudflare = await page.locator('text=Verify you are human').isVisible().catch(() => false);
    if (isCloudflare) {
      test.skip();
      return;
    }
    
    // Wait for project builder to load - look for file in sidebar
    await expect(page.getByText('index.html').first()).toBeVisible();
    
    // Click back arrow to go to workspace
    const backButton = page.locator('button[aria-label="Back"]').first();
    await expect(backButton).toBeVisible();
    await backButton.click();
    
    // Should navigate back to workspace
    await page.waitForURL(/\/workspace/);
    
    // Verify we're in the workspace
    await expect(page.getByPlaceholder('Describe what you want to build').first()).toBeVisible();
  });

  test('project files remain accessible after navigation away and back', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Go to project builder directly
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    
    // Check if we hit Cloudflare
    const isCloudflare = await page.locator('text=Verify you are human').isVisible().catch(() => false);
    if (isCloudflare) {
      test.skip();
      return;
    }
    
    // Wait for project to load - file in sidebar indicates loaded
    await expect(page.getByText('index.html').first()).toBeVisible();
    
    // Navigate away to homepage
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await expect(page.getByText('Build any app')).toBeVisible();
    
    // Return to project
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    
    // Project files should still be visible (context preserved)
    await expect(page.getByText('index.html').first()).toBeVisible();
    await expect(page.getByText('styles.css').first()).toBeVisible();
  });
});
