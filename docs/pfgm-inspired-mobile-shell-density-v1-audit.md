# PFGM-Inspired Mobile Shell & Density V1 Audit

## Baseline and ownership

- Audited baseline commit `94596b5`, the merge commit for PR #1745. The checkout exposed the baseline as branch `work`; this change was created on `feature/pr-1746-pfgm-inspired-mobile-shell-density-v1` without using an unrelated branch.
- `src/ui/App.jsx` owns the application shell, header actions, route selection, and App-owned Saves / `SaveSlotManager` presentation. No route strings, handlers, or ownership changed.
- `src/ui/components/MobileNav.jsx` owns the five bottom destinations and More drawer. Its section/destination/App-action callbacks and close-on-route, Escape, and collapse behavior remain intact.
- `src/ui/components/LeagueDashboard.jsx` owns the dashboard destination switcher and League surface. `FranchiseHQ`, `LeagueHub`, `TeamHub`, `NewsFeed`, and `WeeklyResultsCenter` supply the most visible mobile content inside that shell.
- Simulation remains in `src/worker`; IndexedDB remains the persistence owner. Neither area is touched.

## Live style-system findings

- CSS enters through `src/ui/main.jsx`. The existing order is `base.css`, legacy/global component rules, layout/hub/mobile layers, `app-mobile.css`, shared `screen-system.css`, then `stadium-theme.css`.
- Live shared primitives are `ScreenHeader`, `SectionHeader`, and `SectionCard` (`ScreenSystem.jsx`); `.app-screen-stack`, `.app-row-stack`, `.app-compact-list-row`, and game-center rows (`screen-system.css`); `.card` and `.btn`; `.standings-tabs` / `.standings-tab`; and MobileNav's premium bottom-nav classes.
- The application already provides usable dark, text, divider, state, spacing, and radius variables in `base.css`. It did not provide a restrained green action token or a single late mobile conversion layer, so this PR adds only six mobile-scoped values and a final stylesheet import.
- Repeated rules across legacy files create soft gradients, large radii, shadows, contained pills, and card-within-card depth. The last-loaded layer is the narrowest safe extension point because changing old global definitions would alter desktop and deferred legacy routes.
- Review correction: the conversion no longer targets the generic `.card` class. Approved components opt in with `.pfgm-density-surface`; `LeagueDashboard` applies that wrapper only for HQ, Weekly Hub/Home, Team, League, News, and Weekly Results. FranchiseHQ, TeamHub, LeagueHub, NewsFeed, and WeeklyResultsCenter also declare the opt-in at their own roots so focused component renders retain the intended treatment.

## Repeated visual problems found

- Mobile shell padding made the app read as a floating dashboard instead of edge-to-edge game chrome.
- Page headers and section cards used similar rounded/elevated treatments, weakening hierarchy.
- Tabs appeared as rounded segmented controls and relied too heavily on their filled active state.
- Repeated rows were separated by generous gaps and individual borders rather than bands/dividers.
- Existing primary action styling used the general accent, while active and secondary controls competed for similar emphasis.
- The floating, rounded bottom navigation read as a web overlay rather than persistent native shell chrome.

## Updated surfaces and primitives

- **Shell/header:** edge-to-edge black content, compact navy App and screen headers, square section bands, stronger uppercase title hierarchy.
- **Tabs:** shared standings/section/dashboard tabs and News filters are flat, horizontally contained strips with text contrast plus a green active underline.
- **Rows/cards:** shared screen stacks, row stacks, compact list rows, section cards, team alerts, standings mini rows, News rows, and weekly result cards use tighter gaps, charcoal bands, and visible dividers. A later scoped rule restores the blue user-game result treatment after the generic game-card density reset, so “Your Game Result” remains distinct. Existing content and click semantics remain unchanged.
- **Actions:** existing `.btn-primary` / `.app-action-primary` classifications receive green high emphasis; secondary buttons remain charcoal and bordered. No buttons were reclassified.
- **Bottom navigation:** destinations, labels, callbacks, badges, drawer, collapse behavior, and accessible names are unchanged. Chrome is now full-width and flat; active page destinations have an icon/color treatment, top indicator, bold label, and `aria-current="page"`. More retains the active styling while open but is correctly exposed as an `aria-expanded` menu toggle rather than a current page.
- **Identity:** existing team abbreviations, user-team row state, records, scorelines, metadata, ratings, and player/team content gain stronger surrounding contrast. No identity data or imagery was invented.

