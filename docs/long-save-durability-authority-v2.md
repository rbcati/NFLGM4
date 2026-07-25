# Long-Save Durability Authority V2

Base SHA: `a4f47f47e46e38db834024248484852aeac63ddf`.

## Why V1 determinism was insufficient

The previous durability report could set `deterministic=true` when two runs had the same lifecycle completion metadata, first-failure shape, and save/reload booleans. It did not compare durable roster, contract, cap, player, pick, schedule, or history state at corresponding checkpoints. V2 adds a canonical durable-state snapshot and compares checkpoint state directly.

## Snapshot fields and normalization

Snapshot schema `2.0.0` includes league phase/year/week/season id/user team/live salary cap; authoritative DB-backed teams with records, roster membership, dead cap, deferred dead cap, and stable cap fields; active players with canonical ids, team ids, age, ratings, injury availability, canonical normalized contract fields, and active cap hit; retired-player ledger rows; draft picks; schedule identity/results; completed history champion/runner-up references; and pool counts/source.

Normalization now resolves object-shaped legacy champion and runner-up team references with the canonical team-reference resolver, includes retired ledger evidence from view and DB meta, preserves duplicate entity occurrences during structured comparison, and reports diffs with canonical entity ids rather than array positions.

Excluded fields remain timestamps, narrative/UI-only text, raw serialization order not guaranteed by production, and volatile completion metadata.

## Stable cap equation

At stable cap checkpoints, each team is legal when:

`sum(active roster cap hits from canonical contracts) + current dead cap + counted pending commitments <= live salary cap`

The live cap is resolved from `view.economy.currentSalaryCap` or `db.meta.economy.currentSalaryCap`. Team dead cap and roster contracts come from authoritative DB team/player records when available. Staff payroll is excluded because production cap legality excludes it. Transitional offseason windows skip cap legality with a documented reason rather than pretending those reconciliation windows are final legal gates.

## Continuity rules

V2 continuity now checks that completed history grows exactly once at completed rollover checkpoints, schedule game ids are not reused across seasons, active/retired populations do not overlap, full-pool checkpoints do not lose established players without retirement/draft/release/free-agency/removal evidence, and contract years do not increase unless a signing/extension/restructure transaction occurred inside the compared checkpoint window (old retained transaction probes no longer excuse later corruption).

Roster-only checkpoints explicitly skip player-disappearance proof with a narrow reason because the full free-agent/retired pool is not present in those view-only snapshots.

## Isolation model

CLI determinism legs and `--seeds` runs execute in clean child processes. This avoids reusing worker module globals, caches, fake IndexedDB state, and seeded RNG state between legs/seeds. In-process harness helpers remain available for unit tests and bounded stubs.

## Production root causes repaired in this iteration

- Retired players were evicted from the hot cache after offseason retirement without durable `meta.retiredPlayers` evidence, so continuity could not distinguish retirement from disappearance after old players left the DB player pool. The repair persists a compact retired-player ledger before eviction.
- AI stable rollover could enter preseason with an AI roster below the legal minimum after retirements/cuts/free agency. The repair adds a deterministic minimum-roster reconciliation pass that signs from the existing free-agent pool, respects interactive-user isolation, creates fresh production-shaped contracts instead of inheriting released-player contracts/restructure metadata, validates projected cap legality before commit, and recalculates all team caps before the preseason save surface.
- Save/reload could observe stale pre-save cap aggregates because not every final rollover roster mutation recalculated team cap fields before flushing. The repair recalculates every team cap after final rollover roster reconciliation.
- Several ordering boundaries that affect offers/releases/RNG draw order lacked canonical tie-breaks: AI FA target inputs, equal-score FA offer resolution, offseason roster-cut candidate ties, offseason extension/progression team/player iteration, staff-carousel team/market ties, free-agent offer arrays, and FA offer timestamps. These were narrowed to canonical id/name tie-breaks or deterministic phase/week stamps without changing balance formulas.
- Retention market heat used a falsy team-id predicate, so rostered team `0` players could be counted as free agents. The repair uses `teamId == null` plus non-retired/non-draft status filtering for the market free-agent pool.
- Minimum-roster reconciliation now uses the canonical signable-free-agent predicate, live economy cap before stale team cap totals, pre-commit cap projection, and post-mutation rollback without emitting a SIGN transaction on failure.
- Durable schedule normalization now uses production season identity precedence (`seasonId ?? season ?? year ?? null`) so schedule reuse across different production season IDs is detectable.
- The remaining state divergence was not an FA score tie. A bounded two-leg trace found the first differing durable influence before FA: weekly dynamic events used `generateDynamicEvents()`'s default `Math.random`, which gave the same rookie morale `96` in one leg and `90` in the other before offseason progression. That changed a later player's progression OVR, candidate order, pending cap reservations, offers, and ultimately team assignments such as `5013` (`27` versus `28`). Production weekly and FA event calls now pass the existing seeded `Utils.random` stream, and equal-volatility event candidates use canonical player-ID order so the same draws remain attached to the same players.
- All production pools that can generate/evaluate FA offers, market heat, or signings now use `isSignableFreeAgent`; broad legacy `isFreeAgent` membership no longer allows retired, draft-pool, removed, inconsistent active/null-team, or team-0 rows to affect those authorities.

