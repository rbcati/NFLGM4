/** @vitest-environment node */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

describe('entity link style scope', () => {
  it('keeps the inline reset off explicit button variants', () => {
    expect(css).toContain('.app-entity-link:not(.btn)');
    expect(css).not.toMatch(/\.app-entity-link\s*\{[^}]*\bborder\s*:\s*0/s);
    expect(css).not.toMatch(/\.app-entity-link\s*\{[^}]*\bpadding\s*:\s*0/s);
    expect(css).not.toMatch(/\.app-entity-link\s*\{[^}]*\bbackground\s*:\s*transparent/s);
  });

  it('preserves focus-visible affordance for inline and button entity links', () => {
    expect(css).toContain('.app-entity-link:focus-visible');
    expect(css).toMatch(/\.app-entity-link:focus-visible\s*\{[^}]*outline\s*:/s);
  });
});
