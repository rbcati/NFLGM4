# Mobile Architecture & Core Screen System V1 audit

## 1. Baseline

The branch was cut from current `main` commit `bc0483943591b05430849c9560c3acbd1f07ad74` (the merge of PR #1771). The repository had no configured Git remote in this workspace, so that checked-out commit—not a fabricated remote reference—is the authoritative baseline used for this audit.

## 2. Mobile layout ownership and repeated problems

- `FranchiseHQ`, `TeamHub`, `LeagueHub`, `WeeklyResultsCenter`, and `GameDetailScreen` already compose the shared `app-screen-stack`, section-card, compact-row, and density-surface grammar.
- `LeagueLeaders` owned a 560px minimum-width desktop table. At phone widths its bounded scroller could leave the primary metric beyond the initial viewport. Its filters were already locally constrained by `mobile-shell-density.css`.
- `LeagueStats` independently owned 980px player and 720px team tables, inline responsive layout, filters, and leader cards. The player table had labels but no intentional phone transformation.
- `PlayerProfile` and its error boundary own their overlay presentation. The profile already had a phone-specific full-viewport shell and profile tabs. An audit found no shared focus-management utility, and the profile does not trap or restore focus, so it must not claim true modal semantics.
- The principal duplicated rule was the dense player-data pattern: rank/identity/team/key metric plus secondary statistics. Table-specific inline minimum widths made that data dependent on local horizontal scrolling.
- Risky global patterns remain in legacy CSS, including broad base element/card rules and an existing weekly-results `overflow-x: clip`. This PR does not expand those patterns and does not add document-level overflow suppression.

## 3. Existing primitives reused

The implementation retains `pfgm-density-surface`, `app-screen-stack`, `app-entity-link`, `standings-tab`, existing filter controls, the desktop tables, Player Profile's overlay owner, and existing bottom-navigation ownership. Team Hub's compact cards/rows and Game Book's score-to-tabs hierarchy remain reference implementations and are unchanged.

## 4. New primitives

Only a CSS/markup data grammar was introduced: `app-mobile-data-list`, `app-mobile-data-row`, and its rank, identity, metrics, and empty-state elements, paired with `app-desktop-data-table`. It is necessary in both League Leaders and League Stats, eliminates two independent phone-table strategies, and leaves desktop markup and sorting intact. No generic React component was added because the two sources have different data and action contracts; a component abstraction would add indirection without consolidating behavior.

## 5. Screens migrated

- **League Leaders:** phone rows expose rank, clickable player, team, primary metric, and secondary metric together. A compact mobile empty state distinguishes no recorded leaders from filters with no matches and preserves the existing League/reset action. Filters, category tabs, sort state, and the desktop table remain.
- **League Stats player browser:** phone rows expose rank, clickable player, team/position, the category's primary metric, and every remaining recorded column as a wrapping secondary line. Filters, tabs, sorting, and the desktop table remain.
- **Player Profile:** the existing full-viewport mobile presentation and accessible labels are preserved, while unsupported modal claims are intentionally avoided.

## 6. Intentionally deferred

Draft, Trade Center, Free Agency, Contract Center, History, honors/records screens, setup, admin tools, global modal behavior, global theme behavior, and League Stats team-ranking tables are deferred. The team-ranking scrollers are container-local and were not the reported player-primary-metric failure.

## 7. League transformation

At up to 768px the wide player tables are replaced visually by source-ordered rows that never apply a desktop minimum width. The current primary metric is rendered in a `strong` element immediately below player/team identity; secondary data wraps rather than disappearing. Above the breakpoint the mobile list is hidden and the original sortable table is unchanged. No values or filters are invented.

## 8. Player Profile transformation

The existing mobile density stylesheet already makes the profile 100% wide, caps it to `100dvh`, removes desktop corner radii, and keeps internal vertical scrolling. Existing profile tabs progressively disclose the long career/analytics material rather than placing all narrative in the first viewport. This PR does not delete or reorder profile data. The repository audit found a component-local focus trap in `PostGameSummary`, but no canonical reusable modal utility; adding a new global system would exceed this PR. Player Profile therefore uses a labelled region rather than claiming `aria-modal`, and the failure boundary uses a truthful alert. Full focus containment and restoration remain deferred.

## 9. HQ hierarchy findings

Current HQ has one `advance-week-cta`, in the sticky action owner, with readiness gating and busy/disabled behavior. The apparent duplicate in screenshot evidence was not present on the baseline, so no action was removed. Final Results and the already-collapsed low-frequency season content were not changed.

## 10. Team Hub preservation

Lineup Check Before Kickoff, roster status, priority/pressure information, staff philosophy, game context, entity navigation, and bottom navigation are unchanged. Its existing screen-stack and compact-row grammar remains the quality baseline.

## 11. Game Book preservation

Weekly Results and Game Book were audited but not modified. Their score identity, Summary/Team Stats/Players/Plays authority, preparation context, archive resolution, and return navigation remain unchanged.

## 12. Responsive validation

The shared rules are width-independent below the existing 768px breakpoint and contain no fixed/minimum row width, so 375px, 390px, and 430px use the same bounded grid. Desktop tables remain selected at widths above 768px, including 1024px. A real Playwright run was attempted, but Chromium was absent; installation then failed because the Playwright CDN returned HTTP 403. Consequently no browser measurements or screenshots were produced, and source inspection/jsdom is not represented as browser validation.

## 13. Accessibility

Player and filter controls remain native buttons/inputs/selects. Mobile rows include an accessible rank label, retain explicit player-profile action labels, preserve visible team/status text, and keep all metrics as text. Player Profile no longer overstates unimplemented focus containment through modal semantics; its label, close control, backdrop policy, focus styling, tab semantics, and portal ownership remain intact.

## 14. Tests

Focused League tests assert the mobile primary metric, both mobile empty-state branches and actions, retained entity action, retained desktop table, filters, and sorting. Player Profile and boundary tests assert that the overlays retain accessible labels without claiming unimplemented modal semantics. Full unit, soak, simulation types, build, deployment parity, and Playwright outcomes are reported in the final PR description from actual command output.

## 15. Explicit non-goals and integrity

No simulation, outcomes, injuries, readiness/depth authority, workload/stat formulas, RNG, saves, persistence, archives, worker protocol, contracts/cap, transactions, draft/free agency, progression, roster management, or AI code is changed.
