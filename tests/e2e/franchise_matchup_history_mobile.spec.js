import { test, expect } from '@playwright/test';
import { launchFranchise } from './helpers/franchise.js';

test.describe('Franchise matchup history mobile context', () => {
  for (const viewport of [
    { name: '375px', width: 375, height: 812 },
    { name: '390px', width: 390, height: 844 },
    { name: '430px', width: 430, height: 932 },
  ]) {
    test(`${viewport.name} keeps recorded opponent context compact`, async ({ page, context }) => {
      await context.clearCookies();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await launchFranchise(page);

      const history = page.getByTestId('hq-matchup-history');
      await expect(history).toBeVisible({ timeout: 60000 });
      await expect(history).toContainText(/recorded franchise history|leads last|recent series tied/i);
      await expect(history.locator('table')).toHaveCount(0);

      const layout = await page.evaluate(() => {
        const doc = document.documentElement;
        const panel = document.querySelector('[data-testid="hq-matchup-history"]');
        const rect = panel?.getBoundingClientRect();
        const style = panel ? window.getComputedStyle(panel) : null;
        return {
          documentFits: doc.scrollWidth <= doc.clientWidth + 1,
          panelFits: Boolean(rect && rect.left >= -1 && rect.right <= doc.clientWidth + 1),
          nestedScroll: Boolean(style && ['auto', 'scroll'].includes(style.overflowY)),
        };
      });

      expect(layout.documentFits).toBe(true);
      expect(layout.panelFits).toBe(true);
      expect(layout.nestedScroll).toBe(false);
      await expect(page.locator('body')).not.toContainText('Something went wrong');
    });
  }
});
