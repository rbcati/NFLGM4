# Playability & Navigation Integrity V1 audit

## Baseline and scope

The inspected branch starts at merge commit `68fe8e6` (#1744), after merge commits `bfa9acc` (#1738) and `147ff4a` (#1737). Fetching `origin/main` confirmed that `68fe8e6` was the live main tip before implementation; draft #1743 was not merged or copied. This is reliability surgery only: no visual redesign, gameplay, simulation, AI, roster, trade valuation, contract, cap, worker ownership, persistence, or save-schema changes are included.

## Navigation ownership model

The shell has three distinct owners:

1. **Shell sections** — `hq`, `team`, `league`, and `news`. `LeagueDashboard` resolves these through `NAV_GROUPS` to the first valid canonical dashboard tab in the section.
2. **LeagueDashboard destinations** — canonical string tabs rendered by the dashboard content switch. The mobile drawer renders Weekly Results, Schedule, Standings, Stats (labelled League Stats), Roster Hub (labelled Roster / Depth), Game Plan, Staff, Injuries, Contract Center (labelled Contracts), 💰 Cap (labelled Salary Cap), Transactions (labelled Trade), Free Agency, Draft, History Hub (labelled History), Awards & Records, 🤖 GM Advisor, Analytics, and God Mode.
3. **App actions** — save-slot lifecycle belongs to `App`, which owns `activeSlot` and renders `SaveSlotManager`. Saves is therefore an action (`saves`), not a dashboard destination.

The bottom bar contract is HQ/Team/League as shell sections, News as the canonical `News` dashboard destination, and More as drawer state. Route changes, Escape, backdrop taps, destination taps, section taps, and collapsed Game Book navigation close the drawer.

## Findings and fixes

The reported Saves failure was reproducible by source trace: MobileNav emitted the string `Saves`; LeagueDashboard treated it as a normal tab; and that tab rendered `ModdingHub`, not App's `SaveSlotManager`. The fix marks Saves explicitly as App-owned, passes it through `LeagueDashboard.onOpenSaves`, and invokes the same `setActiveSlot(null)` behavior already used by App's existing **Manage Saves** utility action. Opening it does not call save, delete, reset, create, or worker actions. The obsolete dashboard Saves tab and incorrect ModdingHub rendering were removed.

All other currently rendered drawer IDs resolve to the live dashboard contract. Friendly labels retain their canonical mappings listed above. Contract tests now reject duplicate menu IDs, unknown dashboard routes, invalid shell-section values, and a Saves item that is not App-owned. Interaction tests cover Saves ownership plus drawer closure on action, Escape, and collapsed navigation. A focused 390px Playwright test traverses League Stats, Contracts, Trade, Weekly Results, all primary bottom destinations, and Saves, while checking drawer closure, crash copy, and horizontal overflow.

The audited in-content CTAs in `FranchiseHQ`, `LeagueHub`, `NewsFeed`, `TeamHub`, and `LeagueDashboard` continue to use existing `onNavigate`, entity-select, Game Book, advance, simulation, quick-save, and Manage Saves callbacks. No additional dead callback was proven in the current source, so no speculative rewiring was added.

## Postgame and statistics data boundary

`LeagueStats` receives only `league` and builds its model with `buildLeagueStatsHubModel(league)`. This is intentional: `lastResults` feeds Weekly Results/postgame surfaces and is not a second League Stats authority. The model first uses canonical roster `seasonStats`; only when those are absent does it aggregate detailed player logs from completed schedule games. Team rankings aggregate canonical schedule `teamStats`; score-only games are labelled **Score-only standings data**, partial detail is labelled **Partial data**, and unavailable categories render honest no-data copy. Team columns are filtered by recorded availability, so absent yards/sacks do not produce hollow ranking cells. Existing model tests cover real playerStats, real teamStats, score-only games, input reorder determinism, and non-mutation. No missing propagation or formatter defect requiring a new data path was proven, so the stats pipeline was left unchanged.

## Deferred work

The PFGM-inspired visual redesign, density/polish work, new stat formulas, synthetic stats, new postgame plumbing, new gameplay systems, and broad CTA redesign are intentionally deferred. Sparse or old saves can only display detail actually persisted by their canonical schedule/season-stat data; the truthful limited-data states remain the supported fallback.
