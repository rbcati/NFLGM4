import { test, expect } from '@playwright/test';
import { launchFranchise } from './helpers/franchise.js';

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(120000);

test('mobile weekly-result navigation and Game Book remain single-owner', async ({ page }) => {
  await page.goto('/');
  await launchFranchise(page);
  await expect(page.getByTestId('franchise-hq')).toBeVisible({ timeout: 90000 });

  const seasonPulse = page.getByTestId('season-pulse');
  const gameBookEntry = seasonPulse.getByRole('button', { name: /view game book/i });
  if (await gameBookEntry.isVisible().catch(() => false)) {
    await gameBookEntry.click();
    await expect(page.getByTestId('game-book')).toHaveCount(1);
    await expect(page.getByTestId('return-to-hq')).toHaveCount(1);

    await page.getByRole('button', { name: 'Team', exact: true }).last().click();
    await expect(page.getByTestId('game-book')).toHaveCount(0);
    await expect(page.locator('.mobile-bottom-bar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();

    await page.getByRole('button', { name: 'League', exact: true }).last().click();
    await expect(page.getByTestId('post-game-summary')).toHaveCount(0);
  }

  await page.getByRole('button', { name: 'More', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'More navigation' })).toBeVisible();
  await expect(page.locator('.quick-jump-fab, [aria-label="Help"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
