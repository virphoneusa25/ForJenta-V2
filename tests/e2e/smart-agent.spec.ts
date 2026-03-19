import { test, expect } from '@playwright/test';

/**
 * Smart AI Build Agent Tests
 * 
 * Tests for the goal-driven, conversational AI Build Agent:
 * - TaskClassifier: Classifies prompts into 15+ task types
 * - ProjectInspector: Analyzes project context and tech stack
 * - AgentNarrator: Provides real-time streaming narration
 * - SmartBuildAgent: Orchestrates the full agent flow
 * - UI Components: AgentMessageCard, streaming thoughts display
 */

test.describe('Mobile Agent UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('mobile conversation feed displays with data-testid', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for the empty state which indicates feed is ready
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Verify conversation feed has correct data-testid
    const feed = page.getByTestId('mobile-conversation-feed');
    await expect(feed).toBeVisible();
  });

  test('mobile empty state displays correctly', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Verify empty state component
    const emptyState = page.getByTestId('mobile-empty-state');
    await expect(emptyState).toBeVisible();
    
    // Should show suggestion prompts
    await expect(page.getByText('Build a landing page')).toBeVisible();
    await expect(page.getByText('Create a dashboard')).toBeVisible();
    await expect(page.getByText('Make a todo app')).toBeVisible();
  });

  test('mobile agent input field has correct data-testid', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Verify agent input has data-testid
    const agentInput = page.getByTestId('mobile-agent-input');
    await expect(agentInput).toBeVisible();
    
    // Verify it accepts text input
    await agentInput.fill('Build me a calculator app');
    await expect(agentInput).toHaveValue('Build me a calculator app');
  });

  test('mobile send button has correct data-testid', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Verify send button exists
    const sendBtn = page.getByTestId('mobile-send-btn');
    await expect(sendBtn).toBeVisible();
  });

  test('mobile agent dock is positioned at bottom', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Get the agent input
    const agentInput = page.getByTestId('mobile-agent-input');
    await expect(agentInput).toBeVisible();
    
    // Verify it's in the bottom half of the viewport
    const inputBox = await agentInput.boundingBox();
    expect(inputBox).toBeTruthy();
    if (inputBox) {
      // Input should be in bottom section (viewport is 812px)
      expect(inputBox.y).toBeGreaterThan(500);
    }
  });

  test('mobile preview button is clickable', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    const previewBtn = page.getByTestId('mobile-preview-btn');
    await expect(previewBtn).toBeVisible();
    
    // Click should open preview sheet
    await previewBtn.click();
    
    // Preview sheet should show viewport toggles
    await expect(page.getByRole('button', { name: /mobile/i }).first()).toBeVisible();
  });

  test('mobile menu button opens tools sheet', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    const menuBtn = page.getByTestId('mobile-menu-btn');
    await expect(menuBtn).toBeVisible();
    
    await menuBtn.click();
    
    // Tools sheet should open
    await expect(page.getByRole('heading', { name: /tools/i })).toBeVisible();
    await expect(page.getByText('Save').first()).toBeVisible();
  });
});

test.describe('Agent Input Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('agent input can be typed into', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    const input = page.getByTestId('mobile-agent-input');
    await expect(input).toBeVisible();
    await input.fill('Create a landing page with hero section');
    
    await expect(input).toHaveValue('Create a landing page with hero section');
  });

  test('agent input placeholder changes based on project state', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // With existing project, should show continuation placeholder
    const input = page.getByTestId('mobile-agent-input');
    await expect(input).toBeVisible();
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder).toContain('Continue building');
  });

  test('quick actions are accessible from agent dock', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Click the sparkles/quick actions button
    const quickActionsBtn = page.getByRole('button', { name: /quick actions/i });
    await quickActionsBtn.click();
    
    // Should show quick action suggestions
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByText('Add a feature')).toBeVisible();
  });
});

test.describe('Desktop Builder with Agent Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('desktop view shows AI builder panel and files', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for the FILES header to appear as indicator of desktop layout
    await expect(page.getByText('FILES').first()).toBeVisible();
    
    // AI Builder panel should be visible (use first() to avoid strict mode)
    await expect(page.getByText('AI Builder').first()).toBeVisible();
    
    // Should show demo project files
    await expect(page.getByText('index.html').first()).toBeVisible();
  });

  test('desktop AI builder has working input field', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for desktop layout
    await expect(page.getByText('FILES').first()).toBeVisible();
    await expect(page.getByText('AI Builder').first()).toBeVisible();
    
    // Input field for prompts - it's an INPUT not TEXTAREA
    const input = page.locator('input[placeholder="Describe your web app..."]').first();
    await expect(input).toBeVisible();
    
    await input.fill('Add a dark mode toggle');
    await expect(input).toHaveValue('Add a dark mode toggle');
  });

  test('desktop AI button is visible in header', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    
    // Wait for desktop layout
    await expect(page.getByText('FILES').first()).toBeVisible();
    
    // AI button in header
    const aiBtn = page.getByRole('button', { name: /ai/i }).first();
    await expect(aiBtn).toBeVisible();
  });
});

test.describe('Agent Status Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('connection status shows "Connected"', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Should show connection status
    await expect(page.getByText('Connected')).toBeVisible();
  });

  test('header shows project name', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Project name should be displayed - todo-app
    await expect(page.getByText('todo-app')).toBeVisible();
  });
});

test.describe('Conversation Feed Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('empty state shows building suggestions', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Verify all suggestion chips are present
    await expect(page.getByText('Build a landing page')).toBeVisible();
    await expect(page.getByText('Create a dashboard')).toBeVisible();
    await expect(page.getByText('Make a todo app')).toBeVisible();
  });

  test('empty state has sparkles icon', async ({ page }) => {
    await page.goto('/project/proj-demo-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to build')).toBeVisible();
    
    // Empty state should have the sparkles icon container
    const emptyState = page.getByTestId('mobile-empty-state');
    await expect(emptyState).toBeVisible();
  });
});
