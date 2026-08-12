# Universal Clickability & Entity Drill-Down V1 audit

## Baseline

The implementation started from `1d1fe78`, the merge commit for PR #1747. Its history also contains `94596b5`, the merge commit for PR #1745. No open or superseded branch was used.

## Routing ownership

- **Players:** `playerProfileNavigation.js` validates profile identity and invokes the callback owned by `LeagueDashboard`, which opens the existing `PlayerProfileModalBoundary`/`PlayerProfile` flow.
- **Teams:** `LeagueDashboard` owns `handleTeamSelect` and the existing `TeamProfile` surface. Entity controls only call that callback; they do not introduce route state.
- **Games:** `boxScoreAccess.js` owns canonical game identity, archive-quality presentation, and dispatch to the existing Game Book. A final score with only compact/legacy score data is now factual text rather than evidence of a drill-down archive.
- **Management:** `managementScreenRouting.js` and `shellNavigation.js` remain the destination contract. The Trade Deadline CTA continues to use the existing Trade Center callback.

The requested `src/ui/utils/tradeDeadlineContext.js` does not exist on live main. The live equivalent is `src/core/tradeDeadlineContext.js`, already consumed by `LeagueHub`.

## Existing and inconsistent surfaces

Player drill-down already existed in News, Weekly Results performers, League Leaders, roster/contract surfaces, and several activity views. Team drill-down already existed in standings, stats, schedules, and dashboard-owned profile routes. Weekly Results and League Hub already used the Game Book resolver, although score-only records were still treated as openable.

The League Hub overview was the clearest weekly inconsistency: trending teams, Award Watch players, injury players, and next-week teams were rendered as dead text while adjacent content supported drill-down. Spotlight games also rendered an unconditional button even when resolver evidence was insufficient.

## Updated surfaces

- Added shared player, team, and game entity controls with honest plain-text fallback. The reusable primitive is intentionally rolled out only in League Hub for this PR.
- Connected League Hub Trending Teams, Award Watch, League Health, and Next Week entities to existing profile callbacks. Team links now only activate for finite numeric IDs or numeric-string IDs supported by existing team identity lookups; booleans, arrays, objects, `NaN`, blank strings, and sentinel strings remain inert.
- Routed Spotlight Games through the same Game Book availability gate used elsewhere.
- Tightened Game Book availability so imported/legacy score-only records do not advertise detail that is not present.
- Added minimal hover, keyboard-focus, and cursor affordances without changing shell density or semantic tones. Inline reset styling is scoped away from `.btn` variants so the League Hub `Open Game` CTA keeps its small-button border, padding, background, color, and font styling.

## Deferred deliberately

Franchise HQ, News, Weekly Results, Team Hub, League Stats/Leaders, Award Races, standings, and schedule remain deferred. Several already contain substantial working entity/profile or Game Book pathways, but this PR intentionally keeps the first rollout League-Hub-only. Converting every legacy row in one change would increase nested-interactive and regression risk. A later increment can migrate those existing one-off controls onto the shared component after their surface-specific row semantics are audited.

## Accessibility and mobile

Actionable entities use native buttons, inherit row typography, expose optional labels for ambiguous visible text, retain visible `:focus-visible` outlines, and avoid wrapping existing row controls. Non-actionable entities are spans and never enter the tab order. Text itself is the tap target; no tiny icon-only control was added.

## Validation

Focused entity-link, CSS-scope, and Game Book resolver tests cover valid and invalid player/team identity, detailed versus score-only games, callback dispatch, accessible naming, and preservation of explicit `.btn` styling. The focused tests (28 tests across EntityLink, LeagueHub, and CSS-scope coverage), full unit suite (475 files / 5,896 tests), sim type check, production build, and deploy parity passed locally. The existing mobile League Hub Playwright source was invoked, but browser execution was blocked because Chromium was absent; installation retries were rejected by the download host with HTTP 403.
