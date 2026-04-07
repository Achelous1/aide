import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '../../.vite/build/index.js')],
    env: { ...process.env, NODE_ENV: 'test' },
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  // Wait for React to render
  await page.waitForTimeout(2000);
});

test.afterAll(async () => {
  await app.close();
});

test.describe('Welcome Page', () => {
  test('should display hero title', async () => {
    const hero = page.locator('text=> aide_');
    await expect(hero).toBeVisible();
  });

  test('should display Open Repository button', async () => {
    const btn = page.locator('button', { hasText: 'Open Repository' });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('should display New Project button', async () => {
    const btn = page.locator('button', { hasText: 'New Project' });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('should display aide title in top bar', async () => {
    const title = page.locator('text=> aide').first();
    await expect(title).toBeVisible();
  });

  test('should not show terminal layout when no workspace is active', async () => {
    // StatusBar should NOT be visible on welcome page
    const statusBar = page.locator('text=plugins active');
    await expect(statusBar).not.toBeVisible();
  });
});
