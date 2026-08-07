import { test, expect } from '@playwright/test';
import { goToTab, launchFranchise } from './helpers/franchise.js';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('League Hub Season Pulse is readable without horizontal overflow', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await launchFranchise(page);
  await goToTab(page, 'league');

  await expect(page.getByRole('heading', { name: 'League Season Pulse' })).toBeVisible();
  await expect(page.getByText('What matters around the league right now.')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/league-hub-season-pulse-mobile.png', fullPage: true });
});
