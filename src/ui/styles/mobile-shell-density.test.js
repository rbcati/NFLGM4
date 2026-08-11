/** @vitest-environment node */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./mobile-shell-density.css', import.meta.url), 'utf8');

describe('mobile shell density scope', () => {
  it('does not flatten the generic card primitive', () => {
    expect(css).not.toMatch(/(^|,)\s*\.card\s*(,|\{)/m);
    expect(css).not.toContain('.card::before');
    expect(css).toContain('.pfgm-density-surface .app-section-card');
  });

  it('does not mask document-level horizontal overflow', () => {
    const documentRule = css.match(/html,\s*\n\s*body\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(documentRule).not.toMatch(/overflow-x\s*:/);
    expect(css).toContain('.pfgm-density-surface .standings-tabs');
    expect(css).toContain('overflow-x: auto');
  });
});