## Current evidence

Commands run on this branch after the seeded dynamic-event and strict-signability repairs:

- `node --check src/core/ai-logic.js && node --check src/core/retention/reSigning.js && node --check tests/durability/invariants/continuity.js` — passed.
- `node --check src/worker/worker.js` — passed.
- `npx vitest run tests/unit/aiCapManagementExecution.test.js --config vitest.config.ts` — passed, 1 file / 16 tests.
- `npx vitest run src/core/__tests__/retention-board.test.js --config vitest.config.ts` — passed, 1 file / 4 tests.
- `npm run durability:test` — passed, 5 files / 83 tests.
- `npm run check:sim-types` — passed.
- `npm run build` — passed with the existing Vite chunk-size warning.
- `npm run durability:smoke` — passed one full season with save/reload OK (201 pass / 0 fail / 39 skip, peak RSS 473 MB).
- `npm run test:unit` — passed, 462 files / 5675 tests.
- `npm run durability:5 -- --seed=1684 --determinism --collect-all --write-report --summary` — passed both isolated five-season legs with zero invariant failures and identical canonical state.
- `npm run durability:5 -- --seeds=1684,1702,1703 --collect-all --write-report --summary` — passed all three isolated seeds, each completing 5/5 seasons with zero invariant failures.
- `npm run durability:10 -- --seed=1684 --collect-all --write-report --summary` — attempted honestly, but did not complete: two invariant failures appeared at the season-8 rollover and the process exhausted the approximately 4 GB V8 heap during season 9 after reaching the playoffs.

Latest five-season determinism result:

- Seed: 1684
- Completed: 5/5 seasons in each isolated child leg
- First leg runtime/peak RSS: 408.9 seconds / 2215 MB
- Second leg runtime/peak RSS: 398.5 seconds / 2215 MB
- Invariants: 750 pass / 0 fail / 132 skip in both legs
- Save/reload: OK at season 1 and season 5 in both legs
- Lifecycle deterministic: true
- State deterministic: true
- First divergence: none

The three-seed five-season matrix also completed with `overallPassed=true`: seeds `1684`, `1702`, and `1703` each completed 5/5 seasons with zero invariant failures. This proves the five-season and multi-seed gates on this head; it does not convert the failed ten-season attempt into ten-season authority.

## Remaining limitations / not yet proven

This branch may claim five-season state determinism for seed 1684 and successful five-season execution for seeds 1684/1702/1703. It must **not** claim ten-season safety: the required ten-season attempt became invalid at the season-8 rollover and then ended in a V8 out-of-memory crash during season 9. The two season-8 invariant findings and long-run memory growth are a separate later causal cluster; under the first-confirmed-cluster scope they were recorded rather than hidden or repaired here. A 20-season attempt was not appropriate after the ten-season gate failed and exhausted the available heap.
