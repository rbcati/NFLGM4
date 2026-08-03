# GM Decision Queue V1 — availability foundation audit

## Scope and dependency

This model-only change depends on merged PR #1725. The target contains `playerDecisionPresentation.js`, its exported `buildPlayerDecisionPresentation()` and `normalizePlayerDecisionSeasonStats()`, the player decision card/profile consumers, and `player-decision-cards-v1-audit.md`. The queue calls the merged presentation builder rather than reproducing player role, availability, retention, recommendation, archetype, contract, roster-value, or replacement evaluation.

No UI is wired in this change. The queue performs no navigation, transaction, persistence, worker, IndexedDB, save-schema, or simulation operation.

## Live-source findings

### Player facts consumed

The queue consumes these exact presentation fields once per plausible, unique candidate:

- `identity.id`, `identity.position`, and `identity.statusKey`;
- `role.label` (`Starter`, `Backup`, `Reserve`, or `Role unavailable`) and the presentation model's canonical role/depth interpretation;
- `availability.available` and `availability.detail`;
- `replacement.label`, whose exact live values are title-cased `High`, `Medium`, and `Low` (the underlying re-signing evaluator emits lowercase values and the presentation adapter establishes this casing);
- `availableData` indirectly as the authoritative presentation contract, while queue `availableData` reports which queue facts were established.

The cheap prefilter recognizes only recorded facts already supported by the player surface: `injuryWeeksRemaining`, `injury.weeksRemaining`, `injury.gamesRemaining`, a non-healthy `injury.status`, an injury `name`/`type`, `onIR`, and `status: 'injured_reserve'`. A missing injury record is healthy for prefilter purposes; a duration is never invented. IR status is treated as recorded unavailability even where an old save has no injury object.

### Ownership and status

The supplied roster is the membership boundary and `player.teamId` must match `team.id` using legacy-safe string comparison. Primitive roster references resolve only through `league.players`; unresolved references are omitted. Retired players, free agents, and draft prospects (including membership in `league.draftClass`) are excluded. Canonical player IDs are retained in returned metadata rather than numerically coerced.

### Depth-chart authority and replacement existence

`src/core/depthChart.js` defines canonical rows and writes `depthChart.rowKey`, `depthChart.order`, and `depthChart.role`; it also preserves `depthOrder`. The team-level `team.depthChart[rowKey]` assignment array is the strongest source for proving that a starter's row has no later assigned player. Per-player placement can prove a healthy next-depth player exists, but partial per-player data cannot prove absence.

A replacement must be on the same supplied team, have a recorded later assignment in the same canonical row, be currently available, and not be retired, a prospect, or a free agent. Overall rating is never consulted. Existing canonical row grouping is honored through `rowKey`; the queue defines no new position group or replacement-quality formula.

Missing row assignments, missing role, or incomplete depth information cannot establish “no replacement.” An unavailable starter with unsupported depth evidence remains high and receives a diagnostic rather than being raised to critical.

## Queue contract and rules

`buildAvailabilityDecisionQueue({ roster, team, league, seasonStatsByPlayerId })` returns `{ items, diagnostics }`. Each item has a stable availability ID, category and explicit severity, player subject, factual title, one to three deduplicated reasons, specialist destination metadata, debug sort key, and availability-of-data flags.

Eligibility requires supplied-roster membership, supplied-team ownership, a supported roster status, and a recorded current injury/unavailability fact. A candidate passing the cheap prefilter is presented once. It remains eligible when season stats are missing; matching stats are passed through without loading, archive scanning, mutation, or missing-to-zero conversion.

Severity rules are applied in order:

1. **Critical:** an unavailable recorded `Starter` and complete canonical team-row assignments confirm no healthy next assigned player.
2. **High:** an unavailable recorded `Starter`, or presentation `replacement.label === 'High'`.
3. **Medium:** another unavailable player with an authoritative `Backup` or `Reserve` role and enough context to review.

Replacement difficulty alone never makes an item critical. Missing role never means starter. Missing replacement data never means High. Unsupported candidates are omitted with diagnostics.

Reasons use recorded role, IR status, duration, injury detail, replacement difficulty, and confirmed backup presence/absence. Missing duration produces no duration copy; recorded zero remains available data but does not itself establish an injury. Titles contain only position and recorded starter/depth context.

## Ordering, deduplication, and diagnostics

Items sort by explicit severity rank (`critical`, `high`, `medium`), authoritative role rank (`Starter`, `Backup`, `Reserve`, unavailable), exact replacement rank (`High`, `Medium`, `Low`, unavailable), then canonical ID. `stableSortKey` exposes those components. Numeric and string IDs are compared without mutating or replacing the returned ID, and roster arrival order is not a tie-breaker.

Canonical string-equivalent IDs deduplicate roster references before presentation construction, yielding at most one item and one presentation call per player. Diagnostics are deduplicated and deterministically sorted. They cover unresolved IDs, duplicates, ownership mismatch, excluded status, healthy prefilter results, missing actionable injury context, insufficient role/context, and unsupported critical-depth evidence. They are debug/test data, never item copy.

## Destinations

The live navigation authority names the lineup workflow `Depth Chart` and the injury workflow `Injuries` (the screen heading is “Injury Report”). Recorded starters go to `Depth Chart`; informational non-starters go to `Injuries`. `playerId` is retained as metadata, but this model neither navigates nor invents a player-focused route.

## Performance and partial-data behavior

The implementation indexes league players once for stale primitive references, prefilters before presentation work, deduplicates before presentation work, computes each presentation once, reuses one resolved roster list for depth checks, and sorts only final items and diagnostics. It performs no archive parsing, league scan per output field, persistence read, or worker call. A dependency-injected builder factory is exported solely as a test seam for call-count assertions; the public production function uses the merged presentation helper.

Legacy numeric/string IDs, `onIR`, `injured_reserve`, legacy injury-week aliases, blank/null duration, `depthOrder`/`depthRank`, missing replacement evaluation, missing stats, duplicate references, empty rosters, and partial team/league values fail safely. Missing values do not become zero and absence of evidence cannot increase severity.

## Intentionally unsupported and future work

This foundation does not decide lineup mutations, IR placement, diagnosis, recovery, transactions, dismissal/snoozing, advance blocking, or replacement quality. It adds no contract, roster-shortage, trade, signing, release, waiver, preparation, or cap decision.

Expected later queue categories are **contract**, **roster depth**, **trade deadline**, **opponent preparation**, **cap pressure**, and **development**. Their future integration should retain the same deterministic presentation-only boundary. This PR changes no simulation outcomes, injury mechanics, salary cap, contracts, trades, ratings, AI roster logic, worker behavior, navigation state, transaction behavior, persistence, or save schema.
