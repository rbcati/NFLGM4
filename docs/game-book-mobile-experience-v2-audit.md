# Game Book Mobile Experience V2 audit

## Baseline

- Audited `main` at `5b59927d6f527ac37d6c85d9e3bfb8858206d065`, the merge commit for PR #1768.
- The pre-change supported-game hierarchy was: `GameDetailScreen` route stack → sticky return/week/duplicate compact score → full `ScreenHeader` with a second return, repeated final metadata, and next-week action → standalone Preparation Context `SectionCard` → outer “Game Book Detail” `SectionCard` → embedded `BoxScorePanel`/`BoxScore` with a third dismiss action, canonical score hero, section tabs, and content.
- `BoxScore` already owned the strongest score identity and Summary / Team Stats / Players / Plays presentation. `GameDetailScreen` already owned canonical resolution and preparation classification. `LeagueDashboard`/`App` owned route navigation.

## Consolidation

The final supported-game hierarchy is:

1. compact route-owned return bar (one button);
2. existing `BoxScore` score/matchup hero (one visible score identity);
3. existing Game Book section tabs;
4. existing selected section content;
5. compact Preparation Context subsection inside Summary.

The redundant full `ScreenHeader`, standalone preparation card, outer “Game Book Detail” card, sticky duplicate score, and embedded close button were removed from the supported-game composition rather than visually hidden. Standalone/non-embedded BoxScore dismiss behavior remains intact.

## Authority and truthfulness

- Score, matchup, W/L/tie, week, and season continue to come from the existing `buildGameBookPresentation` result consumed by `BoxScore`; no score is recalculated.
- The one return button calls the existing `onBack` callback. No route, navigation state, or bottom-navigation ownership changed.
- Preparation Context still comes from `buildWeeklyDecisionImpact` and the existing `classifyPreparationBullet` rules. “Not recorded” retains the original explanatory text for assistive technology; generic and no-marker fallbacks remain explicit.
- Team abbreviations in the score hero use the existing `TeamButton`, retaining drill-down when an `onTeamSelect` callback and team ID are available.
- Player links and their Game Book return context are unchanged.
- The existing presentation view model continues to gate Team Stats, Players, and Plays. Score-only/limited records receive no fabricated tabs, player rows, plays, or metrics.

## Files changed

- `src/ui/components/GameDetailScreen.jsx`
- `src/ui/components/GameDetailScreen.test.jsx`
- `src/ui/components/BoxScore.jsx`
- `src/ui/components/BoxScore.test.jsx`
- `src/ui/components/__tests__/gameBookMobileDensity.test.jsx`
- `src/ui/components/__tests__/mobileMatchReviewFlow.viewport.test.jsx`
- `src/ui/styles/app-mobile.css`
- `src/ui/styles/style.css`
- `tests/e2e/mobile_game_day_trust.spec.js`
- `docs/game-book-mobile-experience-v2-audit.md`

## Mobile validation

The responsive implementation uses only Game Book-specific selectors, has no fixed-width content addition, and retains horizontally scrollable tab strips and stat tables. No `html`/`body` overflow masking was added. Static viewport/navigation regression coverage exercises the mobile shell.

Interactive 375/390/430 browser inspection, screenshots, overflow evaluation, and before/after vertical measurements could not be completed in this environment: Playwright's Chromium executable was absent, and `npx playwright install chromium` was blocked with HTTP 403 “Domain forbidden.” No measurements or screenshots are claimed.

## Accessibility

- The supported Game Book DOM contains one route-level return button with existing context-sensitive accessible text and native keyboard semantics.
- Embedded BoxScore no longer leaves a visually hidden or accessibility-tree duplicate dismiss control.
- Existing tab roles, selected states, native buttons, focus styles, and 44px tab targets remain.
- Preparation Context is a labelled Summary section with an `h3`; unavailable details remain available to screen readers.
- Team score-hero drill-down uses native buttons when supported.

## Validation

Targeted Vitest coverage verifies the single return control, single score hero, Summary placement, truthful preparation states, limited tab gating, tab switching, player/team interactions, navigation ownership, and mobile navigation availability. Production build succeeds with the repository's expected chunk-size warning. Full-suite, sim-type, deploy parity, and attempted E2E results are recorded in the pull request.

## Explicit non-goals

No simulation, depth-chart, injury, stat calculation/allocation, score authority, archive/save schema, worker, persistence, resolver, data fetch, Weekly Results/HQ/Team Hub/League redesign, stat table, or special-teams behavior changed. No new Game Book model, parser, or data authority was introduced.