These shared primitives are consumed by Franchise HQ, Team/roster-facing workspaces, League Hub / League Dashboard, News, and Weekly Results / Game Book entry cards, so those are the exact primary surfaces converted in V1.

## Mobile sizing, overflow, and accessibility

- The conversion is scoped to `max-width: 767px`; desktop remains stable.
- There is no document-level `overflow-x` clipping or hiding. The app shell uses border-box `width`/`max-width: 100%`; opted-in screen and row stacks use `min-width: 0` and `max-width: 100%`; compact/game rows are width-constrained; and tab/filter rails own their intentional `overflow-x: auto`. Interactive tab and nav targets remain at least 44px high.
- The bottom bar reserves content space and includes left/right/bottom safe-area insets. More remains a normal labeled bottom destination and the drawer remains independently scrollable under its existing rules.
- Selected tabs do not rely on color alone: they use an underline, font weight, and text contrast. Bottom-nav page selection adds a top indicator, bold label, and `aria-current`; the More toggle reports only its expanded state. Focus uses a two-pixel green outline. Heading elements and levels were not changed.
- Within opted-in density surfaces, later rules preserve info, warning, danger, and success borders/backgrounds on section cards and compact insights. These rules do not target generic alerts, dialogs, or modal content.
- Long dynamic names remain governed by existing row wrapping/truncation rules; the new layer does not add nowrap to data rows. Only intentionally contained tab labels stay on one line.

## Intentionally deferred

- Draft room, Hall of Fame, modal/dialog internals, destructive confirmations, error states, game simulation views, and legacy routes that do not consume a shared primitive are not individually redesigned.
- Desktop/tablet layout, player imagery/avatar generation, logos, rating formulas, stat formulas, route strings, and component APIs are deferred/non-goals.
- Critical decision cards retain semantic separation; this pass does not indiscriminately flatten dialogs or warnings.
- Generic `.card` consumers—including deferred modal, alert, destructive, error/success, draft, trade, contract, analytics, free-agency, and legacy surfaces—retain their existing styling unless they are a named primitive beneath an approved opt-in root.

## Validation record

Validation completed:

- Follow-up review checks: MobileNav, CSS density scope, WeeklyResultsCenter, and FranchiseHQ — 4 files and 62 tests passed after replacing unsupported jest-dom matchers with native attribute assertions.

- Targeted Vitest command covering the CSS scope regression, MobileNav, shell navigation, SaveSlotManager, LeagueHub, TeamHub, NewsFeed, FranchiseHQ/mobile shell, and LeagueDashboard player-profile navigation: 10 files and 84 tests passed.
- `npm run test:unit`: 473 files and 5,877 tests passed.
- `npm run check:sim-types`: passed.
- `npm run build`: passed with the repository's documented large-chunk warning.
- `npm run check:deploy`: production parity, rules, production Netlify CLI build, and deploy-preview Netlify CLI build passed. npm reported the pre-existing package audit count (one low and five high vulnerabilities).
- `npx playwright test tests/e2e/mobile_navigation_integrity.spec.js`: could not execute assertions because Chromium headless shell revision 1217 was absent.
- `npx playwright install chromium`: failed because the environment returned HTTP 403 `Domain forbidden` for the Playwright CDN. Consequently, screenshots and real-browser 375px/390px/430px measurements were not produced or claimed. The existing mobile E2E source already includes a 390px navigation/Saves flow and document-overflow assertion; it was left intact.
- Head `4f97c5be` CI evidence: GitHub job `93794246793` marks “Run fresh franchise first-week smoke” as timed out and reports only exit code 1; parity, both CodeQL analyses, and Netlify header/redirect checks passed. The PR changes do not touch the smoke test, worker, persistence, or first-session data flow. A local retry reached Playwright startup but could not launch because Chromium revision 1217 is absent; installation was then blocked by the same CDN HTTP 403 noted above, so no E2E pass is claimed.
- `git diff --check`: passed.
- `npx vitest run src/ui/styles/mobile-shell-density.test.js`: validates that generic `.card` is not flattened and document-level overflow is not masked.
