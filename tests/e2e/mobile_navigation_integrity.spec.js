import { expect, test } from '@playwright/test';
import { launchFranchise } from './helpers/franchise.js';

const openMenu = async (page) => {
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(page.getByRole('navigation', { name: 'More navigation' })).toHaveClass(/open/);
};

test('mobile primary navigation reaches canonical surfaces and App-owned Saves', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await launchFranchise(page);
  await expect(page.getByTestId('franchise-hq')).toBeVisible({ timeout: 60_000 });

  for (const route of [
    { label: 'League Stats', identity: 'League Stats' },
    { label: 'Contracts', identity: 'Contracts' },
    { label: 'Trade', identity: 'Trade Center' },
    { label: 'Weekly Results', identity: 'Weekly Results' },
  ]) {
    await openMenu(page);
    await page.getByRole('button', { name: route.label, exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'More navigation' })).not.toHaveClass(/open/);
    await expect(page.getByRole('heading', { name: route.identity, exact: true }).first()).toBeVisible();
  }

  for (const label of ['HQ', 'Team', 'League', 'News']) {
    await page.getByRole('button', { name: label, exact: true }).last().click();
    await expect(page.getByRole('heading', { name: label === 'HQ' ? 'Franchise HQ' : label, exact: true }).first()).toBeVisible();
  }

  await openMenu(page);
  await page.getByRole('button', { name: 'Saves', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'More navigation' })).toHaveCount(0);
  await expect(page.getByTestId('app-save-slots')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Franchise save slots' })).toBeVisible();

  await expect(page.locator('body')).not.toContainText('Something went wrong');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
