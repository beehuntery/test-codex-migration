import { test, expect } from '@playwright/test';

test('simple works', async ({ page }) => {
  await page.goto('data:text/html,<html><body><div id="app">hello</div></body></html>');
  await expect(page.locator('#app')).toHaveText('hello');
});
